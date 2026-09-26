// CLI de rappels quotidiens — à appeler depuis la crontab système du VPS,
// pas depuis une requête HTTP (plus de Vercel Cron). Voir la logique dans
// api/_lib/reminders.js.
//
// Exemple de crontab (tous les jours à 8h locale) :
//   0 8 * * *  cd /chemin/vers/applika && node scripts/send-reminders.mjs >> logs/reminders.log 2>&1
//
// Charge les variables d'environnement depuis .env (DATABASE_URL,
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) — inutile d'exporter
// quoi que ce soit dans le shell de la crontab.
import 'dotenv/config';
import { runReminders } from '../api/_lib/reminders.js';
import { withClient } from '../api/_lib/db.js';

// Suivi d'exécution pour le backoffice (table job_runs). Best-effort : le cron ne doit jamais échouer à cause du suivi.
async function track(fn) { try { return await fn(); } catch (e) { console.error('job_runs', e && e.message); return null; } }
const runId = await track(() => withClient(async (c) => (await c.query("insert into job_runs (job) values ('send-reminders') returning id")).rows[0].id));

try {
  const result = await runReminders();
  console.log(new Date().toISOString(), 'OK', JSON.stringify(result));
  await track(() => withClient((c) => c.query(
    "update job_runs set finished_at = now(), status = 'ok', sent = $2, details = $3 where id = $1",
    [runId, (result.usersNotified || 0) + (result.monthlySummariesSent || 0) + (result.dogEventsUsersNotified || 0), JSON.stringify(result)])));
  process.exit(0);
} catch (err) {
  console.error(new Date().toISOString(), 'ÉCHEC', err);
  await track(() => withClient((c) => c.query("update job_runs set finished_at = now(), status = 'echec', failed = 1, details = $2 where id = $1", [runId, JSON.stringify({ error: String(err && err.message || err) })])));
  process.exit(1);
}
