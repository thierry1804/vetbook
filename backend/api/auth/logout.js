import { clearSessionCookie, getSessionTokenFromRequest, verifySessionToken } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  // Révoque la session de cet appareil (si le jeton en porte une), puis efface le cookie.
  try {
    const token = getSessionTokenFromRequest(req);
    if (token) {
      const claims = await verifySessionToken(token).catch(() => null);
      if (claims && claims.sid) {
        await withClient((client) => client.query(
          'update user_sessions set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null',
          [claims.sid, claims.userId]
        ));
      }
    }
  } catch (err) {
    console.error('auth/logout', err);
  }
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
