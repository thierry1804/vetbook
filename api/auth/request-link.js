// POST /api/auth/request-link  { email }
// Génère un jeton de connexion à usage unique (15 min), l'envoie par email
// sous forme de lien magique. Ne révèle jamais si l'email a un compte
// existant ou non : la réponse est identique dans tous les cas.
import { withClient } from '../_lib/db.js';
import { generateLoginToken, hashToken } from '../_lib/auth.js';

const TOKEN_TTL_MS = 15 * 60 * 1000;

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendMagicLinkEmail(email, link) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error('RESEND_API_KEY / EMAIL_FROM manquant.');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Connexion à App'lika",
      html: `<p>Clique sur ce lien pour te connecter à App'lika (valable 15 minutes) :</p><p><a href="${link}">${link}</a></p><p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Échec envoi email (${res.status}): ${body}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const email = req.body && typeof req.body === 'object' ? req.body.email : null;
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Email invalide.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const token = generateLoginToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await withClient((client) =>
      client.query(
        'insert into auth_login_tokens (token_hash, email, expires_at) values ($1, $2, $3)',
        [tokenHash, normalizedEmail, expiresAt]
      )
    );

    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const link = `${appUrl}/?login_token=${token}`;
    await sendMagicLinkEmail(normalizedEmail, link);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('request-link', err);
    res.status(500).json({ error: 'Erreur serveur, réessaie plus tard.' });
  }
}
