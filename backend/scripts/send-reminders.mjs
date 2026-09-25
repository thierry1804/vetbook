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

try {
  const result = await runReminders();
  console.log(new Date().toISOString(), 'OK', JSON.stringify(result));
  process.exit(0);
} catch (err) {
  console.error(new Date().toISOString(), 'ÉCHEC', err);
  process.exit(1);
}
