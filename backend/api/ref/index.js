// GET /api/ref?since=<version> — référentiels publiés (public, versionné, mis en cache par le service
// worker). since >= version courante → { unchanged: true }. Aucune version publiée → { version: 0 } :
// le client garde ses constantes embarquées (repli hors ligne).
import { withClient } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  try {
    const r = (await withClient((c) => c.query("select version, published_at, content from ref_releases where status = 'published' order by version desc limit 1"))).rows[0];
    res.set('Cache-Control', 'public, max-age=300');
    if (!r) { res.json({ version: 0, unchanged: true }); return; }
    const since = Number(req.query.since);
    if (Number.isFinite(since) && since >= r.version) { res.json({ version: r.version, unchanged: true }); return; }
    res.json({ version: r.version, publishedAt: r.published_at, content: r.content });
  } catch (err) {
    console.error('ref', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
