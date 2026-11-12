// Lecture du carnet par photo, côté app : API simulée (aucun appel au modèle), état local préparé.
// Usage : npm run build && node tests/booklet-scan-smoke.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const dist = resolve('dist');
// Vraie image décodable par le navigateur (PNG 16×16), pour la réduction côté front.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGPgndJBEmIY1TCqYfhqAABqqikQLN19fgAAAABJRU5ErkJggg==', 'base64');

const features = (paid) => ({ calendar_agenda: { enabled: true }, health_records: { enabled: true }, hygiene_care: { enabled: true }, weight_tracking: { enabled: true }, booklet_scan: { enabled: paid } });
const config = { enforced: true, countries: [{ code: 'MG', label: 'Madagascar' }], defaultCountry: 'MG', featureLabels: { booklet_scan: 'Lecture du carnet par photo' },
  plans: [{ code: 'gratuit', name: 'Gratuit', monthly: { planCode: 'gratuit', priceMga: 0 }, features: {} }, { code: 'premium', name: 'Premium', monthly: { planCode: 'premium', priceMga: 5000 }, features: { booklet_scan: { enabled: true } } }] };
const SCAN = {
  petName: 'Rex', chip: '', mismatch: false, entries: [
    { kind: 'hygiene', date: '2026-09-12', name: 'Nettoyage oreilles', next: '', nextEstimated: false, frequencyDays: '', uncertain: [] },
    { kind: 'deworming', date: '2026-09-11', name: 'Frontline', type: 'externe', next: '2026-10-11', nextEstimated: true, frequencyDays: 30, uncertain: ['date'] },
    { kind: 'weight', date: '2026-09-12', name: '', weightKg: 12.4, next: '', nextEstimated: false, frequencyDays: '', uncertain: [] },
    { kind: 'vaccine', date: '2026-09-12', name: 'Nobivac DHPPi', vet: 'Dr Rakoto', next: '2027-09-12', nextEstimated: false, frequencyDays: '', uncertain: [] },
    { kind: 'deworming', date: '2026-06-14', name: 'Milbemax', type: 'interne', next: '', nextEstimated: false, frequencyDays: '', uncertain: [] },
  ],
};
let scanCalls = 0;
let scanDelayMs = 0;
let scanBody = SCAN;
const json = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const paid = req.headers['x-test-plan'] === 'paid';
  if (pathname === '/api/auth/me') return json(res, 200, { userId: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid', name: 'Test', emailVerified: true });
  if (pathname === '/api/user/profile') return json(res, 200, { userId: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid', firstName: 'Test', preferences: { country: 'MG', notifications: { email: false, push: false } } });
  if (pathname === '/api/public-config') return json(res, 200, config);
  if (pathname === '/api/me/entitlements') return json(res, 200, { plan: paid ? 'premium' : 'gratuit', status: 'actif', enforced: true, features: features(paid), validUntil: '2099-01-01T00:00:00Z' });
  if (pathname === '/api/sync/pull') return json(res, 200, { found: false });
  if (pathname === '/api/ai/booklet-scan') {
    scanCalls++;
    if (scanDelayMs) await new Promise((r) => setTimeout(r, scanDelayMs));
    return json(res, 200, scanBody);
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

const wrap = (id, name, extra = {}) => ({ id, animal: { name, species: 'Canine', sex: 'Mâle', weightHistory: [], heightHistory: [] }, photos: [], vaccines: [], dewormings: [], consultations: [], medications: [], notes: [], hygiene: [], notifications: {}, ...extra });
const seed = { animals: [wrap(20, 'Rex', { dewormings: [{ id: 30, date: '2026-06-14', name: 'Milbemax', next: '', frequencyDays: '', type: 'interne' }] }), wrap(21, 'Milo')], nextId: 40, currentAnimalId: 20, owner: { name: 'Test' } };

async function open(plan, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, extraHTTPHeaders: { 'x-test-plan': plan } });
  await context.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) { localStorage.setItem('vetbook_data', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); }
    localStorage.setItem('vetbook_onboarding_done', 'done'); localStorage.setItem('vetbook_country_asked', '1');
  }, seed);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.app && window.app._ctx);
  // Ouvre la fiche de l'animal (même gestionnaire que la barre du bas en mobile, absente en bureau).
  await page.evaluate(() => document.querySelector('[data-nav="pets"]').click());
  await page.evaluate(() => window.app.switchTab('vaccins'));
  await page.waitForTimeout(300);
  return { context, page, errors };
}
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vetbook_data')));
async function namedControls(page, root) {
  const nameless = await page.locator(root).evaluate((node) => [...node.querySelectorAll('button,input:not([type=hidden]):not([type=file]),select,textarea')]
    .filter((el) => el.getClientRects().length && !el.disabled)
    .filter((el) => !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.labels?.length || el.textContent.trim()))
    .map((el) => el.outerHTML.slice(0, 120)));
  assert.deepEqual(nameless, []);
}
async function shoot(page, file) {
  await page.locator('#btn-scan-booklet-vaccins').click();
  await page.locator('#modal-scanBooklet[aria-modal="true"]').waitFor();
  await page.locator('#booklet-file').setInputFiles(file);
}

