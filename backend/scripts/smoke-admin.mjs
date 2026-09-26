#!/usr/bin/env node
// Test de fumée du backoffice, en processus : Express + routeur admin sur un port éphémère, base Postgres
// jetable. Usage : DATABASE_URL=... JWT_SECRET=... node scripts/smoke-admin.mjs
import express from 'express';
import cookieParser from 'cookie-parser';
import argon2 from 'argon2';
import assert from 'node:assert/strict';
import { withClient } from '../api/_lib/db.js';
import { ensureSchema, splitSql } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { totpAt, newTotpSecret, verifyTotp } from '../api/_lib/totp.js';
import { signSessionToken } from '../api/_lib/auth.js';
import refHandler from '../api/ref/index.js';
import meEntitlements from '../api/me/entitlements.js';

// Le limiteur de login (10 / 15 min) fausserait le test de verrouillage : plafond relevé avant de charger le routeur.
process.env.ADMIN_LOGIN_RATE_MAX ||= '1000';
const { buildAdminRouter } = await import('../api/admin/router.js');

let ok = 0;
const tag = Date.now().toString(36); // noms uniques : le test peut être relancé sur la même base
const t = async (name, fn) => { await fn(); ok++; console.log('OK  ', name); };

// splitSql : blocs $$ conservés
await t('splitSql garde les fonctions plpgsql', () => {
  const s = splitSql('create function f() returns int as $$ begin return 1; end; $$ language plpgsql;\nselect 1;');
  assert.equal(s.length, 2); assert.match(s[0], /return 1; end;/);
});
await t('TOTP (vecteur RFC 6238)', () => {
  // secret ASCII "12345678901234567890" en base32, t=59 s → 94287082 (8 chiffres) → 6 chiffres : 287082
  assert.equal(totpAt('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000), '287082');
  const s = newTotpSecret(); assert.ok(verifyTotp(s, totpAt(s)));
});

await ensureSchema();
await ensureSchema(); // idempotence
await seedAdminDefaults();
await seedAdminDefaults();

const app = express(); app.use(cookieParser()); app.use(express.json());
app.use('/api/admin', buildAdminRouter());
app.get('/api/ref', refHandler); app.get('/api/me/entitlements', meEntitlements);
const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}`;
const call = async (method, path, { body, cookie } = {}) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch { /* vide */ }
  return { status: r.status, json, headers: r.headers, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
};

// Comptes admin : super_admin + support + analyste
const mk = async (email, role) => {
  const secret = newTotpSecret();
  const hash = await argon2.hash('Passw0rd!', { type: argon2.argon2id });
  await withClient((c) => c.query(
    `insert into admin_users (email, name, password_hash, role_code, totp_secret, totp_enabled) values ($1,$1,$2,$3,$4,true)
     on conflict (email) do update set password_hash = excluded.password_hash, totp_secret = excluded.totp_secret, role_code = excluded.role_code, failed_attempts = 0, locked_until = null`,
    [email, hash, role, secret]));
  return { email, secret };
};
const su = await mk('root@test.mg', 'super_admin'); const sup = await mk('support@test.mg', 'support'); const an = await mk('analyst@test.mg', 'analyst');
const login = async (a, totp) => call('POST', '/api/admin/auth/login', { body: { email: a.email, password: 'Passw0rd!', totp: totp ?? totpAt(a.secret) } });

await t('login refusé : mauvais mot de passe / mauvais 2FA / sans cookie', async () => {
  assert.equal((await call('POST', '/api/admin/auth/login', { body: { email: su.email, password: 'x', totp: '000000' } })).status, 401);
  assert.equal((await login(su, '000000')).status, 401);
  assert.equal((await call('GET', '/api/admin/users')).status, 401);
  await withClient((c) => c.query('update admin_users set failed_attempts = 0, locked_until = null'));
});
const rootC = (await login(su)).cookie; const supC = (await login(sup)).cookie; const anC = (await login(an)).cookie;
await t('session admin : /auth/me', async () => {
  const me = await call('GET', '/api/admin/auth/me', { cookie: rootC });
  assert.equal(me.status, 200); assert.equal(me.json.role, 'super_admin'); assert.ok(me.json.permissions.includes('*'));
});
await t('un JWT utilisateur ne donne pas accès à /api/admin', async () => {
  const userTok = await signSessionToken('00000000-0000-0000-0000-000000000000', 'x@y.z');
  assert.equal((await call('GET', '/api/admin/users', { cookie: `applika_session=${userTok}` })).status, 401);
  assert.equal((await call('GET', '/api/admin/users', { cookie: `admin_session=${userTok}` })).status, 401);
});
await t('RBAC : l\'analyste ne lit pas les utilisateurs nominatifs, le support si', async () => {
  assert.equal((await call('GET', '/api/admin/users', { cookie: anC })).status, 403);
  assert.equal((await call('GET', '/api/admin/users', { cookie: supC })).status, 200);
  assert.equal((await call('GET', '/api/admin/audit', { cookie: supC })).status, 403);
});

// Un utilisateur de test avec un animal
const uid = (await withClient((c) => c.query(
  `insert into users (email, name, password_hash, email_verified_at) values ('u1@test.mg','Test User','x', now()) on conflict (email) do update set status='actif' returning id`))).rows[0].id;
await withClient((c) => c.query(`insert into pets (user_id, local_id, name, species, race, chip) values ($1,1,'Rex','Canine','Labrador Retriever','250269800000001') on conflict (user_id, local_id) do nothing`, [uid]));

await t('utilisateurs : recherche par n° de puce + fiche 360°', async () => {
  const l = await call('GET', `/api/admin/users?filter=${encodeURIComponent(JSON.stringify({ q: '2502698000' }))}`, { cookie: supC });
  assert.equal(l.json.length, 1); assert.equal(l.json[0].animals, 1); assert.ok(!('password_hash' in l.json[0]));
  const f = await call('GET', `/api/admin/users/${uid}`, { cookie: supC });
  assert.equal(f.json.pets.length, 1); assert.ok(!('password_hash' in f.json));
});
await t('suspension : motif obligatoire, audit, connexion API refusée', async () => {
  assert.equal((await call('POST', `/api/admin/users/${uid}/suspend`, { cookie: supC, body: {} })).status, 400);
  assert.equal((await call('POST', `/api/admin/users/${uid}/suspend`, { cookie: supC, body: { reason: 'Signalement abus #12' } })).status, 200);
  const tok = await signSessionToken(uid, 'u1@test.mg');
  const r = await fetch(base.replace(/\d+$/, server.address().port) + '/api/me/entitlements', { headers: { cookie: `applika_session=${tok}` } });
  assert.equal(r.status, 403);
  await call('POST', `/api/admin/users/${uid}/reactivate`, { cookie: supC, body: { reason: 'Résolu avec l\'utilisateur' } });
  const a = await call('GET', `/api/admin/audit?filter=${encodeURIComponent(JSON.stringify({ target_id: uid }))}`, { cookie: rootC });
  assert.ok(a.json.some((x) => x.action === 'user.suspend' && x.reason === 'Signalement abus #12'));
});
await t('audit en ajout seul (UPDATE/DELETE refusés en base)', async () => {
  await assert.rejects(() => withClient((c) => c.query('update admin_audit_log set action = \'x\'')), /ajout seul/);
  await assert.rejects(() => withClient((c) => c.query('delete from admin_audit_log')), /ajout seul/);
});

await t('référentiels : CRUD avec audit avant/après', async () => {
  const c1 = await call('POST', '/api/admin/r/breeds', { cookie: rootC, body: { species_code: 'Canine', name: `Test Race ${tag}`, weight_min: 10, weight_max: 20, aliases: ['TRM'] } });
  assert.equal(c1.status, 201);
  const u1 = await call('PUT', `/api/admin/r/breeds/${c1.json.id}`, { cookie: rootC, body: { weight_max: 22 } });
  assert.equal(Number(u1.json.weight_max), 22);
  const bad = await call('POST', '/api/admin/r/breeds', { cookie: rootC, body: { species_code: 'Inconnue', name: 'X' } });
  assert.equal(bad.status, 400);
  assert.equal((await call('POST', '/api/admin/r/breeds', { cookie: anC, body: { species_code: 'Canine', name: 'Y' } })).status, 403);
  const a = await call('GET', `/api/admin/audit?filter=${encodeURIComponent(JSON.stringify({ target_type: 'breeds' }))}`, { cookie: rootC });
  const upd = a.json.find((x) => x.action === 'breeds.update' && String(x.target_id) === String(c1.json.id)); assert.equal(Number(upd.before.weight_max), 20); assert.equal(Number(upd.after.weight_max), 22);
});

await t('release : brouillon → quatre yeux → publication → GET /api/ref', async () => {
  await withClient((c) => c.query(`insert into content_tips (title, body, country, status) values ('Astuce ${tag}','Corps','MG','publie')`));
  const d = await call('POST', '/api/admin/releases', { cookie: rootC, body: { note: 'test' } });
  assert.equal(d.status, 201);
  const self = await call('POST', `/api/admin/releases/${d.json.version}/publish`, { cookie: rootC });
  assert.equal(self.status, 403); // même auteur
  // le référent vétérinaire est un autre admin : il publie
  const vet = await mk('vet@test.mg', 'vet_referent'); const vetC = (await login(vet)).cookie;
  assert.equal((await call('POST', `/api/admin/releases/${d.json.version}/publish`, { cookie: vetC })).status, 200);
  assert.equal((await call('POST', `/api/admin/releases/${d.json.version}/publish`, { cookie: vetC })).status, 409);
  const ref = await call('GET', '/api/ref');
  assert.equal(ref.json.version, d.json.version); assert.ok(ref.json.content.breedDb.Canine.some((b) => b.name === `Test Race ${tag}`));
  assert.ok(ref.json.content.tips.some((x) => x.title === `Astuce ${tag}`));
  const same = await call('GET', `/api/ref?since=${ref.json.version}`); assert.equal(same.json.unchanged, true);
});

await t('droits : gratuit par défaut, application désactivée = tout ouvert, activée = quotas de la formule', async () => {
  const tok = await signSessionToken(uid, 'u1@test.mg');
  const get = async () => (await fetch(base + '/api/me/entitlements', { headers: { cookie: `applika_session=${tok}` } })).json();
  let e = await get(); assert.equal(e.plan, 'gratuit'); assert.equal(e.enforced, false); assert.equal(e.features.reproduction.enabled, true);
  await withClient((c) => c.query("update app_settings set value = 'true' where key = 'subscriptions_enforced'"));
  e = await get(); assert.equal(e.enforced, true); assert.equal(e.features.reproduction.enabled, false); assert.equal(e.features.animals.quota, 1);
  // abonnement Éleveur + paiement manuel + reçu
  const s = await call('POST', `/api/admin/users/${uid}/subscription`, { cookie: supC, body: { plan_code: 'eleveur', reason: 'Paiement reçu en agence' } });
  assert.equal(s.status, 201);
  const p = await call('POST', `/api/admin/subscriptions/${s.json.id}/payments`, { cookie: supC, body: { amount_mga: 20000, method: 'mvola', reference: 'MV123', reason: 'Saisie manuelle' } });
  assert.equal(p.status, 201); assert.match(p.json.invoice.number, /^F-\d{4}-\d{6}$/);
  e = await get(); assert.equal(e.plan, 'eleveur'); assert.equal(e.features.reproduction.enabled, true); assert.equal(e.features.animals.quota, null);
  // surcharge ponctuelle sur un compte gratuit
  await call('POST', `/api/admin/users/${uid}/subscription`, { cookie: supC, body: { plan_code: 'gratuit', reason: 'Retour gratuit' } });
  await call('POST', '/api/admin/r/overrides', { cookie: rootC, body: { user_id: uid, feature_code: 'reproduction', enabled: true, reason: 'Partenaire élevage' } });
  e = await get(); assert.equal(e.features.reproduction.enabled, true);
  await withClient((c) => c.query("update app_settings set value = 'false' where key = 'subscriptions_enforced'"));
});

await t('tableau de bord + verrouillage après 5 échecs', async () => {
  const d = await call('GET', '/api/admin/dashboard', { cookie: rootC });
  assert.equal(d.status, 200); assert.ok(d.json.users >= 1); assert.ok(Array.isArray(d.json.pets_by_species));
  for (let i = 0; i < 5; i++) await call('POST', '/api/admin/auth/login', { body: { email: an.email, password: 'mauvais', totp: '000000' } });
  assert.equal((await login(an)).status, 423);
  await withClient((c) => c.query('update admin_users set failed_attempts = 0, locked_until = null'));
});
await t('logout révoque la session', async () => {
  const c = (await login(su)).cookie;
  await call('POST', '/api/admin/auth/logout', { cookie: c });
  assert.equal((await call('GET', '/api/admin/auth/me', { cookie: c })).status, 401);
});

server.close();
console.log(`\n${ok} vérifications OK`);
process.exit(0);
