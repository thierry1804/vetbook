import crypto from 'node:crypto';
import { withTransaction } from './db.js';
import { permits, audit } from './admin-auth.js';
import { subscriptionContext, describeSubscriptions } from './subscription-read.js';
import { addCalendar, localInstant, zonedParts, instant, isReserved, overlappingPeriods, migrationIssues } from './subscription-state.js';
import { computeEntitlements } from './entitlements.js';

export function subscriptionError(message,status=400,code='SUBSCRIPTION_INVALID') { const e=new Error(message);e.status=status;e.code=code;return e; }
const fail=(message,status=400,code)=>{throw subscriptionError(message,status,code);};
export const ACTION_PERMISSIONS={assign:'subscriptions.manage',trial:'subscriptions.manage',renew:'subscriptions.manage',change:'subscriptions.manage',suspend:'subscriptions.control',resume:'subscriptions.control',end:'subscriptions.control',cancel:'subscriptions.control',correct:'subscriptions.advanced'};
export function authorizeAction(admin,action) { if(!ACTION_PERMISSIONS[action]||!permits(admin.perms,ACTION_PERMISSIONS[action]))fail('Action non autorisée.',403); }
const advanced=(admin)=>permits(admin.perms,'subscriptions.advanced');
const terminal=['resilie','termine','remplace','annule'];
const signKey=()=>crypto.createHash('sha256').update((process.env.ADMIN_JWT_SECRET||process.env.JWT_SECRET||'')+':subscription-preview').digest();
const hash=(text)=>crypto.createHash('sha256').update(text).digest('hex');
function signedPreview(payload) { const text=Buffer.from(JSON.stringify(payload)).toString('base64url'); return `${text}.${crypto.createHmac('sha256',signKey()).update(text).digest('base64url')}`; }
function readPreview(token) {
  if(typeof token!=='string'||token.length>200000)fail('Aperçu invalide.',400);
  const [text,signature]=token.split('.'); const expected=crypto.createHmac('sha256',signKey()).update(text||'').digest('base64url');
  if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))fail('Aperçu invalide.',400);
  try{return JSON.parse(Buffer.from(text,'base64url').toString());}catch{fail('Aperçu invalide.',400);}
}
export function proposeSubscription(context,input,admin,now=Date.now()) {
  authorizeAction(admin,input.action);
  const reason=String(input.reason||'').trim(); if(reason.length<5||reason.length>1000)fail('Un motif de 5 à 1000 caractères est requis.');
  const before=context.rows; const rows=JSON.parse(JSON.stringify(before)); const state=describeSubscriptions(rows,now);
  const target=rows.find((r)=>r.id===input.subscriptionId)||rows.find((r)=>r.id===(state.effective||state.tracked)?.id);
  const issues=migrationIssues(before,now);
  if((issues.overlaps.length||issues.invalidDates.length||issues.legacyFuture.length)&&!['correct','end','cancel'].includes(input.action))fail('Ce dossier nécessite une revue des périodes existantes avant cette action.',409,'SUBSCRIPTION_REVIEW');
  if(issues.overlaps.length&&!advanced(admin))fail('Une correction avancée est nécessaire pour ce dossier.',403);
  const zone=context.timezone; const start=input.startLocal?localInstant(input.startLocal,zone):new Date(now).toISOString();
  if(input.startLocal&&instant(start)<now)fail('Le début doit être maintenant ou dans le futur.');
  const exception=String(input.exceptionReason||'').trim();
  const requireException=()=>{if(!advanced(admin))fail('Une permission avancée est requise.',403);if(exception.length<5)fail('Un motif de dérogation distinct est requis (5 caractères min.).');};
  const modify=(row,patch)=>Object.assign(row,patch,{version:(row.version||1)+1,workflow_version:1});
  let subject=target;
  function create(planCode,from,{trial=false,replaces=null,previousEnd=null}={}) {
    const plan=context.plans.find((p)=>p.code===planCode);
    if(!plan||plan.archived||plan.code==='gratuit')fail('Choisis une formule non archivée ; Gratuit est l’accès de remplacement.');
    let ends;
    const anchor=zonedParts(from,zone).day;
    if(trial){
      if(!Number.isInteger(plan.trial_days)||plan.trial_days<1)fail('Cette formule ne propose pas d’essai.');
      if(before.some((r)=>(r.is_trial||r.status==='essai')&&r.plan_code.replace(/_annuel$/,'')===plan.code.replace(/_annuel$/,'')))requireException();
      ends=addCalendar(from,plan.trial_days,'days',anchor,zone);
    } else if(input.unlimited===true){requireException();if(input.confirmUnlimited!==true)fail('Confirme explicitement l’accès sans échéance.');ends=null;}
    else if(input.customDays!==undefined&&input.customDays!==null&&input.customDays!=='')ends=addCalendar(from,Number(input.customDays),'days',anchor,zone);
    else {if(!['mensuel','annuel'].includes(plan.period))fail('Choisis une durée personnalisée pour cette formule.');const periods=Number(input.periods??1);if(!Number.isInteger(periods)||periods<1||periods>10)fail('Choisis de 1 à 10 périodes.');ends=addCalendar(from,periods*(plan.period==='annuel'?12:1),'months',anchor,zone);}
    const row={id:crypto.randomUUID(),user_id:context.user.id,plan_code:plan.code,plan_name:plan.name,period:plan.period,status:trial?'essai':'actif',started_at:from,ends_at:ends,auto_renew:false,is_trial:trial,anchor_day:anchor,timezone:zone,version:1,workflow_version:1,replaced_by:null,metadata:replaces?{replaces,previousEnd}: {}};
    rows.push(row); subject=row; return row;
  }
  switch(input.action){
    case 'assign': case 'trial': {
      if(state.effective||rows.some((r)=>isReserved(r)&&instant(r.started_at)<=now&&instant(r.ends_at)>now))fail('Un accès est déjà suivi. Utilise Renouveler ou Changer de formule.',409);
      create(input.planCode,start,{trial:input.action==='trial'}); break;
    }
    case 'renew': {
      if(!target||terminal.includes(target.status))fail('Choisis une période active ou expirée à renouveler.');
      if(target.ends_at&&instant(target.ends_at)<=now){create(target.plan_code,start);break;}
      if(target.status==='suspendu'||target.status==='en_retard')fail('Reprends ou régularise cette période avant de la renouveler.');
      if(target.is_trial||target.status==='essai')fail('Pour convertir un essai, utilise Changer de formule.');
      if(!target.ends_at)fail('Cet accès n’a pas d’échéance à prolonger.');
      if(input.unlimited||input.customDays)fail('Le renouvellement utilise des périodes standards ; utilise la correction avancée pour une exception.');
      const periods=Number(input.periods??1); if(!Number.isInteger(periods)||periods<1||periods>10)fail('Choisis de 1 à 10 périodes.');
      const plan=context.plans.find((p)=>p.code===target.plan_code); if(!plan||plan.archived)fail('Cette formule est archivée ; choisis une nouvelle formule.');
      if(!['mensuel','annuel'].includes(plan.period))fail('Une correction avancée est requise pour cette période particulière.');
      modify(target,{ends_at:addCalendar(target.ends_at,periods*(plan.period==='annuel'?12:1),'months',target.anchor_day||zonedParts(target.started_at,target.timezone).day,target.timezone)});break;
    }
    case 'change': {
      if(!target||!isReserved(target)||instant(target.started_at)>now||instant(target.ends_at)<=now)fail('Aucune période courante à remplacer. Utilise Attribuer.');
      let from=new Date(now).toISOString();
      if(input.when==='end'){if(!target.ends_at)fail('Cet accès est sans échéance. Choisis maintenant ou une date avancée.');from=new Date(target.ends_at).toISOString();}
      else if(input.when==='date'){requireException();if(!input.startLocal)fail('Choisis une date future.');from=start;}
      const previousEnd=target.ends_at;
      const added=create(input.planCode,from,{replaces:target.id,previousEnd});
      modify(target,{ends_at:from,replaced_by:added.id,is_trial:target.is_trial||target.status==='essai',...(instant(from)<=now?{status:'remplace'}:{})});break;
    }
    case 'suspend': {
      if(!target||!['actif','essai'].includes(target.status)||instant(target.started_at)>now||instant(target.ends_at)<=now)fail('Seul un accès en cours peut être suspendu.');
      modify(target,{status:'suspendu',is_trial:target.is_trial||target.status==='essai'});break;
    }
    case 'resume': {
      if(!target||!['suspendu','en_retard'].includes(target.status)||instant(target.started_at)>now||instant(target.ends_at)<=now)fail('Cette période n’est pas suspendue ou est expirée ; renouvelle-la si nécessaire.');
      if(target.status==='en_retard')requireException();
      modify(target,{status:target.is_trial?'essai':'actif'});break;
    }
    case 'end': {
      if(!target||!isReserved(target)||instant(target.started_at)>now||instant(target.ends_at)<=now)fail('Aucune période courante à terminer.');
      if(state.upcoming.length&&!['keep','cancel'].includes(input.futureDisposition))fail('Choisis explicitement si les activations futures sont conservées ou annulées.');
      modify(target,{status:'termine',ends_at:new Date(now).toISOString(),is_trial:target.is_trial||target.status==='essai'});
      if(input.futureDisposition==='cancel')for(const future of state.upcoming)modify(rows.find((r)=>r.id===future.id),{status:'annule'});break;
    }
    case 'cancel': {
      if(!target||!isReserved(target)||instant(target.started_at)<=now)fail('Seule une activation future peut être annulée.');
      modify(target,{status:'annule'});
      const prior=rows.find((r)=>r.replaced_by===target.id);
      if(prior&&target.metadata?.replaces===prior.id)modify(prior,{ends_at:target.metadata.previousEnd||null,replaced_by:null});break;
    }
    case 'correct': {
      if(!target)fail('Période introuvable.'); requireException();
      const from=localInstant(input.correctStartLocal,zone);const end=input.correctEndLocal?localInstant(input.correctEndLocal,zone):null;
      if(!end&&input.confirmUnlimited!==true)fail('Confirme explicitement la correction sans échéance.');
      if(instant(end)<=instant(from))fail('La fin doit être après le début.');
      modify(target,{started_at:from,ends_at:end,timezone:zone,anchor_day:zonedParts(from,zone).day});break;
    }
    default:fail('Action inconnue.');
  }
  const overlap=overlappingPeriods(rows);const introduced=overlap.filter((pair)=>!issues.overlaps.includes(pair));
  if(overlap.length&&(input.action!=='correct'||introduced.length||overlap.length>=issues.overlaps.length))fail('Cette opération ferait chevaucher des périodes. Examine la prochaine activation ou corrige les dates.',409,'SUBSCRIPTION_OVERLAP');
  const changed=rows.filter((r)=>!before.some((old)=>old.id===r.id&&JSON.stringify(old)===JSON.stringify(r)));
  if(changed.some((r)=>instant(r.ends_at)<=instant(r.started_at)&&!terminal.includes(r.status)))fail('La fin doit être après le début.');
  return {rows,changed,subjectId:subject?.id,reason,exception,action:input.action};
}
async function dossierFromContext(c,context) {
  const state=describeSubscriptions(context.rows);
  const events=(await c.query('select id,subscription_id,action,admin_name,reason,payment_reference,before,after,created_at from subscription_events where user_id=$1 order by id desc limit 50',[context.user.id])).rows;
  return {user:context.user,...state,rows:context.rows.map((r)=>({...r,state:describeSubscriptions([r]).tracked?.state||'termine'})),plans:context.plans,revision:context.revision,timezone:context.timezone,usage:context.usage,overrides:context.overrides,events,entitlements:await computeEntitlements(c,context.user.id,{rows:context.rows})};
}
export async function subscriptionDossier(c,userId){return dossierFromContext(c,await subscriptionContext(c,userId));}
async function validateRequest(c,requestId,userId,proposal){
  if(!requestId)return null;
  const request=(await c.query('select * from subscription_requests where id=$1 for update',[requestId])).rows[0];
  if(!request||request.user_id!==userId||!['nouveau','en_cours'].includes(request.status))fail('Cette demande n’est plus ouverte pour cet utilisateur.',409);
  const subject=proposal.rows.find((r)=>r.id===proposal.subjectId);
  if(subject?.plan_code!==request.plan_code||(request.kind==='renew'&&proposal.action!=='renew')||(request.kind==='assign'&&!['assign','trial','change'].includes(proposal.action)))fail('L’opération doit correspondre à l’offre et au type de demande.');
  return request;
}
export async function previewSubscription(userId,input,admin) {
  return withTransaction(async(c)=>{
    const context=await subscriptionContext(c,userId); const now=Date.now(); const proposal=proposeSubscription(context,input,admin,now);
    const request=await validateRequest(c,input.requestId,userId,proposal);
    if(input.paymentReference!=null&&typeof input.paymentReference!=='string')fail('La référence de paiement doit être un texte.');
    const paymentReference=String(input.paymentReference||'').trim();
    if(paymentReference.length>120||[...paymentReference].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127))fail('La référence de paiement doit contenir au maximum 120 caractères, sur une seule ligne.');
    if(paymentReference&&!request)fail('La référence de paiement doit être associée au traitement d’une demande.');
    const before=await computeEntitlements(c,userId,{rows:context.rows,now});
    const subject=proposal.rows.find((r)=>r.id===proposal.subjectId);
    const comparisonAt=Math.max(now,instant(subject?.started_at)||now);
    const after=await computeEntitlements(c,userId,{rows:proposal.rows,now:comparisonAt});
    const transitions=[describeSubscriptions(context.rows,now).nextTransition,...context.overrides.map((o)=>o.expires_at)].filter((v)=>v&&instant(v)>now).map(instant);
    const expiresAt=Math.min(now+300000,...transitions);
    return {paymentReference:paymentReference||null,comparisonAt:new Date(comparisonAt).toISOString(),before:before.subscription,after:after.subscription,changed:proposal.changed,featuresBefore:before.features,featuresAfter:after.features,usage:context.usage,timezone:context.timezone,
      labels:Object.fromEntries(context.features.map((f)=>[f.feature_code,f.label])),
      warnings:[...(context.user.status==='suspendu'?['Le compte est suspendu : l’abonnement ne réactive pas le compte.']:[]),...(proposal.changed.some((r)=>!r.ends_at)?['Cet accès est sans échéance.']:[])],request,
      token:signedPreview({userId,adminId:admin.id,revision:context.revision,proposal:{...proposal,rows:undefined},paymentReference:paymentReference||null,requestId:request?.id,requestVersion:request?.version,expiresAt})};
  });
}
const uuid=(value)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export async function commitSubscription(userId,{token,operationId},req,res) {
  if(!uuid(userId)||!uuid(operationId))fail('Identifiant d’opération invalide.');
  const parsed=readPreview(token); if(parsed.userId!==userId||parsed.adminId!==req.admin.id)fail('Cet aperçu ne correspond pas à cette session.',403);
  authorizeAction(req.admin,parsed.proposal.action);
  return withTransaction(async(c)=>{
    await c.query('select id from users where id=$1 for update',[userId]);
    const prior=(await c.query('select * from subscription_operations where user_id=$1 and operation_id=$2',[userId,operationId])).rows[0];
    if(prior){if(prior.admin_id!==req.admin.id||prior.token_hash!==hash(token))fail('Identifiant d’opération déjà utilisé.',409);return prior.response;}
    if(Date.now()>=parsed.expiresAt)fail('L’aperçu a expiré ou une échéance est atteinte. Recharge-le avant de confirmer.',409,'SUBSCRIPTION_STALE');
    const context=await subscriptionContext(c,userId);
    if(context.revision!==parsed.revision)fail('Le dossier ou les droits ont changé. Vérifie un nouvel aperçu.',409,'SUBSCRIPTION_STALE');
    if(parsed.proposal.exception&&!advanced(req.admin))fail('La permission avancée a changé.',403);
    parsed.proposal.rows=[...context.rows.filter((row)=>!parsed.proposal.changed.some((changed)=>changed.id===row.id)),...parsed.proposal.changed];
    const request=await validateRequest(c,parsed.requestId,userId,parsed.proposal);
    if(request&&request.version!==parsed.requestVersion)fail('La demande a changé. Recharge l’aperçu.',409);
    const proposal=parsed.proposal;
    for(const row of proposal.changed){
      const columns=['status','started_at','ends_at','anchor_day','timezone','is_trial','replaced_by','metadata','version','workflow_version'];
      if(context.rows.some((r)=>r.id===row.id))await c.query(`update subscriptions set ${columns.map((key,i)=>`${key}=$${i+2}`).join(',')} where id=$1 and user_id=$12`,[row.id,...columns.map((key)=>key==='metadata'?JSON.stringify(row[key]):row[key]),userId]);
      else await c.query(`insert into subscriptions (id,user_id,plan_code,${columns.join(',')}) values (${Array.from({length:13},(_,i)=>'$'+(i+1)).join(',')})`,[row.id,userId,row.plan_code,...columns.map((key)=>key==='metadata'?JSON.stringify(row[key]):row[key])]);
    }
    await c.query('insert into subscription_events (user_id,subscription_id,action,admin_id,admin_name,reason,before,after,payment_reference) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[userId,proposal.subjectId,proposal.action,req.admin.id,req.admin.name||req.admin.email,proposal.reason+(proposal.exception?` — Dérogation : ${proposal.exception}`:''),JSON.stringify(context.rows),JSON.stringify(proposal.rows),parsed.paymentReference||null]);
    await audit(req,res,{action:`subscription.${proposal.action}`,targetType:'user',targetId:userId,before:context.rows,after:{periods:proposal.changed,requestId:request?.id||null,paymentReference:parsed.paymentReference||null},reason:proposal.reason},c);
    if(request)await c.query("update subscription_requests set status='traite',assigned_to=$2,payment_reference=$3,public_reply='Votre demande a été traitée. Consultez votre accès actuel.',version=version+1,updated_at=now() where id=$1",[request.id,req.admin.id,parsed.paymentReference||null]);
    const subject=proposal.rows.find((r)=>r.id===proposal.subjectId);
    const immediate=subject&&['assign','trial','change'].includes(proposal.action)&&instant(subject.started_at)<=Date.now();
    const key=immediate?`activation:${subject.id}:${new Date(subject.started_at).toISOString()}`:`operation:${operationId}`;
    const titles={assign:'Votre abonnement a été accordé',trial:'Votre essai a été accordé',renew:'Votre abonnement a été renouvelé',change:'Votre changement de formule est enregistré',suspend:'Votre abonnement est suspendu',resume:'Votre abonnement a repris',end:'Votre période d’accès a été arrêtée',cancel:'Votre activation prévue a été annulée',correct:'Les dates de votre abonnement ont été corrigées'};
    await c.query('insert into subscription_notifications (user_id,subscription_id,event_key,title,body) values ($1,$2,$3,$4,$5) on conflict(event_key) do nothing',[userId,subject?.id||null,key,titles[proposal.action],'Consultez Formule et abonnement pour retrouver vos droits et vos prochaines échéances.']);
    const response=await subscriptionDossier(c,userId);
    await c.query('insert into subscription_operations (user_id,operation_id,admin_id,token_hash,response) values ($1,$2,$3,$4,$5)',[userId,operationId,req.admin.id,hash(token),JSON.stringify(response)]);
    return response;
  });
}
