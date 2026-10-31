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
  const tab = typeof body.tab === 'string' ? body.tab.slice(0, 80) : null;
  const panel = typeof body.panel === 'string' ? body.panel.slice(0, 80) : null;
  const path = typeof body.path === 'string' ? body.path.slice(0, 300) : null;
  // L'onglet/panneau affiné (ex. « vaccins » dans la fiche animal) est encodé dans l'action elle-même
  // pour que le journal reste lisible brut, et redondant dans meta pour filtrer par sous-écran.
  const sub = tab || panel;
  const action = sub ? `page.${view}.${sub}` : `page.${view}`;

  let userId = null;
  try { const token = getSessionTokenFromRequest(req); if (token) userId = (await verifySessionToken(token)).userId; } catch { /* anonyme ou session expirée */ }

  await logAccess({
    kind: 'page', action, path, userId,
    ip: clientIp(req), userAgent: req.headers['user-agent'] || null,
    meta: sub ? { tab, panel } : null,
  });
  res.status(204).end();
}
