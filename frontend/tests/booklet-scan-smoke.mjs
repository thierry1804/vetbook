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
let scanStatus = 200;
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
    return scanStatus === 402 ? json(res, 402, { error: 'Non inclus dans ta formule.', feature: 'booklet_scan' }) : json(res, 200, scanBody);
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

  {
    // Date illisible : le champ passe en texte, JJ/MM/AAAA est accepté et converti à l'enregistrement.
    scanBody = { ...SCAN, entries: [{ kind: 'vaccine', date: '1?/09/2026', name: 'Nobivac DHPPi', vet: '', next: '', nextEstimated: false, frequencyDays: '', uncertain: ['date'] }] };
    const { context, page, errors } = await open('paid');
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('[data-booklet-review]').waitFor();
    const date = page.locator('[data-booklet-field="date"][data-i="0"]');
    assert.equal(await date.getAttribute('type'), 'text');
    assert.match(await date.getAttribute('placeholder'), /JJ\/MM\/AAAA/);
    await date.fill('12/09/2026');
    await page.locator('[data-booklet-save]').click();
    const rex = (await stored(page)).animals.find((a) => a.id === 20);
    assert.deepEqual(rex.vaccines.map((v) => v.date), ['2026-09-12']);
    scanBody = SCAN;
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK date illisible : saisie JJ/MM/AAAA acceptée');
  }

  {
    // Rappel estimé : suit la date corrigée ; une fois modifié à la main, il n'est plus « estimé ».
    scanBody = { ...SCAN, entries: [{ kind: 'deworming', date: '2026-09-11', name: 'Frontline', type: 'externe', next: '2026-10-11', nextEstimated: true, frequencyDays: 30, uncertain: [] }] };
    const { context, page, errors } = await open('paid');
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('[data-booklet-review]').waitFor();
    await page.locator('[data-booklet-field="date"][data-i="0"]').fill('2026-09-20');
    assert.equal(await page.locator('[data-booklet-field="next"][data-i="0"]').inputValue(), '2026-10-20');
    assert.match(await page.locator('#modal-scanBooklet').textContent(), /estimé : 30 j/);
    await page.locator('[data-booklet-field="next"][data-i="0"]').fill('2026-11-01');
    assert.doesNotMatch(await page.locator('#modal-scanBooklet').textContent(), /estimé/);
    await page.locator('[data-booklet-field="date"][data-i="0"]').fill('2026-09-25');
    assert.equal(await page.locator('[data-booklet-field="next"][data-i="0"]').inputValue(), '2026-11-01', 'un rappel saisi à la main ne bouge plus');
    await page.locator('[data-booklet-save]').click();
    const d = (await stored(page)).animals.find((a) => a.id === 20).dewormings.find((x) => x.name === 'Frontline');
    assert.deepEqual([d.date, d.next, d.frequencyDays], ['2026-09-25', '2026-11-01', '']);
    scanBody = SCAN;
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK rappel estimé recalculé, puis figé quand modifié à la main');
  }

  {
    const { context, page } = await open('paid');
    await page.route('**/api/ai/booklet-scan', (route) => route.abort());
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.getByText('Pas de connexion', { exact: false }).waitFor();
    assert.equal(await page.getByText('Failed to fetch', { exact: false }).count(), 0);
    await context.close();
    console.log('OK erreur réseau : message clair');
  }

  {
    // 402 : un seul message « non inclus », pas deux.
    scanStatus = 402;
    const { context, page } = await open('paid');
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('.toast-undo').first().waitFor();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.toast-undo').count(), 1);
    scanStatus = 200;
    await context.close();
    console.log('OK 402 : un seul message');
  }

  {
    // Deux lignes identiques dans la même analyse : la seconde est proposée comme doublon, décochée.
    const same = { kind: 'vaccine', date: '2026-09-12', name: 'Nobivac DHPPi', vet: '', next: '', nextEstimated: false, frequencyDays: '', uncertain: [] };
    scanBody = { ...SCAN, entries: [same, { ...same }, { ...same, name: 'Rage' }] };
    const { context, page, errors } = await open('paid');
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('[data-booklet-review]').waitFor();
    assert.equal(await page.locator('[data-booklet-group="vaccine"] .booklet__row').count(), 2);
    assert.equal(await page.locator('[data-booklet-group="duplicate"] .booklet__row').count(), 1);
    assert.match(await page.locator('[data-booklet-save]').textContent(), /Enregistrer 2 éléments/);
    scanBody = SCAN;
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK doublon dans la même analyse : décoché');
  }

  {
    // Année sur deux chiffres saisie à la main : 98 → 1998, pas 2098.
    scanBody = { ...SCAN, entries: [{ kind: 'vaccine', date: '1?/09/98', name: 'Nobivac DHPPi', vet: '', next: '', nextEstimated: false, frequencyDays: '', uncertain: ['date'] }] };
    const { context, page } = await open('paid');
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('[data-booklet-review]').waitFor();
    await page.locator('[data-booklet-field="date"][data-i="0"]').fill('12/09/98');
    await page.locator('[data-booklet-save]').click();
    assert.deepEqual((await stored(page)).animals.find((a) => a.id === 20).vaccines.map((v) => v.date), ['1998-09-12']);
    scanBody = SCAN;
    await context.close();
    console.log('OK année sur deux chiffres : 98 devient 1998');
  }

  {
    // Un soin hors liste (ajouté par la lecture du carnet) doit rester modifiable.
    const { context, page } = await open('paid');
    await page.evaluate(() => {
      const st = window.app._ctx.getState();
      st.animals.find((a) => a.id === 20).hygiene.push({ id: 77, type: 'Pédicure', date: '2026-09-01', next: '', frequencyDays: '', notes: '' });
      window.app._ctx.saveState();
      window.app.switchTab('hygiene');
    });
    await page.locator('[data-action="edit"][data-hygiene-id="77"]').click();
    assert.equal(await page.locator('#ehy-type').inputValue(), 'Pédicure');
    await context.close();
    console.log('OK soin hors liste : l’édition le conserve');
  }

  {
    // Thème sombre : la ligne du carnet suit la couleur de carte, pas un blanc en dur.
    const { context, page } = await open('paid');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await shoot(page, { name: 'carnet.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('[data-booklet-review]').waitFor();
    const bg = await page.locator('.booklet__row:not(.is-off)').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.notEqual(bg, 'rgb(255, 255, 255)');
    await context.close();
    console.log('OK thème sombre : ligne du carnet sans blanc en dur');
  }
} finally { await browser.close(); await new Promise((done) => server.close(done)); }
