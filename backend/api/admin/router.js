// Backoffice : /api/admin/* (auth séparée, RBAC, audit). Voir docs/backoffice/PLAN.md.
import express from 'express';
import argon2 from 'argon2';
import rateLimit from 'express-rate-limit';
import { withClient, withTransaction } from '../_lib/db.js';
import {
  requireAdmin, auditFallback, audit, requireReason, signAdminToken, setAdminCookie, clearAdminCookie,
  loadAdmin, clientIp, ADMIN_SESSION_HOURS, MAX_FAILED_LOGINS, LOCK_MINUTES,
} from '../_lib/admin-auth.js';
import { verifyTotp } from '../_lib/totp.js';
import { getSetting } from '../_lib/entitlements.js';
import { buildResourceRouter } from './resources.js';
import { mountAdminUsers } from './admins.js';
import { buildReleaseContent } from '../_lib/ref-release.js';

// ADMIN_LOGIN_RATE_MAX : uniquement pour les tests automatisés (défaut 10 tentatives / 15 min / IP).
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.ADMIN_LOGIN_RATE_MAX) || 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives.' } });

function listParams(req, defSort) {
  let range = [0, 24], sort = defSort, filter = {};
  try { if (req.query.range) range = JSON.parse(req.query.range); } catch { /* défaut */ }
  try { if (req.query.sort) sort = JSON.parse(req.query.sort); } catch { /* défaut */ }
  try { if (req.query.filter) filter = JSON.parse(req.query.filter); } catch { /* défaut */ }
  return { offset: Math.max(Number(range[0]) || 0, 0), limit: Math.min(Math.max(Number(range[1]) - Number(range[0]) + 1, 1), 200), sort, filter };
}

