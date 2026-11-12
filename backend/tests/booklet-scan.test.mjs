import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import { withClient } from '../api/_lib/db.js';
import { ensureSchema } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { signSessionToken } from '../api/_lib/auth.js';
import { encryptSecret } from '../api/_lib/crypto.js';
import { makeBookletScan } from '../api/ai/booklet-scan.js';
import { DEFAULT_VISION_MODEL } from '../api/_lib/ai.js';
import { signAdminToken } from '../api/_lib/admin-auth.js';
import { buildAdminRouter } from '../api/admin/router.js';

let count = 0;
const test = async (name, fn) => { await fn(); console.log('OK', name); count++; };
const sql = (text, params = []) => withClient((c) => c.query(text, params));
const setSetting = (key, value) => sql('insert into app_settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value', [key, JSON.stringify(value)]);

await ensureSchema();
await seedAdminDefaults();
await setSetting('ai_enabled', true);
await setSetting('ai_api_key_enc', encryptSecret('cle-de-test'));
await sql("insert into ref_species (code, label) values ('Canine', 'Chien') on conflict do nothing");
await sql("insert into ref_antiparasitics (species_code, name, default_interval_days) values ('Canine', 'Milbemax', 90) on conflict do nothing");

const makeUser = async (paid) => {
  const email = `${crypto.randomUUID()}@test.local`;
  const row = (await sql("insert into users (email, password_hash, name) values ($1, 'x', 'Test') returning id", [email])).rows[0];
  if (paid) await sql("insert into entitlement_overrides (user_id, feature_code, enabled, reason) values ($1, 'booklet_scan', true, 'test')", [row.id]);
  await sql("insert into pets (user_id, local_id, name, species, chip) values ($1, 20, 'Rex', 'Canine', '250269811111111')", [row.id]);
  return { ...row, cookie: `applika_session=${await signSessionToken(row.id, email)}` };
};
const paid = await makeUser(true);
const free = await makeUser(false);

