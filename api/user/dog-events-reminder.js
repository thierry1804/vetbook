// GET  /api/user/dog-events-reminder   -> { dogEventsReminder: boolean }
// POST /api/user/dog-events-reminder  { dogEventsReminder }
// Préférence de compte (pas liée à un animal précis) : rappel groupé
// mensuel des événements canins du calendrier. Voir db/schema.sql
// (users.dog_events_reminder) et api/cron/send-reminders.js.
import { withClient } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const userId = user.userId;

  try {
    if (req.method === 'GET') {
      const { rows } = await withClient((client) =>
        client.query('select dog_events_reminder from users where id = $1', [userId])
      );
      const value = rows[0] ? rows[0].dog_events_reminder : true;
      res.status(200).json({ dogEventsReminder: value });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const value = !!body.dogEventsReminder;
      await withClient((client) =>
        client.query('update users set dog_events_reminder = $1 where id = $2', [value, userId])
      );
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('user/dog-events-reminder', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
