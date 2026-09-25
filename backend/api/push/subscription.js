// POST /api/push/subscription    { endpoint, keys: { p256dh, auth } }
// DELETE /api/push/subscription  { endpoint }
// Équivalent de subscribeToPush()/unsubscribeFromPush() de data-layer.js.
import { withClient } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const userId = user.userId;
  const body = req.body || {};

  try {
    if (req.method === 'POST') {
      const endpoint = body.endpoint;
      const p256dh = body.keys && body.keys.p256dh;
      const authKey = body.keys && body.keys.auth;
      if (!endpoint || !p256dh || !authKey) {
        res.status(400).json({ error: 'Abonnement push incomplet.' });
        return;
      }
      await withClient((client) =>
        client.query(
          `insert into push_subscriptions (user_id, endpoint, p256dh, auth)
           values ($1, $2, $3, $4)
           on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
          [userId, endpoint, p256dh, authKey]
        )
      );
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const endpoint = body.endpoint;
      if (!endpoint) {
        res.status(400).json({ error: 'endpoint manquant.' });
        return;
      }
      await withClient((client) =>
        client.query('delete from push_subscriptions where endpoint = $1 and user_id = $2', [endpoint, userId])
      );
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('push/subscription', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
