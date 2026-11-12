#!/usr/bin/env node
// Lance chaque fichier de backend/tests/ (et le smoke admin) contre une base Postgres vierge — une base neuve
// par fichier : les tests laissent des réglages en base (formules, app_settings) qui faussent les suivants.
// Usage : npm run test:integration [-- motif]   (ex. « -- realtime » pour un seul fichier)
// Serveur Postgres : QA_PG_ADMIN_URL (ex. postgres://qa:qa@127.0.0.1:5432/postgres en CI) ;
// sinon un conteneur postgres:16-alpine jetable est démarré puis supprimé.
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const filter = process.argv[2] || '';
const files = [
  ...readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.mjs')).sort().map((f) => `tests/${f}`),
  'scripts/smoke-admin.mjs',
].filter((f) => f.includes(filter));
if (!files.length) { console.error(`Aucun test ne correspond à « ${filter} ».`); process.exit(1); }

let container = null;
let adminUrl = process.env.QA_PG_ADMIN_URL;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
function stopContainer() { if (container) { try { docker('rm', '-f', container); } catch { /* déjà supprimé */ } container = null; } }
process.on('SIGINT', () => { stopContainer(); process.exit(130); });

async function waitForPostgres(url) {
  for (let i = 0; i < 60; i++) {
    const client = new pg.Client({ connectionString: url });
    try { await client.connect(); await client.end(); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error(`Postgres injoignable : ${url}`);
}
async function freshDatabase() {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query('drop database if exists applika_qa with (force)');
    await client.query('create database applika_qa');
  } finally { await client.end(); }
  const url = new URL(adminUrl); url.pathname = '/applika_qa';
  return url.toString();
}
function run(file, databaseUrl) {
  // Les tests refusent de tourner si une livraison externe (SMTP, push) est configurée.
  const env = { ...process.env, DATABASE_URL: databaseUrl, JWT_SECRET: randomBytes(32).toString('hex'), ADMIN_JWT_SECRET: randomBytes(32).toString('hex') };
  for (const key of ['SMTP_HOST', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'MINIO_ENDPOINT']) delete env[key];
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [file], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    const timer = setTimeout(() => { output += '\n[test-integration] délai de 180 s dépassé\n'; child.kill('SIGKILL'); }, 180_000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, output, seconds: ((Date.now() - started) / 1000).toFixed(1) }); });
  });
}

let failed = 0;
try {
  if (!adminUrl) {
    container = docker('run', '-d', '--rm', '-e', 'POSTGRES_USER=qa', '-e', 'POSTGRES_PASSWORD=qa', '-e', 'POSTGRES_DB=postgres', '-p', '127.0.0.1::5432', 'postgres:16-alpine');
    const port = docker('port', container, '5432/tcp').split('\n')[0].split(':').pop();
    adminUrl = `postgres://qa:qa@127.0.0.1:${port}/postgres`;
  }
  await waitForPostgres(adminUrl);
  for (const file of files) {
    const { code, output, seconds } = await run(file, await freshDatabase());
    if (code === 0) console.log(`✓ ${file} (${seconds} s)`);
    else { failed++; console.log(`✗ ${file} (${seconds} s, code ${code})\n${output.trimEnd().split('\n').slice(-30).join('\n')}\n`); }
  }
} finally { stopContainer(); }
console.log(failed ? `\n${failed}/${files.length} fichier(s) en échec.` : `\n${files.length} fichier(s) de test d'intégration au vert.`);
process.exit(failed ? 1 : 0);
