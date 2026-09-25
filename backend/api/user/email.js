// POST /api/user/change-email { newEmail, password } — envoie un lien de confirmation à la nouvelle adresse.
import argon2 from 'argon2';
import { isValidEmail, requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { createToken } from '../_lib/tokens.js';
import { sendMail } from '../_lib/mailer.js';
import { changeEmail } from '../_lib/emails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!isValidEmail(newEmail)) { res.status(400).json({ error: 'Adresse e-mail invalide.' }); return; }

  try {
    const out = await withClient(async (client) => {
      const u = (await client.query('select id, email, password_hash, google_sub from users where id = $1', [session.userId])).rows[0];
      if (!u) return { error: 'SESSION' };
      if (!u.password_hash) return { error: 'NO_PASSWORD' };
      if (!password || !(await argon2.verify(u.password_hash, password))) return { error: 'PASSWORD' };
      if (newEmail === u.email) return { error: 'SAME' };
      const taken = await client.query('select 1 from users where email = $1', [newEmail]);
      if (taken.rows[0]) return { error: 'TAKEN' };
      await client.query('update users set pending_email = $2 where id = $1', [u.id, newEmail]);
      const token = await createToken(client, { userId: u.id, purpose: 'change-email', payload: { newEmail }, ttlMinutes: 48 * 60 });
      return { token };
    });
    const errors = {
      SESSION: [401, 'Session invalide.'],
      NO_PASSWORD: [400, 'Ce compte n’a pas encore de mot de passe : définissez-en un dans « Sécurité » avant de changer d’adresse.'],
      PASSWORD: [400, 'Le mot de passe est incorrect.'],
      SAME: [400, 'C’est déjà l’adresse de votre compte.'],
      TAKEN: [409, 'Cette adresse est déjà utilisée par un autre compte.'],
    };
    if (out.error) { const [code, msg] = errors[out.error]; res.status(code).json({ error: msg }); return; }
    await sendMail({ to: newEmail, ...changeEmail(out.token, newEmail) });
    res.status(200).json({ ok: true, pendingEmail: newEmail });
  } catch (err) {
    console.error('user/change-email', err);
    res.status(500).json({ error: 'Changement d’adresse impossible.' });
  }
}
