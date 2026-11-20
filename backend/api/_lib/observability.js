// Journaux JSON (une ligne par événement, lisibles par n'importe quel collecteur), identifiant de requête,
// gestion centrale des erreurs et sonde de disponibilité. Sans dépendance.
import crypto from 'node:crypto';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const serializeError = (e) => (e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : e);

export function createLogger({ write = (line) => process.stdout.write(line + '\n'), level = process.env.LOG_LEVEL || 'info' } = {}) {
  const min = LEVELS[level] || LEVELS.info;
  const emit = (lvl) => (msg, fields = {}) => {
    if (LEVELS[lvl] < min) return;
    const out = { level: lvl, time: new Date().toISOString(), msg };
    for (const [k, v] of Object.entries(fields)) out[k] = k === 'err' ? serializeError(v) : v;
    write(JSON.stringify(out));
  };
  return { debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error') };
}

export const log = createLogger();

// Chemin sans query string : elle peut porter des jetons (vérification d'e-mail, réinitialisation, partage).
const pathOf = (req) => String(req.originalUrl || req.url || '').split('?')[0];

export function requestLogger({ logger = log } = {}) {
  return function requestLog(req, res, next) {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const path = pathOf(req);
      if (path === '/api/health' || path === '/api/ready') return;
      const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e5) / 10;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level]('request', { requestId: req.id, method: req.method, path, status: res.statusCode, ms });
    });
    next();
  };
}

export function errorHandler({ logger = log, onError } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function handleError(err, req, res, _next) {
    logger.error('erreur non gérée', { requestId: req.id, method: req.method, path: pathOf(req), err });
    if (onError) onError(err, req);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Erreur interne. Réessaie dans un instant.', requestId: req.id });
  };
}

// Disponibilité (≠ /api/health, qui dit seulement que le processus répond) : la base doit répondre.
export function readyHandler({ check, logger = log }) {
  return async function ready(_req, res) {
    try {
      await check();
      res.json({ ok: true });
    } catch (err) {
      logger.error('service non prêt', { err });
      res.status(503).json({ ok: false });
    }
  };
}
