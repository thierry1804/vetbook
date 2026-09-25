import argon2 from 'argon2';
import { withClient } from '../_lib/db.js';
import { isValidEmail, setSessionCookie, signSessionToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : null;

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Email invalide.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum).' });
    return;
  }

  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await withClient(async (client) => {
      const existing = await client.query('select id from users where email = $1', [email]);
      if (existing.rows[0]) {
        const err = new Error('EMAIL_TAKEN');
        throw err;
      }
      const { rows } = await client.query(
        `insert into users (email, password_hash, name) values ($1, $2, $3)
         returning id, email, name, picture_url`,
        [email, passwordHash, name]
      );
      return rows[0];
    });

    const token = await signSessionToken(user.id, user.email);
    setSessionCookie(res, token);
    res.status(201).json({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture_url,
    });
  } catch (err) {
    if (err && err.message === 'EMAIL_TAKEN') {
      res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
      return;
    }
    console.error('auth/register', err);
    res.status(500).json({ error: 'Inscription impossible.' });
  }
}
