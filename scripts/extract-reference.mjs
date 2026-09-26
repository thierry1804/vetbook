#!/usr/bin/env node
/**
 * Extrait les données de référence codées en dur dans frontend/app.js vers
 * backend/db/seed/reference.json (aucun accès réseau ni base). Ce JSON est ensuite chargé dans les
 * tables ref_* / content_* par backend/scripts/seed-reference.mjs — le backoffice démarre ainsi
 * avec exactement ce que l'app embarque aujourd'hui, sans retaper 1 000 lignes.
 * Usage : node scripts/extract-reference.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import vm from 'vm';

const src = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
const lines = src.split('\n');

function block(name) {
  const start = lines.findIndex((l) => l.startsWith('  var ' + name + ' ='));
  if (start < 0) throw new Error('constante introuvable : ' + name);
  if (/;\s*$/.test(lines[start])) return lines[start];
  let end = start + 1;
  while (end < lines.length && !/^  [\]}];\s*$/.test(lines[end])) end++;
  return lines.slice(start, end + 1).join('\n');
}

const NAMES = ['BREED_DB', 'VACCINE_DB', 'SYMPTOM_TYPES', 'HYGIENE_TYPES', 'ACTIVITY_TYPES', 'MET_TABLE', 'MEAL_TYPES',
  'CHECKUP_QUESTIONS', 'DEFAULT_TIPS', 'DEFAULT_DOG_EVENTS', 'DEFAULT_VET_ENTRIES', 'CENTRALE_CANINE_BREED_SLUGS',
  'CENTRALE_CANINE_BREED_ALIASES', 'CENTRALE_CANINE_FCI_FILES', 'LOF_PATTERN', 'LOMAD_PATTERN'];
const code = 'var ico = function (n) { return "@" + n; };\n' +
  'function protectionKey(name) { return String(name || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, ""); }\n' +
  NAMES.map(block).join('\n') + '\nthis.out = { ' + NAMES.map((n) => `${n}: ${n}`).join(', ') + ', protectionKey: protectionKey };';
const sb = {};
vm.runInNewContext(code, sb);
const o = sb.out;

const breedKey = (name) => {
  const k = o.protectionKey(name);
  if (o.CENTRALE_CANINE_BREED_SLUGS[k]) return k;
  const a = o.CENTRALE_CANINE_BREED_ALIASES[k];
  return a && o.CENTRALE_CANINE_BREED_SLUGS[a] ? a : null;
};
const breeds = [];
for (const [species, list] of Object.entries(o.BREED_DB)) {
  for (const b of list) {
    const key = species === 'Canine' ? breedKey(b.name) : null;
    breeds.push({ species, name: b.name, weightMin: b.weightMin, weightMax: b.weightMax,
      fci: key ? o.CENTRALE_CANINE_FCI_FILES[key] || null : null, slug: key ? o.CENTRALE_CANINE_BREED_SLUGS[key] : null });
  }
}
const vaccines = [];
for (const [species, list] of Object.entries(o.VACCINE_DB)) for (const name of list) vaccines.push({ species, name });

const out = {
  generatedFrom: 'frontend/app.js',
  breeds, vaccines,
  lists: {
    symptom: o.SYMPTOM_TYPES, hygiene: o.HYGIENE_TYPES, meal: o.MEAL_TYPES,
    activity: o.ACTIVITY_TYPES.map((label) => ({ label, met: o.MET_TABLE[label] ?? null })),
  },
  checkup: o.CHECKUP_QUESTIONS.map((q, i) => ({ key: q.key, label: q.label, icon: String(q.icon).startsWith('@') ? String(q.icon).slice(1) : q.icon, levels: q.levels, order: i })),
  registries: [
    { code: 'LOF', label: 'LOF (Livre des Origines Français)', country: 'FR', regex: o.LOF_PATTERN.source, lookupUrl: 'https://www.centrale-canine.fr/lofselect/recherche-chien/identifiant', delays: {} },
    { code: 'LOMAD', label: 'LOMAD (Livre des Origines de Madagascar)', country: 'MG', regex: o.LOMAD_PATTERN.source, lookupUrl: 'https://acymadagascar.org/recherche', delays: { matingDeclarationDays: 28, birthDeclarationDays: 28, lomadRegistrationDays: 168 } },
  ],
  tips: o.DEFAULT_TIPS.map((t) => ({ title: t.title, body: t.content, category: t.category, author: t.author || null })),
  events: o.DEFAULT_DOG_EVENTS.map((e) => ({ title: e.title, description: e.description || null, month: e.month, day: e.day, recurring: e.recurring !== false })),
  emergency: [
    { country: 'FR', label: 'Centre antipoison vétérinaire (3115)', phone: '3115', hours: '24h/24' },
    ...o.DEFAULT_VET_ENTRIES.filter((v) => v.emergency).map((v) => ({ country: 'FR', label: v.name, phone: v.phone, hours: v.hours || null })),
  ],
  fciFiles: o.CENTRALE_CANINE_FCI_FILES,
};
writeFileSync(new URL('../backend/db/seed/reference.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`breeds ${breeds.length} (avec PDF ${breeds.filter((b) => b.fci).length}), vaccins ${vaccines.length}, symptômes ${out.lists.symptom.length},`,
  `check-up ${out.checkup.length}, conseils ${out.tips.length}, événements ${out.events.length}, urgences ${out.emergency.length}`);
