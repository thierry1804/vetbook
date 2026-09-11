// Auth maison (remplace Supabase Auth) : lien magique par email + JWT de
// session. Le token de lien magique n'est jamais stocké en clair (seul son
// hash SHA-256 est en base, voir db/schema.sql: auth_login_tokens).
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant.');
  return encoder.encode(secret);
}

export function generateLoginToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function signSessionToken(userId, email) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifySessionToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return { userId: payload.sub, email: payload.email };
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

// À appeler en tout début de chaque endpoint protégé. Envoie la réponse
// 401 elle-même et renvoie null si l'utilisateur n'est pas authentifié,
// pour permettre `const user = await requireUser(req, res); if (!user) return;`.
export async function requireUser(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Non authentifié.' });
    return null;
  }
  try {
    return await verifySessionToken(token);
  } catch {
    res.status(401).json({ error: 'Session invalide ou expirée.' });
    return null;
  }
}