// Faux OpenRouter : renvoie le contenu choisi par le test et garde le dernier corps envoyé.
let modelContent = '{"entries":[]}';
let calls = 0;
let finishReason = 'stop';
let lastBody = null;
const fakeFetch = async (_url, init) => {
  calls++; lastBody = JSON.parse(init.body);
  return new Response(JSON.stringify({ choices: [{ finish_reason: finishReason, message: { content: modelContent } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const adminRow = (await sql("insert into admin_users (email, name, password_hash, role_code) values ($1, 'QA', 'x', 'super_admin') returning id", [`${crypto.randomUUID()}@test.local`])).rows[0];
const adminSession = (await sql("insert into admin_sessions (admin_id, expires_at) values ($1, now() + interval '1 hour') returning id", [adminRow.id])).rows[0];
const adminCookie = `admin_session=${await signAdminToken(adminRow.id, adminSession.id)}`;

const app = express();
app.use(cookieParser());
app.use('/api/admin', express.json(), buildAdminRouter());
app.post('/api/ai/booklet-scan', makeBookletScan({ fetchImpl: fakeFetch }));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
async function scan(actor, { petLocalId = 20, bytes = JPEG, type = 'image/jpeg' } = {}) {
  const form = new FormData();
  form.append('petLocalId', String(petLocalId));
  form.append('photo', new Blob([bytes], { type }), 'carnet.jpg');
  const res = await fetch(base + '/api/ai/booklet-scan', { method: 'POST', headers: { cookie: actor?.cookie || '' }, body: form });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

try {
  await test('sans session : 401 ; gratuit : 402 sans appel au modèle', async () => {
    assert.equal((await scan(null)).status, 401);
    const r = await scan(free);
    assert.equal(r.status, 402);
    assert.equal(r.json.feature, 'booklet_scan');
    assert.equal(calls, 0);
  });

  await test('animal d’un autre compte : 404 ; pas une image : 415 ; plus de 8 Mo : 413', async () => {
    assert.equal((await scan(paid, { petLocalId: 999 })).status, 404);
    assert.equal((await scan(paid, { bytes: Buffer.from('bonjour'), type: 'text/plain' })).status, 415);
    assert.equal((await scan(paid, { bytes: Buffer.alloc(8 * 1024 * 1024 + 10) })).status, 413);
    assert.equal(calls, 0);
  });

  await test('déparasitage lu : rappel estimé depuis ref_antiparasitics, sans écart de nom', async () => {
    modelContent = '```json\n{"petName":"Rex","entries":[{"kind":"deworming","date":"12/09/2026","name":"Milbemax"}]}\n```';
    const r = await scan(paid);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const [e] = r.json.entries;
    assert.deepEqual([e.kind, e.date, e.next, e.nextEstimated, e.frequencyDays], ['deworming', '2026-09-12', '2026-12-11', true, 90]);
    assert.equal(r.json.mismatch, false);
  });

  await test('le corps envoyé au modèle : vision, température 0, JSON, image en data URL', async () => {
    assert.equal(lastBody.model, DEFAULT_VISION_MODEL);
    assert.equal(lastBody.temperature, 0);
    assert.deepEqual(lastBody.response_format, { type: 'json_object' });
    const parts = lastBody.messages.at(-1).content;
    assert.ok(parts.some((p) => p.type === 'image_url' && p.image_url.url.startsWith('data:image/jpeg;base64,')));
    assert.ok(parts.some((p) => p.type === 'text' && p.text.includes('Rex')));
  });

  await test('autre nom ou autre puce sur la page : mismatch', async () => {
    modelContent = '{"petName":"Max","entries":[{"kind":"weight","date":"12/09/2026","weightKg":12.4}]}';
    assert.equal((await scan(paid)).json.mismatch, true);
    modelContent = '{"petName":"Rex","chip":"250269899999999","entries":[{"kind":"weight","date":"12/09/2026","weightKg":12.4}]}';
    assert.equal((await scan(paid)).json.mismatch, true);
  });

  await test('rien de lisible ou sortie invalide : 422 avec un conseil', async () => {
    for (const content of ['{"entries":[]}', 'désolé, je ne vois rien', '{"entries":[{"kind":"consultation","date":"12/09/2026"}]}']) {
      modelContent = content;
      const r = await scan(paid);
      assert.equal(r.status, 422);
      assert.match(r.json.error, /lumière/);
    }
  });

  await test('JSON suivi de texte avec accolades : lu normalement', async () => {
    modelContent = '{"petName":"Rex","entries":[{"kind":"weight","date":"12/09/2026","weightKg":12.4}]}\nNote {sans importance}.';
    const r = await scan(paid);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.entries.length, 1);
  });

  await test('réponse coupée par max_tokens : message dédié, pas « plus de lumière »', async () => {
    modelContent = '{"petName":"Rex","entries":[{"kind":"vaccine","date":"2026-0';
    finishReason = 'length';
    try {
      const r = await scan(paid);
      assert.equal(r.status, 422);
      assert.match(r.json.error, /dense/);
      assert.doesNotMatch(r.json.error, /lumière/);
      assert.ok(lastBody.max_tokens >= 4000);
    } finally { finishReason = 'stop'; }
  });

  await test('aucune écriture en base, usage compté en source booklet', async () => {
    const written = (await sql(`select (select count(*) from vaccinations where user_id = $1) + (select count(*) from dewormings where user_id = $1)
      + (select count(*) from hygiene_events where user_id = $1) as n`, [paid.id])).rows[0];
    assert.equal(Number(written.n), 0);
    const usage = (await sql("select count(*)::int as n from ai_usage_log where source = 'booklet'")).rows[0];
    assert.ok(usage.n >= calls);
  });

  await test('backoffice : modèle de vision lu, modifié, audité et utilisé par l’analyse', async () => {
    const admin = (path, init = {}) => fetch(base + '/api/admin' + path, { ...init, headers: { cookie: adminCookie, 'content-type': 'application/json' } })
      .then(async (r) => ({ status: r.status, json: await r.json() }));
    const before = await admin('/ai-settings');
    assert.equal(before.status, 200);
    assert.deepEqual([before.json.visionModel, before.json.defaultVisionModel], [DEFAULT_VISION_MODEL, DEFAULT_VISION_MODEL]);
    const put = await admin('/ai-settings', { method: 'PUT', body: JSON.stringify({ enabled: true, visionModel: 'fournisseur/modele-test', reason: 'Test du modèle de vision' }) });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    assert.equal((await admin('/ai-settings')).json.visionModel, 'fournisseur/modele-test');
    const logged = (await sql("select before, after from admin_audit_log where action = 'ai.settings' order by id desc limit 1")).rows[0];
    assert.equal(logged.after.visionModel, 'fournisseur/modele-test');
    assert.equal(logged.before.visionModel, DEFAULT_VISION_MODEL);
    modelContent = '{"entries":[{"kind":"weight","date":"12/09/2026","weightKg":12.4}]}';
    assert.equal((await scan(paid)).status, 200);
    assert.equal(lastBody.model, 'fournisseur/modele-test');
    await admin('/ai-settings', { method: 'PUT', body: JSON.stringify({ enabled: true, visionModel: '', reason: 'Retour au défaut' }) });
    assert.equal((await admin('/ai-settings')).json.visionModel, DEFAULT_VISION_MODEL);
  });

  await test('IA désactivée : 503', async () => {
    await setSetting('ai_enabled', false);
    assert.equal((await scan(paid)).status, 503);
    await setSetting('ai_enabled', true);
  });

  console.log(`${count} vérifications de lecture du carnet au vert`);
  server.close(); process.exit(0);
} catch (error) { console.error(error); server.close(); process.exit(1); }
