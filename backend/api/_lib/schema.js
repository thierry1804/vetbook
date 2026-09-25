import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withClient } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function ensureSchema() {
  const schemaPath = path.join(__dirname, '../../db/schema.sql');
  const raw = await readFile(schemaPath, 'utf8');
  const schema = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  await withClient(async (client) => {
    for (const stmt of statements) {
      await client.query(stmt);
    }
  });
}
