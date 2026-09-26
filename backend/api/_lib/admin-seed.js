// Amorçage idempotent au démarrage : rôles/permissions (source : ROLES), catalogue de
// fonctionnalités, formules proposées par la spec (à valider : prix non fixés), réglages par défaut.
import { withClient } from './db.js';
import { ROLES } from './admin-auth.js';

// Catalogue exhaustif des fonctionnalités de l'app : [code, libellé, type, catégorie]. Chaque entrée de l'app
// (onglet, menu, bouton) et chaque route serveur payante est rattachée à l'un de ces codes.
const FEATURES = [
  ['animals', 'Nombre d\'animaux', 'quota', 'Limites'],
  ['photos_count', 'Nombre de photos', 'quota', 'Limites'],
  ['photos_storage_mb', 'Stockage photos (Mo)', 'quota', 'Limites'],
  ['share_link_days', 'Durée du lien vétérinaire (jours)', 'quota', 'Limites'],
  ['household_members', 'Membres du foyer', 'quota', 'Limites'],
  ['health_records', 'Carnet de santé : vaccins, déparasitage, actes, frise', 'boolean', 'Carnet de santé'],
  ['medications', 'Traitements en cours', 'boolean', 'Carnet de santé'],
  ['consultations', 'Consultations vétérinaires', 'boolean', 'Carnet de santé'],
  ['hygiene_care', 'Soins d\'hygiène', 'boolean', 'Carnet de santé'],
  ['journal_notes', 'Journal de suivi (notes et symptômes)', 'boolean', 'Carnet de santé'],
  ['weight_tracking', 'Courbe de poids et mesures de taille', 'boolean', 'Carnet de santé'],
  ['nutrition_plan', 'Nutrition et repas', 'boolean', 'Suivi quotidien'],
  ['activities', 'Activités et balades', 'boolean', 'Suivi quotidien'],
  ['health_checkup', 'Check-up santé', 'boolean', 'Suivi quotidien'],
  ['heat_cycles', 'Chaleurs et cycles', 'boolean', 'Suivi quotidien'],
  ['reproduction', 'Reproduction, saillies, déclarations LOMAD', 'boolean', 'Reproduction et pedigree'],
  ['pedigree_edit', 'Pedigree (saisie et liens entre animaux)', 'boolean', 'Reproduction et pedigree'],
  ['acym_lookup', 'Recherche dans l\'annuaire ACYM (LOMAD)', 'boolean', 'Reproduction et pedigree'],
  ['breed_standard', 'Standard de race (fiche officielle)', 'boolean', 'Reproduction et pedigree'],
  ['calendar_agenda', 'Agenda et rappels', 'boolean', 'Rappels et agenda'],
  ['push_reminders', 'Rappels push', 'boolean', 'Rappels et agenda'],
  ['email_reminders', 'Rappels par e-mail', 'boolean', 'Rappels et agenda'],
  ['sms_reminders', 'Rappels par SMS', 'boolean', 'Rappels et agenda'],
  ['monthly_summary', 'Résumé mensuel', 'boolean', 'Rappels et agenda'],
  ['vet_directory', 'Annuaire et urgences', 'boolean', 'Annuaire et communauté'],
  ['community_events', 'Événements', 'boolean', 'Annuaire et communauté'],
  ['community_tips', 'Astuces et conseils', 'boolean', 'Annuaire et communauté'],
  ['vet_share', 'Lien de partage pour le vétérinaire', 'boolean', 'Partage et données'],
  ['qr_identity', 'Carte d\'identité et QR code', 'boolean', 'Partage et données'],
  ['export_pdf_ics', 'Export PDF et .ics', 'boolean', 'Partage et données'],
  ['cloud_sync', 'Sauvegarde et synchronisation cloud', 'boolean', 'Partage et données'],
  ['practice_portal', 'Portail vétérinaire', 'boolean', 'Professionnels'],
];
// Fonctionnalités remplacées : leurs droits sont recopiés vers les nouveaux codes (migration `features_v3`).
const SPLIT_TARGETS = new Set(['nutrition_plan', 'activities', 'health_checkup']);
const SPLIT = { nutrition_activity_checkup: ['nutrition_plan', 'activities', 'health_checkup'] };
// Fonctionnalités fermées par formule (tout le reste est ouvert) — valeurs de départ, modifiables dans le backoffice.
const CLOSED = {
  gratuit: ['push_reminders', 'email_reminders', 'sms_reminders', 'monthly_summary', 'reproduction', 'pedigree_edit', 'acym_lookup', 'export_pdf_ics', 'practice_portal'],
  premium: ['reproduction', 'sms_reminders', 'practice_portal'],
  eleveur: ['sms_reminders', 'practice_portal'],
  cabinet: ['sms_reminders', 'reproduction', 'pedigree_edit', 'acym_lookup', 'export_pdf_ics'],
};
const QUOTAS = {
  gratuit: { animals: 1, photos_count: 20, photos_storage_mb: 60, share_link_days: 7 },
  premium: { animals: 5, photos_storage_mb: 500, share_link_days: 90, household_members: 3 },
  eleveur: { animals: null, photos_storage_mb: 5000, share_link_days: 90, household_members: 10 },
  cabinet: { animals: null, photos_storage_mb: 5000, share_link_days: 90 },
};
const planFeatures = (base) => {
  const out = {};
  for (const [code, , kind] of FEATURES) {
    if (kind === 'quota') { if (QUOTAS[base] && code in QUOTAS[base]) out[code] = [true, QUOTAS[base][code]]; else if (base !== 'gratuit' && code === 'photos_count') out[code] = [true, null]; }
    else if (!(CLOSED[base] || []).includes(code)) out[code] = [true, null];
  }
  return out;
};

