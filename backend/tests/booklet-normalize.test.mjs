import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, parseBookletDate, normalizeBookletResult, bookletPrompt, BOOKLET_KINDS } from '../api/_lib/booklet.js';

const today = '2026-11-12';

test('extractJson tolère les blocs de code et le texte autour', () => {
  assert.deepEqual(extractJson('Voici :\n```json\n{"entries":[]}\n```'), { entries: [] });
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.equal(extractJson('pas de json'), null);
  assert.equal(extractJson('{ cassé'), null);
});

test('extractJson survit au texte avec accolades après (ou avant) le JSON', () => {
  assert.deepEqual(extractJson('{"entries":[]}\nNote : le {vaccin} est valable un an.'), { entries: [] });
  assert.deepEqual(extractJson('Format {attendu} : {"entries":[{"kind":"vaccine"}]}'), { entries: [{ kind: 'vaccine' }] });
  assert.deepEqual(extractJson('{"note":"a } b { c","entries":[]} fin }'), { note: 'a } b { c', entries: [] });
});

test('extractJson préfère l’objet qui contient entries', () => {
  assert.deepEqual(extractJson('{"meta":1} puis {"entries":[]}'), { entries: [] });
});

test('extractJson rend null pour une réponse coupée en plein milieu', () => {
  assert.equal(extractJson('{"petName":"Rex","entries":[{"kind":"vaccine","date":"2026-0'), null);
});

test('parseBookletDate lit JJ/MM et les années sur deux chiffres', () => {
  assert.equal(parseBookletDate('03/04/2026', today).iso, '2026-04-03');
  assert.equal(parseBookletDate('12-09-26', today).iso, '2026-09-12');
  assert.equal(parseBookletDate('12.09.2026', today).iso, '2026-09-12');
  assert.equal(parseBookletDate('12 septembre 2026', today).iso, '2026-09-12');
  assert.equal(parseBookletDate('1er fevrier 2026', today).iso, '2026-02-01');
  assert.equal(parseBookletDate('2026-09-12', today).iso, '2026-09-12');
  assert.equal(parseBookletDate('31/02/2026', today).iso, null);
  assert.equal(parseBookletDate('1?/09/2026', today).iso, null);
  assert.equal(parseBookletDate('1?/09/2026', today).raw, '1?/09/2026');
});

test('normalizeBookletResult garde les quatre types et écarte le reste', () => {
  const out = normalizeBookletResult({ petName: 'Rex', entries: [
    { kind: 'deworming', date: '12/09/2026', name: 'Milbemax', next: '12/12/2026' },
    { kind: 'consultation', date: '12/09/2026', name: 'Visite' },
    { kind: 'weight', date: '12/09/2026', weightKg: 200 },
    { kind: 'weight', date: '12/09/2026', weightKg: '12,4' },
  ] }, { today });
  assert.equal(out.petName, 'Rex');
  assert.deepEqual(out.entries.map((e) => e.kind), ['deworming', 'weight']);
  assert.equal(out.entries[0].type, 'interne');
  assert.equal(out.entries[0].next, '2026-12-12');
  assert.equal(out.entries[0].nextEstimated, false);
  assert.equal(out.entries[1].weightKg, 12.4);
});

test('date illisible ou future marquée incertaine, rappel antérieur retiré', () => {
  const [a, b, c] = normalizeBookletResult({ entries: [
    { kind: 'vaccine', date: '1?/09/2026', name: 'Nobivac' },
    { kind: 'vaccine', date: '12/01/2027', name: 'Rabisin' },
    { kind: 'deworming', date: '12/09/2026', name: 'Milbemax', next: '01/01/2026' },
  ] }, { today }).entries;
  assert.deepEqual([a.date, a.uncertain], ['1?/09/2026', ['date']]);
  assert.ok(b.uncertain.includes('date'));
  assert.equal(c.next, '');
});

test('hygiène rapprochée des types connus, texte gardé sinon, textes tronqués', () => {
  const [a, b, c] = normalizeBookletResult({ entries: [
    { kind: 'hygiene', date: '12/09/2026', name: 'nettoyage des oreilles' },
    { kind: 'hygiene', date: '12/09/2026', name: 'x'.repeat(300) },
    { kind: 'hygiene', date: '12/09/2026', name: 'Détartrage' },
  ] }, { today, hygieneTypes: ['Détartrage'] }).entries;
  assert.equal(a.name, 'Nettoyage oreilles');
  assert.equal(b.name.length, 120);
  assert.equal(c.name, 'Détartrage');
});

test('uncertain fourni par le modèle est conservé et filtré sur les champs connus', () => {
  const [e] = normalizeBookletResult({ entries: [{ kind: 'vaccine', date: '12/09/2026', name: 'Nobivac', uncertain: ['name', 'bidon'] }] }, { today }).entries;
  assert.deepEqual(e.uncertain, ['name']);
});

test('entrée sans date ni nom ignorée, réponse sans entries tolérée', () => {
  assert.deepEqual(normalizeBookletResult({}, { today }).entries, []);
  assert.deepEqual(normalizeBookletResult({ entries: [{ kind: 'vaccine' }, null, 'x'] }, { today }).entries, []);
});

test('le prompt décrit le contrat JSON et les quatre types', () => {
  const p = bookletPrompt('Rex', 'Canine');
  for (const k of BOOKLET_KINDS) assert.ok(p.includes(k));
  assert.ok(p.includes('AAAA-MM-JJ') && p.includes('uncertain') && p.includes('Rex'));
});
