// Auth : JWT de session en cookie httpOnly (+ Bearer legacy).
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { withClient } from './db.js';

const encoder = new TextEncoder();
export const SESSION_COOKIE = 'applika_session';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant.');
  return encoder.encode(secret);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const SESSION_DAYS = 30;

export async function signSessionToken(userId, email, sid) {
  const claims = { email };
  if (sid) claims.sid = sid;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return { userId: payload.sub, email: payload.email, sid: payload.sid || null, iat: payload.iat };
}

// Crée la ligne de session (appareil) et renvoie le JWT à poser en cookie.
export async function startSession(client, user, req) {
  const ua = String((req && req.headers && req.headers['user-agent']) || '').slice(0, 300);
  const ip = String((req && (req.ip || (req.socket && req.socket.remoteAddress))) || '').slice(0, 64);
  const { rows } = await client.query(
    `insert into user_sessions (user_id, expires_at, user_agent, ip)
     values ($1, now() + ($2 || ' days')::interval, $3, $4) returning id`,
    [user.id, String(SESSION_DAYS), ua, ip]
  );
  return signSessionToken(user.id, user.email, rows[0].id);
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

export function getSessionTokenFromRequest(req) {
  if (req.cookies && req.cookies[SESSION_COOKIE]) return req.cookies[SESSION_COOKIE];
  return getBearerToken(req);
}

export function setSessionCookie(res, token) {
  const secure = process.env.COOKIE_SECURE === 'true';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res) {
  const secure = process.env.COOKIE_SECURE === 'true';
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  });
}

// Vérifie le JWT puis l'état de la session en base : appareil révoqué, expiré, ou émis avant le
// dernier « se déconnecter partout » (session_epoch). Les anciens jetons sans "sid" restent
// acceptés jusqu'à leur expiration, sauf s'ils précèdent session_epoch.
export async function requireUser(req, res) {
  const token = getSessionTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Non authentifié.' });
    return null;
  }
  let claims;
  try {
    claims = await verifySessionToken(token);
  } catch {
    res.status(401).json({ error: 'Session invalide ou expirée.' });
    return null;
  }
  try {
    const ok = await withClient(async (client) => {
      const u = await client.query('select session_epoch from users where id = $1', [claims.userId]);
      if (!u.rows[0]) return false;
      // iat est en secondes, session_epoch en millisecondes : une seconde de tolérance.
      if (claims.iat && claims.iat * 1000 + 1000 < new Date(u.rows[0].session_epoch).getTime()) return false;
      if (claims.sid) {
        const s = await client.query(
          `update user_sessions
              set last_seen_at = case when last_seen_at < now() - interval '5 minutes' then now() else last_seen_at end
            where id = $1 and user_id = $2 and revoked_at is null and expires_at > now()
        returning id`,
          [claims.sid, claims.userId]
        );
        if (!s.rows[0]) return false;
      }
      return true;
    });
    if (!ok) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Session invalide ou expirée.' });
      return null;
    }
  } catch (err) {
    console.error('requireUser', err);
    res.status(500).json({ error: 'Erreur d\'authentification.' });
    return null;
  }
  return claims;
}

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
