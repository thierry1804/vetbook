// Schedule from the backend directory: 0 8 * * * cd /path/backend && node scripts/send-reminders.mjs
// The same lock, delivery tracking and execution history are used by the admin console.
import 'dotenv/config';
import { executeReminderJob } from '../api/_lib/reminder-job.js';

try {
  const out = await executeReminderJob({ trigger: 'cron' });
  console.log(new Date().toISOString(), 'OK', JSON.stringify(out));
  process.exit(out.trackingError ? 1 : 0);
} catch (error) {
  console.error(new Date().toISOString(), 'ÉCHEC', error.message);
  process.exit(1);
}
