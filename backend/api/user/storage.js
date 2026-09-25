// GET /api/user/storage — espace occupé sur le serveur par le compte connecté.
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const out = await withClient(async (c) => {
      const p = (await c.query('select count(*)::int as n, coalesce(sum(byte_size), 0)::bigint as bytes from photos where user_id = $1', [session.userId])).rows[0];
      const pets = (await c.query('select count(*)::int as n from pets where user_id = $1', [session.userId])).rows[0];
      const u = (await c.query('select avatar_key from users where id = $1', [session.userId])).rows[0];
      return { photos: { count: p.n, bytes: Number(p.bytes) }, pets: pets.n, hasAvatar: !!(u && u.avatar_key) };
    });
    res.status(200).json(out);
  } catch (err) {
    console.error('user/storage', err);
    res.status(500).json({ error: 'Espace indisponible.' });
  }
}
