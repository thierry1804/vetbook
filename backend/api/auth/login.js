import argon2 from 'argon2';
import { withClient } from '../_lib/db.js';
import { isSuspended, isValidEmail, setSessionCookie, startSession } from '../_lib/auth.js';
import { USER_COLUMNS, publicUser } from '../_lib/profile.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isValidEmail(email) || !password) {
    res.status(400).json({ error: 'Adresse e-mail et mot de passe requis.' });
    return;
  }

  try {
    const result = await withClient(async (client) => {
      const { rows } = await client.query(`select ${USER_COLUMNS}, password_hash from users where email = $1`, [email]);
      const user = rows[0];
      if (!user || !user.password_hash) return null;
      if (!(await argon2.verify(user.password_hash, password))) return null;
      if (await isSuspended(client, user.id)) return { suspended: true };
      return { user, sessionToken: await startSession(client, user, req) };
    });

    if (!result) {
      res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
      return;
    }
    if (result.suspended) {
      res.status(403).json({ error: 'Compte suspendu. Contactez le support.', code: 'ACCOUNT_SUSPENDED' });
      return;
    }
    setSessionCookie(res, result.sessionToken);
    res.status(200).json(publicUser(result.user));
  } catch (err) {
    console.error('auth/login', err);
    res.status(500).json({ error: 'Connexion impossible.' });
  }
}
