import assert from 'node:assert/strict';
import { withClient } from '../api/_lib/db.js';
import { ensureSchema } from '../api/_lib/schema.js';
import { reserveAiAttempt, AI_REQUESTS_PER_MINUTE } from '../api/_lib/ai-usage.js';

let count = 0;
const test = async (name, fn) => { await fn(); console.log('OK', name); count++; };
const sql = (text, params = []) => withClient((c) => c.query(text, params));
const fill = (source, n) => sql("insert into ai_usage_log (source, model) select $1, 'm' from generate_series(1, $2)", [source, n]);
const status = async (source) => reserveAiAttempt({ source, model: 'm' }).then(() => 200, (e) => e.status);

await ensureSchema();

await test('le budget de l’assistant reste limité', async () => {
  await sql('delete from ai_usage_log');
  await fill('chat', AI_REQUESTS_PER_MINUTE);
  assert.equal(await status('chat'), 429);
});

await test('un assistant à bout de budget ne bloque pas la lecture du carnet', async () => {
  assert.equal(await status('booklet'), 200);
});

await test('la lecture du carnet a son propre budget et ne vide pas celui de l’assistant', async () => {
  await sql('delete from ai_usage_log');
  await fill('booklet', 10);
  assert.equal(await status('booklet'), 429);
  assert.equal(await status('chat'), 200);
});

console.log(`${count} vérifications du budget IA au vert`);
process.exit(0);
