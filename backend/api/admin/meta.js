// Données d'aide à l'édition des contenus : pays ouverts et état « modifications non publiées ».
import { isDeepStrictEqual } from 'node:util';
import { withClient } from '../_lib/db.js';
import { requireAdmin, audit, requireReason } from '../_lib/admin-auth.js';
import { withTransaction } from '../_lib/db.js';
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

  // Application des formules : interrupteur global (réglage `subscriptions_enforced`) + impact sur les comptes actuels.
  // Tout compte sans abonnement actif est en formule « gratuit » : l'aperçu compte ceux qui dépassent ses limites.
  router.get('/enforcement', requireAdmin('billing.read'), async (_req, res, next) => {
    try {
      const out = await withClient(async (c) => {
        const enforced = (await getSetting(c, 'subscriptions_enforced', false)) === true;
        const q = async (feature) => { const r = (await c.query("select enabled, quota from plan_features where plan_code = 'gratuit' and feature_code = $1", [feature])).rows[0]; return r && r.enabled ? (r.quota == null ? null : Number(r.quota)) : 0; };
        const free = `not exists (select 1 from subscriptions s where s.user_id = u.id and s.status in ('essai','actif') and (s.ends_at is null or s.ends_at > now()))`;
        const total = Number((await c.query(`select count(*) n from users u where ${free}`)).rows[0].n);
        const animalsQ = await q('animals'); const photosQ = await q('photos_count');
        const over = async (table, limit) => (limit == null ? 0 : Number((await c.query(
          `select count(*) n from (select u.id from users u join ${table} t on t.user_id = u.id where ${free} group by u.id having count(*) > $1) x`, [limit])).rows[0].n));
        return { enforced, free_users: total, limits: { animals: animalsQ, photos_count: photosQ },
          over: { animals: await over('pets', animalsQ), photos_count: await over('photos', photosQ) } };
      });
      res.json(out);
    } catch (err) { next(err); }
  });

  router.put('/enforcement', requireAdmin('billing.plans_write'), async (req, res, next) => {
    try {
      if (typeof req.body?.enabled !== 'boolean') { res.status(400).json({ error: 'Valeur « enabled » (booléen) requise.' }); return; }
      const reason = requireReason(req, res); if (!reason) return;
      await withTransaction(async (c) => {
        const before = await getSetting(c, 'subscriptions_enforced', false);
        await c.query("insert into app_settings (key, value) values ('subscriptions_enforced', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(req.body.enabled)]);
        await audit(req, res, { action: 'billing.enforcement', targetType: 'setting', targetId: 'subscriptions_enforced', before: { enabled: before }, after: { enabled: req.body.enabled }, reason }, c);
      });
      res.json({ enforced: req.body.enabled });
    } catch (err) { next(err); }
  });
}
