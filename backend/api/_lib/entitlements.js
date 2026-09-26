// Droits d'abonnement : formule active + surcharges ponctuelles. Sans application stricte
// (app_settings.subscriptions_enforced = false, valeur par défaut), tout est ouvert : le calcul
// reste exposé au front, mais aucune fonctionnalité n'est refusée.
import { withClient } from './db.js';

export const OFFLINE_GRACE_DAYS = 7;

export async function getSetting(client, key, fallback) {
  const { rows } = await client.query('select value from app_settings where key = $1', [key]);
  return rows[0] ? rows[0].value : fallback;
}

export async function computeEntitlements(client, userId) {
  const enforced = (await getSetting(client, 'subscriptions_enforced', false)) === true;
  const sub = (await client.query(
    `select plan_code, status, ends_at from subscriptions
      where user_id = $1 and status in ('essai','actif') and (ends_at is null or ends_at > now())
      order by started_at desc limit 1`, [userId])).rows[0];
  const planCode = sub ? sub.plan_code : 'gratuit';
  const features = {};
  for (const r of (await client.query(
    `select f.code, coalesce(pf.enabled, false) as enabled, pf.quota
       from features f left join plan_features pf on pf.feature_code = f.code and pf.plan_code = $1`, [planCode])).rows) {
    features[r.code] = { enabled: enforced ? r.enabled : true, quota: enforced && r.quota != null ? Number(r.quota) : null };
  }
  if (enforced) {
    for (const o of (await client.query(
      `select feature_code, enabled, quota from entitlement_overrides
        where user_id = $1 and (expires_at is null or expires_at > now())`, [userId])).rows) {
      features[o.feature_code] = { enabled: o.enabled, quota: o.quota != null ? Number(o.quota) : (features[o.feature_code] || {}).quota ?? null };
    }
  }
  const now = Date.now();
  return {
    enforced, plan: planCode, status: sub ? sub.status : 'gratuit', features,
    computedAt: new Date(now).toISOString(),
    // Le client garde ces droits jusqu'à cette date sans réseau : un abonné ne perd pas l'accès faute de connexion.
    validUntil: new Date(now + OFFLINE_GRACE_DAYS * 86400_000).toISOString(),
  };
}

// Garde-fou serveur (« le front seul se contourne »). Renvoie { ok, quota }.
export async function checkFeature(userId, code) {
  return withClient(async (client) => {
    const e = await computeEntitlements(client, userId);
    const f = e.features[code];
    return { ok: !!(f && f.enabled), quota: f ? f.quota : null, entitlements: e };
  });
}

// Pour les handlers (req,res) existants : `if (!(await guardFeature(res, userId, 'push_reminders'))) return;`
export async function guardFeature(res, userId, code) {
  const r = await checkFeature(userId, code);
  if (!r.ok) {
    res.status(402).json({ error: 'Fonctionnalité non incluse dans votre formule.', feature: code, plan: r.entitlements.plan });
    return false;
  }
  return true;
}

// Limite effective d'une quantité : la plus stricte entre le réglage global (app_settings, `fallback` si absent)
// et le quota de la formule quand les droits sont appliqués (fonctionnalité fermée = 0). null = illimité.
export async function effectiveLimit(userId, code, settingKey, fallback) {
  return withClient(async (client) => {
    let limit = settingKey ? await getSetting(client, settingKey, fallback) : fallback;
    if (limit != null) limit = Number(limit);
    const e = await computeEntitlements(client, userId);
    if (e.enforced && code) {
      const f = e.features[code];
      if (!f || !f.enabled) return 0;
      if (f.quota != null) limit = limit == null ? f.quota : Math.min(limit, f.quota);
    }
    return limit;
  });
}

// 402 si `current` a déjà atteint la limite effective (voir effectiveLimit). Renvoie true si l'action est permise.
export async function guardQuota(res, userId, code, current, settingKey, fallback) {
  const limit = await effectiveLimit(userId, code, settingKey, fallback);
  if (limit != null && current >= limit) {
    res.status(402).json({ error: 'Limite de votre formule atteinte.', feature: code, quota: limit });
    return false;
  }
  return true;
}
