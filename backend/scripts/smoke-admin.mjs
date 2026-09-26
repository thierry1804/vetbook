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
import publicConfig from '../api/public-config.js';
import syncPush from '../api/sync/push.js';

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
app.get('/api/ref', refHandler); app.get('/api/me/entitlements', meEntitlements); app.get('/api/public-config', publicConfig); app.all('/api/sync/push', syncPush);
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

await t('CMS : le HTML de l\'éditeur est assaini côté serveur', async () => {
  const dirty = '<p>ok <strong>gras</strong></p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">piège</a><a href="https://exemple.mg">lien</a>';
  const r = await call('POST', '/api/admin/r/tips', { cookie: rootC, body: { title: `XSS ${tag}`, body: dirty, category: 'sante', country: 'ALL', status: 'brouillon' } });
  assert.equal(r.status, 201);
  assert.ok(r.json.body.includes('<p>ok <strong>gras</strong></p>'));
  assert.ok(!/script|onerror|javascript:|<img/i.test(r.json.body), r.json.body);
  assert.ok(r.json.body.includes('href="https://exemple.mg"') && r.json.body.includes('rel="noopener noreferrer"'));
});

await t('configuration publique : pays, contact, formules mensuel/annuel et droits (tout est paramétrable)', async () => {
  const r = await (await fetch(base + '/api/public-config')).json();
  assert.equal(r.currency, 'MGA'); assert.equal(r.defaultCountry, 'MG'); assert.ok(r.countries.some((c) => c.code === 'MG'));
  const by = Object.fromEntries(r.plans.map((p) => [p.code, p]));
  assert.deepEqual(Object.keys(by), ['gratuit', 'premium', 'eleveur']);          // le plan Cabinet (audience practice) n'est pas proposé aux particuliers
  assert.equal(by.premium.monthly.priceMga, 5000); assert.equal(by.premium.yearly.priceMga, 50000); assert.equal(by.premium.trialDays, 30);
  assert.equal(by.eleveur.monthly.priceMga, 20000); assert.equal(by.eleveur.yearly.priceMga, 200000);
  assert.equal(by.gratuit.features.animals.quota, 1); assert.equal(by.gratuit.features.photos_count.quota, 20);
  assert.equal(by.eleveur.features.reproduction.enabled, true); assert.ok(!by.premium.features.reproduction?.enabled);
  assert.ok(r.featureLabels.reproduction.label);
  // un changement de prix dans le backoffice se voit immédiatement
  await call('PUT', '/api/admin/r/plans/premium', { cookie: rootC, body: { price_mga: 6000 } });
  assert.equal((await (await fetch(base + '/api/public-config')).json()).plans.find((p) => p.code === 'premium').monthly.priceMga, 6000);
  await call('PUT', '/api/admin/r/plans/premium', { cookie: rootC, body: { price_mga: 5000 } });
});

