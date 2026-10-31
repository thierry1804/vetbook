import test from 'node:test';
import assert from 'node:assert/strict';
import { compareReleaseContent } from '../api/_lib/release-comparison.js';
import { listSql, RESOURCES } from '../api/admin/resources.js';
import { executeReminderJob } from '../api/_lib/reminder-job.js';

test('release comparison distinguishes additions, edits, removals and ignores object key order', () => {
  const old = { tips: [{ id: 1, title: 'Ancien', country: 'FR' }, { id: 2, title: 'Retiré' }], registries: { LOF: { label: 'LOF', delays: { mating: 28 } } } };
  const next = { tips: [{ country: 'FR', title: 'Nouveau', id: 1 }, { id: 3, title: 'Ajouté' }], registries: { LOF: { delays: { mating: 28 }, label: 'LOF' } } };
  const result = compareReleaseContent(old, next);
  const tips = result.find((s) => s.key === 'tips');
  assert.deepEqual([tips.added, tips.modified, tips.removed], [1, 1, 1]);
  assert.equal(tips.changes.find((c) => c.kind === 'modified').before.title, 'Ancien');
  assert.equal(result.find((s) => s.key === 'registries').changes.length, 0);
});
test('release comparison ignores entry reordering and scopes species and emergencies', () => {
  const before = { vaccineDb: { Canine: ['A', 'B'], Féline: ['A'] }, emergencyNumbers: [{ country: 'FR', label: 'Urgences', phone: '1' }] };
  const after = { vaccineDb: { Canine: ['B', 'A'], Féline: [] }, emergencyNumbers: [{ country: 'FR', label: 'Urgences', phone: '2' }] };
  const result = compareReleaseContent(before, after);
  assert.equal(result.find((s) => s.key === 'vaccineDb').removed, 1);
  assert.equal(result.find((s) => s.key === 'emergencyNumbers').modified, 1);
  assert.equal(compareReleaseContent({}, after).find((s) => s.key === 'vaccineDb').added, 2);
});
test('comparison retains distinct entries with duplicate labels', () => {
  const result = compareReleaseContent({}, { emergencyNumbers: [{ country: 'FR', label: 'Garde', phone: '1' }, { country: 'FR', label: 'Garde', phone: '2' }] });
  assert.equal(result.find((s) => s.key === 'emergencyNumbers').added, 2);
});

test('notification and work-queue filters are parameterized and have matching date windows', () => {
  const messages = listSql(RESOURCES.messages, { sort: ['status', 'DESC'], filter: { status: 'echec', recent_days: 7, job_run_id: '12', unknown: 'ignored' } });
  assert.match(messages.where, /message_log.status::text = \$1/);
  assert.match(messages.where, /message_log.job_run_id::text = \$2/);
  assert.match(messages.where, /message_log.created_at >= now\(\)/);
  assert.deepEqual(messages.params, ['echec', '12', 7]);
  const subs = listSql(RESOURCES.subscriptions, { sort: ['id', 'ASC'], filter: { expiring_days: 7 } });
  assert.match(subs.where, /subscriptions.status in \('actif','essai'\)/); assert.deepEqual(subs.params, [7]);
  const invalid = listSql(RESOURCES.jobs, { sort: ['status;drop table', 'bad'], filter: { recent_days: '1;drop table', status: "';drop table users;--" } });
  assert.equal(invalid.orderBy, 'job_runs.id ASC'); assert.deepEqual(invalid.params, ["';drop table users;--"]);
});
function fixture({ locked = true, trackingFails = false } = {}) {
  const queries = []; let released = false;
  const client = { query: async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] };
    if (sql.startsWith('insert')) return { rows: [{ id: 42 }] };
    if (sql.includes('pg_advisory_unlock')) released = true;
    if (trackingFails && sql.includes('status = $2')) throw new Error('Tracking failed');
    return { rows: [] };
  } };
  return { queries, released: () => released, withClient: async (fn) => fn(client) };
}
test('cron and manual runs refuse overlapping execution before delivery', async () => {
  const f = fixture({ locked: false }); let sent = false;
  await assert.rejects(executeReminderJob({}, { withClient: f.withClient, runReminders: async () => { sent = true; } }), { status: 409 });
  assert.equal(sent, false); assert.equal(f.queries.length, 1);
});
test('audit failure prevents delivery and releases the execution lock', async () => {
  const f = fixture(); let sent = false;
  await assert.rejects(executeReminderJob({ beforeRun: async () => { throw new Error('Audit unavailable'); } }, { withClient: f.withClient, runReminders: async () => { sent = true; } }), /Audit unavailable/);
  assert.equal(sent, false); assert.equal(f.released(), true);
  assert(f.queries.some((q) => q.sql.includes("status = 'echec'")));
});
test('partial delivery is tracked separately from processed accounts', async () => {
  const f = fixture(); const order = [];
  const result = await executeReminderJob({ trigger: 'manual', beforeRun: async (id) => { assert.equal(id, 42); order.push('audit'); } }, { withClient: f.withClient, runReminders: async ({ runId }) => { assert.equal(runId, 42); order.push('delivery'); return { usersNotified: 2, monthlySummariesSent: 1, delivery: { email: { sent: 1, failed: 1 }, push: { sent: 0, failed: 0 } } }; } });
  assert.deepEqual(order, ['audit', 'delivery']); assert.equal(result.trackingError, false);
  const finish = f.queries.find((q) => q.sql.includes('status = $2'));
  assert.deepEqual(finish.params.slice(0, 4), [42, 'partial', 3, 1]); assert.equal(f.released(), true);
});
test('tracking failure after delivery does not report delivery failure or retry it', async () => {
  const f = fixture({ trackingFails: true }); let calls = 0;
  const result = await executeReminderJob({}, { withClient: f.withClient, runReminders: async () => { calls++; return { usersNotified: 1 }; } });
  assert.equal(result.trackingError, true); assert.equal(calls, 1); assert.equal(f.released(), true);
  assert(!f.queries.some((q) => q.sql.includes("status = 'echec'")));
});
