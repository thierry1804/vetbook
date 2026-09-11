// Applique db/schema.sql sur la base Neon pointée par DATABASE_URL (.env).
// Idempotent (le schéma n'utilise que IF NOT EXISTS / ADD COLUMN IF NOT
// EXISTS) : peut être relancé sans risque après chaque évolution du schéma.
//
//   node scripts/apply-schema.mjs
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';

// Voir DB_FORCE_IPV4 dans api/_lib/db.js — même filet de sécurité, mais pour
// le driver HTTP (fetch) de neon() plutôt que le driver WebSocket.
if (process.env.DB_FORCE_IPV4 === 'true') {
  const { Agent, setGlobalDispatcher } = await import('undici');
  setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL manquant (vérifie ton .env).');
  process.exit(1);
}

const sql = neon(connectionString);
const rawSchema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

// Retire les lignes de commentaire AVANT de découper sur ';' — sinon un bloc
// de commentaire sans point-virgule fusionne avec l'instruction SQL qui le
// suit dans le même "chunk", qui se ferait alors filtrer à tort.
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
for (const stmt of statements) {
  try {
    await sql(stmt);
    ok++;
  } catch (err) {
    console.error('ÉCHEC sur:', stmt.slice(0, 80).replace(/\n/g, ' '));
    console.error('  ->', err.message);
  }
}
console.log(`${ok}/${statements.length} instructions appliquées avec succès.`);

if (ok < statements.length) process.exitCode = 1;
