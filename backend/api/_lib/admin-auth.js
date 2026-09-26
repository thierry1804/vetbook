// Authentification, RBAC et audit du backoffice. Cookie et clé de signature distincts de ceux
// des utilisateurs : un jeton utilisateur ne donne jamais accès à /api/admin.
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { withClient } from './db.js';

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_SESSION_HOURS = 8;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

// ── Rôles et permissions (module.action) — matrice de la spec, section « Rôles et permissions ».
// '*' = tout ; 'module.*' = toutes les actions du module.
export const ROLES = {
  super_admin: { label: 'Super admin', perms: ['*'] },
  admin_tech: {
    label: 'Admin technique',
    perms: ['dashboard.read', 'users.read', 'pets.read', 'referentiels.read', 'notifications.read', 'notifications.templates',
      'sharing.read', 'storage.*', 'system.*', 'audit.read', 'rgpd.execute', 'billing.read', 'billing.integrations'],
  },
  support: {
    label: 'Support',
    perms: ['dashboard.read', 'users.read', 'users.support', 'users.suspend', 'pets.read_reason', 'referentiels.read', 'contents.read',
      'directory.*', 'notifications.read', 'notifications.resend', 'sharing.read', 'sharing.revoke', 'storage.moderate',
      'rgpd.instruct', 'billing.read', 'billing.payment', 'billing.extend'],
  },
  editor: {
    label: 'Éditeur contenu',
    perms: ['dashboard.read', 'referentiels.read', 'referentiels.write', 'contents.read', 'contents.write', 'contents.publish',
      'directory.read', 'directory.write', 'notifications.campaigns'],
  },
  vet_referent: {
    label: 'Référent vétérinaire',
    perms: ['dashboard.read', 'pets.read_anon', 'referentiels.read', 'referentiels.write', 'referentiels.publish',
      'contents.read', 'contents.review', 'directory.read', 'directory.validate'],
  },
  analyst: {
    label: 'Analyste',
    perms: ['dashboard.read', 'users.aggregate', 'pets.aggregate', 'notifications.stats', 'sharing.aggregate', 'billing.aggregate'],
  },
  commercial: {
    label: 'Gestionnaire commercial',
    perms: ['dashboard.read', 'users.read', 'billing.read', 'billing.payment', 'billing.plans_write', 'billing.refund', 'billing.export'],
  },
};

export function permits(perms, needed) {
  if (!needed) return true;
  const [mod] = needed.split('.');
  return perms.some((p) => p === '*' || p === needed || p === `${mod}.*`);
}

function secretKey() {
  const s = process.env.ADMIN_JWT_SECRET || (process.env.JWT_SECRET ? crypto.createHash('sha256').update(process.env.JWT_SECRET + ':admin').digest('hex') : '');
  if (!s) throw new Error('ADMIN_JWT_SECRET (ou JWT_SECRET) manquant.');
  return new TextEncoder().encode(s);
}

export async function signAdminToken(adminId, sid) {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(secretKey());
}

export function setAdminCookie(res, token) {
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: ADMIN_SESSION_HOURS * 3600 * 1000,
  });
}

export function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/api/admin' });
}

export function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() || null;
}

// Charge l'admin de la requête (cookie → JWT → session non révoquée, admin actif) ou null.
export async function loadAdmin(req) {
  const token = req.cookies && req.cookies[ADMIN_COOKIE];
  if (!token) return null;
  let claims;
  try { claims = (await jwtVerify(token, secretKey())).payload; } catch { return null; }
  return withClient(async (c) => {
    const { rows } = await c.query(
      `select a.id, a.email, a.name, a.role_code, s.id as sid
         from admin_sessions s join admin_users a on a.id = s.admin_id
        where s.id = $1 and a.id = $2 and s.revoked_at is null and s.expires_at > now() and a.status = 'actif'`,
      [claims.sid, claims.sub]
    );
    if (!rows[0]) return null;
    const perms = (await c.query('select permission from admin_role_permissions where role_code = $1', [rows[0].role_code])).rows.map((r) => r.permission);
    return { ...rows[0], perms };
  });
}

// Middleware : impose une session admin (et éventuellement une permission).
export function requireAdmin(permission) {
  return async (req, res, next) => {
    try {
      const admin = await loadAdmin(req);
      if (!admin) { res.status(401).json({ error: 'Non authentifié.' }); return; }
      if (!permits(admin.perms, permission)) { res.status(403).json({ error: `Permission requise : ${permission}.` }); return; }
      req.admin = admin;
      next();
    } catch (err) { next(err); }
  };
}

// Écrit une ligne d'audit. `client` optionnel (dans une transaction) ; marque la requête comme auditée
// pour que le middleware de secours n'ajoute pas de doublon.
export async function audit(req, res, { action, targetType = null, targetId = null, before = null, after = null, reason = null }, client = null) {
  const run = (c) => c.query(
    `insert into admin_audit_log (admin_id, admin_email, action, target_type, target_id, before, after, reason, ip)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [req.admin && req.admin.id, req.admin && req.admin.email, action, targetType, targetId == null ? null : String(targetId),
      before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), reason, clientIp(req)]
  );
  if (client) await run(client); else await withClient(run);
  if (res && res.locals) res.locals.audited = true;
}

// Middleware de secours : toute requête d'écriture admin réussie qui n'a pas produit d'audit détaillé
// laisse une trace (méthode + chemin + statut) — « traçabilité sans oubli possible ».
export function auditFallback(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') { next(); return; }
  res.on('finish', () => {
    if (res.locals.audited || !req.admin || res.statusCode >= 400) return;
    audit(req, null, { action: `${req.method} ${req.baseUrl}${req.path}`, after: { status: res.statusCode } }).catch((e) => console.error('audit fallback', e));
  });
  next();
}

export function requireReason(req, res) {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5) { res.status(400).json({ error: 'Un motif (5 caractères min.) est obligatoire pour cette action.' }); return null; }
  return reason;
}
