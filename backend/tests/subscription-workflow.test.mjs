import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import { addCalendar, localInstant, resolveSubscriptions, overlappingPeriods } from '../api/_lib/subscription-state.js';
import { proposeSubscription, previewSubscription, commitSubscription } from '../api/_lib/subscription-service.js';
import { subscriptionContext } from '../api/_lib/subscription-read.js';
import { computeEntitlements } from '../api/_lib/entitlements.js';
import { enqueueSubscriptionDeadlines, runSubscriptionNotifications } from '../api/_lib/subscription-notifications.js';
import { withClient } from '../api/_lib/db.js';
import { ensureSchema } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { signSessionToken } from '../api/_lib/auth.js';
import syncPull from '../api/sync/pull.js';
import { buildAdminRouter } from '../api/admin/router.js';
import { signAdminToken } from '../api/_lib/admin-auth.js';
import { buildMySubscriptionRouter } from '../api/me/subscription.js';
let passed=0;
const test=async(name,fn)=>{await fn();console.log('OK',name);passed++;};
const sql=(text,params=[])=>withClient(c=>c.query(text,params));
await test('calendar months preserve anchor, leap day and local time across DST',()=>{
 const feb=addCalendar('2027-01-31T12:30:00Z',1,'months',31);assert.equal(feb,'2027-02-28T12:30:00.000Z');assert.equal(addCalendar(feb,1,'months',31),'2027-03-31T12:30:00.000Z');
 assert.equal(addCalendar('2024-02-29T12:00:00Z',12,'months',29),'2025-02-28T12:00:00.000Z');
 assert.equal(addCalendar('2026-03-28T11:00:00Z',1,'days',28,'Europe/Paris'),'2026-03-29T10:00:00.000Z');
 assert.throws(()=>localInstant('2026-02-30T12:00')); assert.throws(()=>addCalendar(feb,-1,'months',31));
});
await test('future, suspended and expired periods grant no current access; touching boundaries are legal',()=>{
 const rows=[{id:'a',status:'actif',started_at:'2026-01-01',ends_at:'2026-02-01'},{id:'b',status:'actif',started_at:'2026-02-01',ends_at:null}];
 assert.equal(overlappingPeriods(rows).length,0);assert.equal(resolveSubscriptions(rows,Date.parse('2026-01-20')).effective.id,'a');assert.equal(resolveSubscriptions(rows,Date.parse('2026-02-01')).effective.id,'b');
 assert.equal(resolveSubscriptions([{...rows[1],status:'suspendu'}],Date.parse('2026-02-01')).effective,null);
 assert.equal(resolveSubscriptions(rows,Date.parse('2025-01-01')).effective,null);
});
await ensureSchema();await ensureSchema();await seedAdminDefaults();
const adminRow=(await sql("insert into admin_users(email,name,password_hash,role_code) values($1,'Subscription QA','x','super_admin') returning id,email,name",['subscriptions-'+crypto.randomUUID()+'@test.local'])).rows[0];
const admin={...adminRow,perms:['*']};const limited={...admin,perms:['subscriptions.read','subscriptions.manage','subscriptions.control']};
const newUser=async()=> (await sql("insert into users(email,name,password_hash,email_verified_at) values($1,'Subscription QA','x',now()) returning id",[crypto.randomUUID()+'@test.local'])).rows[0].id;
const uid=await newUser();const other=await newUser();
const context=id=>withClient(c=>subscriptionContext(c,id));
const commit=(id,preview,operationId=crypto.randomUUID(),actor=admin)=>commitSubscription(id,{token:preview.token,operationId},{admin:actor,headers:{},ip:'127.0.0.1'},{locals:{}});
const preview=(id,input,actor=admin)=>previewSubscription(id,{reason:'Validation métier de test',periods:1,...input},actor);
let period;
await test('preview is read-only; confirmation concurrent duplicate is idempotent',async()=>{
 const p=await preview(uid,{action:'assign',planCode:'premium'});assert.equal((await context(uid)).rows.length,0);
 const op=crypto.randomUUID();const [a,b]=await Promise.all([commit(uid,p,op),commit(uid,p,op)]);assert.equal(a.effective.id,b.effective.id);period=a.effective;
 assert.equal((await context(uid)).rows.length,1);assert.equal((await sql('select count(*)::int n from subscription_events where user_id=$1',[uid])).rows[0].n,1);
});
await test('stale preview, altered signatures and different actors are rejected',async()=>{
 const p=await preview(uid,{action:'renew'});const p2=await preview(uid,{action:'renew'});await commit(uid,p2);
 await assert.rejects(commit(uid,p),{status:409});await assert.rejects(commit(uid,{token:p.token+'tamper'}),{status:400});await assert.rejects(commit(uid,p,crypto.randomUUID(),{...admin,id:crypto.randomUUID()}),{status:403});
});
await test('renew retains remaining duration and anchor',async()=>{
 const before=(await context(uid)).rows[0];const out=await commit(uid,await preview(uid,{action:'renew',periods:2}));
 assert.equal(new Date(out.effective.ends_at).toISOString(),addCalendar(before.ends_at,2,'months',before.anchor_day,before.timezone));
});
await test('scheduled switch keeps current rights; cancellation restores prior expiry',async()=>{
 const before=(await context(uid)).rows[0];let out=await commit(uid,await preview(uid,{action:'change',planCode:'eleveur',when:'end'}));assert.equal(out.effective.plan_code,'premium');assert.equal(out.upcoming.length,1);
 const future=out.upcoming[0];await assert.rejects(preview(uid,{action:'renew'}),{status:409});
 out=await commit(uid,await preview(uid,{action:'cancel',subscriptionId:future.id}));assert.equal(out.upcoming.length,0);assert.equal(new Date(out.effective.ends_at).toISOString(),new Date(before.ends_at).toISOString());
});
await test('subscription suspension does not suspend account; resume restores current access',async()=>{
 let out=await commit(uid,await preview(uid,{action:'suspend'}));assert.equal(out.effective,null);assert.equal(out.tracked.state,'suspendu');assert.equal(out.user.status,'actif');
 out=await commit(uid,await preview(uid,{action:'resume'}));assert.equal(out.effective.plan_code,'premium');
});
await test('dedicated permissions, unlimited access and trial repeat require explicit exceptions',async()=>{
 await assert.rejects(preview(other,{action:'assign',planCode:'premium'},{...admin,perms:['subscriptions.read']}),{status:403});
 await assert.rejects(preview(other,{action:'assign',planCode:'premium',unlimited:true,confirmUnlimited:true,exceptionReason:'Cas spécial'},limited),{status:403});
 await assert.rejects(preview(other,{action:'assign',planCode:'premium',unlimited:true}),{status:400});
 const p=await preview(other,{action:'trial',planCode:'premium'});await commit(other,p);await commit(other,await preview(other,{action:'end'}));
 await assert.rejects(preview(other,{action:'trial',planCode:'premium'},limited),{status:403});
 await commit(other,await preview(other,{action:'assign',planCode:'premium',unlimited:true,confirmUnlimited:true,exceptionReason:'Accès partenaire validé'}));assert.equal((await context(other)).rows.at(-1).ends_at,null);
});
await test('future assignment changes access at boundary and bounds cache without worker',async()=>{
 const id=await newUser();const start=new Date(Date.now()+86400000).toISOString().slice(0,16);
 const p=await preview(id,{action:'assign',planCode:'premium',startLocal:start});const out=await commit(id,p);assert.equal(out.effective,null);assert.equal(out.upcoming.length,1);
 const row=out.upcoming[0];const e=await withClient(c=>computeEntitlements(c,id));assert.equal(e.plan,'gratuit');assert.equal(e.validUntil,new Date(row.started_at).toISOString());
 const active=await withClient(c=>computeEntitlements(c,id,{now:Date.parse(row.started_at)}));assert.equal(active.plan,'premium');const expired=await withClient(c=>computeEntitlements(c,id,{now:Date.parse(row.ends_at)}));assert.equal(expired.plan,'gratuit');
});
await test('legacy unlimited rows stay intact; overlaps demand explicit correction',async()=>{
 const c=await context(other);const before=JSON.stringify(c.rows);await context(other);assert.equal(JSON.stringify((await context(other)).rows),before);
 const pure={...c,rows:[{...period,id:'a',ends_at:null},{...period,id:'b',ends_at:null}]};assert.throws(()=>proposeSubscription(pure,{action:'renew',reason:'Test chevauchement'},admin),{status:409});
});
const app=express();app.use(cookieParser());app.use(express.json());app.use('/api/me/subscription',buildMySubscriptionRouter());app.use('/api/admin',buildAdminRouter());app.get('/api/sync/pull',syncPull);const server=app.listen(0);const base='http://127.0.0.1:'+server.address().port;
const customer=await newUser();const tok=await signSessionToken(customer,'test@test.local');const foreign=await signSessionToken(uid,'test@test.local');
const call=async(path,{method='GET',body,token=tok}={})=>{const r=await fetch(base+'/api/me/subscription'+path,{method,headers:{'content-type':'application/json',cookie:'applika_session='+token},body:body?JSON.stringify(body):undefined});return {status:r.status,json:await r.json()};};
let request;
await test('customer requests deduplicate, isolate ownership, and expose no internal notes',async()=>{
 const body={kind:'assign',planCode:'premium',comment:'Je souhaite découvrir cette formule'};
 const a=await call('/requests',{method:'POST',body});assert.equal(a.status,201,JSON.stringify(a));request=a.json;
 const b=await call('/requests',{method:'POST',body});assert.equal(a.json.id,b.json.id);
 assert.equal((await call('/requests/'+request.id+'/cancel',{method:'POST',token:foreign})).status,404);
 await sql("update subscription_requests set internal_note='INTERNE SECRET' where id=$1",[request.id]);assert.ok(!JSON.stringify((await call('')).json).includes('INTERNE SECRET'));
});
await test('request fulfilment and access grant are one transaction; stale requests cannot be fulfilled',async()=>{
 const p=await preview(customer,{action:'assign',planCode:'premium',requestId:request.id,paymentReference:' MV-STALE '});await sql('update subscription_requests set version=version+1 where id=$1',[request.id]);await assert.rejects(commit(customer,p),{status:409});assert.equal((await context(customer)).rows.length,0);
 const valid=await preview(customer,{action:'assign',planCode:'premium',requestId:request.id,paymentReference:'  MV-2026-001234  '});assert.equal(valid.paymentReference,'MV-2026-001234');
 const operation=crypto.randomUUID();await commit(customer,valid,operation);await commit(customer,valid,operation);
 const stored=(await sql('select status,payment_reference from subscription_requests where id=$1',[request.id])).rows[0];assert.equal(stored.status,'traite');assert.equal(stored.payment_reference,'MV-2026-001234');
 assert.equal((await sql('select payment_reference from subscription_events where user_id=$1',[customer])).rows[0].payment_reference,'MV-2026-001234');
 assert.equal((await sql("select after->>'paymentReference' as reference from admin_audit_log where target_id=$1 and action='subscription.assign'",[customer])).rows[0].reference,'MV-2026-001234');
 assert.ok(!JSON.stringify((await call('')).json).includes('MV-2026-001234'));
 assert.equal((await call('/requests/'+request.id+'/cancel',{method:'POST'})).status,409);
});
await test('payment references validate before writing and remain tied to a request',async()=>{
 const id=await newUser();const r=(await sql("insert into subscription_requests(user_id,kind,plan_code) values($1,'assign','premium') returning id",[id])).rows[0];
 for(const paymentReference of ['x'.repeat(121),'MV-123\nSECOND',123,{reference:'invalid'}])await assert.rejects(preview(id,{action:'assign',planCode:'premium',requestId:r.id,paymentReference}),{status:400});
 await assert.rejects(preview(id,{action:'assign',planCode:'premium',paymentReference:'MV-123'}),{status:400});
 assert.equal((await context(id)).rows.length,0);assert.equal((await sql('select payment_reference from subscription_requests where id=$1',[r.id])).rows[0].payment_reference,null);
 const p=await preview(id,{action:'assign',planCode:'premium',requestId:r.id,paymentReference:'   '});assert.equal(p.paymentReference,null);
});
await test('cancelled requests grant no access and cannot be processed',async()=>{
 const id=await newUser();const cancelled=(await sql("insert into subscription_requests(user_id,kind,plan_code,status) values($1,'assign','premium','annule') returning id",[id])).rows[0];await assert.rejects(preview(id,{action:'assign',planCode:'premium',requestId:cancelled.id}),{status:409});assert.equal((await context(id)).rows.length,0);
});
await test('deadline notifications deduplicate; optional providers are never called when unconfigured',async()=>{
 const current=(await context(uid)).rows.find(r=>r.id===period.id);const near=new Date(Date.parse(current.ends_at)-3600000);await withClient(c=>enqueueSubscriptionDeadlines(c,near));const first=(await sql('select count(*)::int n from subscription_notifications where user_id=$1',[uid])).rows[0].n;
 await withClient(c=>enqueueSubscriptionDeadlines(c,near));assert.equal((await sql('select count(*)::int n from subscription_notifications where user_id=$1',[uid])).rows[0].n,first);
 delete process.env.SMTP_HOST;delete process.env.VAPID_PUBLIC_KEY;let sent=0;await runSubscriptionNotifications({sendEmail:async()=>{sent++;},sendPush:async()=>{sent++;}});assert.equal(sent,0);
 const own=(await call('')).json.notifications[0];assert.ok(own);assert.equal((await call('/notifications/'+own.id+'/read',{method:'POST'})).status,200);assert.equal((await call('/notifications/'+own.id+'/read',{method:'POST',token:foreign})).status,404);
});
await test('HTTP admin closes raw writes, rejects reader mutations, and separates public refusals',async()=>{
 const session=(await sql("insert into admin_sessions(admin_id,expires_at) values($1,now()+interval '1 hour') returning id",[admin.id])).rows[0];
 const token=await signAdminToken(admin.id,session.id);
 const acall=async(method,path,body)=>{const r=await fetch(base+'/api/admin'+path,{method,headers:{'content-type':'application/json',cookie:'admin_session='+token},body:body?JSON.stringify(body):undefined});return {status:r.status,json:await r.json()};};
 assert.equal((await acall('POST','/r/subscriptions',{user_id:uid})).status,410);assert.equal((await acall('PUT','/r/subscriptions/'+period.id,{status:'actif'})).status,410);assert.equal((await acall('DELETE','/r/subscriptions/'+period.id)).status,410);
 const req=(await sql("insert into subscription_requests(user_id,kind,plan_code) values($1,'renew','premium') returning *",[customer])).rows[0];
 assert.equal((await acall('PUT','/subscription-requests/'+req.id,{status:'traite',version:req.version})).status,400);
 const taken=await acall('PUT','/subscription-requests/'+req.id,{status:'en_cours',version:req.version,internalNote:'Note privée'});assert.equal(taken.status,200);assert.equal(taken.json.assigned_to,admin.id);
 const refused=await acall('PUT','/subscription-requests/'+req.id,{status:'refuse',version:taken.json.version,publicReply:'La variante demandée nécessite un échange avec notre équipe.',internalNote:'Note privée'});assert.equal(refused.status,200);
 const own=await call('');assert.ok(JSON.stringify(own.json).includes('nécessite un échange'));assert.ok(!JSON.stringify(own.json).includes('Note privée'));
 await sql("update admin_users set role_code='admin_tech' where id=$1",[admin.id]);
 assert.equal((await acall('GET','/subscription-periods')).status,200);assert.equal((await acall('POST','/subscription-users/'+uid+'/preview',{action:'renew',reason:'Refus attendu'})).status,403);assert.equal((await acall('GET','/subscription-review')).status,403);
 await sql("update admin_users set role_code='super_admin' where id=$1",[admin.id]);
});
await test('two distinct confirmations on the same revision cannot both extend access',async()=>{
 const p=await preview(uid,{action:'renew'});const q=await preview(uid,{action:'renew'});const results=await Promise.allSettled([commit(uid,p),commit(uid,q)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
});
await test('ending access preserves existing pets and allows personal read/export',async()=>{
 await sql("insert into pets(user_id,local_id,name) values($1,901,'Carnet conservé'),($1,902,'Deuxième carnet')",[customer]);
 await commit(customer,await preview(customer,{action:'end'}));
 await sql("update app_settings set value='true' where key='subscriptions_enforced'");
 const response=await fetch(base+'/api/sync/pull',{headers:{cookie:'applika_session='+tok}});assert.equal(response.status,200);const data=await response.json();assert.ok(JSON.stringify(data).includes('Carnet conservé'));assert.equal((await sql('select count(*)::int n from pets where user_id=$1',[customer])).rows[0].n,2);
});
await test('configured opted-in email is sent once, using an injected provider',async()=>{
 await sql(`update users set preferences='{"notifications":{"email":true,"push":false}}' where id=$1`,[customer]);
 await sql("insert into subscription_notifications(user_id,event_key,title,body) values($1,$2,'Test','Échéance de test')",[customer,crypto.randomUUID()]);
 process.env.SMTP_HOST='injected-test-provider';let sent=0;const fake=async()=>{sent++;return {delivered:true};};await runSubscriptionNotifications({sendEmail:fake});assert.ok(sent>=1);const first=sent;await runSubscriptionNotifications({sendEmail:fake});assert.equal(sent,first);delete process.env.SMTP_HOST;
});
server.close();console.log(`${passed} subscription checks passed`);process.exit(0);
