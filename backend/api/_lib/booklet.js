// Lecture du carnet de santé par photo : prompt d'extraction et normalisation de la sortie du modèle.
// Fichier pur (aucun accès base) : la sortie d'un modèle de vision n'est jamais prise telle quelle —
// tout ce qui ne passe pas ces contrôles est écarté ou signalé « à vérifier » au propriétaire.

export const BOOKLET_KINDS = ['vaccine', 'deworming', 'hygiene', 'weight'];
export const HYGIENE_TYPES = ['Brossage dents', 'Coupe griffes', 'Bain', 'Toilettage', 'Nettoyage oreilles', 'Nettoyage yeux'];
const UNCERTAIN_FIELDS = ['date', 'name', 'next', 'type', 'weightKg', 'vet'];
const MAX_TEXT = 120;
const WEIGHT_MIN = 0.1;
const WEIGHT_MAX = 150;

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const STOPWORDS = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'l', 'd', 'et']);

const text = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXT) : typeof v === 'number' ? String(v) : '');
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (s) => fold(s).split(/[^a-z0-9]+/).filter((w) => w && !STOPWORDS.has(w));

export function bookletPrompt(petName, species) {
  return [
    `Tu lis la photo d'une page du carnet de santé de l'animal « ${petName} » (espèce : ${species || 'inconnue'}).`,
    "Relève chaque acte écrit sur la page, sans rien inventer. Types d'actes (champ kind) :",
    '- vaccine : vaccin (nom souvent sur une vignette collée, vétérinaire sur le tampon) ;',
    '- deworming : déparasitage interne (vermifuge) ou externe (puces, tiques) ;',
    '- hygiene : soin d\'hygiène (nettoyage des oreilles ou des yeux, toilettage, bain, griffes, dents) ;',
    '- weight : pesée.',
    'Réponds uniquement par un objet JSON de cette forme :',
    '{"petName":"nom lu sur la page ou vide","chip":"n° de puce lu ou vide","entries":[{"kind":"vaccine|deworming|hygiene|weight",'
      + '"date":"AAAA-MM-JJ","name":"produit ou soin","type":"interne|externe","next":"AAAA-MM-JJ","weightKg":12.4,"vet":"vétérinaire","uncertain":["date"]}]}',
    'Les dates manuscrites françaises sont au format jour/mois/année. Convertis-les en AAAA-MM-JJ.',
    'Mets dans uncertain le nom de chaque champ que tu n\'as pas pu lire avec certitude. Laisse vide un champ illisible ou absent ;',
    'n\'invente jamais de date de rappel (next) qui ne figure pas sur la page.',
  ].join('\n');
}

// Les objets {…} équilibrés d'un texte, en ignorant les accolades qui sont dans des chaînes JSON.
function balancedObjects(s) {
  const found = [];
  for (let start = s.indexOf('{'); start !== -1; start = s.indexOf('{', start + 1)) {
    let depth = 0; let inString = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inString) {
        if (ch === '\\') i++;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) { found.push(s.slice(start, i + 1)); break; }
    }
  }
  return found;
}

