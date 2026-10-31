// Beacon public : une vue de page côté front (connecté ou non). Volontairement tolérant — jamais
// de 4xx bloquant pour un comportement de tracking, jamais de dépendance à une session valide.
import { clientIp } from './_lib/admin-auth.js';
import { logAccess } from './_lib/access-log.js';
import { getSessionTokenFromRequest, verifySessionToken } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const view = typeof body.view === 'string' ? body.view.slice(0, 80) : 'inconnu';
  const path = typeof body.path === 'string' ? body.path.slice(0, 300) : null;

  let userId = null;
  try { const token = getSessionTokenFromRequest(req); if (token) userId = (await verifySessionToken(token)).userId; } catch { /* anonyme ou session expirée */ }

  await logAccess({
    kind: 'page', action: `page.${view}`, path, userId,
    ip: clientIp(req), userAgent: req.headers['user-agent'] || null,
  });
  res.status(204).end();
}
