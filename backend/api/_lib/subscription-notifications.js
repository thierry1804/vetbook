import webpush from 'web-push';
import { withClient } from './db.js';
import { sendMail, appUrl, logPushAttempt } from './mailer.js';

export async function enqueueSubscriptionDeadlines(c,now=new Date()) {
  const rows=(await c.query("select s.*,p.name as plan_name from subscriptions s join plans p on p.code=s.plan_code where s.workflow_version=1 and s.status in ('actif','essai','suspendu') and s.started_at<=$1",[now])).rows;
  let added=0;
  for(const row of rows){
    const start=new Date(row.started_at).toISOString();const end=row.ends_at?new Date(row.ends_at):null;
    const messages=[];
    if(!end||end>now)messages.push({key:`activation:${row.id}:${start}`,title:'Votre période d’abonnement a commencé',body:`Votre période ${row.plan_name} a commencé. Consultez vos droits dans Formule et abonnement.`});
    if(end&&!row.replaced_by){
      const days=(end-now)/86400000;
      if(days<=0)messages.push({key:`expiry:${row.id}:${end.toISOString()}`,title:'Une période d’abonnement est arrivée à échéance',body:`Votre période ${row.plan_name} est arrivée à échéance. Consultez votre accès actuel ou demandez un renouvellement.`});
      else if(days<=7){const threshold=days<=1?1:7;messages.push({key:`soon:${row.id}:${end.toISOString()}:${threshold}`,title:'Votre abonnement arrive à échéance',body:`Votre période ${row.plan_name} se termine le ${end.toISOString()}. Un renouvellement reste une décision de l’équipe.`});}
    }
    for(const message of messages){const out=await c.query('insert into subscription_notifications (user_id,subscription_id,event_key,title,body) values ($1,$2,$3,$4,$5) on conflict(event_key) do nothing',[row.user_id,row.id,message.key,message.title,message.body]);added+=out.rowCount;}
  }
  return added;
}
function quiet(preferences,now=new Date()) {
  const q=preferences?.notifications?.quietHours;if(!q?.enabled)return false;
  const parse=(s)=>/^\d{2}:\d{2}$/.test(s||'')?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
  const from=parse(q.from),to=parse(q.to),current=now.getHours()*60+now.getMinutes();
  if(from==null||to==null||from===to)return false;return from<to?current>=from&&current<to:current>=from||current<to;
}
export async function runSubscriptionNotifications({sendEmail=sendMail,sendPush=(sub,payload)=>webpush.sendNotification(sub,payload)}={}) {
  return withClient(async(c)=>{
    const locked=(await c.query('select pg_try_advisory_lock(17236,4) as locked')).rows[0].locked;
    if(!locked)return {skipped:true};
    try{
      const queued=await enqueueSubscriptionDeadlines(c);
      // A crash after provider acceptance is ambiguous: do not replay a possibly delivered message.
      await c.query("update subscription_notifications set email_status=case when email_status='sending' then 'unknown' else email_status end,push_status=case when push_status='sending' then 'unknown' else push_status end where attempted_at<now()-interval '5 minutes' and (email_status='sending' or push_status='sending')");
      const notices=(await c.query("select n.*,u.email,u.preferences,u.status as user_status from subscription_notifications n join users u on u.id=n.user_id where n.email_status='pending' or n.push_status='pending' order by n.created_at limit 100")).rows;
      const pushConfigured=!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY);
      if(pushConfigured)webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:contact@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
      for(const n of notices){
        if(n.email_status==='pending'){
          const enabled=n.user_status==='actif'&&n.preferences?.notifications?.email===true&&!!process.env.SMTP_HOST;
          await c.query('update subscription_notifications set email_status=$2,attempted_at=now() where id=$1',[n.id,enabled?'sending':'disabled']);
          if(enabled){let state='error';try{const result=await sendEmail({to:n.email,subject:n.title,text:`${n.body}\n\n${appUrl()}/`,template:'subscription'});state=result.delivered?'accepted':result.console?'simulated':'error';}catch{state='unknown';}await c.query('update subscription_notifications set email_status=$2 where id=$1',[n.id,state]);}
        }
        if(n.push_status==='pending'){
          const enabled=n.user_status==='actif'&&n.preferences?.notifications?.push!==false&&pushConfigured;
          if(enabled&&quiet(n.preferences))continue;
          await c.query('update subscription_notifications set push_status=$2,attempted_at=now() where id=$1',[n.id,enabled?'sending':'disabled']);
          if(enabled){
            const subs=(await c.query('select endpoint,p256dh,auth from push_subscriptions where user_id=$1',[n.user_id])).rows;
            let failed=0;
            for(const sub of subs){try{await sendPush({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:n.title,body:n.body,url:'/?account=plan'}));await logPushAttempt({userId:n.user_id,title:n.title,status:'envoye'});}catch{failed++;await logPushAttempt({userId:n.user_id,title:n.title,status:'echec',error:'Envoi de notification d’abonnement non confirmé.'});}}
            await c.query('update subscription_notifications set push_status=$2 where id=$1',[n.id,!subs.length?'unavailable':failed?'error':'accepted']);
          }
        }
      }
      return {queued,processed:notices.length};
    } finally {await c.query('select pg_advisory_unlock(17236,4)');}
  });
}
