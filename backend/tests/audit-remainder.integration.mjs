// Run only against a disposable database, never against the application's database.
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { ensureSchema } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { withClient } from '../api/_lib/db.js';
import { signAdminToken } from '../api/_lib/admin-auth.js';
import { buildAdminRouter } from '../api/admin/router.js';
import { callOpenRouter } from '../api/_lib/ai.js';
import { reserveAiAttempt } from '../api/_lib/ai-usage.js';

assert.match(process.env.DATABASE_URL || '', /\/applika_qa(?:\?|$)/, 'A disposable applika_qa database is required');
assert(!process.env.SMTP_HOST && !process.env.VAPID_PUBLIC_KEY, 'External delivery must be disabled');
await ensureSchema(); await ensureSchema(); await seedAdminDefaults();
const query = async (sql, params) => (await withClient((c) => c.query(sql, params))).rows;
async function account(email, role) {
  const a = (await query("insert into admin_users (email,name,password_hash,role_code) values ($1,$1,'test-only',$2) returning id", [email, role]))[0];
  const sid = (await query("insert into admin_sessions (admin_id,expires_at) values ($1,now()+interval '1 hour') returning id", [a.id]))[0].id;
  return { id: a.id, cookie: `admin_session=${await signAdminToken(a.id, sid)}` };
}
const tag = Date.now(); const root = await account(`root-${tag}@example.invalid`, 'super_admin'); const support = await account(`support-${tag}@example.invalid`, 'support'); const analyst = await account(`analyst-${tag}@example.invalid`, 'analyst');
const app = express(); app.use(cookieParser()); app.use(express.json()); app.use('/api/admin', buildAdminRouter());
const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/api/admin`;
async function call(path, { method = 'GET', body, cookie = root.cookie } = {}) {
  const response = await fetch(base + path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, json: await response.json(), headers: response.headers };
}
try {
  const marker = `QA-${tag}`;
  await query("insert into directory_clinics (name,country,status) values ($1,'FR','valide'),($1,'FR','valide'),($1,'FR','a_valider'),($1,'MG','archive')", [marker]);
  const filter = { q: marker, country: 'FR', status: 'valide' };
  const countsPath = '/r/clinics/counts?' + new URLSearchParams({ filter: JSON.stringify(filter) });
  const counts = await call(countsPath); assert.equal(counts.status, 200);
  assert.deepEqual(counts.json, { total: 3, counts: { valide: 2, a_valider: 1 } });
  const rows = await call('/r/clinics?' + new URLSearchParams({ filter: JSON.stringify(filter) })); assert.equal(rows.json.length, 2);
  assert.equal((await call(countsPath, { cookie: '' })).status, 401);
  assert.equal((await call(countsPath, { cookie: analyst.cookie })).status, 403);
  assert.equal((await call('/r/clinics/counts?field=sql')).status, 400);
  console.log('PASS status counts share list filters, omit selected status, and enforce permissions');

  const catalog = await call('/plan-catalog'); assert.equal(catalog.status, 200);
  assert.equal(catalog.json.offers.flatMap((o) => [o.monthly,o.annual,o.oneTime,o.other].filter(Boolean)).length, catalog.json.variantCount);
  assert(catalog.json.offers.find((o) => o.code === 'premium').discount.savings > 0);
  assert.equal((await call('/plan-catalog', { cookie: analyst.cookie })).status, 403);
  console.log('PASS plan catalogue groups all variants with annual discounts');

  const code = `Féline-${tag}`;
  assert.equal((await call('/r/species', { method:'POST', body: { code, label: marker, status: 'actif' } })).status, 201);
  const user = (await query('insert into users (email) values ($1) returning id', [`species-${tag}@example.invalid`]))[0];
  await query("insert into pets (user_id,local_id,name,species) values ($1,1,'QA1',$2),($1,2,'QA2',$2)", [user.id,code]);
  const path = '/r/species/' + encodeURIComponent(code);
  assert.equal((await call(path+'/usage')).json.animals, 2);
  const blocked = await call(path, { method:'PUT', body:{status:'archive'} }); assert.equal(blocked.status, 409); assert.equal(blocked.json.animals, 2);
  assert.equal((await call(path)).json.status, 'actif');
  assert.equal((await call(path, { method:'PUT', body:{status:'archive',confirmArchive:'true'} })).status, 409);
  assert.equal((await call(path, { method:'PUT', body:{status:'archive',confirmArchive:true} })).status, 200);
  assert.equal((await call(path, { method:'PUT', body:{label:marker+' modifié'} })).status, 200);
  assert.equal((await call(path+'/usage')).json.animals, 2);
  assert.equal((await query('select count(*)::int n from pets where species=$1', [code]))[0].n, 2);
  assert.equal((await call(path+'/usage', { cookie: analyst.cookie })).status, 403);
  const audit = (await query("select reason from admin_audit_log where target_type='species' and target_id=$1 and reason is not null", [code]))[0]; assert.match(audit.reason, /2 animal/);
  console.log('PASS species archiving requires explicit confirmation, preserves animals and records the warning');

  assert.equal((await call('/ai-settings/usage')).json.minute.used, 0);
  assert.equal((await call('/ai-settings/usage', { cookie:support.cookie })).status, 403);
  const longPrompt = { enabled:false, systemPrompt:'a'.repeat(4001), reason:'Test de validation' };
  assert.equal((await call('/ai-settings', { method:'PUT', body:longPrompt })).status, 400);
  assert.equal((await call('/ai-settings/test', { method:'POST', body:longPrompt })).status, 400);
  const privateText = 'PRIVATE-CONVERSATION-MUST-NOT-BE-LOGGED';
  const messages = [{role:'user',content:privateText}];
  const reply = await callOpenRouter({apiKey:'test-only',model:'qa-model',messages,source:'admin',fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:'Réponse de test'}}]}),{status:200})});
  assert.equal(reply, 'Réponse de test');
  await assert.rejects(callOpenRouter({apiKey:'test-only',model:'qa-model',messages,fetchImpl:async()=>new Response(JSON.stringify({error:{message:'Temporary failure'}}),{status:503})}),{status:503});
  await assert.rejects(callOpenRouter({apiKey:'test-only',model:'qa-model',messages,timeoutMs:5,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Timeout test'))))}), /Timeout test/);
  const usage = (await call('/ai-settings/usage')).json;
  assert.deepEqual(usage.day, {attempts:3,success:1,errors:2,pending:0}); assert.equal(usage.minute.used,3);
  assert.equal((await query("select count(*)::int n from ai_usage_log where source='admin'"))[0].n,1);
  assert(!JSON.stringify(await query('select * from ai_usage_log')).includes(privateText));
  console.log('PASS real AI attempts, successes, failures and timeouts tracked without conversation content');

  await query('delete from ai_usage_log');
  const attempts = await Promise.allSettled(Array.from({length:16},(_,i)=>reserveAiAttempt({source:i%2?'admin':'chat',model:'qa-concurrency'})));
  assert.equal(attempts.filter((a)=>a.status==='fulfilled').length,15);
  const refusal = attempts.find((a)=>a.status==='rejected'); assert.equal(refusal.reason.status,429); assert(refusal.reason.retryAfter>0);
  const full = (await call('/ai-settings/usage')).json; assert.equal(full.minute.used,15); assert.equal(full.minute.remaining,0);
  await query("update ai_usage_log set created_at=now()-interval '61 seconds' where id in (select id from ai_usage_log order by id limit 13)");
  await reserveAiAttempt({source:'admin',model:'after-expiry'}); assert.equal((await call('/ai-settings/usage')).json.minute.used,3);
  await query("insert into ai_usage_log (source,model,created_at) values ('chat','old-entry',now()-interval '31 days')");
  await reserveAiAttempt({source:'chat',model:'prune'}); assert.equal((await query("select count(*)::int n from ai_usage_log where model='old-entry'"))[0].n,0);
  console.log('PASS concurrent chat/admin requests share a durable rolling limit, expire and prune correctly');
  server.close(); process.exit(0);
} catch(error) { console.error(error); server.close(); process.exit(1); }
