// Lancement manuel du job de rappels (normalement un cron système — voir scripts/send-reminders.mjs).
// Reprend exactement la même logique et le même suivi (table job_runs) que le script cron, pour que
// l'historique reste cohérent qu'il s'agisse d'un déclenchement automatique ou manuel.
import { withClient } from '../_lib/db.js';
import { requireAdmin, audit, requireReason } from '../_lib/admin-auth.js';
import { runReminders } from '../_lib/reminders.js';

export function mountJobs(router) {
  router.post('/jobs/run', requireAdmin('notifications.resend'), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const runId = (await withClient((c) => c.query("insert into job_runs (job) values ('send-reminders') returning id"))).rows[0].id;
      try {
        const result = await runReminders();
        const sent = (result.usersNotified || 0) + (result.monthlySummariesSent || 0) + (result.dogEventsUsersNotified || 0);
        await withClient((c) => c.query(
          "update job_runs set finished_at = now(), status = 'ok', sent = $2, details = $3 where id = $1", [runId, sent, JSON.stringify(result)]));
        await audit(req, res, { action: 'jobs.run', targetType: 'job', targetId: 'send-reminders', after: { sent }, reason });
        res.json({ ok: true, result });
      } catch (err) {
        await withClient((c) => c.query(
          "update job_runs set finished_at = now(), status = 'echec', failed = 1, details = $2 where id = $1", [runId, JSON.stringify({ error: String(err && err.message || err) })]));
        throw err;
      }
    } catch (err) { next(err); }
  });
}
