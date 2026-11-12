import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createLogger, requestLogger, errorHandler, readyHandler } from '../api/_lib/observability.js';

const collect = (level) => { const lines = []; return { lines, logger: createLogger({ write: (l) => lines.push(JSON.parse(l)), level }) }; };

async function serve(setup) {
  const app = express();
  setup(app);
  const server = app.listen(0);
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test('le logger écrit une ligne JSON par événement et respecte le niveau', () => {
  const { lines, logger } = collect('warn');
  logger.info('ignoré');
  logger.warn('attention', { a: 1 });
  logger.error('boum', { err: new Error('cassé') });
  assert.deepEqual(lines.map((l) => [l.level, l.msg]), [['warn', 'attention'], ['error', 'boum']]);
  assert.equal(lines[0].a, 1);
  assert.ok(lines[0].time);
  assert.equal(lines[1].err.message, 'cassé');
  assert.match(lines[1].err.stack, /Error: cassé/);
});

test('une requête est journalisée sans sa query string, avec un identifiant renvoyé en en-tête', async () => {
  const { lines, logger } = collect('info');
  const { server, base } = await serve((app) => {
    app.use(requestLogger({ logger }));
    app.get('/api/auth/verify-email', (_req, res) => res.status(204).end());
    app.get('/api/health', (_req, res) => res.json({ ok: true }));
  });
  try {
    const res = await fetch(`${base}/api/auth/verify-email?token=secret-a-ne-pas-journaliser`);
    const id = res.headers.get('x-request-id');
    assert.ok(id);
    await fetch(`${base}/api/health`);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(lines.length, 1, 'la santé du service ne remplit pas les journaux');
    assert.deepEqual([lines[0].method, lines[0].path, lines[0].status, lines[0].requestId], ['GET', '/api/auth/verify-email', 204, id]);
    assert.ok(typeof lines[0].ms === 'number');
    assert.doesNotMatch(JSON.stringify(lines[0]), /secret-a-ne-pas-journaliser/);
  } finally { server.close(); }
});

test('une erreur non gérée donne un 500 générique avec l’identifiant, et le détail va aux journaux', async () => {
  const { lines, logger } = collect('info');
  const { server, base } = await serve((app) => {
    app.use(requestLogger({ logger }));
    app.get('/boom', () => { throw new Error('détail interne SQL'); });
    app.use(errorHandler({ logger }));
  });
  try {
    const res = await fetch(`${base}/boom`);
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(body.requestId, res.headers.get('x-request-id'));
    assert.doesNotMatch(JSON.stringify(body), /SQL/);
    const logged = lines.find((l) => l.level === 'error');
    assert.equal(logged.err.message, 'détail interne SQL');
    assert.equal(logged.requestId, body.requestId);
  } finally { server.close(); }
});

test('/api/ready répond 503 quand la base ne répond pas', async () => {
  for (const [ok, expected] of [[true, 200], [false, 503]]) {
    const { server, base } = await serve((app) => {
      app.get('/api/ready', readyHandler({ check: async () => { if (!ok) throw new Error('db down'); }, logger: collect('info').logger }));
    });
    try {
      const res = await fetch(`${base}/api/ready`);
      assert.equal(res.status, expected);
      assert.equal((await res.json()).ok, ok);
    } finally { server.close(); }
  }
});
