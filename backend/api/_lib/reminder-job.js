import { withClient } from './db.js';
import { runReminders } from './reminders.js';

// Both cron and HTTP share one database lock. The audit callback runs before any delivery.
export async function executeReminderJob({ trigger = 'cron', reason = null, beforeRun } = {}, dependencies = {}) {
  const connect = dependencies.withClient || withClient;
  const run = dependencies.runReminders || runReminders;
  return connect(async (client) => {
    const locked = (await client.query('select pg_try_advisory_lock(17236, 2) as locked')).rows[0].locked;
    if (!locked) { const error = new Error('Une exécution des rappels est déjà en cours.'); error.status = 409; throw error; }
    try {
      const details = { trigger, reason };
      const runId = (await client.query("insert into job_runs (job, details) values ('send-reminders', $1) returning id", [JSON.stringify(details)])).rows[0].id;
      let result;
      try {
        if (beforeRun) await beforeRun(runId);
        result = await run({ runId });
      } catch (error) {
        try { await client.query("update job_runs set finished_at = now(), status = 'echec', failed = 1, details = $2 where id = $1", [runId, JSON.stringify({ ...details, error: String(error.message || error), delivery: error.delivery })]); }
        catch (trackingError) { console.error('job tracking', trackingError.message); }
        throw error;
      }
      const processed = (result.usersNotified || 0) + (result.monthlySummariesSent || 0) + (result.dogEventsUsersNotified || 0);
      const failed = (result.delivery?.email?.failed || 0) + (result.delivery?.push?.failed || 0);
      let trackingError = false;
      try {
        await client.query('update job_runs set finished_at = now(), status = $2, sent = $3, failed = $4, details = $5 where id = $1',
          [runId, failed ? 'partial' : 'ok', processed, failed, JSON.stringify({ ...details, ...result })]);
      } catch (error) { trackingError = true; console.error('job tracking after delivery', error.message); }
      return { runId, result, trackingError };
    } finally {
      try { await client.query('select pg_advisory_unlock(17236, 2)'); }
      catch (error) { console.error('job lock release', error.message); }
    }
  });
}
