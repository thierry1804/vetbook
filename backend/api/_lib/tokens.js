// Jetons à usage unique liés à un compte (vérification d'e-mail, réinitialisation, invitation…).
import crypto from 'node:crypto';
import { hashToken } from './auth.js';

export function newRawToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function createToken(client, { userId = null, purpose, payload = {}, ttlMinutes }) {
  const raw = newRawToken();
  // Un seul jeton actif par compte et par usage : le nouveau remplace les précédents.
  if (userId) {
    await client.query('delete from user_tokens where user_id = $1 and purpose = $2 and used_at is null', [userId, purpose]);
  }
  await client.query(
    `insert into user_tokens (user_id, purpose, token_hash, payload, expires_at)
     values ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [userId, purpose, hashToken(raw), JSON.stringify(payload), String(ttlMinutes)]
  );
  return raw;
}

// Consomme le jeton (une seule fois) ; renvoie la ligne ou null s'il est inconnu, expiré ou déjà utilisé.
export async function consumeToken(client, raw, purpose) {
  if (typeof raw !== 'string' || raw.length < 20) return null;
  const { rows } = await client.query(
    `update user_tokens set used_at = now()
      where token_hash = $1 and purpose = $2 and used_at is null and expires_at > now()
  returning id, user_id, payload`,
    [hashToken(raw), purpose]
  );
  return rows[0] || null;
}
