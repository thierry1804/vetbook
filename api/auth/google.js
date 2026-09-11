// POST /api/auth/google  { credential }
// Vérifie l'ID token renvoyé par le bouton Google Identity Services
// (accounts.google.com/gsi/client), crée le compte ou le relie à un compte
// existant (même logique de compartimentation que /api/auth/verify : un
// utilisateur = une ligne `users`, jamais fait confiance au payload client
// pour l'identité), renvoie un JWT de session identique.
//
// Vérification faite avec `jose` (déjà une dépendance du projet) plutôt
// qu'avec `google-auth-library`, pour ne pas ajouter de dépendance : on
// récupère les clés publiques de Google (JWKS, mises en cache et
// renouvelées automatiquement par `createRemoteJWKSet`) et on vérifie la
// signature + l'émetteur + l'audience nous-mêmes.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { withClient } from '../_lib/db.js';
import { signSessionToken } from '../_lib/auth.js';

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

    // email_verified vient de Google (compte Google = email déjà prouvé) :
    // c'est ce qui rend sûr le rattachement automatique à un compte
    // existant créé par lien magique avec le même email ci-dessous.
    if (!payload.email || !payload.email_verified) {
      res.status(401).json({ error: 'Email Google non vérifié.' });
      return;
    }
    const email = String(payload.email).trim().toLowerCase();
    const googleSub = String(payload.sub);
    // Claims du scope par défaut (openid email profile), non sensibles.
    // Rafraîchies à chaque connexion pour rester à jour avec le compte
    // Google (photo/nom changés côté Google se répercutent ici).
    const name = typeof payload.name === 'string' ? payload.name : null;
    const picture = typeof payload.picture === 'string' ? payload.picture : null;

    const user = await withClient(async (client) => {
      // Reconnexion : ce compte Google est déjà relié à un utilisateur.
      const bySub = await client.query(
        `update users set name = $2, picture_url = $3 where google_sub = $1
         returning id, email, name, picture_url`,
        [googleSub, name, picture]
      );
      if (bySub.rows[0]) return bySub.rows[0];

      // Sinon, crée le compte ou relie un compte existant (même email,
      // par ex. créé auparavant via lien magique) à ce sub Google.
      const { rows } = await client.query(
        `insert into users (email, google_sub, name, picture_url) values ($1, $2, $3, $4)
         on conflict (email) do update set google_sub = excluded.google_sub, name = excluded.name, picture_url = excluded.picture_url
         returning id, email, name, picture_url`,
        [email, googleSub, name, picture]
      );
      return rows[0];
    });

    const sessionToken = await signSessionToken(user.id, user.email);
    res.status(200).json({
      token: sessionToken, userId: user.id, email: user.email,
      name: user.name, picture: user.picture_url,
    });
  } catch (err) {
    console.error('auth/google', err);
    res.status(401).json({ error: 'Jeton Google invalide ou expiré.' });
  }
}
