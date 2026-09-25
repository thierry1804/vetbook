// Auth : JWT de session en cookie httpOnly (+ Bearer legacy).
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

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

export async function requireUser(req, res) {
  const token = getSessionTokenFromRequest(req);
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

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
