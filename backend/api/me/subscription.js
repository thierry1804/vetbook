import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireUser } from '../_lib/auth.js';
import { withClient, withTransaction } from '../_lib/db.js';
import { computeEntitlements } from '../_lib/entitlements.js';
import { subscriptionError } from '../_lib/subscription-service.js';

export function buildMySubscriptionRouter() {
  const router=express.Router();
  router.use(async(req,res,next)=>{try{const user=await requireUser(req,res);if(user){req.subscriptionUser=user;res.set('Cache-Control','private, no-store');next();}}catch(error){next(error);}});
  router.get('/',async(req,res,next)=>{try{
    const result=await withClient(async(c)=>{
      const userId=req.subscriptionUser.userId;
      const entitlements=await computeEntitlements(c,userId);
      const requests=(await c.query('select r.id,r.kind,r.plan_code,p.name as plan_name,p.period,r.desired_start,r.comment,r.status,r.public_reply,r.version,r.created_at,r.updated_at from subscription_requests r join plans p on p.code=r.plan_code where r.user_id=$1 order by r.created_at desc limit 50',[userId])).rows;
      const notifications=(await c.query('select id,title,body,created_at,read_at from subscription_notifications where user_id=$1 order by created_at desc limit 50',[userId])).rows;
      return {entitlements,requests,notifications};
    });res.json(result);
  }catch(error){next(error);}});
  router.post('/requests',rateLimit({windowMs:60000,max:5,standardHeaders:true,legacyHeaders:false}),async(req,res,next)=>{try{
    const body=req.body||{};
    if(!['assign','renew'].includes(body.kind))throw subscriptionError('Type de demande invalide.');
    const row=await withTransaction(async(c)=>{
      const userId=req.subscriptionUser.userId;
      await c.query('select id from users where id=$1 for update',[userId]);
      const plan=(await c.query("select code from plans where code=$1 and visible and not archived and audience='owner' and code<>'gratuit'",[body.planCode])).rows[0];
      if(!plan)throw subscriptionError('Cette offre n’est pas disponible.');
      const existing=(await c.query("select id from subscription_requests where user_id=$1 and plan_code=$2 and kind=$3 and status in ('nouveau','en_cours')",[userId,plan.code,body.kind])).rows[0];
      if(existing)return existing;
      let desired=null;if(body.desiredStart){desired=new Date(body.desiredStart);if(!Number.isFinite(desired.getTime())||desired.getTime()<Date.now())throw subscriptionError('La date souhaitée doit être future.');}
      if(body.kind==='renew'){
        const own=(await c.query("select id from subscriptions where user_id=$1 and plan_code=$2 and status in ('actif','essai','suspendu') limit 1",[userId,plan.code])).rows[0];
        if(!own)throw subscriptionError('Aucune période de cette offre à renouveler.');
      }
      return (await c.query('insert into subscription_requests (user_id,kind,plan_code,desired_start,comment) values ($1,$2,$3,$4,$5) returning id',[userId,body.kind,plan.code,desired,String(body.comment||'').trim().slice(0,1000)])).rows[0];
    });res.status(201).json(row);
  }catch(error){next(error);}});
  router.post('/requests/:id/cancel',async(req,res,next)=>{try{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id))throw subscriptionError('Demande invalide.');
    const out=await withTransaction(async(c)=>{
      const row=(await c.query('select * from subscription_requests where id=$1 and user_id=$2 for update',[req.params.id,req.subscriptionUser.userId])).rows[0];
      if(!row)throw subscriptionError('Demande introuvable.',404);
      if(!['nouveau','en_cours'].includes(row.status))throw subscriptionError('Cette demande est déjà fermée.',409);
      await c.query("update subscription_requests set status='annule',version=version+1,updated_at=now() where id=$1",[row.id]);return {ok:true};
    });res.json(out);
  }catch(error){next(error);}});
  router.post('/notifications/:id/read',async(req,res,next)=>{try{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id))throw subscriptionError('Notification invalide.');
    const row=(await withClient((c)=>c.query('update subscription_notifications set read_at=coalesce(read_at,now()) where id=$1 and user_id=$2 returning id',[req.params.id,req.subscriptionUser.userId]))).rows[0];
    if(!row)throw subscriptionError('Notification introuvable.',404);res.json({ok:true});
  }catch(error){next(error);}});
  router.use((error,_req,res,_next)=>{void _next;if(error.status)res.status(error.status).json({error:error.message,code:error.code});else{console.error('subscription',error);res.status(500).json({error:'Erreur serveur.'});}});
  return router;
}
