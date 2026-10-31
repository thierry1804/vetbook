// Écran Réglages typé : remplace l'édition JSON brute clé par clé (un seul champ texte, aucune
// structure) par un formulaire avec un contrôle par réglage. Les clés internes seed_* (verrous de
// migration ponctuels) ne sont pas exposées ici ; subscriptions_enforced/gated_ui restent gérés par
// /enforcement (confirmation + aperçu des comptes impactés), pas dupliqués dans ce formulaire.
import { withClient, withTransaction } from '../_lib/db.js';
import { requireAdmin, audit, requireReason } from '../_lib/admin-auth.js';
import { getSetting } from '../_lib/entitlements.js';

const DEFAULTS = {
  contact: { email: '', phone: '', whatsapp: '', subscribe_instructions: '' },
  default_country: 'MG',
  four_eyes_publish: true,
  maintenance: { enabled: false, message: '' },
  max_household_members: 10,
  max_share_days: 90,
  max_upload_mb: 12,
  min_client_version: null,
  open_countries: [{ code: 'MG', label: 'Madagascar' }],
  storage_quota_mb: null,
};
const KEYS = Object.keys(DEFAULTS);

function sanitize(b) {
  const contact = b.contact && typeof b.contact === 'object' ? b.contact : {};
  const maintenance = b.maintenance && typeof b.maintenance === 'object' ? b.maintenance : {};
  const countries = Array.isArray(b.open_countries) ? b.open_countries : [];
  return {
    contact: {
      email: String(contact.email || '').slice(0, 200), phone: String(contact.phone || '').slice(0, 60),
      whatsapp: String(contact.whatsapp || '').slice(0, 60), subscribe_instructions: String(contact.subscribe_instructions || '').slice(0, 2000),
    },
    default_country: String(b.default_country || 'MG').toUpperCase().slice(0, 2),
    four_eyes_publish: b.four_eyes_publish !== false,
    maintenance: { enabled: maintenance.enabled === true, message: String(maintenance.message || '').slice(0, 500) },
    max_household_members: Math.max(1, Math.min(50, Number(b.max_household_members) || DEFAULTS.max_household_members)),
    max_share_days: Math.max(1, Math.min(3650, Number(b.max_share_days) || DEFAULTS.max_share_days)),
    max_upload_mb: Math.max(1, Math.min(200, Number(b.max_upload_mb) || DEFAULTS.max_upload_mb)),
    min_client_version: b.min_client_version ? String(b.min_client_version).slice(0, 30) : null,
    open_countries: countries.filter((c) => c && c.code && c.label).map((c) => ({ code: String(c.code).toUpperCase().slice(0, 2), label: String(c.label).slice(0, 80) })).slice(0, 50),
    storage_quota_mb: b.storage_quota_mb == null || b.storage_quota_mb === '' ? null : Math.max(1, Number(b.storage_quota_mb)),
  };
}

export function mountSettingsTyped(router) {
  router.get('/app-settings', requireAdmin('system.read'), async (_req, res, next) => {
    try {
      const out = await withClient(async (c) => {
        const o = {};
        for (const k of KEYS) o[k] = await getSetting(c, k, DEFAULTS[k]);
        return o;
      });
      res.json(out);
    } catch (err) { next(err); }
  });

  router.put('/app-settings', requireAdmin('system.write'), async (req, res, next) => {
    try {
      const reason = requireReason(req, res); if (!reason) return;
      const next_ = sanitize(req.body || {});
      if (next_.maintenance.enabled && next_.maintenance.message.trim().length < 5) {
        res.status(400).json({ error: "Message de maintenance requis (5 caractères min.) quand la maintenance est activée." }); return;
      }
      await withTransaction(async (c) => {
        const before = {};
        for (const k of KEYS) before[k] = await getSetting(c, k, DEFAULTS[k]);
        for (const k of KEYS) {
          await c.query('insert into app_settings (key, value) values ($1,$2) on conflict (key) do update set value = excluded.value', [k, JSON.stringify(next_[k])]);
        }
        await audit(req, res, { action: 'settings.update', targetType: 'setting', targetId: 'app-settings', before, after: next_, reason }, c);
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });
}
