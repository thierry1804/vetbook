// Run only against a disposable database, never against the application's database.
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { ensureSchema } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { withClient } from '../api/_lib/db.js';
import { signAdminToken } from '../api/_lib/admin-auth.js';
import { buildAdminRouter } from '../api/admin/router.js';
import { sendMail } from '../api/_lib/mailer.js';

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
  assert.equal((await call('/work-queue', { cookie: '' })).status, 401);
  await query("insert into message_log (channel,status,created_at) values ('email','echec',now()), ('email','echec',now()-interval '9 days')");
  const queue = await call('/work-queue'); assert.equal(queue.status, 200); assert(queue.json.items.length >= 8);
  const failedMail = queue.json.items.find((item) => item.key === 'messages');
  const filteredMail = await call('/r' + failedMail.to); assert.equal(filteredMail.status, 200);
  assert.equal(filteredMail.json.length, failedMail.count); assert(filteredMail.json.every((row) => row.status === 'echec'));
  const limited = await call('/work-queue', { cookie: analyst.cookie }); assert.equal(limited.status, 200);
  assert(!limited.json.items.some((item) => ['subscriptions','releases'].includes(item.key)));
  console.log('PASS authenticated work queue, permission filtering and exact filtered counts');

  const flag = await call('/r/flags', { method: 'POST', body: { key: `qa-${tag}`, enabled: true, note: 'Historique' } }); assert.equal(flag.status, 201);
  const history = await call(`/record-history/flags/${flag.json.id}`); assert.equal(history.status, 200); assert.equal(history.json[0].action, 'flags.create');
  assert.equal((await call(`/record-history/flags/${flag.json.id}`, { cookie: support.cookie })).status, 403);
  console.log('PASS scoped record history and access control');

  await query("insert into app_settings (key,value) values ('four_eyes_publish','true') on conflict (key) do update set value='true'");
  const draft = (await query("insert into ref_releases (status,content,created_by) values ('draft',$1,$2) returning version", [JSON.stringify({ tips: [{ id: 17, title: 'Conseil de test' }] }), root.id]))[0];
  let comparison = await call(`/releases/${draft.version}/comparison`); assert.equal(comparison.status, 200); assert.equal(comparison.json.canPublish, false); assert.equal(comparison.json.ownDraft, true);
  await query("insert into app_settings (key,value) values ('four_eyes_publish','false') on conflict (key) do update set value='false'");
  comparison = await call(`/releases/${draft.version}/comparison`); assert.equal(comparison.json.canPublish, true);
  assert.equal((await call(`/releases/${draft.version}/publish`, { method: 'POST', body: { baseVersion: -1 } })).status, 409);
  assert.equal((await call(`/releases/${draft.version}/publish`, { method: 'POST', body: { baseVersion: comparison.json.baseVersion } })).status, 200);
  assert.equal((await call('/releases/nope/comparison')).status, 400);
  console.log('PASS release comparison, four-eyes rule, stale baseline refusal and publication');

  await withClient(async (c) => {
    await c.query('select pg_advisory_lock(17236,2)');
    try { assert.equal((await call('/jobs/run', { method: 'POST', body: { reason: 'Test du verrou' } })).status, 409); }
    finally { await c.query('select pg_advisory_unlock(17236,2)'); }
  });
  assert.equal((await call('/jobs/run', { method: 'POST', body: { reason: 'x' } })).status, 400);
  const user = (await query("insert into users (email,preferences,dog_events_reminder) values ($1,$2,false) returning id", [`reminders-${tag}@example.invalid`, JSON.stringify({ notifications: { email: true, push: false } })]))[0];
  const pet = (await query("insert into pets (user_id,local_id,name) values ($1,1,'QA animal') returning id", [user.id]))[0];
  await query("insert into vaccinations (pet_id,user_id,local_id,date,name,next) values ($1,$2,1,current_date,'Vaccin QA',current_date)", [pet.id, user.id]);
  const job = await call('/jobs/run', { method: 'POST', body: { reason: 'Vérification isolée' } }); assert.equal(job.status, 200);
  assert.equal(job.json.result.delivery.email.sent, 0); assert(job.json.result.delivery.email.simulated >= 1); assert.equal(job.json.result.delivery.push.sent, 0);
  await sendMail({ to: 'qa@example.invalid', subject: 'Simulation QA', text: 'Aucun envoi externe', jobRunId: job.json.runId });
  const linked = await call('/r/messages?' + new URLSearchParams({ filter: JSON.stringify({ job_run_id: job.json.runId }) }));
  assert.equal(linked.status, 200); assert(linked.json.length > 0); assert(linked.json.every((row) => String(row.job_run_id) === String(job.json.runId)));
  console.log('PASS execution locking, reason validation, delivery counters and linked message journal');
  await query("update app_settings set value='true' where key='four_eyes_publish'");
  server.close(); process.exit(0);
} catch (error) { console.error(error); server.close(); process.exit(1); }
