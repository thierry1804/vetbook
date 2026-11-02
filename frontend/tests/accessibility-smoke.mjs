import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const dist = resolve('dist');
const threadId = '00000000-0000-4000-8000-000000000010';
const olderMessageId = '00000000-0000-4000-8000-000000000011';
const threadSummary = (n) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, petName: `Animal ${n}`, otherName: 'Camille', closed: false, blocked: false, blockedByMe: false, preview: `Message ${n}` });
const config = {
  enforced: true, countries: [{ code: 'MG', label: 'Madagascar' }], defaultCountry: 'MG', featureLabels: {},
  plans: [
    { code: 'gratuit', name: 'Gratuit', monthly: { planCode: 'gratuit', priceMga: 0 }, features: { calendar_agenda: { enabled: true } } },
    { code: 'premium', name: 'Premium', trialDays: 30, monthly: { planCode: 'premium', priceMga: 5000 }, yearly: { planCode: 'premium_annuel', priceMga: 50000 }, features: {} },
  ],
};
const entitlements = { plan: 'gratuit', status: 'gratuit', enforced: true, features: { calendar_agenda: { enabled: true }, pet_directory: { enabled: true }, pet_messages: { enabled: true } }, validUntil: '2099-01-01T00:00:00Z', subscription: { tracked: false, effective: null, upcoming: [], history: [] } };
const json = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const signedIn = req.headers['x-test-signed-in'] === '1';
  if (pathname === '/api/auth/me') return json(res, signedIn ? 200 : 401, signedIn ? { userId: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid', name: 'Test', emailVerified: true } : { error: 'Non authentifié.' });
  if (pathname === '/api/user/profile') return json(res, 200, { userId: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid', firstName: 'Test', lastName: 'Compte', preferences: { notifications: { email: false, push: false } } });
  if (pathname === '/api/public-config') return json(res, 200, config);
  if (pathname === '/api/me/entitlements') return json(res, 200, entitlements);
  if (pathname === '/api/me/subscription') return json(res, 200, { entitlements, requests: [], notifications: [] });
  if (pathname === '/api/me/notifications') return json(res, 200, { rows: [], unread: 0, next: null, offset: 0, checkedAt: new Date().toISOString() });
  if (pathname === '/api/pet-threads') {
    const more = new URL(req.url, 'http://localhost').searchParams.has('before');
    return json(res, 200, { threads: (more ? [21, 22] : Array.from({ length: 20 }, (_, n) => n + 1)).map(threadSummary), nextBefore: more ? null : threadSummary(20).id });
  }
  if (pathname === `/api/pet-threads/${threadId}`) {
    const older = new URL(req.url, 'http://localhost').searchParams.has('before');
    return json(res, 200, { thread: { ...threadSummary(10), id: threadId }, messages: older
      ? [{ id: olderMessageId, mine: false, body: 'Ancien message', createdAt: '2026-01-01T00:00:00Z' }]
      : [{ id: '00000000-0000-4000-8000-000000000012', mine: true, body: 'Message récent', createdAt: '2026-01-02T00:00:00Z' }], nextBefore: older ? null : olderMessageId });
  }
  if (pathname.startsWith('/api/')) return json(res, 404, { error: 'Non disponible dans le test.' });
  if (pathname === '/config.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end('window.__SUPABASE_CONFIG__={apiBaseUrl:"",vapidPublicKey:"",googleClientId:""};'); return; }
  const file = resolve(dist, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(dist + sep)) { res.writeHead(403); res.end(); return; }
  try {
    const body = await readFile(file);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }[extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': mime }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
async function namedControls(page, root) {
  const nameless = await page.locator(root).evaluate((node) => [...node.querySelectorAll('button,input:not([type=hidden]),select,textarea')]
    .filter((el) => el.getClientRects().length && !el.disabled)
    .filter((el) => !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.labels?.length || el.textContent.trim()))
    .map((el) => el.outerHTML.slice(0, 120)));
  assert.deepEqual(nameless, []);
}
async function noPageOverflow(page) {
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(width.content <= width.viewport + 2, `Débordement horizontal : ${width.content}px pour ${width.viewport}px`);
}
try {
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await guest.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#ob-name').waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'ob-name');
  await namedControls(page, '#modal-onboarding');
  await page.locator('#onboarding-skip').click();
  assert.notEqual(await page.evaluate(() => document.activeElement.tagName), 'BODY');
  await page.locator('#btn-add-animal').click();
  await page.locator('#modal-addAnimal[aria-modal="true"]').waitFor();
  await namedControls(page, '#modal-addAnimal');
  const last = page.locator('#modal-addAnimal button').last();
  await last.focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.closest('#modal-addAnimal')?.id), 'modal-addAnimal');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-add-animal');
  await page.locator('#btn-add-animal').click();
  await page.locator('#aa-name').fill('Milo');
  await page.locator('#form-add-animal button[type="submit"]').click();
  await page.evaluate(() => window.app.switchTab('alertes'));
  await page.locator('.reminder-cat.active').waitFor();
  assert.equal(await page.locator('.reminder-cat.active').getAttribute('aria-pressed'), 'true');
  await page.locator('.reminder-cat[data-cat="vaccin"]').click();
  assert.equal(await page.locator('.reminder-cat[data-cat="vaccin"]').getAttribute('aria-pressed'), 'true');
  await page.locator('.reminder-period[data-range="60"]').click();
  assert.equal(await page.locator('.reminder-period[data-range="60"]').getAttribute('aria-pressed'), 'true');
  await page.evaluate(() => window.app.showNotifications());
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Notifications');
  await page.locator('#inbox-login').click();
  await page.locator('[data-act="open"][data-panel="security"]').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'acc-panel-title');
  await namedControls(page, '#view-user-profile');
  await noPageOverflow(page);
  assert.deepEqual(errors, []);
  await guest.close();
  console.log('OK mobile onboarding, animal dialog, reminders, guest notifications and account');

  const member = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { 'x-test-signed-in': '1' } });
  await member.addInitScript(() => { localStorage.setItem('vetbook_onboarding_done', 'done'); });
  const userPage = await member.newPage();
  const memberErrors = [];
  userPage.on('pageerror', (error) => memberErrors.push(error.message));
  await userPage.goto(base, { waitUntil: 'domcontentloaded' });
  await userPage.waitForTimeout(300);
  await userPage.evaluate(() => window.app.showUserProfile());
  await userPage.locator('[data-panel="plan"]').click();
  await userPage.locator('[data-act="plan-subscribe"]').first().click();
  await userPage.locator('.accd__panel[aria-modal="true"]').waitFor();
  await namedControls(userPage, '.accd__panel');
  for (const expected of ['Modalités de la demande', 'Confirmer la demande']) {
    await userPage.locator('[data-step-act="next"]').click();
    assert.equal(await userPage.locator('#accd-title').textContent(), expected);
    assert.equal(await userPage.evaluate(() => document.activeElement.id), 'accd-title');
  }
  await userPage.keyboard.press('Escape');
  assert.equal(await userPage.locator('.accd__panel').count(), 0);
  await userPage.evaluate(() => window.app.showNotifications());
  await userPage.locator('#inbox-page-title').waitFor();
  await userPage.waitForTimeout(150);
  assert.equal(await userPage.evaluate(() => document.activeElement.id), 'inbox-page-title');
  await namedControls(userPage, '#view-notifications');
  await userPage.evaluate((id) => window.app._ctx.showPetThread(id), threadId);
  await userPage.locator('[data-pet-older]').click();
  await userPage.getByText('Ancien message').waitFor();
  await userPage.locator('[data-pet-messages]').click();
  await userPage.locator('[data-pet-thread]').first().waitFor();
  assert.equal(await userPage.locator('[data-pet-thread]').count(), 20);
  await userPage.locator('[data-pet-threads-more]').click();
  await userPage.locator('[data-pet-thread]').nth(21).waitFor();
  assert.equal(await userPage.locator('[data-pet-thread]').count(), 22);
  await namedControls(userPage, '#view-pets');
  await noPageOverflow(userPage);
  assert.deepEqual(memberErrors, []);
  await member.close();
  console.log('OK authenticated subscription dialog, notifications and message pagination');
} finally { await browser.close(); await new Promise((done) => server.close(done)); }