// [code, base, nom, audience, mensuel, annuel, essai]
const PLANS = [
  ['gratuit', 'gratuit', 'Gratuit', 'owner', 0, 0, 0],
  ['premium', 'premium', 'Premium', 'owner', 5000, 50000, 30],
  ['eleveur', 'eleveur', 'Éleveur', 'owner', 20000, 200000, 0],
  ['cabinet', 'cabinet', 'Cabinet', 'practice', 60000, 600000, 0],
];
// Paramètres publics lus par l'app (GET /api/public-config) : pays ouverts, contact et procédure d'abonnement.
const PUBLIC_SETTINGS = {
  open_countries: [{ code: 'MG', label: 'Madagascar' }, { code: 'FR', label: 'France' }],
  gated_ui: 'lock',
  contact: { email: '', phone: '', whatsapp: '', subscribe_instructions: 'Pour souscrire, contacte-nous : le paiement se fait par mobile money (MVola, Orange Money, Airtel Money) et ton abonnement est activé sous 24 h.' },
};
const SETTINGS = {
  ...PUBLIC_SETTINGS,
  subscriptions_enforced: false, four_eyes_publish: true, default_country: 'MG',
  max_share_days: 90, max_household_members: 10, max_upload_mb: 12, storage_quota_mb: null,
  maintenance: { enabled: false, message: '' }, min_client_version: null,
};

