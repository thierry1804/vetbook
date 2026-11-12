// Migrations versionnées (db/migrations/NNNN_nom.sql), appliquées une fois, en transaction, sous verrou.
// Le socle idempotent (schema.sql, admin.sql) reste dans schema.js ; ici, ce qui ne se rejoue pas.
import crypto from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withClient } from './db.js';
import { splitSql } from './schema.js';

const DEFAULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations');
const LOCK = [17236, 4];

// Renvoie la liste des migrations appliquées pendant cet appel.
export async function runMigrations({ dir = DEFAULT_DIR } = {}) {
  const names = (await readdir(dir).catch(() => [])).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  return withClient(async (client) => {
    await client.query('select pg_advisory_lock($1, $2)', LOCK);
    try {
      await client.query(`create table if not exists schema_migrations (
        version text primary key, checksum text not null, applied_at timestamptz not null default now())`);
      const done = new Map((await client.query('select version, checksum from schema_migrations')).rows.map((r) => [r.version, r.checksum]));
      const applied = [];
      for (const file of names) {
        const version = file.replace(/\.sql$/, '');
        const raw = await readFile(path.join(dir, file), 'utf8');
        const checksum = crypto.createHash('sha256').update(raw).digest('hex');
        if (done.has(version)) {
          if (done.get(version) !== checksum) throw new Error(`La migration ${version} a été modifiée après son application : écris-en une nouvelle.`);
          continue;
        }
        await client.query('begin');
        try {
          for (const stmt of splitSql(raw)) await client.query(stmt);
          await client.query('insert into schema_migrations (version, checksum) values ($1, $2)', [version, checksum]);
          await client.query('commit');
        } catch (err) {
          await client.query('rollback');
          throw err;
        }
        applied.push(version);
      }
      return applied;
    } finally {
      await client.query('select pg_advisory_unlock($1, $2)', LOCK);
    }
  });
}
