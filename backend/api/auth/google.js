// POST /api/auth/google  { credential }
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { withClient } from '../_lib/db.js';
import { setSessionCookie, startSession } from '../_lib/auth.js';
import { USER_COLUMNS, publicUser } from '../_lib/profile.js';

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

    const out = await withClient(async (client) => {
      // Le nom et la photo Google ne servent que de valeur initiale : une fois le profil modifié dans l'app
      // (prénom/nom, photo téléversée), Google ne l'écrase plus. L'adresse Google est déjà vérifiée.
      const bySub = await client.query(
        `update users set
            name = case when first_name is null and last_name is null then $2 else name end,
            picture_url = $3,
            email_verified_at = coalesce(email_verified_at, now())
          where google_sub = $1 returning id`,
        [googleSub, name, picture]
      );
      let userId = bySub.rows[0] && bySub.rows[0].id;
      if (!userId) {
        const ins = await client.query(
          `insert into users (email, google_sub, name, picture_url, email_verified_at) values ($1, $2, $3, $4, now())
           on conflict (email) do update set google_sub = excluded.google_sub,
             name = case when users.first_name is null and users.last_name is null then excluded.name else users.name end,
             picture_url = excluded.picture_url,
             email_verified_at = coalesce(users.email_verified_at, now())
           returning id`,
          [email, googleSub, name, picture]
        );
        userId = ins.rows[0].id;
      }
      const { rows } = await client.query(`select ${USER_COLUMNS} from users where id = $1`, [userId]);
      return { user: rows[0], sessionToken: await startSession(client, rows[0], req) };
    });

    setSessionCookie(res, out.sessionToken);
    res.status(200).json(publicUser(out.user));
  } catch (err) {
    console.error('auth/google', err);
    res.status(401).json({ error: 'Jeton Google invalide ou expiré.' });
  }
}
