#!/usr/bin/env node
/**
 * Construit CENTRALE_CANINE_FCI_FILES (clé de race du catalogue SCC → n° de fichier PDF).
 *
 * Source : scripts/generated/wikidata-fci-p528.json (races FCI via Wikidata P528),
 * rapprochée des tables CENTRALE_CANINE_BREED_SLUGS / _ALIASES de frontend/app.js.
 * Aucun accès réseau (le scrape live de centrale-canine.fr est trop lent / bloqué).
 *
 * Usage : node scripts/build-fci-breed-map.mjs
 * Sorties : scripts/generated/centrale-canine-fci-files.js
 *           scripts/generated/fci-unmatched.json (catalogue sans PDF + labels Wikidata non rapprochés)
 */
import { readFileSync, writeFileSync } from 'fs';

const APP_JS = new URL('../frontend/app.js', import.meta.url);
const WIKIDATA = new URL('./generated/wikidata-fci-p528.json', import.meta.url);
const OUT_FILE = new URL('./generated/centrale-canine-fci-files.js', import.meta.url);
const OUT_UNMATCHED = new URL('./generated/fci-unmatched.json', import.meta.url);

function protectionKey(name) {
  return String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
}

// Synonymes Wikidata (clé normalisée d'un label FR/EN) → clé du catalogue SCC.
// À compléter au vu de fci-unmatched.json.
const EXTRA = {
  beauceron: 'bergerdebeauce', labradorretriever: 'retrieverdulabrador', labrador: 'retrieverdulabrador',
  goldenretriever: 'retrieverdorado', germanshepherddog: 'bergerallemand', germanshepherd: 'bergerallemand',
  belgianshepherddog: 'chiendebergerbelge', papillon: 'epagneulnaincontinental',
  foxterrierapoillisse: 'foxterrierpoillisse', smoothfoxterrier: 'foxterrierpoillisse',
  foxterrierapoildur: 'foxterrierpoildur', wirefoxterrier: 'foxterrierpoildur',
  chiendelansuedois: 'chiendelansuedoisjamthund', jamthund: 'chiendelansuedoisjamthund',
  chiennoiretbronzeautrichien: 'brachetnoiretfeu', austrianblackandtanhound: 'brachetnoiretfeu',
  gosdaturacatala: 'chiendebergercatalan', catalansheepdog: 'chiendebergercatalan',
  perdigueirodeburgos: 'braquedeburgos', perdiguerodeburgos: 'braquedeburgos', burgosretriever: 'braquedeburgos',
  rafeirodelalentejo: 'matindelalentejo', rafeirodoalentejo: 'matindelalentejo',
  drahthaar: 'chiendarretallemandapoildur', germanwirehairedpointer: 'chiendarretallemandapoildur',
  korthals: 'griffonapoildurkorthals', wirehairedpointinggriffon: 'griffonapoildurkorthals',
  grandmunsterlander: 'grandepagneuldemunster', largemunsterlander: 'grandepagneuldemunster',
  braqueallemand: 'braqueallemandapoilcourt', germanshorthairedpointer: 'braqueallemandapoilcourt',
  setterirlandais: 'setterirlandaisrouge', irishsetter: 'setterirlandaisrouge',
  flatcoatedretriever: 'retrieverapoilplat', kingcharlesspaniel: 'epagneulkingcharles',
  drever: 'bassetsuedois', hamiltonstovare: 'chiencourantdehamilton',
  braquefrancaistypegascongne: 'braquefrancaistypegascogne', frenchpointingdoggascognetype: 'braquefrancaistypegascogne',
  cavalierkingcharlesspaniel: 'cavalierkingcharles', leonberg: 'chiendeleonberg', leonberger: 'chiendeleonberg',
  colley: 'collieapoillong', roughcollie: 'collieapoillong', deerhound: 'levrierecossais', scottishdeerhound: 'levrierecossais',
  cockeramericain: 'cockerspanielamericain', americancockerspaniel: 'cockerspanielamericain',
  bergerpicard: 'bergerdepicardie', picardyshepherd: 'bergerdepicardie',
  schnauzerminiature: 'schnauzernain', miniatureschnauzer: 'schnauzernain',
  bergerdebergame: 'bergerbergamasque', bergamascoshepherd: 'bergerbergamasque',
  volpinoitaliano: 'volpinoitalien',
  bergerdeabruzzesetmaremme: 'bergerdelamaremmeetdesabruzzes', abruzzomaremmasheepdog: 'bergerdelamaremmeetdesabruzzes',
  dunker: 'chiencourantnorvegien', sabuesoespanol: 'chiencourantespagnol',
  pekinois: 'epagneulpekinois', pekingese: 'epagneulpekinois',
  chienderougeduhanovre: 'chienderougedehanovre', hanoverhound: 'chienderougedehanovre',
  chienfrancaisblancetnoir: 'francaisblancetnoir', wetterhoun: 'chiendeaufrison',
  chiennumexicain: 'chiennudumexique', xoloitzcuintle: 'chiennudumexique',
  erdelykopo: 'chiencourantdetransylvanie', transylvanianhound: 'chiencourantdetransylvanie',
  bergerdestatras: 'chiendebergerdestatras', tatrashepherddog: 'chiendebergerdestatras',
  lundehund: 'chiennorvegiendemacareux', norwegianlundehund: 'chiennorvegiendemacareux',
  hygenhund: 'chiencourantdehygen', groenlandais: 'chiendugroenland', greenlanddog: 'chiendugroenland',
  bergercroate: 'chiendebergercroate', croatiansheepdog: 'chiendebergercroate',
  levriergalgo: 'levrierespagnol', galgoespanol: 'levrierespagnol',
  americanstaffordshireterrier: 'staffordshireterrieramericain',
  bergerislandais: 'chiendebergerislandais', icelandicsheepdog: 'chiendebergerislandais',
  australiankelpie: 'kelpieaustralien', colleyapoilcourt: 'collieapoilcourt', smoothcollie: 'collieapoilcourt',
  kooikerhondje: 'petitchienhollandaisdechasseaugibierdeau',
  bergerdemajorque: 'chiendebergerdemajorque', majorcashepherddog: 'chiendebergerdemajorque',
  blackrussianterrier: 'terriernoirrusse', podencocanario: 'chiendegarennedescanaries',
  setterirlandaisrougeetblanc: 'setterirlandaisrougeblanc', irishredandwhitesetter: 'setterirlandaisrougeblanc',
  bergerdanatolie: 'chiendebergerkangal', anatolianshepherd: 'chiendebergerkangal',
  chartpolski: 'levrierpolonais', polishgreyhound: 'levrierpolonais',
  parsonrussellterrier: 'terrierdureverendrussell', filadesaomiguel: 'filadesaintmiguel', azorescattledog: 'filadesaintmiguel',
  jackrussell: 'terrierjackrussell', jackrussellterrier: 'terrierjackrussell',
  cimarronuruguayo: 'cimarronuruguayen', tornjak: 'bergerdebosnieherzegovineetdecroatie',
  bergerroumainbucovine: 'chiendebergerroumaindebucovine', bucovinashepherddog: 'chiendebergerroumaindebucovine',
  continentalbulldog: 'bulldogcontinental',
};

