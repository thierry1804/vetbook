import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { signSessionToken } from '../api/_lib/auth.js';
import { perUserLimiter } from '../api/_lib/rate-limit.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';

async function serve() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.post('/x', perUserLimiter({ windowMs: 60000, max: 2, message: 'Trop de demandes. Réessaie plus tard.' }), (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  return { server, url: `http://127.0.0.1:${server.address().port}/x` };
}
const post = (url, headers) => fetch(url, { method: 'POST', headers });

test('deux comptes derrière la même IP ont chacun leur quota', async () => {
  const { server, url } = await serve();
  try {
    const a = { cookie: `applika_session=${await signSessionToken('1', 'a@test.local')}`, 'x-forwarded-for': '10.0.0.1' };
    const b = { cookie: `applika_session=${await signSessionToken('2', 'b@test.local')}`, 'x-forwarded-for': '10.0.0.1' };
    assert.equal((await post(url, a)).status, 200);
    assert.equal((await post(url, a)).status, 200);
    const blocked = await post(url, a);
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error, 'Trop de demandes. Réessaie plus tard.');
    assert.equal((await post(url, b)).status, 200, 'le compte B ne doit pas payer pour le compte A');
  } finally { server.close(); }
});

test('sans session valide, le quota suit l’IP du visiteur (CF-Connecting-IP) et non celle du proxy', async () => {
  const { server, url } = await serve();
  try {
    const visitor = (ip) => ({ 'cf-connecting-ip': ip, 'x-forwarded-for': '10.0.0.1' });
    assert.equal((await post(url, visitor('203.0.113.1'))).status, 200);
    assert.equal((await post(url, visitor('203.0.113.1'))).status, 200);
    assert.equal((await post(url, visitor('203.0.113.1'))).status, 429);
    assert.equal((await post(url, visitor('203.0.113.2'))).status, 200);
  } finally { server.close(); }
});

test('un jeton falsifié ne donne pas accès au quota d’un autre compte', async () => {
  const { server, url } = await serve();
  try {
    const forged = { cookie: 'applika_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.faux', 'cf-connecting-ip': '203.0.113.9' };
    for (let i = 0; i < 2; i++) assert.equal((await post(url, forged)).status, 200);
    const real = { cookie: `applika_session=${await signSessionToken('1', 'a@test.local')}`, 'cf-connecting-ip': '203.0.113.10' };
    assert.equal((await post(url, real)).status, 200, 'le quota du vrai compte 1 est intact');
  } finally { server.close(); }
});
