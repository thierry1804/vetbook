// POST /api/user/consent { accept: true } — enregistre l'acceptation des conditions et de la politique de confidentialité.
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { TERMS_VERSION } from '../_lib/profile.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!req.body || req.body.accept !== true) { res.status(400).json({ error: 'Acceptation requise.' }); return; }
  try {
    await withClient((c) => c.query('update users set terms_accepted_at = now(), terms_version = $2 where id = $1', [session.userId, TERMS_VERSION]));
    res.status(200).json({ ok: true, version: TERMS_VERSION });
  } catch (err) {
    console.error('user/consent', err);
    res.status(500).json({ error: 'Enregistrement impossible.' });
  }
}
