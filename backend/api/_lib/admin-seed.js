// Amorçage idempotent au démarrage : rôles/permissions (source : ROLES), catalogue de
// fonctionnalités, formules proposées par la spec (à valider : prix non fixés), réglages par défaut.
import { withClient } from './db.js';
import { ROLES } from './admin-auth.js';

const FEATURES = [
  ['animals', 'Nombre d\'animaux', 'quota'],
  ['health_records', 'Carnet de santé et rappels dans l\'app', 'boolean'],
  ['push_reminders', 'Rappels push et résumé mensuel', 'boolean'],
  ['photos_storage_mb', 'Stockage photos (Mo)', 'quota'],
  ['share_link_days', 'Durée du lien vétérinaire (jours)', 'quota'],
  ['household_members', 'Membres du foyer', 'quota'],
  ['nutrition_activity_checkup', 'Nutrition, activités, check-up', 'boolean'],
  ['reproduction', 'Reproduction, saillies, déclarations LOMAD', 'boolean'],
  ['pedigree_edit', 'Pedigree (saisie) et recherche ACYM', 'boolean'],
  ['export_pdf_ics', 'Export PDF et .ics', 'boolean'],
  ['sms_reminders', 'Rappels par SMS', 'boolean'],
  ['practice_portal', 'Portail vétérinaire', 'boolean'],
];

// [plan, {feature: [enabled, quota]}]
const OWNER_BASE = { health_records: [true, null], nutrition_activity_checkup: [true, null] };
const PLAN_FEATURES = {
  gratuit: { ...OWNER_BASE, animals: [true, 1], photos_storage_mb: [true, 60], share_link_days: [true, 7] },
  premium: { ...OWNER_BASE, animals: [true, 5], push_reminders: [true, null], photos_storage_mb: [true, 500], share_link_days: [true, 90],
    household_members: [true, 3], pedigree_edit: [true, null], export_pdf_ics: [true, null] },
  eleveur: { ...OWNER_BASE, animals: [true, null], push_reminders: [true, null], photos_storage_mb: [true, 5000], share_link_days: [true, 90],
    household_members: [true, 10], reproduction: [true, null], pedigree_edit: [true, null], export_pdf_ics: [true, null] },
  cabinet: { ...OWNER_BASE, animals: [true, null], push_reminders: [true, null], photos_storage_mb: [true, 5000], share_link_days: [true, 90],
    practice_portal: [true, null] },
};
// [code, base, nom, audience, mensuel, annuel, essai]
const PLANS = [
  ['gratuit', 'gratuit', 'Gratuit', 'owner', 0, 0, 0],
  ['premium', 'premium', 'Premium', 'owner', 5000, 50000, 30],
  ['eleveur', 'eleveur', 'Éleveur', 'owner', 20000, 200000, 0],
  ['cabinet', 'cabinet', 'Cabinet', 'practice', 60000, 600000, 0],
];
const SETTINGS = {
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
    for (const [code, label, kind] of FEATURES) {
      await c.query('insert into features (code, label, kind) values ($1,$2,$3) on conflict (code) do nothing', [code, label, kind]);
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
          for (const [f, [enabled, quota]] of Object.entries(PLAN_FEATURES[base])) {
            await c.query('insert into plan_features (plan_code, feature_code, enabled, quota) values ($1,$2,$3,$4)', [pcode, f, enabled, quota]);
          }
        }
      }
    }
    for (const [key, value] of Object.entries(SETTINGS)) {
      await c.query('insert into app_settings (key, value) values ($1,$2) on conflict (key) do nothing', [key, JSON.stringify(value)]);
    }
    for (const [code, label, order] of [['Canine', 'Chien', 0], ['Féline', 'Chat', 1], ['Autre', 'Autre', 2]]) {
      await c.query('insert into ref_species (code, label, sort_order) values ($1,$2,$3) on conflict (code) do nothing', [code, label, order]);
    }
  });
}
