import { subscriptionRows, describeSubscriptions } from './subscription-read.js';
// Droits d'abonnement : formule active + surcharges ponctuelles. Sans application stricte
// (app_settings.subscriptions_enforced = false, valeur par défaut), tout est ouvert : le calcul
// reste exposé au front, mais aucune fonctionnalité n'est refusée.
import { withClient } from './db.js';

export const OFFLINE_GRACE_DAYS = 7;

export async function getSetting(client, key, fallback) {
  const { rows } = await client.query('select value from app_settings where key = $1', [key]);
  return rows[0] ? rows[0].value : fallback;
}

export async function computeEntitlements(client, userId, options = {}) {
  const enforced = (await getSetting(client, 'subscriptions_enforced', false)) === true;
  const now = options.now ?? Date.now();
  const subscription = describeSubscriptions(options.rows || await subscriptionRows(client,userId),now);
  const sub = subscription.effective;
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
        where user_id = $1 and (expires_at is null or expires_at > $2) order by created_at,id`, [userId,new Date(now)])).rows) {
      features[o.feature_code] = { enabled: o.enabled, quota: o.quota != null ? Number(o.quota) : (features[o.feature_code] || {}).quota ?? null };
    }
  }
  const overrideEnd = (await client.query('select min(expires_at) as end from entitlement_overrides where user_id=$1 and expires_at>$2', [userId,new Date(now)])).rows[0]?.end;
  const transitions = [now + OFFLINE_GRACE_DAYS * 86400_000, subscription.nextTransition, overrideEnd].filter(Boolean).map((v)=>new Date(v).getTime());
  return {
    enforced, plan: planCode, status: sub ? sub.status : 'gratuit', features,
    subscription,
    computedAt: new Date(now).toISOString(),
    // Le client garde ces droits jusqu'à cette date sans réseau : un abonné ne perd pas l'accès faute de connexion.
    validUntil: new Date(Math.min(...transitions)).toISOString(),
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

// Garde dédiée pour l'assistant IA : appel à un service tiers payé par l'application (même sur un
// modèle gratuit, le débit est limité), donc toujours appliquée — contrairement aux autres
// fonctionnalités, elle ignore `subscriptions_enforced` (pas encore activé globalement sur cette
// instance) pour ne jamais l'ouvrir par inadvertance aux formules gratuites.
export async function guardAiAssistant(res, userId) {
  return withClient(async (client) => {
    const state = describeSubscriptions(await subscriptionRows(client,userId));
    const planCode = state.effective?.plan_code || 'gratuit';
    const pf = (await client.query('select enabled from plan_features where plan_code = $1 and feature_code = $2', [planCode, 'ai_assistant'])).rows[0];
    const override = (await client.query(
      `select enabled from entitlement_overrides where user_id = $1 and feature_code = 'ai_assistant' and (expires_at is null or expires_at > now())
        order by created_at desc limit 1`, [userId])).rows[0];
    const ok = override ? override.enabled === true : !!(pf && pf.enabled);
    if (!ok) {
      res.status(402).json({ error: "L'assistant IA n'est pas inclus dans votre formule.", feature: 'ai_assistant', plan: planCode });
      return false;
    }
    return true;
  });
}
