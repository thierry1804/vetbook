import argon2 from 'argon2';
import { withClient } from '../_lib/db.js';
import { isValidEmail, setSessionCookie, startSession } from '../_lib/auth.js';
import { TERMS_VERSION, USER_COLUMNS, displayName, publicUser } from '../_lib/profile.js';
import { createToken } from '../_lib/tokens.js';
import { sendMail } from '../_lib/mailer.js';
import { verifyEmail } from '../_lib/emails.js';

const clean = (v, max = 80) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum).' });
    return;
  }
  if (!firstName) {
    res.status(400).json({ error: 'Indiquez votre prénom.' });
    return;
  }
  if (body.acceptTerms !== true) {
    res.status(400).json({ error: 'Vous devez accepter les conditions d’utilisation et la politique de confidentialité.' });
    return;
  }

  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const out = await withClient(async (client) => {
      const existing = await client.query('select id from users where email = $1', [email]);
      if (existing.rows[0]) throw new Error('EMAIL_TAKEN');
      const ins = await client.query(
        `insert into users (email, password_hash, name, first_name, last_name, terms_accepted_at, terms_version)
         values ($1, $2, $3, $4, $5, now(), $6) returning id`,
        [email, passwordHash, displayName(firstName, lastName), firstName, lastName || null, TERMS_VERSION]
      );
      const { rows } = await client.query(`select ${USER_COLUMNS} from users where id = $1`, [ins.rows[0].id]);
      const user = rows[0];
      const sessionToken = await startSession(client, user, req);
      const verifyToken = await createToken(client, { userId: user.id, purpose: 'verify', ttlMinutes: 48 * 60 });
      return { user, sessionToken, verifyToken };
    });

    setSessionCookie(res, out.sessionToken);
    // Envoi non bloquant : un échec SMTP ne doit pas empêcher la création du compte.
    sendMail({ to: email, ...verifyEmail(out.verifyToken, firstName) }).catch(() => {});
    res.status(201).json(publicUser(out.user));
  } catch (err) {
    if (err && err.message === 'EMAIL_TAKEN') {
      res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
      return;
    }
    console.error('auth/register', err);
    res.status(500).json({ error: 'Inscription impossible.' });
  }
}
