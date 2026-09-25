#!/usr/bin/env node
/**
 * Vérifie hors navigateur la résolution des URL de standard de race
 * (extrait les tables + helpers de frontend/app.js dans un vm, sans DOM).
 * Usage : node scripts/verify-breed-standard-urls.mjs
 */
import { readFileSync } from 'fs';
import vm from 'vm';

const src = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
function extract(re) {
  const m = src.match(re);
  if (!m) throw new Error('bloc introuvable: ' + re);
  return m[0];
}

const code = [
  extract(/function protectionKey\(name\) \{[\s\S]*?\n  \}\n/),
  extract(/var BREED_DB = \{[\s\S]*?\n  \};/),
  extract(/var CENTRALE_CANINE_BREED_SLUGS = \{[\s\S]*?\n  \};/),
  extract(/var CENTRALE_CANINE_BREED_ALIASES = \{[\s\S]*?\n  \};/),
  extract(/var CENTRALE_CANINE_FCI_FILES = \{[\s\S]*?\n  \};/),
  extract(/function centraleCanineBreedKey\(race\) \{[\s\S]*?\n  \}\n/),
  extract(/function centraleCanineBreedLinkMeta\(race\) \{[\s\S]*?\n  \}\n/),
  extract(/function centraleCanineBreedUrl\(race\) \{[\s\S]*?\n  \}\n/),
].join('\n');
const sb = {};
vm.runInNewContext(code + '\nthis.meta = centraleCanineBreedLinkMeta; this.url = centraleCanineBreedUrl; this.db = BREED_DB; this.fci = CENTRALE_CANINE_FCI_FILES; this.slugs = CENTRALE_CANINE_BREED_SLUGS;', sb);

let failed = 0;
function check(cond, msg) {
  if (!cond) { failed++; console.error('FAIL:', msg); } else console.log('OK:  ', msg);
}

const beauce = sb.meta('Beauceron');
check(beauce && beauce.isPdf && beauce.url.endsWith('/fci_race/044.pdf'), 'Beauceron → …/044.pdf (' + (beauce && beauce.url) + ')');
const lab = sb.meta('Labrador Retriever');
check(lab && lab.isPdf && lab.url.endsWith('/fci_race/122.pdf'), 'Labrador Retriever → …/122.pdf (' + (lab && lab.url) + ')');
const aus = sb.meta('Berger Australien');
check(aus && aus.isPdf && aus.url.endsWith('/fci_race/342.pdf'), 'Berger Australien → …/342.pdf (' + (aus && aus.url) + ')');
check(sb.meta('Chien Imaginaire XYZ') === null, 'race inconnue → null');
check(sb.meta('') === null && sb.meta(null) === null, 'race vide → null');
const pageOnly = Object.keys(sb.slugs).find((k) => !sb.fci[k]);
check(pageOnly && sb.meta(pageOnly) && sb.meta(pageOnly).isPdf === false, 'race sans n° FCI → lien page (' + pageOnly + ')');

// Couverture des races proposées dans le formulaire (BREED_DB, chiens).
const dogs = (sb.db.Canine || []).map((b) => b.name);
const missing = dogs.filter((n) => !sb.meta(n));
const noPdf = dogs.filter((n) => sb.meta(n) && !sb.meta(n).isPdf);
console.log(`BREED_DB chiens : ${dogs.length} races — sans lien : ${missing.length} — lien page seulement : ${noPdf.length}`);
if (missing.length) console.log('  sans lien :', missing.join(', '));
if (noPdf.length) console.log('  page seulement :', noPdf.join(', '));
check(missing.length === 0 || missing.every((n) => /autre|croisé|mixte/i.test(n)), 'toutes les races BREED_DB ont un lien (hors mixtes)');

if (failed) { console.error(failed + ' vérification(s) en échec.'); process.exit(1); }
console.log('All checks passed.');
