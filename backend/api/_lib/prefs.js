// Validation des préférences du compte : seules les clés connues sont conservées, chaque valeur est bornée.
const oneOf = (v, allowed, d) => (allowed.includes(v) ? v : d);
const int = (v, min, max, d) => (Number.isInteger(v) && v >= min && v <= max ? v : d);
const time = (v, d) => (typeof v === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);

export const DEFAULT_PREFERENCES = {
  units: { weight: 'kg', height: 'cm' },
  dateFormat: 'fr-short',
  weekStart: 'mon',
  defaultPetLocalId: null,
  notifications: {
    push: true, email: false,
    vaccineLeadDays: 7, dewormingLeadDays: 7, hygieneLeadDays: 7, medicationLeadDays: 7,
    quietHours: { enabled: false, from: '22:00', to: '07:00' },
  },
  accessibility: { textSize: 'normal', reduceMotion: false, highContrast: false },
};

export function sanitizePreferences(input, current) {
  const base = Object.assign({}, DEFAULT_PREFERENCES, current || {});
  const src = input && typeof input === 'object' ? input : {};
  const cur = (k) => (base[k] && typeof base[k] === 'object' ? base[k] : {});
  const u = Object.assign({}, DEFAULT_PREFERENCES.units, cur('units'), src.units || {});
  const n = Object.assign({}, DEFAULT_PREFERENCES.notifications, cur('notifications'), src.notifications || {});
  const q = Object.assign({}, DEFAULT_PREFERENCES.notifications.quietHours, cur('notifications').quietHours || {}, (src.notifications && src.notifications.quietHours) || {});
  const a = Object.assign({}, DEFAULT_PREFERENCES.accessibility, cur('accessibility'), src.accessibility || {});
  return {
    units: { weight: oneOf(u.weight, ['kg', 'lb'], 'kg'), height: oneOf(u.height, ['cm', 'in'], 'cm') },
    dateFormat: oneOf(src.dateFormat !== undefined ? src.dateFormat : base.dateFormat, ['fr-short', 'fr-long', 'fr-numeric', 'iso'], 'fr-short'),
    weekStart: oneOf(src.weekStart !== undefined ? src.weekStart : base.weekStart, ['mon', 'sun'], 'mon'),
    defaultPetLocalId: src.defaultPetLocalId !== undefined
      ? (Number.isFinite(Number(src.defaultPetLocalId)) && src.defaultPetLocalId !== null ? Number(src.defaultPetLocalId) : null)
      : (base.defaultPetLocalId ?? null),
    notifications: {
      push: bool(n.push, true), email: bool(n.email, false),
      vaccineLeadDays: int(n.vaccineLeadDays, 1, 90, 7), dewormingLeadDays: int(n.dewormingLeadDays, 1, 90, 7),
      hygieneLeadDays: int(n.hygieneLeadDays, 1, 90, 7), medicationLeadDays: int(n.medicationLeadDays, 1, 90, 7),
      quietHours: { enabled: bool(q.enabled, false), from: time(q.from, '22:00'), to: time(q.to, '07:00') },
    },
    accessibility: { textSize: oneOf(a.textSize, ['normal', 'large', 'xlarge'], 'normal'), reduceMotion: bool(a.reduceMotion, false), highContrast: bool(a.highContrast, false) },
  };
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function sanitizeEmergencyContact(input, current) {
  const src = input && typeof input === 'object' ? input : {};
  const cur = current && typeof current === 'object' ? current : {};
  const pick = (k, max) => (src[k] !== undefined ? str(src[k], max) : str(cur[k], max));
  return { name: pick('name', 80), relation: pick('relation', 60), phone: pick('phone', 30), email: pick('email', 120), notes: pick('notes', 300) };
}

export function cleanPhone(v) {
  const p = typeof v === 'string' ? v.trim() : '';
  if (!p) return '';
  if (!/^[+\d][\d\s().-]{4,24}$/.test(p)) return null;
  return p;
}