const src = readFileSync(APP_JS, 'utf8');

// Les tables mélangent clés entre guillemets (SLUGS) et non quotées (ALIASES) : on capte les deux.
function parseTable(name) {
  const m = src.match(new RegExp('var ' + name + ' = \\{([\\s\\S]*?)\\n  \\};'));
  if (!m) throw new Error('table introuvable : ' + name);
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*["']?([a-z0-9]+)["']?\s*:\s*["']([^"']+)["']/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}
const SLUGS = parseTable('CENTRALE_CANINE_BREED_SLUGS');
const ALIASES = parseTable('CENTRALE_CANINE_BREED_ALIASES');

const bindings = JSON.parse(readFileSync(WIKIDATA, 'utf8')).results.bindings;

// clé candidate → clé catalogue
function resolve(candidate) {
  if (SLUGS[candidate]) return candidate;
  if (ALIASES[candidate] && SLUGS[ALIASES[candidate]]) return ALIASES[candidate];
  if (EXTRA[candidate] && SLUGS[EXTRA[candidate]]) return EXTRA[candidate];
  return null;
}

const files = {};
const unmatchedWikidata = [];
for (const b of bindings) {
  const fci = String(b.fci.value).trim();
  if (!/^\d+$/.test(fci)) continue;
  const fileId = fci.padStart(3, '0');
  const labels = [b.labelFr && b.labelFr.value, b.labelEn && b.labelEn.value].filter(Boolean);
  let hit = false;
  for (const label of labels) {
    const key = resolve(protectionKey(label));
    if (key) { if (!files[key]) files[key] = fileId; hit = true; }
  }
  if (!hit) unmatchedWikidata.push({ fci: fileId, labels });
}

// Races courantes absentes de la requête Wikidata — n° FCI officiels (PDF vérifiés HTTP 200).
const MANUAL = {
  bergerallemand: '166', affenpinscher: '186', airedaleterrier: '007', akita: '255', akitaamericain: '344',
  saintbernard: '061', shihtzu: '208', samoyede: '212', saluki: '269', huskydesiberie: '270',
  malamutedelalaska: '243', schipperke: '083', sloughi: '188', spinone: '165', skyeterrier: '075',
  terrierecossais: '073', sealyhamterrier: '074', staffordshirebullterrier: '076', shiba: '257',
  shikoku: '319', levrierafghan: '228', petitbrabancon: '082', griffonbelge: '081',
  chiendebergerdesshetland: '088', bichonapoilfrise: '215',
};
for (const [k, v] of Object.entries(MANUAL)) if (SLUGS[k] && !files[k]) files[k] = v;

// Overrides vérifiés à la main (HTTP 200) — priment sur Wikidata.
const VERIFIED = { bergerdebeauce: '044', retrieverdulabrador: '122', bergeraustralien: '342' };
for (const [k, v] of Object.entries(VERIFIED)) if (SLUGS[k]) files[k] = v;

const keys = Object.keys(files).sort();
const js = '// Généré par scripts/build-fci-breed-map.mjs — ne pas éditer à la main.\n' +
  '  var CENTRALE_CANINE_FCI_FILES = {\n' +
  keys.map((k) => '    "' + k + '":"' + files[k] + '"').join(',\n') + '\n  };\n';
writeFileSync(OUT_FILE, js);

const catalogueWithoutPdf = Object.keys(SLUGS).filter((k) => !files[k]).sort();
writeFileSync(OUT_UNMATCHED, JSON.stringify({ catalogueWithoutPdf, unmatchedWikidata }, null, 2) + '\n');

console.log(`Catalogue : ${Object.keys(SLUGS).length} races — avec PDF : ${keys.length} — sans : ${catalogueWithoutPdf.length}`);
console.log(`Wikidata non rapprochés : ${unmatchedWikidata.length} / ${bindings.length}`);
