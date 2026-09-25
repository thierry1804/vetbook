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

  if (!isValidEmail(email) || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis.' });
    return;
  }

  try {
    const user = await withClient(async (client) => {
      const { rows } = await client.query(
        `select id, email, name, picture_url, password_hash from users where email = $1`,
        [email]
      );
      return rows[0] || null;
    });

    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }

    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }

    const token = await signSessionToken(user.id, user.email);
    setSessionCookie(res, token);
    res.status(200).json({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture_url,
    });
  } catch (err) {
    console.error('auth/login', err);
    res.status(500).json({ error: 'Connexion impossible.' });
  }
}
