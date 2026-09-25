// POST /api/auth/resend-verification — renvoie l'e-mail de confirmation du compte connecté.
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { createToken } from '../_lib/tokens.js';
import { sendMail } from '../_lib/mailer.js';
import { verifyEmail, changeEmail } from '../_lib/emails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const out = await withClient(async (client) => {
      const { rows } = await client.query('select email, first_name, email_verified_at, pending_email from users where id = $1', [session.userId]);
      const u = rows[0];
      if (!u) return null;
      if (u.pending_email) {
        const token = await createToken(client, { userId: session.userId, purpose: 'change-email', payload: { newEmail: u.pending_email }, ttlMinutes: 48 * 60 });
        return { to: u.pending_email, mail: changeEmail(token, u.pending_email) };
      }
      if (u.email_verified_at) return { already: true };
      const token = await createToken(client, { userId: session.userId, purpose: 'verify', ttlMinutes: 48 * 60 });
      return { to: u.email, mail: verifyEmail(token, u.first_name) };
    });
    if (!out) {
      res.status(401).json({ error: 'Session invalide.' });
      return;
    }
    if (out.already) {
      res.status(200).json({ ok: true, alreadyVerified: true });
      return;
    }
    await sendMail({ to: out.to, ...out.mail });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('auth/resend-verification', err);
    res.status(500).json({ error: 'Envoi impossible pour le moment.' });
  }
}
