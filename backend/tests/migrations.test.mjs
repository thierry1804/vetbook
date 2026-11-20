import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withClient } from '../api/_lib/db.js';
import { runMigrations } from '../api/_lib/migrations.js';

let count = 0;
const test = async (name, fn) => { await fn(); console.log('OK', name); count++; };
const sql = (text, params = []) => withClient((c) => c.query(text, params));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
const write = (name, body) => fs.writeFileSync(path.join(dir, name), body);
const tableExists = async (t) => (await sql('select to_regclass($1) as r', [t])).rows[0].r !== null;

await test('les migrations s’appliquent une fois, dans l’ordre des numéros', async () => {
  write('0002_remplit.sql', "insert into mig_t (id) values (1);");
  write('0001_cree.sql', 'create table mig_t (id int);');
  assert.deepEqual(await runMigrations({ dir }), ['0001_cree', '0002_remplit']);
  assert.equal((await sql('select count(*)::int as n from mig_t')).rows[0].n, 1);
  assert.deepEqual(await runMigrations({ dir }), [], 'rien à refaire au second passage');
  assert.equal((await sql('select count(*)::int as n from mig_t')).rows[0].n, 1);
});

await test('une migration qui échoue est annulée en entier et n’est pas enregistrée', async () => {
  write('0003_casse.sql', 'create table mig_partiel (id int); select 1/0;');
  await assert.rejects(() => runMigrations({ dir }), /division by zero/);
  assert.equal(await tableExists('mig_partiel'), false);
  assert.equal((await sql("select count(*)::int as n from schema_migrations where version = '0003_casse'")).rows[0].n, 0);
  fs.rmSync(path.join(dir, '0003_casse.sql'));
});

await test('une migration déjà appliquée puis modifiée est refusée', async () => {
  write('0001_cree.sql', 'create table mig_t (id int, extra text);');
  await assert.rejects(() => runMigrations({ dir }), /modifiée/);
  write('0001_cree.sql', 'create table mig_t (id int);');
  assert.deepEqual(await runMigrations({ dir }), []);
});

await test('deux démarrages simultanés n’appliquent la migration qu’une fois', async () => {
  write('0004_concurrent.sql', 'create table mig_conc (id int); insert into mig_conc values (1);');
  const [a, b] = await Promise.all([runMigrations({ dir }), runMigrations({ dir })]);
  assert.equal(a.length + b.length, 1);
  assert.equal((await sql('select count(*)::int as n from mig_conc')).rows[0].n, 1);
});

await test('le dossier de migrations du dépôt s’applique sans erreur', async () => {
  await runMigrations();
});

console.log(`${count} vérifications de migrations au vert`);
process.exit(0);
