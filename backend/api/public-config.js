// GET /api/public-config — configuration publique lue par l'app : pays ouverts, mode maintenance,
// version minimale du client, contact et procédure d'abonnement, formules et droits associés.
// Tout est paramétré dans le backoffice (app_settings, plans, features, plan_features).
import { withClient } from './_lib/db.js';
import { getSetting } from './_lib/entitlements.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  try {
    const out = await withClient(async (c) => {
      const s = (k, d) => getSetting(c, k, d);
      const plans = (await c.query('select * from plans where visible and not archived order by sort_order, code')).rows;
      const pf = (await c.query('select plan_code, feature_code, enabled, quota from plan_features')).rows;
      const features = (await c.query('select code, label, kind from features order by code')).rows;
      const byPlan = {};
      for (const r of pf) (byPlan[r.plan_code] || (byPlan[r.plan_code] = {}))[r.feature_code] = { enabled: r.enabled, quota: r.quota != null ? Number(r.quota) : null };

      // « premium » et « premium_annuel » forment une seule offre (mensuel / annuel).
      const offers = new Map();
      for (const p of plans) {
        const base = p.code.replace(/_annuel$/, '');
        const o = offers.get(base) || { code: base, name: p.name.replace(/ \(annuel\)$/, ''), audience: p.audience, country: p.country, trialDays: p.trial_days || 0, sortOrder: p.sort_order, monthly: null, yearly: null, features: byPlan[base] || byPlan[p.code] || {} };
        const price = { planCode: p.code, priceMga: Number(p.price_mga) };
        if (p.period === 'annuel') o.yearly = price; else o.monthly = price;
        offers.set(base, o);
      }
      return {
        currency: 'MGA',
        enforced: (await s('subscriptions_enforced', false)) === true,
        countries: await s('open_countries', []),
        defaultCountry: await s('default_country', 'MG'),
        gatedUi: (await s('gated_ui', 'lock')) === 'hide' ? 'hide' : 'lock',
        maintenance: await s('maintenance', { enabled: false, message: '' }),
        minClientVersion: await s('min_client_version', null),
        contact: await s('contact', {}),
        featureLabels: Object.fromEntries(features.map((f) => [f.code, { label: f.label, kind: f.kind }])),
        plans: [...offers.values()].filter((o) => o.audience === 'owner').sort((a, b) => a.sortOrder - b.sortOrder),
      };
    });
    res.set('Cache-Control', 'public, max-age=60').json(out);
  } catch (err) {
    console.error('public-config', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
