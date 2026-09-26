#!/usr/bin/env node
/**
 * Vérifie hors navigateur la logique « backoffice » du front (frontend/app.js) : application d'une
 * version de référentiels par-dessus les constantes embarquées, filtre par pays, droits d'abonnement.
 * Les fonctions sont extraites du vrai fichier et exécutées dans un vm avec des constantes de test.
 * Usage : node scripts/verify-reference-apply.mjs
 */
import { readFileSync } from 'fs';
import vm from 'vm';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
const fn = (name) => {
  const m = src.match(new RegExp('  function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}\\n'));
  if (!m) throw new Error('fonction introuvable : ' + name);
  return m[0];
};

const store = {};
const sb = {
  console, RegExp,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  ico: (n) => `<i:${n}>`,
};
vm.createContext(sb);
vm.runInContext(`
var REF_KEY='vetbook_ref', ENT_KEY='vetbook_entitlements', COUNTRY_KEY='vetbook_country', REF_CONTENT=null, EMBEDDED=null;
var DEFAULT_VET_ENTRIES=[{ id: 1, name: 'Antipoison FR', phone: '3115', emergency: true }];
var BREED_DB = { Canine: [{ name: 'Embarqué', weightMin: 1, weightMax: 2 }], 'Féline': [{ name: 'Chat embarqué', weightMin: 3, weightMax: 4 }] };
var VACCINE_DB = { Canine: ['Vieux vaccin'] };
var SYMPTOM_TYPES = ['Embarqué'], HYGIENE_TYPES = ['Bain'], MEAL_TYPES = ['Croquettes'], ACTIVITY_TYPES = ['Promenade'], MET_TABLE = { Promenade: 3 };
var CHECKUP_QUESTIONS = [{ key: 'appetite', label: 'Appétit', icon: '<old-icon>', levels: ['Normal'] }];
var DEFAULT_TIPS = [{ id: 1, title: 'Embarqué' }], DEFAULT_DOG_EVENTS = [{ id: 1, title: 'Embarqué' }];
var LOF_PATTERN = /^old$/, LOMAD_PATTERN = /^old$/;
${fn('readJson')}${fn('currentCountry')}${fn('refCountryOk')}${fn('referenceVetEntries')}${fn('applyReference')}${fn('currentEntitlements')}${fn('hasFeature')}${fn('featureQuota')}
`, sb);
const run = (code) => vm.runInContext(code, sb);
let n = 0;
const t = (name, f) => { f(); n++; console.log('OK  ', name); };

t('aucune version publiée / contenu vide → constantes embarquées intactes', () => {
  assert.equal(run('applyReference(null)'), false);
  assert.equal(run('applyReference({ content: {} })'), true);
  assert.equal(run('BREED_DB.Canine[0].name'), 'Embarqué');
  assert.equal(run('SYMPTOM_TYPES[0]'), 'Embarqué');
});

const release = { version: 3, content: {
  breedDb: { Canine: [{ name: 'Labrador Retriever', weightMin: 25, weightMax: 36, fci: '122', ccSlug: 'x' }], 'Féline': [] },
  vaccineDb: { Canine: ['Nobivac DHPPi', 'Rabisin'] },
  lists: { symptom: [{ label: 'Vomissements' }, { label: 'Toux' }], hygiene: [{ label: 'Brossage dents' }],
    meal: [{ label: 'BARF' }], activity: [{ label: 'Course', met: 8 }, { label: 'Jeu', met: 4 }] },
  checkupQuestions: [{ key: 'appetite', label: 'Appétit', icon: 'utensils', levels: ['A', 'B', 'C'], advice: 'x' }, { key: 'nouveau', label: 'Nouveau', icon: 'zap', levels: [] }],
  tips: [{ id: 9, title: 'Conseil MG', content: 'c', category: 'sante', country: 'MG' }, { id: 10, title: 'Conseil FR', body: 'b', category: 'sante', country: 'FR' }],
  events: [{ id: 1, title: 'Expo Tana', month: 6, day: 26, recurring: true, country: 'MG' }, { id: 2, title: 'SIA', month: 2, day: 22, country: 'FR' }],
  registries: { LOF: { pattern: '^\\d{6}$' }, LOMAD: { pattern: '([' } },
} };
sb.release = release;

