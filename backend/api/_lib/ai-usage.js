import { withClient, withTransaction } from './db.js';

export const AI_REQUESTS_PER_MINUTE = 15;
// La lecture du carnet a son propre budget : un scan ne doit pas priver l'assistant (ni l'inverse).
export const BOOKLET_REQUESTS_PER_MINUTE = 10;
export const AI_RETENTION_DAYS = 30;

// The same rolling budget is shared by all API processes and administrative test calls.
export async function reserveAiAttempt({ source, model }) {
  return withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(17236, 3)');
    const booklet = source === 'booklet';
    const usage = (await client.query(`select count(*)::int as used, min(created_at) + interval '60 seconds' as reset_at from ai_usage_log
      where created_at > clock_timestamp() - interval '60 seconds' and (source = 'booklet') = $1`, [booklet])).rows[0];
    if (usage.used >= (booklet ? BOOKLET_REQUESTS_PER_MINUTE : AI_REQUESTS_PER_MINUTE)) {
      const error = new Error('Budget local de l’assistant atteint. Réessaie dans une minute.');
      error.status = 429; error.retryAfter = Math.max(1, Math.ceil((new Date(usage.reset_at).getTime() - Date.now()) / 1000)); throw error;
    }
    await client.query("delete from ai_usage_log where created_at < clock_timestamp() - interval '30 days'");
    return (await client.query('insert into ai_usage_log (source, model) values ($1, $2) returning id', [source, String(model).slice(0, 200)])).rows[0].id;
  });
}
export async function finishAiAttempt(id, status, httpStatus = null) {
  // A tracking outage after delivery must not turn a successful reply into a failed request.
  try {
    await withClient((client) => client.query('update ai_usage_log set finished_at = clock_timestamp(), status = $2, http_status = $3 where id = $1', [id, status, httpStatus]));
  } catch { console.error('Impossible de finaliser le suivi d’un appel IA.'); }
}
export async function getAiUsage() {
  const row = await withClient(async (client) => (await client.query(`select
    count(*) filter (where created_at > now() - interval '60 seconds' and source <> 'booklet')::int as minute_used,
    min(created_at) filter (where created_at > now() - interval '60 seconds' and source <> 'booklet') + interval '60 seconds' as reset_at,
    count(*) filter (where created_at > now() - interval '24 hours')::int as day_attempts,
    count(*) filter (where created_at > now() - interval '24 hours' and status = 'success')::int as day_success,
    count(*) filter (where created_at > now() - interval '24 hours' and status = 'error')::int as day_errors,
    count(*) filter (where created_at > now() - interval '24 hours' and status = 'pending')::int as day_pending,
    min(created_at) as observed_since from ai_usage_log where created_at > now() - interval '30 days'`)).rows[0]);
  return { minute: { used: row.minute_used, limit: AI_REQUESTS_PER_MINUTE, remaining: Math.max(0, AI_REQUESTS_PER_MINUTE - row.minute_used), resetAt: row.reset_at },
    day: { attempts: row.day_attempts, success: row.day_success, errors: row.day_errors, pending: row.day_pending },
    observedSince: row.observed_since, retentionDays: AI_RETENTION_DAYS, updatedAt: new Date().toISOString() };
}
