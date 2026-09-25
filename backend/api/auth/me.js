import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const session = await requireUser(req, res);
  if (!session) return;

  try {
    const user = await withClient(async (client) => {
      const { rows } = await client.query(
        `select id, email, name, picture_url from users where id = $1`,
        [session.userId]
      );
      return rows[0] || null;
    });
    if (!user) {
      res.status(401).json({ error: 'Session invalide.' });
      return;
    }
    res.status(200).json({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture_url,
    });
  } catch (err) {
    console.error('auth/me', err);
    res.status(500).json({ error: 'Impossible de récupérer le profil.' });
  }
}