export async function seedAdminDefaults() {
  await withClient(async (c) => {
    for (const [code, r] of Object.entries(ROLES)) {
      await c.query('insert into admin_roles (code, label) values ($1,$2) on conflict (code) do update set label = excluded.label', [code, r.label]);
      await c.query('delete from admin_role_permissions where role_code = $1', [code]);
      for (const p of r.perms) await c.query('insert into admin_role_permissions (role_code, permission) values ($1,$2)', [code, p]);
    }
    const before = new Set((await c.query('select code from features')).rows.map((r) => r.code));
    let order = 0;
    for (const [code, label, kind, category] of FEATURES) {
      await c.query(
        `insert into features (code, label, kind, category, sort_order) values ($1,$2,$3,$4,$5)
         on conflict (code) do update set category = coalesce(features.category, excluded.category), sort_order = excluded.sort_order`,
        [code, label, kind, category, order++]);
    }
    if ((await c.query('select 1 from plans limit 1')).rowCount === 0) {
      let order = 0;
      for (const [code, base, name, audience, monthly, yearly, trial] of PLANS) {
        const variants = code === 'gratuit' ? [[code, 'mensuel', 0]] : [[code, 'mensuel', monthly], [code + '_annuel', 'annuel', yearly]];
        for (const [pcode, period, price] of variants) {
          await c.query(
            `insert into plans (code, name, audience, price_mga, period, trial_days, sort_order) values ($1,$2,$3,$4,$5,$6,$7)`,
            [pcode, name + (period === 'annuel' ? ' (annuel)' : ''), audience, price, period, trial, order++]
          );
          for (const [f, [enabled, quota]] of Object.entries(planFeatures(base))) {
            await c.query('insert into plan_features (plan_code, feature_code, enabled, quota) values ($1,$2,$3,$4)', [pcode, f, enabled, quota]);
          }
        }
      }
    }
    // Migration unique : le quota « nombre de photos » de la formule gratuite (spec : 20 photos).
    if ((await c.query("select 1 from app_settings where key = 'seed_photos_count_v1'")).rowCount === 0) {
      await c.query("insert into plan_features (plan_code, feature_code, enabled, quota) values ('gratuit', 'photos_count', true, 20) on conflict (plan_code, feature_code) do nothing");
      await c.query("insert into app_settings (key, value) values ('seed_photos_count_v1', 'true') on conflict (key) do nothing");
    }
    // Migration unique : « nombre de photos » illimité (quota vide) pour les formules payantes.
    if ((await c.query("select 1 from app_settings where key = 'seed_photos_count_v2'")).rowCount === 0) {
      await c.query(`insert into plan_features (plan_code, feature_code, enabled, quota)
                     select code, 'photos_count', true, null from plans where code <> 'gratuit' on conflict (plan_code, feature_code) do nothing`);
      await c.query("insert into app_settings (key, value) values ('seed_photos_count_v2', 'true') on conflict (key) do nothing");
    }
    // Migration unique (features_v3) : catalogue exhaustif. Les fonctionnalités remplacées transmettent leurs droits aux nouveaux
    // codes ; les nouvelles reçoivent les valeurs de départ de chaque formule (sans écraser un réglage existant).
    if ((await c.query("select 1 from app_settings where key = 'seed_features_v3'")).rowCount === 0) {
      for (const [oldCode, news] of Object.entries(SPLIT)) {
        for (const n of news) {
          await c.query(`insert into plan_features (plan_code, feature_code, enabled, quota) select plan_code, $2, enabled, quota from plan_features where feature_code = $1 on conflict (plan_code, feature_code) do nothing`, [oldCode, n]);
          await c.query(`insert into entitlement_overrides (user_id, feature_code, enabled, quota, reason, expires_at, created_by) select user_id, $2, enabled, quota, reason, expires_at, created_by from entitlement_overrides where feature_code = $1`, [oldCode, n]);
        }
        await c.query('delete from features where code = $1', [oldCode]);
      }
      const plans = (await c.query('select code from plans')).rows;
      for (const p of plans) {
        const base = p.code.replace(/_annuel$/, '');
        const def = planFeatures(base);
        for (const [code, , kind] of FEATURES) {
          if (before.has(code) || SPLIT_TARGETS.has(code)) continue;
          const d = def[code];
          const enabled = d ? d[0] : (kind === 'boolean' && !CLOSED[base] ? base !== 'gratuit' : false);
          await c.query('insert into plan_features (plan_code, feature_code, enabled, quota) values ($1,$2,$3,$4) on conflict (plan_code, feature_code) do nothing', [p.code, code, enabled, d ? d[1] : null]);
        }
      }
      await c.query("insert into app_settings (key, value) values ('seed_features_v3', 'true') on conflict (key) do nothing");
    }
    for (const [key, value] of Object.entries(SETTINGS)) {
      await c.query('insert into app_settings (key, value) values ($1,$2) on conflict (key) do nothing', [key, JSON.stringify(value)]);
    }
    for (const [code, label, order] of [['Canine', 'Chien', 0], ['Féline', 'Chat', 1], ['Autre', 'Autre', 2]]) {
      await c.query('insert into ref_species (code, label, sort_order) values ($1,$2,$3) on conflict (code) do nothing', [code, label, order]);
    }
  });
}
