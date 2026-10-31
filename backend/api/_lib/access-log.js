// Journal d'accès public (access_log) : navigation front (connecté ou non) + appels API publics
// marquants. Distinct de admin_audit_log (actions du backoffice) — voir backend/db/admin.sql.
// Ne doit jamais faire échouer la requête réelle : toute erreur d'écriture est avalée et logguée.
import geoip from 'geoip-lite';
import { withClient } from './db.js';
import { clientIp } from './admin-auth.js';

// Géolocalisation approximative (pays/région/ville) depuis une base locale embarquée (geoip-lite) :
// aucun appel externe, aucune IP envoyée à un tiers. Échoue silencieusement sur IP privée/invalide.
function geoFor(ip) {
  if (!ip) return null;
  try {
    const g = geoip.lookup(ip);
    return g ? { country: g.country || null, region: g.region || null, city: g.city || null } : null;
  } catch { return null; }
}

export async function logAccess({ kind, action, path = null, userId = null, ip = null, userAgent = null, meta = null }) {
  try {
    const geo = geoFor(ip);
    const fullMeta = geo ? { ...(meta || {}), geo } : meta;
    await withClient((c) => c.query(
      `insert into access_log (kind, action, path, user_id, ip, user_agent, meta) values ($1,$2,$3,$4,$5,$6,$7)`,
      [kind, action, path, userId, ip, userAgent, fullMeta == null ? null : JSON.stringify(fullMeta)]
    ));
  } catch (err) {
    console.error('access-log', err);
  }
  maybePurge();
}

// Purge : pas de cron sur cet hôte, donc portée par le trafic lui-même — un contrôle en mémoire
// (pas de requête DB) limite l'opération réelle à une fois toutes les 6h, quel que soit le volume.
const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const RETENTION_INTERVAL = '3 months';
let lastPurgeAt = 0;
async function maybePurge() {
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
  lastPurgeAt = now;
  try {
    const { rowCount } = await withClient((c) => c.query(`delete from access_log where created_at < now() - interval '${RETENTION_INTERVAL}'`));
    if (rowCount) console.log(`access-log: purge de ${rowCount} ligne(s) de plus de ${RETENTION_INTERVAL}`);
  } catch (err) {
    console.error('access-log purge', err);
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
