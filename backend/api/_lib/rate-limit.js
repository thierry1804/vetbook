// Limiteur de débit par compte. Derrière Cloudflare → cloudflared → nginx, `req.ip` est celui du
// proxy, donc le même pour tout le monde : un quota par IP serait partagé par tous les comptes.
// Clé : l'identifiant du compte tiré d'un jeton de session vérifié ; à défaut (pas de session ou
// jeton invalide), l'IP du visiteur transmise par Cloudflare. Un jeton falsifié retombe sur l'IP :
// il ne peut ni consommer le quota d'un autre compte ni en créer un neuf.
import rateLimit from 'express-rate-limit';
import { getSessionTokenFromRequest, verifySessionToken } from './auth.js';

async function limiterKey(req) {
  const token = getSessionTokenFromRequest(req);
  if (token) {
    try { return `user:${(await verifySessionToken(token)).userId}`; } catch { /* jeton invalide : repli sur l'IP */ }
  }
  return `ip:${req.headers['cf-connecting-ip'] || req.ip}`;
}

export function perUserLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs, max, standardHeaders: true, legacyHeaders: false,
    keyGenerator: limiterKey,
    message: { error: message },
  });
}
