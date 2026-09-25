// POST /api/auth/google  { credential }
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { withClient } from '../_lib/db.js';
import { setSessionCookie, signSessionToken } from '../_lib/auth.js';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const credential = req.body && typeof req.body === 'object' ? req.body.credential : null;
  if (typeof credential !== 'string' || !credential) {
    res.status(400).json({ error: 'Jeton Google manquant.' });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('auth/google', new Error('GOOGLE_CLIENT_ID manquant.'));
    res.status(500).json({ error: 'Connexion Google non configurée côté serveur.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(credential, JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    });

    if (!payload.email || !payload.email_verified) {
      res.status(401).json({ error: 'Email Google non vérifié.' });
      return;
    }
    const email = String(payload.email).trim().toLowerCase();
    const googleSub = String(payload.sub);
    const name = typeof payload.name === 'string' ? payload.name : null;
    const picture = typeof payload.picture === 'string' ? payload.picture : null;

    const user = await withClient(async (client) => {
      const bySub = await client.query(
        `update users set name = $2, picture_url = $3 where google_sub = $1
         returning id, email, name, picture_url`,
        [googleSub, name, picture]
      );
      if (bySub.rows[0]) return bySub.rows[0];

      const { rows } = await client.query(
        `insert into users (email, google_sub, name, picture_url) values ($1, $2, $3, $4)
         on conflict (email) do update set google_sub = excluded.google_sub, name = excluded.name, picture_url = excluded.picture_url
         returning id, email, name, picture_url`,
        [email, googleSub, name, picture]
      );
      return rows[0];
    });

    const sessionToken = await signSessionToken(user.id, user.email);
    setSessionCookie(res, sessionToken);
    res.status(200).json({
      userId: user.id, email: user.email,
      name: user.name, picture: user.picture_url,
    });
  } catch (err) {
    console.error('auth/google', err);
    res.status(401).json({ error: 'Jeton Google invalide ou expiré.' });
  }
}
