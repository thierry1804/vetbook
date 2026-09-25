import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL manquant (vérifie ton .env).');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const rawSchema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

const schema = rawSchema
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`${statements.length} instructions à exécuter.`);

let ok = 0;
const client = await pool.connect();
try {
  for (const stmt of statements) {
    try {
      await client.query(stmt);
      ok++;
    } catch (err) {
      console.error('ÉCHEC sur:', stmt.slice(0, 80).replace(/\n/g, ' '));
      console.error('  ->', err.message);
    }
  }
} finally {
  client.release();
  await pool.end();
}

console.log(`${ok}/${statements.length} instructions appliquées avec succès.`);
if (ok < statements.length) process.exitCode = 1;
