import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import webpush from 'web-push';
import { withClient, withTransaction } from '../api/_lib/db.js';
import { ensureSchema } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { signSessionToken } from '../api/_lib/auth.js';
import { signAdminToken } from '../api/_lib/admin-auth.js';
import { buildMySubscriptionRouter } from '../api/me/subscription.js';
import { buildAdminRouter } from '../api/admin/router.js';
import support, { mySupportRequests, replyToMySupportRequest } from '../api/support.js';
import { buildNotificationRouter, runInboxPush } from '../api/_lib/notification-router.js';
import { realtimeHandler,startRealtime,stopRealtime } from '../api/_lib/realtime.js';
let count=0;const test=async(name,fn)=>{await fn();console.log('OK',name);count++;};
const sql=(text,params=[])=>withClient(c=>c.query(text,params));
await ensureSchema();await ensureSchema();await seedAdminDefaults();
const user=async()=>{const row=(await sql("insert into users(email,password_hash) values($1,'x') returning id",[crypto.randomUUID()+'@test.local'])).rows[0];return {...row,cookie:'applika_session='+await signSessionToken(row.id,'qa@test.local')};};
const admin=async role=>{const a=(await sql("insert into admin_users(email,name,password_hash,role_code) values($1,'Realtime QA','x',$2) returning id",[crypto.randomUUID()+'@test.local',role])).rows[0];const session=(await sql("insert into admin_sessions(admin_id,expires_at) values($1,now()+interval '1 hour') returning id",[a.id])).rows[0];return {...a,cookie:'admin_session='+await signAdminToken(a.id,session.id),sid:session.id};};
const u=await user(),v=await user(),a=await admin('support'),reader=await admin('analyst');
const app=express();app.use(cookieParser());app.use(express.json());app.use('/api/admin',buildAdminRouter());app.post('/api/support',support);app.get('/api/me/support-requests',mySupportRequests);app.post('/api/me/support-requests/:id/replies',replyToMySupportRequest);app.use('/api/me/notifications',buildNotificationRouter('user'));app.get('/api/me/events',realtimeHandler('user'));app.use('/api/me/subscription',buildMySubscriptionRouter());
const server=app.listen(0);const base='http://127.0.0.1:'+server.address().port;startRealtime();
const call=async(path,actor=u,{method='GET',body}={})=>{const r=await fetch(base+path,{method,headers:{cookie:actor?.cookie||'','content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,json:await r.json()};};
const streams=[];
async function stream(path,actor,since){const controller=new AbortController();const response=await fetch(base+path+(since?'?since='+since:''),{headers:{cookie:actor.cookie},signal:controller.signal});assert.equal(response.status,200);const reader=response.body.getReader();const events=[];let buffer='';const task=(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=new TextDecoder().decode(value);let at;while((at=buffer.indexOf('\n\n'))>=0){const raw=buffer.slice(0,at);buffer=buffer.slice(at+2);const type=/event: (.*)/.exec(raw)?.[1],id=/^id: (.*)/m.exec(raw)?.[1];if(type)events.push({type,id,data:JSON.parse(/data: (.*)/.exec(raw)?.[1]||'{}')});}}}catch(e){if(e.name!=='AbortError')throw e;}})();const s={events,stop:async()=>{controller.abort();await task;}};streams.push(s);return s;}
async function until(fn,message){const end=Date.now()+5000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw new Error(message);}
let requestId;
await test('authentication isolates admin and user live/inbox routes',async()=>{
 assert.equal((await call('/api/me/notifications',null)).status,401);assert.equal((await call('/api/admin/notifications',u)).status,401);assert.equal((await call('/api/me/notifications',a)).status,401);
});
const us=await stream('/api/me/events',u),vs=await stream('/api/me/events',v),as=await stream('/api/admin/events',a),rs=await stream('/api/admin/events',reader);
await test('committed requests notify authorized admins and their owner in realtime',async()=>{
 requestId=(await sql("insert into subscription_requests(user_id,kind,plan_code) values($1,'assign','premium') returning id",[u.id])).rows[0].id;
 await until(()=>us.events.some(e=>e.type==='change'&&e.data.resource==='subscription-requests'&&e.data.id===requestId),'missing user event');
 await until(()=>as.events.some(e=>e.type==='change'&&e.data.resource==='subscription-requests'&&e.data.id===requestId),'missing admin event');
 assert.ok(!vs.events.some(e=>e.data.id===requestId));assert.ok(!rs.events.some(e=>e.data.id===requestId));
 const own=await call('/api/me/notifications');assert.equal(own.json.unread,1);assert.equal(own.json.rows[0].title,'Votre demande a été reçue');
 assert.ok((await call('/api/admin/notifications',a)).json.rows.some(r=>r.title==='Nouvelle demande d’abonnement'));assert.equal((await call('/api/admin/notifications',reader)).json.rows.length,0);
});
await test('rollback produces neither notification nor live event',async()=>{
 const id=crypto.randomUUID();await assert.rejects(withTransaction(async c=>{await c.query("insert into subscription_requests(id,user_id,kind,plan_code) values($1,$2,'assign','eleveur')",[id,u.id]);throw new Error('rollback');}));
 await new Promise(r=>setTimeout(r,150));assert.ok(!us.events.some(e=>e.data.id===id));assert.equal((await sql('select count(*)::int n from subscription_requests where id=$1',[id])).rows[0].n,0);
});
await test('take responsibility notifies user, without leaking private notes',async()=>{
 const r=await call('/api/admin/subscription-requests/'+requestId,a,{method:'PUT',body:{status:'en_cours',version:1,internalNote:'SECRET ADMIN'}});assert.equal(r.status,200);
 await until(()=>us.events.filter(e=>e.type==='change'&&e.data.resource==='subscription-requests'&&e.data.id===requestId).length>=2,'missing update');
 const inbox=(await call('/api/me/notifications')).json;assert.equal(inbox.unread,2);assert.ok(!JSON.stringify(inbox).includes('SECRET ADMIN'));assert.ok(!JSON.stringify(us.events).includes('SECRET ADMIN'));
});
await test('read state belongs to one recipient and is shared across devices',async()=>{
 const own=(await call('/api/me/notifications')).json.rows[0];
 await call('/api/me/notifications/read',v,{method:'POST',body:{id:own.id}});assert.equal((await call('/api/me/notifications')).json.unread,2);
 await call('/api/me/notifications/read',u,{method:'POST',body:{id:own.id}});assert.equal((await call('/api/me/notifications')).json.unread,1);
 const old=(await call('/api/me/notifications')).json.checkedAt;await new Promise(r=>setTimeout(r,20));await sql("insert into inbox_notifications(audience,recipient_id,event_key,title,body,href) values('user',$1,$2,'New','Body','/?account=plan')",[u.id,crypto.randomUUID()]);await call('/api/me/notifications/read',u,{method:'POST',body:{before:old}});assert.equal((await call('/api/me/notifications')).json.unread,1);
});
await test('legacy subscription notifications share their read state with the global inbox',async()=>{
 const key='test:'+crypto.randomUUID();const notice=(await sql("insert into subscription_notifications(user_id,event_key,title,body) values($1,$2,'Legacy','Body') returning id",[u.id,key])).rows[0];const row=(await sql("select id from inbox_notifications where recipient_id=$1 and event_key=$2",[u.id,'subscription:'+key])).rows[0];
 await call('/api/me/notifications/read',u,{method:'POST',body:{id:row.id}});assert.ok((await sql('select read_at from subscription_notifications where id=$1',[notice.id])).rows[0].read_at);
});
await test('simultaneous reads through old history and global inbox remain atomic',async()=>{
 const key='concurrent-read:'+crypto.randomUUID();const source=(await sql("insert into subscription_notifications(user_id,event_key,title,body) values($1,$2,'Read race','Body') returning id",[u.id,key])).rows[0];const row=(await sql('select id from inbox_notifications where recipient_id=$1 and event_key=$2',[u.id,'subscription:'+key])).rows[0];
 const results=await Promise.all([call('/api/me/notifications/read',u,{method:'POST',body:{id:row.id}}),call('/api/me/subscription/notifications/'+source.id+'/read',u,{method:'POST'})]);assert.deepEqual(results.map(r=>r.status),[200,200]);assert.ok((await sql('select read_at from subscription_notifications where id=$1',[source.id])).rows[0].read_at);assert.ok((await sql('select read_at from inbox_notifications where id=$1',[row.id])).rows[0].read_at);
});
await test('disconnected clients replay committed changes from their last cursor',async()=>{
 await until(()=>us.events.some(e=>e.type==='cursor'),'no cursor');const cursor=us.events.filter(e=>e.type==='cursor').at(-1).id;await us.stop();
 await sql("update subscription_requests set status='annule',version=version+1 where id=$1",[requestId]);
 const back=await stream('/api/me/events',u,cursor);await until(()=>back.events.some(e=>e.type==='change'&&e.data.id===requestId),'replay missing');await back.stop();
});
await test('support requests and replies update admin and user immediately without leaking to other accounts',async()=>{
 const supportStream=await stream('/api/me/events',u);
 const created=await call('/api/support',u,{method:'POST',body:{email:'owner@test.local',subject:'Question de support',description:'J’ai besoin d’une réponse dans mon compte.'}});assert.equal(created.status,201);
 const id=String(created.json.id);
 await until(()=>as.events.some(e=>e.type==='change'&&e.data.resource==='support-requests'&&e.data.id===id),'support admin event missing');
 assert.ok(!rs.events.some(e=>e.type==='change'&&e.data.resource==='support-requests'&&e.data.id===id));
 assert.ok((await call('/api/admin/support-requests',a)).json.rows.some(r=>String(r.id)===id&&r.account_linked));
 assert.ok((await call('/api/me/support-requests',u)).json.rows.some(r=>String(r.id)===id));
 assert.ok(!(await call('/api/me/support-requests',v)).json.rows.some(r=>String(r.id)===id));
 const answer=await call('/api/admin/support-requests/'+id+'/replies',a,{method:'POST',body:{body:'Nous avons corrigé votre problème.'}});assert.equal(answer.status,201);
 await until(()=>supportStream.events.filter(e=>e.type==='change'&&e.data.resource==='support-requests'&&e.data.id===id).length>=2,'support user reply event missing');
 const history=(await call('/api/me/support-requests',u)).json.rows.find(r=>String(r.id)===id);assert.equal(history.replies[0].body,'Nous avons corrigé votre problème.\n\n— Realtime QA\nL\'équipe App\'lika');
 assert.ok((await call('/api/me/notifications',u)).json.rows.some(r=>r.title.startsWith('Réponse du support')&&r.body.startsWith('Nous avons corrigé votre problème.')&&r.href.includes('request='+id)));
 assert.ok(!(await call('/api/me/notifications',v)).json.rows.some(r=>r.body.startsWith('Nous avons corrigé votre problème.')));
 const guest=await call('/api/support',null,{method:'POST',body:{email:'guest@test.local',subject:'Sans compte',description:'Une demande sans compte utilisateur.'}});assert.equal(guest.status,201);
 assert.equal((await call('/api/admin/support-requests/'+guest.json.id+'/replies',a,{method:'POST',body:{body:'Réponse privée'}})).status,409);
 const email=(await sql('select email from users where id=$1',[u.id])).rows[0].email;
 const legacy=await call('/api/support',null,{method:'POST',body:{email,subject:'Ancienne demande',description:'Une demande à rattacher au compte.'}});assert.equal(legacy.status,201);
 assert.ok((await call('/api/admin/support-requests',a)).json.rows.some(r=>String(r.id)===String(legacy.json.id)&&r.matching_account&&!r.account_linked));
 const linked=await call('/api/admin/support-requests/'+legacy.json.id+'/replies',a,{method:'POST',body:{body:'Réponse liée au compte'}});assert.equal(linked.status,201);
 assert.ok((await call('/api/me/support-requests',u)).json.rows.some(r=>String(r.id)===String(legacy.json.id)&&r.replies[0].body.startsWith('Réponse liée au compte\n\n— Realtime QA')));
 const follow=await call('/api/me/support-requests/'+id+'/replies',u,{method:'POST',body:{body:'Merci, c’est réglé.'}});assert.equal(follow.status,201);
 const thread=(await call('/api/me/support-requests',u)).json.rows.find(r=>String(r.id)===id);
 assert.ok(thread.replies.some(r=>r.author==='user'&&r.body==='Merci, c’est réglé.'));
 assert.equal((await call('/api/me/support-requests/'+id+'/replies',v,{method:'POST',body:{body:'Pas mon fil.'}})).status,404);
 assert.ok((await call('/api/admin/support-requests',a)).json.rows.some(r=>String(r.id)===id&&r.replies.some(reply=>reply.author==='user'&&reply.body==='Merci, c’est réglé.')));
});
await test('role removal immediately stops restricted event and inbox access',async()=>{
 await sql("update admin_users set role_code='analyst' where id=$1",[a.id]);const before=as.events.filter(e=>e.type==='change'&&e.data.resource==='subscription-requests').length;
 await sql("insert into subscription_requests(user_id,kind,plan_code) values($1,'assign','eleveur')",[v.id]);await new Promise(r=>setTimeout(r,250));assert.equal(as.events.filter(e=>e.type==='change'&&e.data.resource==='subscription-requests').length,before);assert.equal((await call('/api/admin/notifications',a)).json.rows.length,0);
});
await test('invalidated sessions terminate existing live connections',async()=>{
 await sql('update admin_sessions set revoked_at=now() where id=$1',[a.sid]);await sql("select publish_realtime('admin',null,'subscription','wake')");await until(()=>as.events.some(e=>e.type==='session-ended'),'revocation not applied');
});
await test('future or expired cursors reset without exposing unrelated events',async()=>{
 const reset=await stream('/api/me/events',v,'9999999999999999999');await until(()=>reset.events.some(e=>e.type==='ready'),'no ready');assert.equal(reset.events[0].data.reset,true);await reset.stop();
});
await test('push is optional, malformed subscriptions are rejected, and unconfigured providers are not called',async()=>{
 delete process.env.VAPID_PUBLIC_KEY;delete process.env.VAPID_PRIVATE_KEY;assert.equal((await call('/api/me/notifications/push',u,{method:'POST',body:{endpoint:'https://invalid.local'}})).status,409);let sent=0;await runInboxPush({send:async()=>sent++});assert.equal(sent,0);
});
await test('transaction ordering cannot skip an event committed after another writer',async()=>{
 let release,inserted;const ready=new Promise(r=>inserted=r);const gate=new Promise(r=>release=r);
 const first=withTransaction(async c=>{await c.query("select publish_realtime('user',$1,'subscription','first-ordered')",[v.id]);inserted();await gate;});await ready;
 let secondDone=false;const second=withTransaction(async c=>{await c.query("select publish_realtime('user',$1,'subscription','second-ordered')",[v.id]);secondDone=true;});
 await new Promise(r=>setTimeout(r,100));assert.equal(secondDone,false);release();await first;await second;
 await until(()=>vs.events.some(e=>e.data.id==='second-ordered'),'second event missing');const changes=vs.events.filter(e=>['first-ordered','second-ordered'].includes(e.data.id));assert.deepEqual(changes.map(e=>e.data.id),['first-ordered','second-ordered']);
});
await test('configured push honors roles, opts in per device and does not repeat ambiguous delivery',async()=>{
 const keys=webpush.generateVAPIDKeys();process.env.VAPID_PUBLIC_KEY=keys.publicKey;process.env.VAPID_PRIVATE_KEY=keys.privateKey;
 await sql("update inbox_notifications set push_status='unavailable' where push_status='pending'");
 const enabled=await admin('support');const endpoint='https://fcm.googleapis.com/fcm/send/qa-'+crypto.randomUUID();
 await sql('insert into admin_push_subscriptions(admin_id,endpoint,p256dh,auth) values($1,$2,$3,$4)',[enabled.id,endpoint,'x','y']);
 const add=async(key)=>sql("insert into inbox_notifications(audience,recipient_id,event_key,title,body,href,permission) values('admin',$1,$2,'Test','Body','/subscription-requests','subscriptions.read')",[enabled.id,key]);
 await add('push-'+crypto.randomUUID());let calls=0;await runInboxPush({send:async()=>{calls++;}});assert.equal(calls,1);await runInboxPush({send:async()=>{calls++;}});assert.equal(calls,1);
 await add('uncertain-'+crypto.randomUUID());await runInboxPush({send:async()=>{calls++;throw new Error('Timeout after possible acceptance');}});assert.equal(calls,2);await runInboxPush({send:async()=>{calls++;}});assert.equal(calls,2);
 await sql("update admin_users set role_code='analyst' where id=$1",[enabled.id]);await add('permission-'+crypto.randomUUID());await runInboxPush({send:async()=>{calls++;}});assert.equal(calls,2);
 assert.equal((await call('/api/me/notifications/push',u,{method:'POST',body:{endpoint:'https://127.0.0.1/private',keys:{p256dh:'x'.repeat(87),auth:'x'.repeat(22)}}})).status,400);
 delete process.env.VAPID_PUBLIC_KEY;delete process.env.VAPID_PRIVATE_KEY;
});
for(const s of streams)await s.stop();await stopRealtime();server.close();console.log(`${count} realtime checks passed`);process.exit(0);
