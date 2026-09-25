// POST /api/auth/reset-password { token, password }
import argon2 from 'argon2';
import { withTransaction } from '../_lib/db.js';
import { consumeToken } from '../_lib/tokens.js';
import { sendMail } from '../_lib/mailer.js';
import { passwordChanged } from '../_lib/emails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8) {
    res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum).' });
    return;
  }
  try {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const email = await withTransaction(async (client) => {
      const tok = await consumeToken(client, body.token, 'reset');
      if (!tok) return null;
      const { rows } = await client.query(
        `update users set password_hash = $2, session_epoch = now(), updated_at = now(),
                email_verified_at = coalesce(email_verified_at, now())
          where id = $1 returning email`,
        [tok.user_id, hash]
      );
      await client.query('update user_sessions set revoked_at = now() where user_id = $1 and revoked_at is null', [tok.user_id]);
      return rows[0] ? rows[0].email : null;
    });
    if (!email) {
      res.status(400).json({ error: 'Ce lien est invalide ou a expiré. Refaites une demande de réinitialisation.' });
      return;
    }
    sendMail({ to: email, ...passwordChanged() }).catch(() => {});
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('auth/reset-password', err);
    res.status(500).json({ error: 'Réinitialisation impossible.' });
  }
}
