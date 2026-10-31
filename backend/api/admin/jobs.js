import { requireAdmin, audit, requireReason } from '../_lib/admin-auth.js';
import { executeReminderJob } from '../_lib/reminder-job.js';

export function mountJobs(router) {
  router.post('/jobs/run', requireAdmin('notifications.resend'), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const out = await executeReminderJob({ trigger: 'manual', reason,
        beforeRun: (runId) => audit(req, res, { action: 'jobs.run', targetType: 'jobs', targetId: runId, after: { status: 'running' }, reason }),
      });
      res.json({ ok: true, ...out });
    } catch (error) {
      if (error.status === 409) return res.status(409).json({ error: error.message });
      next(error);
    }
  });
}
