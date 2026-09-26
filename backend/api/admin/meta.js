// Données d'aide à l'édition des contenus : pays ouverts et état « modifications non publiées ».
import { isDeepStrictEqual } from 'node:util';
import { withClient } from '../_lib/db.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { getSetting } from '../_lib/entitlements.js';
import { buildReleaseContent } from '../_lib/ref-release.js';

const SECTIONS = ['breedDb', 'vaccineDb', 'lists', 'registries', 'checkupQuestions', 'tips', 'events', 'clinics', 'emergencyNumbers', 'pages'];

export function mountMeta(router) {
  router.get('/meta', requireAdmin(), async (_req, res, next) => {
    try {
      res.json({ countries: await withClient((c) => getSetting(c, 'open_countries', [])) });
    } catch (err) { next(err); }
  });

  // Compare l'état courant des tables à la dernière version publiée, section par section.
  router.get('/release-status', requireAdmin(), async (_req, res, next) => {
    try {
      const out = await withClient(async (c) => {
        const pub = (await c.query("select version, content from ref_releases where status = 'published' order by version desc limit 1")).rows[0];
        const draft = (await c.query("select version from ref_releases where status = 'draft' order by version desc limit 1")).rows[0];
        const now = JSON.parse(JSON.stringify(await buildReleaseContent(c)));
        const changed = {};
        for (const k of SECTIONS) changed[k] = !pub || !isDeepStrictEqual(now[k], pub.content?.[k]);
        return { published_version: pub ? pub.version : null, draft_version: draft ? draft.version : null, changed, pending: Object.values(changed).some(Boolean) };
      });
      res.json(out);
    } catch (err) { next(err); }
  });
}