// Le modèle ajoute parfois du texte (avec ses propres accolades) avant ou après le JSON : on essaie
// le texte entier, puis chaque objet équilibré, en préférant celui qui contient `entries`.
export function extractJson(raw) {
  const s = String(raw || '').replace(/```(?:json)?/gi, '').trim();
  const parse = (str) => { try { const v = JSON.parse(str); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } };
  const whole = parse(s);
  if (whole) return whole;
  const objects = balancedObjects(s).map(parse).filter(Boolean);
  return objects.find((o) => 'entries' in o) || objects[0] || null;
}

function isoIfValid(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

// Les carnets français s'écrivent jour/mois/année : « 03/04/2026 » est le 3 avril, jamais le 4 mars.
export function parseBookletDate(raw) {
  const src = text(raw);
  const out = { iso: null, raw: src };
  if (!src) return out;
  let m = src.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) { out.iso = isoIfValid(+m[1], +m[2], +m[3]); return out; }
  m = src.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})$/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    out.iso = isoIfValid(year, +m[2], +m[1]);
    return out;
  }
  m = fold(src).match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const month = m[2].length >= 3 ? MONTHS.findIndex((name) => name.startsWith(m[2])) : -1;
    if (month !== -1) out.iso = isoIfValid(+m[3], month + 1, +m[1]);
  }
  return out;
}

function parseWeight(v) {
  const n = typeof v === 'number' ? v : Number(String(v || '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= WEIGHT_MIN && n <= WEIGHT_MAX ? Math.round(n * 100) / 100 : null;
}

// Le soin lu (« nettoyage des oreilles ») est ramené au type connu le plus précis dont tous les mots y figurent.
function matchHygiene(name, types) {
  const have = new Set(words(name));
  let best = null;
  for (const t of types) {
    const need = words(t);
    if (need.length && need.every((w) => have.has(w)) && (!best || need.length > words(best).length)) best = t;
  }
  return best || name;
}

function normalizeEntry(e, today, hygieneTypes) {
  if (!e || typeof e !== 'object' || !BOOKLET_KINDS.includes(e.kind)) return null;
  const uncertain = new Set(Array.isArray(e.uncertain) ? e.uncertain.filter((f) => UNCERTAIN_FIELDS.includes(f)) : []);
  const parsed = parseBookletDate(e.date);
  const date = parsed.iso || parsed.raw;
  if (!parsed.iso) uncertain.add('date');
  else if (parsed.iso > today) uncertain.add('date');

  const out = { kind: e.kind, date, name: text(e.name), next: '', nextEstimated: false, frequencyDays: '', uncertain: [] };
  if (e.kind === 'weight') {
    const w = parseWeight(e.weightKg);
    if (w == null) return null;
    out.weightKg = w;
  } else {
    if (!out.name && !date) return null;
    if (e.kind === 'hygiene' && out.name) out.name = matchHygiene(out.name, hygieneTypes);
    if (e.kind === 'deworming') out.type = fold(e.type || '').startsWith('ext') ? 'externe' : 'interne';
    if (e.kind === 'vaccine') out.vet = text(e.vet);
    const next = parseBookletDate(e.next);
    if (next.iso && !(parsed.iso && next.iso < parsed.iso)) out.next = next.iso;
    else if (next.raw && !next.iso) uncertain.add('next');
  }
  out.uncertain = UNCERTAIN_FIELDS.filter((f) => uncertain.has(f));
  return out;
}

export function normalizeBookletResult(raw, { today, hygieneTypes = [] } = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const types = [...new Set([...HYGIENE_TYPES, ...hygieneTypes.filter((t) => typeof t === 'string' && t.trim())])];
  const entries = (Array.isArray(src.entries) ? src.entries : []).map((e) => normalizeEntry(e, today, types)).filter(Boolean);
  return { petName: text(src.petName), chip: text(src.chip), entries };
}

const productKey = (s) => fold(s).replace(/[^a-z0-9]/g, '');
const addDays = (iso, days) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

// Rappel absent du carnet : estimé depuis l'intervalle par défaut du produit dans les référentiels
// du backoffice, jamais inventé par le modèle. Signalé nextEstimated pour que l'écran le dise.
export async function estimateReminders(client, entries, species) {
  const tables = { vaccine: 'ref_vaccines', deworming: 'ref_antiparasitics' };
  const intervals = {};
  for (const [kind, table] of Object.entries(tables)) {
    const { rows } = await client.query(`select name, default_interval_days from ${table} where species_code = $1 and default_interval_days > 0`, [species || '']);
    intervals[kind] = new Map(rows.map((r) => [productKey(r.name), r.default_interval_days]));
  }
  return entries.map((e) => {
    const days = intervals[e.kind] && !e.next && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? intervals[e.kind].get(productKey(e.name)) : null;
    return days ? { ...e, next: addDays(e.date, days), frequencyDays: days, nextEstimated: true } : e;
  });
}
