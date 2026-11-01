import { withClient } from './_lib/db.js';

export default async function help(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée.' });
  try {
    const rows = (await withClient((c) => c.query("select distinct on (slug) slug,title,body,version,published_at from content_pages where kind='help' and status='publie' order by slug,published_at desc nulls last,id desc"))).rows;
    res.set('Cache-Control', 'public, max-age=60').json({ pages: rows });
  } catch (error) { console.error('help', error); res.status(500).json({ error: 'Aide indisponible.' }); }
}
