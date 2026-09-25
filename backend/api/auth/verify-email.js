// POST /api/auth/verify-email { token } — confirme l'adresse d'un nouveau compte ou un changement d'adresse.
import { withTransaction } from '../_lib/db.js';
import { consumeToken } from '../_lib/tokens.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  const raw = req.body && typeof req.body.token === 'string' ? req.body.token : '';
  try {
    const out = await withTransaction(async (client) => {
      let tok = await consumeToken(client, raw, 'verify');
      if (tok) {
        const { rows } = await client.query(
          'update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1 returning email', [tok.user_id]);
        return rows[0] ? { kind: 'verify', email: rows[0].email } : null;
      }
      tok = await consumeToken(client, raw, 'change-email');
      if (!tok) return null;
      const newEmail = tok.payload && tok.payload.newEmail;
      if (!newEmail) return null;
      const taken = await client.query('select 1 from users where email = $1 and id <> $2', [newEmail, tok.user_id]);
      if (taken.rows[0]) return { error: 'TAKEN' };
      await client.query(
        `update users set email = $2, pending_email = null, email_verified_at = now(), updated_at = now() where id = $1`,
        [tok.user_id, newEmail]
      );
      return { kind: 'change-email', email: newEmail };
    });
    if (!out) {
      res.status(400).json({ error: 'Ce lien est invalide ou a expiré.' });
      return;
    }
    if (out.error === 'TAKEN') {
      res.status(409).json({ error: 'Cette adresse est déjà utilisée par un autre compte.' });
      return;
    }
    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    console.error('auth/verify-email', err);
    res.status(500).json({ error: 'Confirmation impossible.' });
  }
}
