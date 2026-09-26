// GET /api/me/entitlements — droits de l'utilisateur connecté (formule + surcharges). Lu par le front
// pour masquer ou verrouiller ; les routes payantes appellent aussi guardFeature() côté serveur.
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { computeEntitlements } from '../_lib/entitlements.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    res.set('Cache-Control', 'private, no-store');
    res.json(await withClient((c) => computeEntitlements(c, user.userId)));
  } catch (err) {
    console.error('me/entitlements', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
