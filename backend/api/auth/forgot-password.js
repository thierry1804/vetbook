// POST /api/auth/forgot-password { email } — répond toujours 200 (pas d'indice sur l'existence du compte).
import { withClient } from '../_lib/db.js';
import { isValidEmail } from '../_lib/auth.js';
import { createToken } from '../_lib/tokens.js';
import { sendMail } from '../_lib/mailer.js';
import { resetPassword } from '../_lib/emails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  const email = req.body && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' });
    return;
  }
  try {
    const token = await withClient(async (client) => {
      const { rows } = await client.query('select id from users where email = $1', [email]);
      if (!rows[0]) return null;
      return createToken(client, { userId: rows[0].id, purpose: 'reset', ttlMinutes: 60 });
    });
    if (token) sendMail({ to: email, ...resetPassword(token) }).catch(() => {});
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('auth/forgot-password', err);
    res.status(500).json({ error: 'Demande impossible pour le moment.' });
  }
}