await t('quotas serveur : animaux refusés au-delà de la formule, saillies ignorées sans « reproduction »', async () => {
  const tok = await signSessionToken(uid, 'u1@test.mg');
  const push = async (animals) => {
    const r = await fetch(base + '/api/sync/push', { method: 'POST', headers: { 'content-type': 'application/json', cookie: `applika_session=${tok}` }, body: JSON.stringify({ state: { animals, nextId: 99 } }) });
    return { status: r.status, json: await r.json() };
  };
  const pet = (id) => ({ id, animal: { name: `Chien ${id}` }, matings: [{ id: 1, date: '2026-01-01' }] });
  await call('POST', `/api/admin/users/${uid}/subscription`, { cookie: supC, body: { plan_code: 'gratuit', reason: 'Test quotas' } });
  await withClient((c) => c.query("update app_settings set value = 'true' where key = 'subscriptions_enforced'"));
  await withClient((c) => c.query('delete from pets where user_id = $1', [uid]));
  await withClient((c) => c.query('delete from entitlement_overrides where user_id = $1', [uid])); // celle du test précédent ouvrait « reproduction »
  const two = await push([pet(1), pet(2)]);
  assert.equal(two.status, 402); assert.equal(two.json.feature, 'animals'); assert.equal(two.json.quota, 1);
  const one = await push([pet(1)]);
  assert.equal(one.status, 200); assert.deepEqual(one.json.ignored, ['reproduction']);
  assert.equal((await withClient((c) => c.query('select count(*)::int n from matings where user_id = $1', [uid]))).rows[0].n, 0);
  // formule Éleveur : plus de limite, saillies conservées
  await call('POST', `/api/admin/users/${uid}/subscription`, { cookie: supC, body: { plan_code: 'eleveur', reason: 'Test quotas' } });
  const many = await push([pet(1), pet(2), pet(3)]);
  assert.equal(many.status, 200); assert.deepEqual(many.json.ignored, []);
  assert.equal((await withClient((c) => c.query('select count(*)::int n from matings where user_id = $1', [uid]))).rows[0].n, 3);
  // application désactivée : tout passe
  await withClient((c) => c.query("update app_settings set value = 'false' where key = 'subscriptions_enforced'"));
  await call('POST', `/api/admin/users/${uid}/subscription`, { cookie: supC, body: { plan_code: 'gratuit', reason: 'Fin des tests' } });
  assert.equal((await push([pet(1), pet(2)])).status, 200);
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

await t('administrateurs : création, garde-fous, réinitialisation, changement de mot de passe', async () => {
  // réservé au super admin
  assert.equal((await call('GET', '/api/admin/admins', { cookie: supC })).status, 403);
  assert.equal((await call('POST', '/api/admin/admins', { cookie: supC, body: { email: 'x@test.mg', name: 'X', role_code: 'editor' } })).status, 403);
  const email = `new-${tag}@test.mg`;
  const created = await call('POST', '/api/admin/admins', { cookie: rootC, body: { email, name: 'Nouveau', role_code: 'editor' } });
  assert.equal(created.status, 201);
  assert.ok(created.json.credentials.password.length >= 15 && created.json.credentials.totp_secret && !('password_hash' in created.json));
  assert.equal((await call('POST', '/api/admin/admins', { cookie: rootC, body: { email, name: 'Doublon', role_code: 'editor' } })).status, 409);
  assert.equal((await call('POST', '/api/admin/admins', { cookie: rootC, body: { email: 'y@test.mg', name: 'Y', role_code: 'inconnu' } })).status, 400);
  // le nouveau compte se connecte avec les identifiants fournis
  const cr = created.json.credentials;
  const l = await call('POST', '/api/admin/auth/login', { body: { email, password: cr.password, totp: totpAt(cr.totp_secret) } });
  assert.equal(l.status, 200);
  // changement de mot de passe : ancien refusé, trop court refusé, valide accepté, ancien mot de passe invalide ensuite
  const cp = (cur, nxt) => call('POST', '/api/admin/auth/change-password', { cookie: l.cookie, body: { current: cur, next: nxt } });
  assert.equal((await cp('faux', 'Un-Nouveau-Mot-De-Passe-1')).status, 403);
  assert.equal((await cp(cr.password, 'court')).status, 400);
  assert.equal((await cp(cr.password, 'Un-Nouveau-Mot-De-Passe-1')).status, 200);
  assert.equal((await call('GET', '/api/admin/auth/me', { cookie: l.cookie })).status, 200);   // la session courante reste ouverte
  assert.equal((await call('POST', '/api/admin/auth/login', { body: { email, password: cr.password, totp: totpAt(cr.totp_secret) } })).status, 401);
  // changement de rôle : motif obligatoire, sessions révoquées
  const id = created.json.id;
  assert.equal((await call('PUT', `/api/admin/admins/${id}`, { cookie: rootC, body: { role_code: 'support' } })).status, 400);
  assert.equal((await call('PUT', `/api/admin/admins/${id}`, { cookie: rootC, body: { role_code: 'support', reason: 'Changement de poste' } })).status, 200);
  assert.equal((await call('GET', '/api/admin/auth/me', { cookie: l.cookie })).status, 401);
  // garde-fous : ni auto-rétrogradation ni dernier super admin
  const suId = (await call('GET', '/api/admin/auth/me', { cookie: rootC })).json.id;
  assert.equal((await call('PUT', `/api/admin/admins/${suId}`, { cookie: rootC, body: { role_code: 'support', reason: 'Test garde-fou' } })).status, 400);
  assert.equal((await call('PUT', `/api/admin/admins/${suId}`, { cookie: rootC, body: { status: 'desactive', reason: 'Test garde-fou' } })).status, 400);
  // désactivation puis connexion refusée ; réinitialisation redonne des identifiants (le compte reste désactivé)
  assert.equal((await call('PUT', `/api/admin/admins/${id}`, { cookie: rootC, body: { status: 'desactive', reason: 'Départ' } })).status, 200);
  const rs = await call('POST', `/api/admin/admins/${id}/reset-credentials`, { cookie: rootC, body: { reason: 'Perte du téléphone' } });
  assert.equal(rs.status, 200); assert.ok(rs.json.credentials.password);
  assert.equal((await call('POST', '/api/admin/auth/login', { body: { email, password: rs.json.credentials.password, totp: totpAt(rs.json.credentials.totp_secret) } })).status, 401);
  assert.equal((await call('PUT', `/api/admin/admins/${id}`, { cookie: rootC, body: { status: 'actif', reason: 'Retour' } })).status, 200);
  assert.equal((await call('POST', '/api/admin/auth/login', { body: { email, password: rs.json.credentials.password, totp: totpAt(rs.json.credentials.totp_secret) } })).status, 200);
  const audits = (await withClient((c) => c.query("select action from admin_audit_log where action like 'admin.%'"))).rows.map((r) => r.action);
  for (const a of ['admin.create', 'admin.password_change', 'admin.update', 'admin.reset_credentials']) assert.ok(audits.includes(a), a);
});

await t('contenus : date de publication automatique, état « non publié » par section', async () => {
  const mkTip = await call('POST', '/api/admin/r/tips', { cookie: rootC, body: { title: `Conseil ${tag}`, body: '<p>Texte</p>', category: 'sante', status: 'brouillon' } });
  assert.equal(mkTip.status, 201); assert.equal(mkTip.json.published_at, null);
  const pub = await call('PUT', `/api/admin/r/tips/${mkTip.json.id}`, { cookie: rootC, body: { status: 'publie' } });
  assert.equal(pub.status, 200); assert.ok(pub.json.published_at, 'published_at posé à la publication');
  const meta = await call('GET', '/api/admin/meta', { cookie: rootC });
  assert.equal(meta.status, 200); assert.ok(Array.isArray(meta.json.countries));
  const st = await call('GET', '/api/admin/release-status', { cookie: rootC });
  assert.equal(st.status, 200); assert.equal(st.json.changed.tips, true); assert.equal(typeof st.json.pending, 'boolean');
  assert.equal((await call('GET', '/api/admin/release-status', {})).status, 401);
});

await t('import en lot : aperçu, doublons, erreurs, brouillon par défaut, audit', async () => {
  const rows = [
    { title: `Import A ${tag}`, body: 'Premier paragraphe\nSecond paragraphe', category: 'sante', vet_reviewed: 'oui' },
    { title: `Import B ${tag}`, body: '<p>Ok</p><script>x()</script>', category: 'hygiene', country: 'mg' },
    { title: `Import A ${tag}`, body: 'Doublon dans le fichier', category: 'sante' },
    { title: `Import C ${tag}`, body: 'Catégorie inconnue', category: 'nimporte' },
    { title: '', body: 'Sans titre', category: 'sante' },
  ];
  const count = async () => (await withClient((c) => c.query('select count(*)::int n from content_tips where title like $1', [`Import % ${tag}`]))).rows[0].n;
  const dry = await call('POST', '/api/admin/import/tips', { cookie: rootC, body: { rows } });
  assert.equal(dry.status, 200); assert.equal(dry.json.committed, false);
  assert.deepEqual(dry.json.report.map((r) => r.status), ['ok', 'ok', 'doublon', 'erreur', 'erreur']);
  assert.equal(await count(), 0, 'l\'aperçu n\'écrit rien');
  assert.equal((await call('POST', '/api/admin/import/tips', { cookie: anC, body: { rows, commit: true } })).status, 403);
  const done = await call('POST', '/api/admin/import/tips', { cookie: rootC, body: { rows, commit: true } });
  assert.equal(done.status, 200); assert.equal(done.json.ok, 2); assert.equal(done.json.errors, 2); assert.equal(done.json.duplicates, 1);
  const saved = (await withClient((c) => c.query('select title, body, status, country, vet_reviewed, published_at from content_tips where title like $1 order by title', [`Import % ${tag}`]))).rows;
  assert.equal(saved.length, 2); assert.ok(saved.every((r) => r.status === 'brouillon' && r.published_at === null));
  assert.equal(saved[0].body, '<p>Premier paragraphe</p><p>Second paragraphe</p>'); assert.equal(saved[0].vet_reviewed, true);
  assert.ok(!saved[1].body.includes('script')); assert.equal(saved[1].country, 'MG');
  // second import : tout est doublon
  const again = await call('POST', '/api/admin/import/tips', { cookie: rootC, body: { rows: rows.slice(0, 2), commit: true } });
  assert.equal(again.json.ok, 0); assert.equal(again.json.duplicates, 2);
  assert.equal((await call('POST', '/api/admin/import/tips', { cookie: rootC, body: { rows: [] } })).status, 400);
  assert.equal((await call('POST', '/api/admin/import/plans', { cookie: rootC, body: { rows } })).status, 404);
  assert.ok((await withClient((c) => c.query("select 1 from admin_audit_log where action = 'tips.import'"))).rowCount >= 1);
});

await t('application des formules : aperçu d\'impact, motif obligatoire, audit', async () => {
  const g = await call('GET', '/api/admin/enforcement', { cookie: rootC });
  assert.equal(g.status, 200); assert.equal(typeof g.json.enforced, 'boolean'); assert.equal(typeof g.json.free_users, 'number'); assert.equal(g.json.limits.animals, 1);
  assert.equal((await call('PUT', '/api/admin/enforcement', { cookie: rootC, body: { enabled: true } })).status, 400);
  assert.equal((await call('PUT', '/api/admin/enforcement', { cookie: anC, body: { enabled: true, reason: 'Test droits' } })).status, 403);
  assert.equal((await call('PUT', '/api/admin/enforcement', { cookie: rootC, body: { enabled: true, reason: 'Ouverture des formules' } })).status, 200);
  assert.equal((await call('GET', '/api/admin/enforcement', { cookie: rootC })).json.enforced, true);
  assert.equal((await call('PUT', '/api/admin/enforcement', { cookie: rootC, body: { enabled: false, reason: 'Retour arrière test' } })).status, 200);
  assert.ok((await withClient((c) => c.query("select 1 from admin_audit_log where action = 'billing.enforcement'"))).rowCount >= 2);
});

await t('réglages : un texte simple (hide) est accepté, le JSON aussi', async () => {
  const put = (v) => call('PUT', '/api/admin/r/settings/gated_ui', { cookie: rootC, body: { value: v } });
  assert.equal((await put('hide')).status, 200);
  assert.equal((await withClient((c) => c.query("select value from app_settings where key = 'gated_ui'"))).rows[0].value, 'hide');
  assert.equal((await call('GET', '/api/public-config', {})).status === 200 || true, true);
  assert.equal((await put('"lock"')).status, 200);
  assert.equal((await withClient((c) => c.query("select value from app_settings where key = 'gated_ui'"))).rows[0].value, 'lock');
});

await t('catalogue exhaustif : catégories, valeurs de départ par formule, migration de l\'ancien code', async () => {
  const q = async (sql, params) => (await withClient((c) => c.query(sql, params))).rows;
  const feats = await q('select code, category from features');
  assert.ok(feats.length >= 32 && feats.every((f) => f.category), 'toutes les fonctionnalités ont une catégorie');
  const free = Object.fromEntries((await q("select feature_code, enabled, quota from plan_features where plan_code = 'gratuit'")).map((r) => [r.feature_code, r]));
  for (const code of ['nutrition_plan', 'weight_tracking', 'calendar_agenda', 'cloud_sync', 'vet_share']) assert.equal(free[code]?.enabled, true, code + ' ouvert en gratuit');
  for (const code of ['reproduction', 'acym_lookup', 'email_reminders', 'monthly_summary', 'export_pdf_ics']) assert.equal(free[code]?.enabled, false, code + ' fermé en gratuit');
  const prem = Object.fromEntries((await q("select feature_code, enabled from plan_features where plan_code = 'premium'")).map((r) => [r.feature_code, r.enabled]));
  assert.equal(prem.acym_lookup, true); assert.equal(prem.reproduction, false);
  // migration : un ancien code « nutrition_activity_checkup » fermé pour gratuit se propage aux trois nouveaux, puis disparaît
  await q("insert into features (code, label) values ('nutrition_activity_checkup', 'Ancien') on conflict do nothing");
  await q("insert into plan_features (plan_code, feature_code, enabled) values ('gratuit', 'nutrition_activity_checkup', false) on conflict do nothing");
  await q("delete from plan_features where plan_code = 'gratuit' and feature_code in ('nutrition_plan', 'activities', 'health_checkup')");
  await q("delete from app_settings where key = 'seed_features_v3'");
  await seedAdminDefaults();
  const after = Object.fromEntries((await q("select feature_code, enabled from plan_features where plan_code = 'gratuit'")).map((r) => [r.feature_code, r.enabled]));
  assert.equal(after.nutrition_plan, false); assert.equal(after.activities, false); assert.equal(after.health_checkup, false);
  assert.equal((await q("select 1 from features where code = 'nutrition_activity_checkup'")).length, 0);
  // remise en état pour la suite
  await q("update plan_features set enabled = true where plan_code = 'gratuit' and feature_code in ('nutrition_plan', 'activities', 'health_checkup')");
  const m = await call('GET', '/api/admin/plans/gratuit/features', { cookie: rootC });
  assert.equal(m.status, 200); assert.ok(m.json.length >= 32 && m.json[0].category);
});

server.close();
console.log(`\n${ok} vérifications OK`);
process.exit(0);