export function buildAdminRouter() {
  const router = express.Router();
  router.use(auditFallback);

  // ───────── Authentification ─────────
  router.post('/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const { email, password, totp } = req.body || {};
      if (typeof email !== 'string' || typeof password !== 'string') { res.status(400).json({ error: 'E-mail et mot de passe requis.' }); return; }
      const failLog = (id) => audit({ admin: id ? { id, email } : { id: null, email }, ip: req.ip, headers: req.headers }, res, { action: 'auth.login_failed', targetType: 'admin', targetId: id, after: { email } });
      const admin = (await withClient((c) => c.query('select * from admin_users where lower(email) = lower($1)', [email.trim()]))).rows[0];
      if (!admin || admin.status !== 'actif') { await failLog(null); res.status(401).json({ error: 'Identifiants invalides.' }); return; }
      if (admin.locked_until && new Date(admin.locked_until) > new Date()) { res.status(423).json({ error: 'Compte verrouillé, réessayez plus tard.' }); return; }
      const bump = async () => withClient((c) => c.query(
        `update admin_users set failed_attempts = failed_attempts + 1,
                locked_until = case when failed_attempts + 1 >= $2 then now() + ($3 || ' minutes')::interval else locked_until end
          where id = $1`, [admin.id, MAX_FAILED_LOGINS, String(LOCK_MINUTES)]));
      if (!(await argon2.verify(admin.password_hash, password))) { await bump(); await failLog(admin.id); res.status(401).json({ error: 'Identifiants invalides.' }); return; }
      if (!admin.totp_enabled || !admin.totp_secret) { res.status(403).json({ error: '2FA non configurée : demandez à un super admin de la réinitialiser.' }); return; }
      if (!verifyTotp(admin.totp_secret, totp)) { await bump(); await failLog(admin.id); res.status(401).json({ error: 'Code 2FA invalide.' }); return; }
      const sid = await withClient(async (c) => {
        await c.query('update admin_users set failed_attempts = 0, locked_until = null, last_login_at = now() where id = $1', [admin.id]);
        return (await c.query(
          `insert into admin_sessions (admin_id, expires_at, ip, user_agent) values ($1, now() + ($2 || ' hours')::interval, $3, $4) returning id`,
          [admin.id, String(ADMIN_SESSION_HOURS), clientIp(req), (req.headers['user-agent'] || '').slice(0, 300)])).rows[0].id;
      });
      setAdminCookie(res, await signAdminToken(admin.id, sid));
      await audit({ admin: { id: admin.id, email: admin.email }, ip: req.ip, headers: req.headers }, res, { action: 'auth.login', targetType: 'admin', targetId: admin.id });
      res.json({ id: admin.id, email: admin.email, name: admin.name, role: admin.role_code });
    } catch (err) { next(err); }
  });

  router.post('/auth/logout', async (req, res, next) => {
    try {
      const admin = await loadAdmin(req);
      if (admin) {
        await withClient((c) => c.query('update admin_sessions set revoked_at = now() where id = $1', [admin.sid]));
        req.admin = admin;
        await audit(req, res, { action: 'auth.logout', targetType: 'admin', targetId: admin.id });
      }
      clearAdminCookie(res);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  router.get('/auth/me', requireAdmin(), (req, res) => {
    const { id, email, name, role_code: role, perms } = req.admin;
    res.json({ id, email, name, role, permissions: perms });
  });

  // ───────── Utilisateurs ─────────
  router.get('/users', requireAdmin('users.read'), async (req, res, next) => {
    try {
      const { offset, limit, sort, filter } = listParams(req, ['created_at', 'DESC']);
      const params = []; const where = [];
      if (filter.q) {
        params.push(`%${String(filter.q).slice(0, 80)}%`);
        const p = `$${params.length}`;
        where.push(`(u.email ilike ${p} or u.name ilike ${p} or u.phone ilike ${p} or exists (
          select 1 from pets x left join pedigree g on g.pet_id = x.id
           where x.user_id = u.id and (x.chip ilike ${p} or g.registry_number ilike ${p} or g.chip_number ilike ${p})))`);
      }
      if (filter.status) { params.push(filter.status); where.push(`u.status = $${params.length}`); }
      if (filter.verified === true || filter.verified === 'true') where.push('u.email_verified_at is not null');
      if (filter.verified === false || filter.verified === 'false') where.push('u.email_verified_at is null');
      if (filter.method === 'google') where.push('u.google_sub is not null');
      if (filter.method === 'email') where.push('u.google_sub is null');
      if (filter.terms_version) { params.push(filter.terms_version); where.push(`u.terms_version = $${params.length}`); }
      const w = where.length ? 'where ' + where.join(' and ') : '';
      const col = ['created_at', 'email', 'name', 'status', 'last_seen_at', 'animals'].includes(sort[0]) ? sort[0] : 'created_at';
      const dir = String(sort[1]).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const out = await withClient(async (c) => {
        const total = Number((await c.query(`select count(*) from users u ${w}`, params)).rows[0].count);
        const rows = (await c.query(
          `select u.id, u.email, u.name, u.phone, u.status, u.email_verified_at, (u.google_sub is not null) as google, u.terms_version, u.created_at,
                  (select count(*) from pets p where p.user_id = u.id)::int as animals,
                  (select max(last_seen_at) from user_sessions s where s.user_id = u.id) as last_seen_at
             from users u ${w} order by ${col} ${dir} nulls last limit ${limit} offset ${offset}`, params)).rows;
        return { total, rows };
      });
      res.set('Content-Range', `users ${offset}-${offset + out.rows.length - 1}/${out.total}`).set('Access-Control-Expose-Headers', 'Content-Range');
      res.json(out.rows);
    } catch (err) { next(err); }
  });

  router.get('/users/:id', requireAdmin('users.read'), async (req, res, next) => {
    try {
      const data = await withClient(async (c) => {
        const u = (await c.query(
          `select id, email, name, first_name, last_name, phone, locale, status, suspended_at, suspension_reason, email_verified_at,
                  (google_sub is not null) as google, terms_accepted_at, terms_version, emergency_contact, preferences, created_at, updated_at
             from users where id = $1`, [req.params.id])).rows[0];
        if (!u) return null;
        const q = async (sql) => (await c.query(sql, [req.params.id])).rows;
        return {
          ...u, id: u.id,
          owner: (await q('select name, phone, email, clinic, address from owners where user_id = $1'))[0] || null,
          pets: await q('select id, local_id, name, species, race, sex, sterilise, created_at from pets where user_id = $1 order by local_id'),
          sessions: await q('select id, created_at, last_seen_at, expires_at, user_agent, ip from user_sessions where user_id = $1 and revoked_at is null and expires_at > now() order by last_seen_at desc'),
          push_subscriptions: Number((await q('select count(*) from push_subscriptions where user_id = $1'))[0].count),
          storage_bytes: Number((await q('select coalesce(sum(byte_size),0) as s from photos where user_id = $1'))[0].s),
          share_links: Number((await q('select count(*) from share_links where user_id = $1'))[0].count),
          household_members: Number((await q('select count(*) from household_members where owner_id = $1'))[0].count),
          subscription: (await q(`select id, plan_code, status, started_at, ends_at from subscriptions where user_id = $1 order by started_at desc limit 1`))[0] || null,
          audit: await q(`select id, admin_email, action, reason, created_at from admin_audit_log where target_type = 'user' and target_id = $1 order by id desc limit 20`),
        };
      });
      if (!data) { res.status(404).json({ error: 'Utilisateur introuvable.' }); return; }
      res.json(data);
    } catch (err) { next(err); }
  });

  const userAction = (name, perm, apply) => router.post(`/users/:id/${name}`, requireAdmin(perm), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const out = await withTransaction(async (c) => {
        const before = (await c.query('select id, email, status, email_verified_at, suspension_reason from users where id = $1 for update', [req.params.id])).rows[0];
        if (!before) return null;
        const after = await apply(c, before, reason);
        await audit(req, res, { action: `user.${name}`, targetType: 'user', targetId: before.id, before, after, reason }, c);
        return after;
      });
      if (!out) { res.status(404).json({ error: 'Utilisateur introuvable.' }); return; }
      res.json(out);
    } catch (err) { next(err); }
  });
  // Suspension : statut + invalidation immédiate de toutes les sessions (session_epoch).
  userAction('suspend', 'users.suspend', async (c, b, reason) => (await c.query(
    `update users set status = 'suspendu', suspended_at = now(), suspension_reason = $2, session_epoch = now() where id = $1
     returning id, email, status, suspension_reason`, [b.id, reason])).rows[0]);
  userAction('reactivate', 'users.suspend', async (c, b) => (await c.query(
    `update users set status = 'actif', suspended_at = null, suspension_reason = null where id = $1 returning id, email, status`, [b.id])).rows[0]);
  userAction('logout-everywhere', 'users.support', async (c, b) => (await c.query(
    `update users set session_epoch = now() where id = $1 returning id, email, session_epoch`, [b.id])).rows[0]);
  userAction('mark-verified', 'users.support', async (c, b) => (await c.query(
    `update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1 returning id, email, email_verified_at`, [b.id])).rows[0]);

  // ───────── Audit (lecture seule) ─────────
  router.get('/audit', requireAdmin('audit.read'), async (req, res, next) => {
    try {
      const { offset, limit, filter } = listParams(req, ['id', 'DESC']);
      const params = []; const where = [];
      for (const k of ['action', 'admin_email', 'target_type', 'target_id']) {
        if (filter[k]) { params.push(String(filter[k])); where.push(`${k} = $${params.length}`); }
      }
      if (filter.q) { params.push(`%${String(filter.q).slice(0, 80)}%`); where.push(`(action ilike $${params.length} or reason ilike $${params.length})`); }
      const w = where.length ? 'where ' + where.join(' and ') : '';
      const out = await withClient(async (c) => ({
        total: Number((await c.query(`select count(*) from admin_audit_log ${w}`, params)).rows[0].count),
        rows: (await c.query(`select *, id::text as id from admin_audit_log ${w} order by admin_audit_log.id desc limit ${limit} offset ${offset}`, params)).rows,
      }));
      res.set('Content-Range', `audit ${offset}-${offset + out.rows.length - 1}/${out.total}`).set('Access-Control-Expose-Headers', 'Content-Range');
      res.json(out.rows);
    } catch (err) { next(err); }
  });

  // ───────── Tableau de bord (indicateurs calculables aujourd'hui) ─────────
  router.get('/dashboard', requireAdmin('dashboard.read'), async (_req, res, next) => {
    try {
      const d = await withClient(async (c) => {
        const one = async (sql) => Number((await c.query(sql)).rows[0].n);
        const users = await one('select count(*) n from users');
        return {
          users, signups7: await one("select count(*) n from users where created_at > now() - interval '7 days'"),
          signups30: await one("select count(*) n from users where created_at > now() - interval '30 days'"),
          verified_ratio: users ? (await one('select count(*) n from users where email_verified_at is not null')) / users : 0,
          google_ratio: users ? (await one('select count(*) n from users where google_sub is not null')) / users : 0,
          with_pet: await one('select count(distinct user_id) n from pets'),
          active7: await one("select count(distinct user_id) n from user_sessions where last_seen_at > now() - interval '7 days'"),
          active30: await one("select count(distinct user_id) n from user_sessions where last_seen_at > now() - interval '30 days'"),
          pets_by_species: (await c.query('select coalesce(species, \'?\') as species, count(*)::int as n from pets group by 1 order by 2 desc')).rows,
          top_breeds: (await c.query('select race, count(*)::int as n from pets where race is not null group by 1 order by 2 desc limit 10')).rows,
          storage_bytes: await one('select coalesce(sum(byte_size),0) n from photos'),
          mrr_mga: await one(`select coalesce(sum(case p.period when 'annuel' then p.price_mga / 12 else p.price_mga end),0)::bigint n
                                from subscriptions s join plans p on p.code = s.plan_code where s.status = 'actif'`),
          last_reminder_job: (await c.query("select job, status, started_at, finished_at, sent, failed from job_runs order by id desc limit 1")).rows[0] || null,
        };
      });
      res.json(d);
    } catch (err) { next(err); }
  });

  // ───────── Référentiels : versions publiées ─────────
  router.get('/releases', requireAdmin('referentiels.read'), async (_req, res, next) => {
    try {
      const rows = (await withClient((c) => c.query(
        `select r.version as id, r.version, r.status, r.note, r.created_at, r.published_at, a.email as created_by_email, p.email as published_by_email
           from ref_releases r left join admin_users a on a.id = r.created_by left join admin_users p on p.id = r.published_by order by r.version desc`))).rows;
      res.set('Content-Range', `releases 0-${Math.max(rows.length - 1, 0)}/${rows.length}`).set('Access-Control-Expose-Headers', 'Content-Range');
      res.json(rows);
    } catch (err) { next(err); }
  });

  router.get('/releases/:version', requireAdmin('referentiels.read'), async (req, res, next) => {
    try {
      const r = (await withClient((c) => c.query('select version as id, version, status, note, content, created_at, published_at from ref_releases where version = $1', [req.params.version]))).rows[0];
      if (!r) { res.status(404).json({ error: 'Version introuvable.' }); return; }
      res.json(r);
    } catch (err) { next(err); }
  });

  // Fige l'état courant des tables ref_* / contenus publiés / annuaire validé en brouillon de version.
  router.post('/releases', requireAdmin('referentiels.write'), async (req, res, next) => {
    try {
      const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : null;
      const row = await withTransaction(async (c) => {
        const content = await buildReleaseContent(c);
        const r = (await c.query(
          `insert into ref_releases (status, note, content, created_by) values ('draft', $1, $2, $3) returning version as id, version, status, note, created_at`,
          [note, JSON.stringify(content), req.admin.id])).rows[0];
        await audit(req, res, { action: 'release.create_draft', targetType: 'release', targetId: r.version, after: { note, counts: content.counts } }, c);
        return r;
      });
      res.status(201).json(row);
    } catch (err) { next(err); }
  });

  // Publication : principe des quatre yeux (le publieur ≠ l'auteur du brouillon) tant que four_eyes_publish = true.
  router.post('/releases/:version/publish', requireAdmin('referentiels.publish'), async (req, res, next) => {
    try {
      const out = await withTransaction(async (c) => {
        const r = (await c.query('select version, status, created_by from ref_releases where version = $1 for update', [req.params.version])).rows[0];
        if (!r) return { code: 404, error: 'Version introuvable.' };
        if (r.status !== 'draft') return { code: 409, error: 'Seul un brouillon peut être publié.' };
        if ((await getSetting(c, 'four_eyes_publish', true)) === true && r.created_by === req.admin.id) {
          return { code: 403, error: 'Principe des quatre yeux : la publication doit être faite par un autre administrateur que l\'auteur du brouillon.' };
        }
        await c.query("update ref_releases set status = 'archived' where status = 'published'");
        const pub = (await c.query(
          `update ref_releases set status = 'published', published_by = $2, published_at = now() where version = $1 returning version as id, version, status, published_at`,
          [r.version, req.admin.id])).rows[0];
        await audit(req, res, { action: 'release.publish', targetType: 'release', targetId: r.version, after: pub }, c);
        return { code: 200, body: pub };
      });
      if (out.error) { res.status(out.code).json({ error: out.error }); return; }
      res.json(out.body);
    } catch (err) { next(err); }
  });

  // ───────── Abonnements : matrice des droits, souscription manuelle, paiement + reçu ─────────
  router.get('/plans/:code/features', requireAdmin('billing.read'), async (req, res, next) => {
    try {
      res.json((await withClient((c) => c.query(
        `select f.code as feature_code, f.label, f.kind, coalesce(pf.enabled,false) as enabled, pf.quota
           from features f left join plan_features pf on pf.feature_code = f.code and pf.plan_code = $1 order by f.code`, [req.params.code]))).rows);
    } catch (err) { next(err); }
  });

  router.put('/plans/:code/features', requireAdmin('billing.plans_write'), async (req, res, next) => {
    try {
      const items = Array.isArray(req.body) ? req.body : req.body?.features;
      if (!Array.isArray(items)) { res.status(400).json({ error: 'Liste de fonctionnalités attendue.' }); return; }
      await withTransaction(async (c) => {
        const before = (await c.query('select feature_code, enabled, quota from plan_features where plan_code = $1 order by feature_code', [req.params.code])).rows;
        for (const it of items) {
          await c.query(
            `insert into plan_features (plan_code, feature_code, enabled, quota) values ($1,$2,$3,$4)
             on conflict (plan_code, feature_code) do update set enabled = excluded.enabled, quota = excluded.quota`,
            [req.params.code, String(it.feature_code), it.enabled === true, it.quota == null || it.quota === '' ? null : Number(it.quota)]);
        }
        await audit(req, res, { action: 'plan.features_update', targetType: 'plan', targetId: req.params.code, before, after: items }, c);
      });
      res.json({ ok: true });
    } catch (err) {
      if (err.code === '23503') { res.status(400).json({ error: 'Formule ou fonctionnalité inconnue.' }); return; }
      next(err);
    }
  });

  router.post('/users/:id/subscription', requireAdmin('billing.payment'), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const { plan_code: plan, status = 'actif', ends_at: endsAt = null } = req.body || {};
      const row = await withTransaction(async (c) => {
        await c.query("update subscriptions set status = 'resilie' where user_id = $1 and status in ('essai','actif')", [req.params.id]);
        const s = (await c.query(
          'insert into subscriptions (user_id, plan_code, status, ends_at) values ($1,$2,$3,$4) returning id, user_id, plan_code, status, started_at, ends_at',
          [req.params.id, plan, status, endsAt])).rows[0];
        await audit(req, res, { action: 'subscription.assign', targetType: 'user', targetId: req.params.id, after: s, reason }, c);
        return s;
      });
      res.status(201).json(row);
    } catch (err) {
      if (err.code === '23503') { res.status(400).json({ error: 'Utilisateur ou formule inconnu.' }); return; }
      next(err);
    }
  });

  router.post('/subscriptions/:id/payments', requireAdmin('billing.payment'), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const amount = Number(req.body?.amount_mga);
      if (!Number.isInteger(amount) || amount <= 0) { res.status(400).json({ error: 'Montant en ariary (entier > 0) requis.' }); return; }
      const method = ['mvola', 'orange_money', 'airtel_money', 'carte', 'especes'].includes(req.body?.method) ? req.body.method : 'especes';
      const out = await withTransaction(async (c) => {
        const sub = (await c.query('select id, user_id from subscriptions where id = $1', [req.params.id])).rows[0];
        if (!sub) return null;
        const pay = (await c.query(
          `insert into payments (subscription_id, user_id, amount_mga, method, reference, entered_by) values ($1,$2,$3,$4,$5,$6) returning *`,
          [sub.id, sub.user_id, amount, method, req.body?.reference || null, req.admin.id])).rows[0];
        const seq = (await c.query("select nextval('invoice_number_seq') as n")).rows[0].n;
        const inv = (await c.query(
          `insert into invoices (number, user_id, payment_id, amount_mga) values ($1,$2,$3,$4) returning id, number, amount_mga, issued_at`,
          [`F-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`, sub.user_id, pay.id, amount])).rows[0];
        await audit(req, res, { action: 'payment.manual_entry', targetType: 'subscription', targetId: sub.id, after: { payment: pay.id, invoice: inv.number, amount }, reason }, c);
        return { payment: pay, invoice: inv };
      });
      if (!out) { res.status(404).json({ error: 'Abonnement introuvable.' }); return; }
      res.status(201).json(out);
    } catch (err) { next(err); }
  });

  mountAdminUsers(router);
  router.use(buildResourceRouter());
  router.use((err, _req, res, _next) => { console.error('admin', err); res.status(500).json({ error: 'Erreur serveur.' }); });
  return router;
}
