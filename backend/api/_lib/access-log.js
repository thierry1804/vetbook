// Journal d'accès public (access_log) : navigation front (connecté ou non) + appels API publics
// marquants. Distinct de admin_audit_log (actions du backoffice) — voir backend/db/admin.sql.
// Ne doit jamais faire échouer la requête réelle : toute erreur d'écriture est avalée et logguée.
import { withClient } from './db.js';
import { clientIp } from './admin-auth.js';

export async function logAccess({ kind, action, path = null, userId = null, ip = null, userAgent = null, meta = null }) {
  try {
    await withClient((c) => c.query(
      `insert into access_log (kind, action, path, user_id, ip, user_agent, meta) values ($1,$2,$3,$4,$5,$6,$7)`,
      [kind, action, path, userId, ip, userAgent, meta == null ? null : JSON.stringify(meta)]
    ));
  } catch (err) {
    console.error('access-log', err);
  }
}

// Middleware : journalise automatiquement l'issue (succès/échec selon le code HTTP) d'une route
// publique marquante, sans toucher au handler. `action` est un préfixe stable (ex. "auth.login").
export function trackAccess(action) {
  return (req, res, next) => {
    res.on('finish', () => {
      const outcome = res.statusCode < 400 ? 'ok' : 'echec';
      logAccess({
        kind: 'api', action: `${action}.${outcome}`, path: req.originalUrl,
        ip: clientIp(req), userAgent: req.headers['user-agent'] || null, meta: { status: res.statusCode },
      });
    });
    next();
  };
}
