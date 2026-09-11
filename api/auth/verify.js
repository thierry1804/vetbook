// POST /api/auth/verify  { token }
// Vérifie un jeton de lien magique, crée l'utilisateur si besoin (par
// email), marque le jeton comme utilisé, renvoie un JWT de session.
import { withClient } from '../_lib/db.js';
import { hashToken, signSessionToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const token = req.body && typeof req.body === 'object' ? req.body.token : null;
  if (typeof token !== 'string' || !token) {
    res.status(400).json({ error: 'Jeton manquant.' });
    return;
  }

  try {
    const tokenHash = hashToken(token);

    const user = await withClient(async (client) => {
      const { rows } = await client.query(
        'select email, expires_at, used_at from auth_login_tokens where token_hash = $1',
        [tokenHash]
      );
      const row = rows[0];
      if (!row) throw Object.assign(new Error('Lien invalide.'), { statusCode: 401 });
      if (row.used_at) throw Object.assign(new Error('Ce lien a déjà été utilisé.'), { statusCode: 401 });
      if (new Date(row.expires_at).getTime() < Date.now()) {
        throw Object.assign(new Error('Ce lien a expiré.'), { statusCode: 401 });
      }

      await client.query('update auth_login_tokens set used_at = now() where token_hash = $1', [tokenHash]);

      // name/picture_url restent inchangés ici (pas fournis par un lien
      // magique) : on les relit simplement s'ils existent déjà, par ex.
      // suite à une connexion Google antérieure avec ce même email.
      const { rows: userRows } = await client.query(
        `insert into users (email) values ($1)
         on conflict (email) do update set email = excluded.email
         returning id, email, name, picture_url`,
        [row.email]
      );
      return userRows[0];
    });

    const sessionToken = await signSessionToken(user.id, user.email);
    res.status(200).json({
      token: sessionToken, userId: user.id, email: user.email,
      name: user.name, picture: user.picture_url,
    });
  } catch (err) {
    const statusCode = err && err.statusCode ? err.statusCode : 500;
    if (statusCode === 500) console.error('verify', err);
    res.status(statusCode).json({ error: err.message || 'Erreur serveur.' });
  }
}
