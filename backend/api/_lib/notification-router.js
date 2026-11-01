import express from 'express';
import webpush from 'web-push';
import { withClient, withTransaction } from './db.js';
import { permits } from './admin-auth.js';
import { realtimeIdentity } from './realtime.js';

export function buildNotificationRouter(audience){
  const router=express.Router();
  router.use(async(req,res,next)=>{try{const identity=await realtimeIdentity(req,res,audience);if(identity){req.inboxIdentity=identity;res.set('Cache-Control','private, no-store');next();}}catch(e){next(e);}});
  const scope=req=>[audience,req.inboxIdentity.id,audience==='user'||permits(req.inboxIdentity.perms,'subscriptions.read')];
  const where='audience=$1 and recipient_id=$2 and (permission is null or $3)';
  router.get('/',async(req,res,next)=>{try{
    const offset=Math.max(0,Math.min(100000,Number(req.query.offset)||0));
    const result=await withClient(async c=>{
      const checkedAt=(await c.query('select clock_timestamp() as at')).rows[0].at;
      const params=scope(req);const unread=(await c.query(`select count(*)::int as count from inbox_notifications where ${where} and read_at is null`,params)).rows[0].count;
      const rows=(await c.query(`select id,title,body,href,created_at,read_at from inbox_notifications where ${where} ${req.query.unread==='1'?'and read_at is null':''} order by created_at desc,id desc limit 30 offset $4`,[...params,offset])).rows;
      return {rows,unread,offset,next:rows.length===30?offset+30:null,checkedAt,pushConfigured:!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY),vapidPublicKey:process.env.VAPID_PUBLIC_KEY||null};
    });res.json(result);
  }catch(e){next(e);}});
  router.post('/read',async(req,res,next)=>{try{
    const id=req.body?.id;const before=req.body?.before;
    if(id&&!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:'Notification invalide.'});
    if(!id&&(!before||!Number.isFinite(Date.parse(before))))return res.status(400).json({error:'Date de lecture requise.'});
    await withTransaction(async c=>{
      await c.query('select pg_advisory_xact_lock(73922,1)');
      const out=await c.query(`update inbox_notifications set read_at=now() where ${where} and read_at is null and ${id?'id=$4::uuid':'created_at<=$4::timestamptz'} returning event_key`,[...scope(req),id||before]);
      // Keep the source history and the global inbox consistent in one commit.
      if(audience==='user'&&out.rows.length)await c.query('update subscription_notifications set read_at=coalesce(read_at,now()) where user_id=$1 and event_key=any($2::text[])',[req.inboxIdentity.id,out.rows.filter(r=>r.event_key.startsWith('subscription:')).map(r=>r.event_key.slice(13))]);
    });
    res.json({ok:true});
  }catch(e){next(e);}});
  router.post('/push',async(req,res,next)=>{try{
    if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return res.status(409).json({error:'Les notifications push ne sont pas configurées.'});
    const {endpoint,keys}=req.body||{};
    let url;try{url=new URL(endpoint);}catch{ return res.status(400).json({error:'Adresse push invalide.'}); }
    const approved=/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)*push\.apple\.com|(?:[a-z0-9-]+\.)*notify\.windows\.com)$/i;
    if(url.protocol!=='https:'||!approved.test(url.hostname)||url.port||url.username||url.password||String(endpoint).length>2048||!keys||!/^[-_a-z0-9=+/]{80,100}$/i.test(keys.p256dh||'')||!/^[-_a-z0-9=+/]{20,30}$/i.test(keys.auth||''))return res.status(400).json({error:'Abonnement push invalide.'});
    const table=audience==='admin'?'admin_push_subscriptions':'push_subscriptions';const column=audience==='admin'?'admin_id':'user_id';
    await withClient(c=>c.query(`insert into ${table}(${column},endpoint,p256dh,auth) values($1,$2,$3,$4) on conflict(endpoint) do update set ${column}=excluded.${column},p256dh=excluded.p256dh,auth=excluded.auth`,[req.inboxIdentity.id,endpoint,keys.p256dh,keys.auth]));
    res.json({ok:true});
  }catch(e){next(e);}});
  router.delete('/push',async(req,res,next)=>{try{
    const table=audience==='admin'?'admin_push_subscriptions':'push_subscriptions';const column=audience==='admin'?'admin_id':'user_id';
    await withClient(c=>c.query(`delete from ${table} where ${column}=$1 and endpoint=$2`,[req.inboxIdentity.id,String(req.body?.endpoint||'')]));res.json({ok:true});
  }catch(e){next(e);}});
  return router;
}
let nextCleanup=0;
export async function runInboxPush({send=(subscription,payload)=>webpush.sendNotification(subscription,payload)}={}){
  return withClient(async c=>{
    if(!(await c.query('select pg_try_advisory_lock(73922,2) as locked')).rows[0].locked)return;
    try{
      await c.query("update inbox_notifications set push_status='unknown' where push_status='sending' and attempted_at<now()-interval '5 minutes'");
      if(Date.now()>nextCleanup){await c.query("delete from realtime_events where created_at<now()-interval '7 days'");nextCleanup=Date.now()+3600000;}
      if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)return;
      webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:contact@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
      const rows=(await c.query("select * from inbox_notifications where push_status='pending' order by created_at limit 100")).rows;
      for(const row of rows){
        let subs=[];
        if(row.audience==='admin'){
          const admin=(await c.query("select a.id from admin_users a where a.id=$1 and a.status='actif' and ($2::text is null or exists(select 1 from admin_role_permissions p where p.role_code=a.role_code and p.permission in ('*','subscriptions.*',$2)))",[row.recipient_id,row.permission])).rows[0];
          if(admin)subs=(await c.query('select * from admin_push_subscriptions where admin_id=$1',[row.recipient_id])).rows;
        }else{
          const user=(await c.query("select preferences from users where id=$1 and status='actif'",[row.recipient_id])).rows[0];
          const prefs=user?.preferences?.notifications;
          if(user&&prefs?.push!==false){
            const q=prefs?.quietHours;const now=new Date();const minute=now.getHours()*60+now.getMinutes();const parse=s=>/^\d{2}:\d{2}$/.test(s||'')?Number(s.slice(0,2))*60+Number(s.slice(3)):null;const from=parse(q?.from),to=parse(q?.to);
            if(q?.enabled&&from!==null&&to!==null&&from!==to&&(from<to?minute>=from&&minute<to:minute>=from||minute<to))continue;
            subs=(await c.query('select * from push_subscriptions where user_id=$1',[row.recipient_id])).rows;
          }
        }
        await c.query("update inbox_notifications set push_status='sending',attempted_at=now() where id=$1",[row.id]);
        let errors=0;
        for(const sub of subs){try{await send({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:row.title,body:row.body,url:row.href,tag:'inbox-'+row.id}));}catch(e){errors++;if([404,410].includes(e.statusCode)){const table=row.audience==='admin'?'admin_push_subscriptions':'push_subscriptions';await c.query(`delete from ${table} where endpoint=$1`,[sub.endpoint]);}}}
        await c.query('update inbox_notifications set push_status=$2 where id=$1',[row.id,!subs.length?'unavailable':errors?'unknown':'accepted']);
      }
    }finally{await c.query('select pg_advisory_unlock(73922,2)');}
  });
}
