// Suivi d'erreurs optionnel (Sentry ou service compatible) : actif seulement si SENTRY_DSN est défini.
// Aucune donnée personnelle n'est envoyée : pas de PII par défaut, ni corps de requête, ni cookies, ni en-têtes.
import { log } from './observability.js';

let sentry = null;

export async function initErrorTracking() {
  if (!process.env.SENTRY_DSN) return false;
  try {
    sentry = await import('@sentry/node');
    sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      release: process.env.APP_VERSION || undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request) { delete event.request.data; delete event.request.cookies; delete event.request.headers; delete event.request.query_string; }
        delete event.user;
        return event;
      },
    });
    log.info('suivi d’erreurs activé');
    return true;
  } catch (err) {
    log.warn('suivi d’erreurs indisponible', { err });
    sentry = null;
    return false;
  }
}

export function captureError(err, context = {}) {
  if (sentry) sentry.captureException(err, { tags: { requestId: context.requestId || undefined } });
}

export async function flushErrors(timeoutMs = 2000) {
  if (sentry) await sentry.flush(timeoutMs).catch(() => {});
}
