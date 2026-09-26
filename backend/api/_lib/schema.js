import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withClient } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fichiers appliqués dans l'ordre au démarrage (tous idempotents).
const SCHEMA_FILES = ['schema.sql', 'admin.sql'];

// Découpe un script SQL en instructions. Gère les commentaires « -- » et les blocs
// entre dollars ($$ ... $$) pour pouvoir embarquer des fonctions/déclencheurs plpgsql.
export function splitSql(raw) {
  const noComments = raw.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
  const statements = [];
  let cur = '';
  let inDollar = false;
  for (let i = 0; i < noComments.length; i++) {
    if (noComments.startsWith('$$', i)) { inDollar = !inDollar; cur += '$$'; i++; continue; }
    const ch = noComments[i];
    if (ch === ';' && !inDollar) { if (cur.trim()) statements.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) statements.push(cur.trim());
  return statements;
}

export async function ensureSchema() {
  await withClient(async (client) => {
    for (const file of SCHEMA_FILES) {
      const raw = await readFile(path.join(__dirname, '../../db', file), 'utf8');
      for (const stmt of splitSql(raw)) await client.query(stmt);
    }
  });
}
