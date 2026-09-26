// Gestion des comptes administrateurs (super admin uniquement) et changement de son propre mot de passe.
// Les secrets générés (mot de passe provisoire, secret TOTP) ne sont renvoyés qu'une fois, à la création ou à la réinitialisation.
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { withClient, withTransaction } from '../_lib/db.js';
import { requireAdmin, audit, requireReason, ROLES } from '../_lib/admin-auth.js';
import { newTotpSecret, otpauthUrl } from '../_lib/totp.js';

const PERM = 'admins.manage';
const MIN_PASSWORD = 12;
const COLS = 'id, email, name, role_code, status, totp_enabled, failed_attempts, locked_until, last_login_at, created_at';
const emailOk = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const newPassword = () => crypto.randomBytes(15).toString('base64url');
const hash = (p) => argon2.hash(p, { type: argon2.argon2id });

export function mountAdminUsers(router) {
  const revokeSessions = (c, adminId, exceptSid = null) =>
    c.query('update admin_sessions set revoked_at = now() where admin_id = $1 and revoked_at is null and ($2::uuid is null or id <> $2::uuid)', [adminId, exceptSid]);
  const activeSupers = async (c, exceptId) =>
    Number((await c.query("select count(*) n from admin_users where role_code = 'super_admin' and status = 'actif' and id <> $1", [exceptId])).rows[0].n);

  router.get('/roles', requireAdmin(), (_req, res) => {
    res.json(Object.entries(ROLES).map(([code, r]) => ({ code, label: r.label, permissions: r.perms })));
  });

  // Changement de son propre mot de passe : mot de passe actuel exigé, les autres sessions sont fermées.
  router.post('/auth/change-password', requireAdmin(), async (req, res, next) => {
    try {
      const { current, next: next_ } = req.body || {};
      if (typeof current !== 'string' || typeof next_ !== 'string') { res.status(400).json({ error: 'Mot de passe actuel et nouveau requis.' }); return; }
      if (next_.length < MIN_PASSWORD) { res.status(400).json({ error: `Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD} caractères.` }); return; }
      if (next_ === current) { res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel.' }); return; }
      const row = (await withClient((c) => c.query('select password_hash from admin_users where id = $1', [req.admin.id]))).rows[0];
      if (!row || !(await argon2.verify(row.password_hash, current))) { res.status(403).json({ error: 'Mot de passe actuel incorrect.' }); return; }
      const h = await hash(next_);
      await withTransaction(async (c) => {
        await c.query('update admin_users set password_hash = $2 where id = $1', [req.admin.id, h]);
        await revokeSessions(c, req.admin.id, req.admin.sid);
        await audit(req, res, { action: 'admin.password_change', targetType: 'admin', targetId: req.admin.id }, c);
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  router.get('/admins', requireAdmin(PERM), async (req, res, next) => {
    try {
      const rows = (await withClient((c) => c.query(`select ${COLS} from admin_users order by created_at`))).rows;
      res.set('Content-Range', `admins 0-${Math.max(rows.length - 1, 0)}/${rows.length}`).set('Access-Control-Expose-Headers', 'Content-Range');
      res.json(rows);
    } catch (err) { next(err); }
  });

  router.get('/admins/:id', requireAdmin(PERM), async (req, res, next) => {
    try {
      const out = await withClient(async (c) => {
        const a = (await c.query(`select ${COLS} from admin_users where id = $1`, [req.params.id])).rows[0];
        if (!a) return null;
        a.sessions = (await c.query('select id, created_at, expires_at, ip, user_agent from admin_sessions where admin_id = $1 and revoked_at is null and expires_at > now() order by created_at desc', [a.id])).rows;
        a.audit = (await c.query("select id, action, reason, created_at from admin_audit_log where admin_id = $1 order by id desc limit 15", [a.id])).rows;
        return a;
      });
      if (!out) { res.status(404).json({ error: 'Administrateur introuvable.' }); return; }
      res.json(out);
    } catch (err) { next(err); }
  });

  router.post('/admins', requireAdmin(PERM), async (req, res, next) => {
    try {
      const { email, name, role_code: role } = req.body || {};
      if (!emailOk(email)) { res.status(400).json({ error: 'Adresse e-mail invalide.' }); return; }
      if (typeof name !== 'string' || !name.trim()) { res.status(400).json({ error: 'Nom requis.' }); return; }
      if (!ROLES[role]) { res.status(400).json({ error: 'Rôle inconnu.' }); return; }
      const password = newPassword(); const secret = newTotpSecret();
      const created = await withTransaction(async (c) => {
        const a = (await c.query(
          `insert into admin_users (email, name, password_hash, role_code, totp_secret, totp_enabled) values ($1,$2,$3,$4,$5,true) returning ${COLS}`,
          [email.trim().toLowerCase(), name.trim().slice(0, 120), await hash(password), role, secret])).rows[0];
        await audit(req, res, { action: 'admin.create', targetType: 'admin', targetId: a.id, after: { email: a.email, role } }, c);
        return a;
      });
      res.status(201).json({ ...created, credentials: { password, totp_secret: secret, otpauth_url: otpauthUrl(secret, created.email) } });
    } catch (err) {
      if (err.code === '23505') { res.status(409).json({ error: 'Un administrateur avec cette adresse existe déjà.' }); return; }
      next(err);
    }
  });

  router.put('/admins/:id', requireAdmin(PERM), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const { name, role_code: role, status } = req.body || {};
      if (role !== undefined && !ROLES[role]) { res.status(400).json({ error: 'Rôle inconnu.' }); return; }
      if (status !== undefined && !['actif', 'desactive'].includes(status)) { res.status(400).json({ error: 'Statut inconnu.' }); return; }
      const out = await withTransaction(async (c) => {
        const before = (await c.query(`select ${COLS} from admin_users where id = $1 for update`, [req.params.id])).rows[0];
        if (!before) return { code: 404, error: 'Administrateur introuvable.' };
        const nextRole = role ?? before.role_code, nextStatus = status ?? before.status;
        const losesPower = before.status === 'actif' && before.role_code === 'super_admin' && (nextRole !== 'super_admin' || nextStatus !== 'actif');
        if (before.id === req.admin.id && (nextRole !== before.role_code || nextStatus !== 'actif')) return { code: 400, error: 'Tu ne peux pas modifier ton propre rôle ni te désactiver.' };
        if (losesPower && (await activeSupers(c, before.id)) === 0) return { code: 400, error: 'Il doit rester au moins un super admin actif.' };
        const after = (await c.query(`update admin_users set name = $2, role_code = $3, status = $4 where id = $1 returning ${COLS}`,
          [before.id, typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : before.name, nextRole, nextStatus])).rows[0];
        if (nextRole !== before.role_code || nextStatus !== before.status) await revokeSessions(c, before.id);
        await audit(req, res, { action: 'admin.update', targetType: 'admin', targetId: before.id, before, after, reason }, c);
        return { code: 200, body: after };
      });
      if (out.error) { res.status(out.code).json({ error: out.error }); return; }
      res.json(out.body);
    } catch (err) { next(err); }
  });

  // Nouveau mot de passe provisoire + nouveau secret TOTP (perte de téléphone, compte compromis) ; déverrouille le compte.
  router.post('/admins/:id/reset-credentials', requireAdmin(PERM), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const password = newPassword(); const secret = newTotpSecret();
      const out = await withTransaction(async (c) => {
        const a = (await c.query(
          `update admin_users set password_hash = $2, totp_secret = $3, totp_enabled = true, failed_attempts = 0, locked_until = null where id = $1 returning ${COLS}`,
          [req.params.id, await hash(password), secret])).rows[0];
        if (!a) return null;
        await revokeSessions(c, a.id, a.id === req.admin.id ? req.admin.sid : null);
        await audit(req, res, { action: 'admin.reset_credentials', targetType: 'admin', targetId: a.id, reason }, c);
        return a;
      });
      if (!out) { res.status(404).json({ error: 'Administrateur introuvable.' }); return; }
      res.json({ ...out, credentials: { password, totp_secret: secret, otpauth_url: otpauthUrl(secret, out.email) } });
    } catch (err) { next(err); }
  });

  router.post('/admins/:id/unlock', requireAdmin(PERM), async (req, res, next) => {
    try {
      const a = (await withClient((c) => c.query(`update admin_users set failed_attempts = 0, locked_until = null where id = $1 returning ${COLS}`, [req.params.id]))).rows[0];
      if (!a) { res.status(404).json({ error: 'Administrateur introuvable.' }); return; }
      await audit(req, res, { action: 'admin.unlock', targetType: 'admin', targetId: a.id });
      res.json(a);
    } catch (err) { next(err); }
  });

  router.post('/admins/:id/revoke-sessions', requireAdmin(PERM), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      await withTransaction(async (c) => {
        await revokeSessions(c, req.params.id, req.params.id === req.admin.id ? req.admin.sid : null);
        await audit(req, res, { action: 'admin.revoke_sessions', targetType: 'admin', targetId: req.params.id, reason }, c);
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });
}