try {
  {
    const { context, page, errors } = await open('free');
    const btn = page.locator('#btn-scan-booklet-vaccins');
    assert.ok(await btn.evaluate((el) => el.classList.contains('is-feature-locked')));
    await btn.click();
    assert.equal(await page.locator('#modal-scanBooklet[aria-modal="true"]').count(), 0);
    assert.equal(scanCalls, 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK gratuit : bouton cadenassé, pas d’appel API');
  }

  {
    const { context, page, errors } = await open('paid');
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('[data-booklet-review]').waitFor();
    assert.equal(scanCalls, 1);
    const groups = await page.locator('[data-booklet-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-booklet-group')));
    assert.deepEqual(groups, ['vaccine', 'deworming', 'hygiene', 'weight', 'duplicate']);
    assert.equal(await page.locator('#modal-scanBooklet .is-doubt').count(), 1);
    assert.equal(await page.locator('[data-booklet-group="duplicate"] input[type=checkbox]').isChecked(), false);
    assert.match(await page.locator('[data-booklet-save]').textContent(), /Enregistrer 4 éléments/);
    assert.match(await page.locator('#modal-scanBooklet').textContent(), /estimé : 30 j/);
    assert.match(await page.locator('#modal-scanBooklet').textContent(), /écrit sur le carnet/);
    await namedControls(page, '#modal-scanBooklet');
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    assert.ok(width.content <= width.viewport + 2, `Débordement horizontal : ${width.content}px`);
    console.log('OK payant : groupes, valeur à vérifier, doublon décoché, compteur, rappels étiquetés');

    await page.locator('[data-booklet-save]').click();
    await page.locator('#modal-scanBooklet[aria-modal="true"]').waitFor({ state: 'detached' }).catch(() => {});
    const s = await stored(page);
    const rex = s.animals.find((a) => a.id === 20); const milo = s.animals.find((a) => a.id === 21);
    assert.deepEqual(rex.vaccines.map((v) => [v.name, v.date, v.next, v.vet]), [['Nobivac DHPPi', '2026-09-12', '2027-09-12', 'Dr Rakoto']]);
    assert.deepEqual(rex.dewormings.map((d) => d.name), ['Milbemax', 'Frontline']);
    assert.deepEqual([rex.dewormings[1].type, rex.dewormings[1].frequencyDays, rex.dewormings[1].next], ['externe', 30, '2026-10-11']);
    assert.deepEqual(rex.hygiene.map((h) => [h.type, h.date]), [['Nettoyage oreilles', '2026-09-12']]);
    assert.deepEqual(rex.animal.weightHistory.map((w) => [w.date, w.weight]), [['2026-09-12', 12.4]]);
    assert.deepEqual([milo.vaccines.length, milo.dewormings.length, milo.hygiene.length, milo.animal.weightHistory.length], [0, 0, 0, 0]);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK enregistrer ajoute exactement les lignes cochées');
  }

  {
    const { context, page, errors } = await open('paid');
    scanDelayMs = 800;
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForTimeout(150);
    await page.evaluate(() => { window.app._ctx.getState().currentAnimalId = 21; });
    await page.locator('[data-booklet-review]').waitFor();
    await page.locator('[data-booklet-save]').click();
    const s = await stored(page);
    assert.equal(s.animals.find((a) => a.id === 20).vaccines.length, 1);
    assert.equal(s.animals.find((a) => a.id === 21).vaccines.length, 0);
    scanDelayMs = 0;
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK les lignes vont dans l’animal capturé au départ');
  }

  {
    const { context, page, errors } = await open('paid');
    const before = scanCalls;
    await shoot(page, { name: 'carnet.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('ceci est un texte, pas une photo') });
    await page.getByText('Ce format de photo n’est pas pris en charge', { exact: false }).waitFor();
    assert.equal(scanCalls, before);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal-scanBooklet[aria-modal="true"]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-scan-booklet-vaccins');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK fichier non image : message, aucun appel API, Échap rend le focus');
  }

  {
    scanBody = { ...SCAN, petName: 'Max', mismatch: true };
    const { context, page, errors } = await open('paid', { width: 1280, height: 900 });
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('[data-booklet-review]').waitFor();
    assert.match(await page.locator('[data-booklet-mismatch]').textContent(), /« Max », pas Rex/);
    scanBody = SCAN;
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK mismatch affiche l’avertissement');
  }
} finally { await browser.close(); await new Promise((done) => server.close(done)); }