t('version publiée → remplace races, vaccins, listes, check-up, conseils, événements, registres', () => {
  assert.equal(run('applyReference(release)'), true);
  assert.equal(run('BREED_DB.Canine.length + BREED_DB.Canine[0].name'), '1Labrador Retriever');
  assert.equal(run('BREED_DB["Féline"][0].name'), 'Chat embarqué');          // espèce vide dans la release → repli
  assert.equal(run('VACCINE_DB.Canine.join()'), 'Nobivac DHPPi,Rabisin');
  assert.equal(run('SYMPTOM_TYPES.join()'), 'Vomissements,Toux');
  assert.equal(run('ACTIVITY_TYPES.join() + MET_TABLE.Course + MET_TABLE.Promenade'), 'Course,Jeu83');
  assert.equal(run('CHECKUP_QUESTIONS[0].icon'), '<old-icon>');              // icône embarquée conservée
  assert.equal(run('CHECKUP_QUESTIONS[1].icon'), '<i:zap>');
  assert.equal(run('DEFAULT_TIPS[1].content'), 'b');                          // body → content
  assert.equal(run('LOF_PATTERN.test("123456")'), true);
  assert.equal(run('LOMAD_PATTERN.source'), '^old$');                         // regex invalide ignorée
});

t('filtre par pays : vide = tout, sinon uniquement le pays choisi', () => {
  store.vetbook_country = 'MG';
  run('applyReference(release)');
  assert.equal(run('DEFAULT_TIPS.map(function (x) { return x.title; }).join()'), 'Conseil MG');
  assert.equal(run('DEFAULT_DOG_EVENTS.map(function (x) { return x.title; }).join()'), 'Expo Tana');
  store.vetbook_country = 'ZZ';                                               // aucun contenu pour ce pays → on garde ce qui est chargé
  run('applyReference(release)');
  assert.equal(run('DEFAULT_TIPS.length'), 1);
  delete store.vetbook_country;
  run('applyReference(release)');
  assert.equal(run('DEFAULT_TIPS.length'), 2);
});

t('annuaire : urgences et cliniques par pays, repli FR seulement si pays vide/FR', () => {
  delete store.vetbook_country;
  run('REF_CONTENT = null');
  assert.equal(run('referenceVetEntries().length'), 1);                       // repli embarqué (antipoison FR)
  store.vetbook_country = 'MG';
  assert.equal(run('referenceVetEntries().length'), 0);                       // jamais de 3115 pour Madagascar
  run(`REF_CONTENT = { emergencyNumbers: [{ country: 'MG', label: 'Urgence MG', phone: '034 00', hours: '24h' }, { country: 'FR', label: 'Urgence FR', phone: '3115' }],
    clinics: [{ id: 7, name: 'Clinique Tana', city: 'Antananarivo', country: 'MG', on_call: true, lat: '-18.9', lng: '47.5' }, { id: 8, name: 'Clinique Lyon', country: 'FR' }] }`);
  const mg = JSON.parse(JSON.stringify(run('referenceVetEntries()')));
  assert.deepEqual(mg.map((e) => e.name), ['Urgence MG', 'Clinique Tana']);
  assert.equal(mg[1].emergency, true);                                        // clinique de garde = urgence
  assert.equal(mg[1].lat, -18.9);
  delete store.vetbook_country;
  assert.equal(run('referenceVetEntries().length'), 4);                       // pays vide : tout
  run('REF_CONTENT = null');
});

t('droits : ouverts par défaut, appliqués seulement si enforced', () => {
  assert.equal(run('hasFeature("reproduction")'), true);                      // aucun cache
  store.vetbook_entitlements = JSON.stringify({ enforced: false, features: { reproduction: { enabled: false } } });
  assert.equal(run('hasFeature("reproduction")'), true);                      // pas appliqué
  store.vetbook_entitlements = JSON.stringify({ enforced: true, features: { reproduction: { enabled: false, quota: null }, share_link_days: { enabled: true, quota: 7 } } });
  assert.equal(run('hasFeature("reproduction")'), false);
  assert.equal(run('hasFeature("inconnue")'), false);
  assert.equal(run('featureQuota("share_link_days")'), 7);
  assert.equal(run('featureQuota("reproduction")'), null);
  store.vetbook_entitlements = '{corrompu';
  assert.equal(run('hasFeature("reproduction")'), true);                      // cache illisible → ouvert
});

console.log(`\n${n} vérifications OK`);
