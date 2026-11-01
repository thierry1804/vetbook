import { withClient, withTransaction } from '../_lib/db.js';
import { requireAdmin, audit } from '../_lib/admin-auth.js';
import { listSubscriptions, describeSubscriptions, subscriptionRows } from '../_lib/subscription-read.js';
import { subscriptionDossier, previewSubscription, commitSubscription, subscriptionError } from '../_lib/subscription-service.js';
import { migrationIssues } from '../_lib/subscription-state.js';

const uuid=(value)=>/^[0-9a-f-]{36}$/i.test(value||'');
const route=(fn)=>async(req,res,next)=>{try{await fn(req,res);}catch(error){if(error.status)res.status(error.status).json({error:error.message,code:error.code});else next(error);}};
export function mountSubscriptions(router) {
  const read=requireAdmin('subscriptions.read');
  router.get('/subscription-users',read,route(async(req,res)=>{
    const q=String(req.query.q||'').trim().slice(0,100);
    if(q.length<2)return res.json([]);
    res.json((await withClient((c)=>c.query("select id,name,email from users where name ilike $1 or email ilike $1 order by email limit 20",['%'+q+'%']))).rows);
  }));
  router.get('/subscription-periods',read,route(async(req,res)=>{
    const data=await withClient((c)=>listSubscriptions(c,req.query));
    const page=Math.max(1,Number(req.query.page)||1),size=Math.min(100,Math.max(1,Number(req.query.size)||25));
    const timezone=(await withClient((c)=>c.query("select value from app_settings where key='subscription_timezone'"))).rows[0]?.value||'UTC';
    res.json({counts:data.counts,total:data.rows.length,rows:data.rows.slice((page-1)*size,page*size),timezone});
  }));
  router.get('/subscription-periods/export',read,route(async(req,res)=>res.json((await withClient((c)=>listSubscriptions(c,req.query))).rows)));
  router.get('/subscription-periods/:id',read,route(async(req,res)=>{
    if(!uuid(req.params.id))throw subscriptionError('Période invalide.');
    const row=(await withClient((c)=>c.query('select user_id from subscriptions where id=$1',[req.params.id]))).rows[0];
    if(!row)throw subscriptionError('Période introuvable.',404);
    res.json({userId:row.user_id});
  }));
  router.get('/subscription-users/:id',read,route(async(req,res)=>{
    if(!uuid(req.params.id))throw subscriptionError('Utilisateur invalide.');
    res.json(await withClient((c)=>subscriptionDossier(c,req.params.id)));
  }));
  router.post('/subscription-users/:id/preview',read,route(async(req,res)=>{
    if(!uuid(req.params.id))throw subscriptionError('Utilisateur invalide.');
    res.json(await previewSubscription(req.params.id,req.body||{},req.admin));
  }));
  router.post('/subscription-users/:id/commit',read,route(async(req,res)=>res.json(await commitSubscription(req.params.id,req.body||{},req,res))));
  router.get('/subscription-review',requireAdmin('subscriptions.advanced'),route(async(_req,res)=>{
    const rows=(await withClient((c)=>c.query('select s.*,u.email,u.name from subscriptions s join users u on u.id=s.user_id order by s.user_id,s.started_at'))).rows;
    const grouped=new Map();for(const row of rows){if(!grouped.has(row.user_id))grouped.set(row.user_id,[]);grouped.get(row.user_id).push(row);}
    const issues=[...grouped].map(([userId,periods])=>({userId,name:periods[0].name,email:periods[0].email,...migrationIssues(periods)})).filter((r)=>['overlaps','invalidDates','unlimited','ambiguous','legacyFuture'].some((key)=>r[key].length));
    res.json({totalPeriods:rows.length,issues});
  }));
  router.get('/subscription-options',read,route(async(_req,res)=>{
    res.json((await withClient((c)=>c.query('select code,name,period,trial_days,archived from plans order by sort_order,code'))).rows);
  }));
  router.get('/subscription-requests',read,route(async(req,res)=>{
    const q=String(req.query.q||'').slice(0,100);const status=String(req.query.status||'');
    const data=await withClient(async(c)=>{
      const all=(await c.query(`select r.*,u.name as user_name,u.email as user_email,p.name as plan_name,p.period,a.name as assigned_name
        from subscription_requests r join users u on u.id=r.user_id join plans p on p.code=r.plan_code left join admin_users a on a.id=r.assigned_to
        where ($1='' or u.name ilike $1 or u.email ilike $1) order by r.created_at desc`,[q?'%'+q+'%':''])).rows;
      const matches=(row,key)=>key==='open'?['nouveau','en_cours'].includes(row.status):!key||row.status===key;
      const rows=all.filter((row)=>matches(row,status)); const page=Math.max(1,Number(req.query.page)||1);
      return {rows:rows.slice((page-1)*25,page*25),total:rows.length,counts:Object.fromEntries(['open','nouveau','en_cours','traite','refuse','annule',''].map((key)=>[key,all.filter((row)=>matches(row,key)).length]))};
    });res.json(data);
  }));
  router.put('/subscription-requests/:id',requireAdmin('subscriptions.manage'),route(async(req,res)=>{
    const body=req.body||{};if(!['en_cours','refuse'].includes(body.status))throw subscriptionError('Seuls la prise en charge et le refus sont possibles ici.');
    if(body.status==='refuse'&&String(body.publicReply||'').trim().length<5)throw subscriptionError('Un message pour l’utilisateur est requis (5 caractères min.).');
    const out=await withTransaction(async(c)=>{
      const request=(await c.query('select * from subscription_requests where id=$1 for update',[req.params.id])).rows[0];
      if(!request)throw subscriptionError('Demande introuvable.',404);
      if(!['nouveau','en_cours'].includes(request.status)||request.version!==Number(body.version))throw subscriptionError('La demande a changé ou est déjà fermée.',409);
      const row=(await c.query('update subscription_requests set status=$2,assigned_to=$3,public_reply=$4,internal_note=$5,version=version+1,updated_at=now() where id=$1 returning *',[request.id,body.status,req.admin.id,body.status==='refuse'?String(body.publicReply).trim().slice(0,1000):null,String(body.internalNote||'').slice(0,2000)])).rows[0];
      await audit(req,res,{action:'subscription.request_update',targetType:'user',targetId:request.user_id,before:request,after:row,reason:body.status==='refuse'?'Refus de demande':'Prise en charge de demande'},c);
      if(body.status==='refuse')await c.query('insert into subscription_notifications (user_id,event_key,title,body) values ($1,$2,$3,$4) on conflict(event_key) do nothing',[request.user_id,'request-refused:'+request.id,'Votre demande d’abonnement a reçu une réponse',row.public_reply]);
      return row;
    });res.json(out);
  }));
}
export {describeSubscriptions,subscriptionRows};
