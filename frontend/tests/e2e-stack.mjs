// Parcours de bout en bout contre la vraie stack (nginx → API → Postgres), sans aucune API simulée.
// Prérequis : `docker compose up -d` à la racine. Usage : BASE_URL=http://localhost:3080 node tests/e2e-stack.mjs
// Crée un compte jetable (e2e-…@example.invalid) et le supprime à la fin, même en cas d'échec.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.BASE_URL || 'http://localhost:3080').replace(/\/$/, '');
const email = `e2e-${Date.now()}@example.invalid`;
const password = 'e2e-motdepasse-1';
const petName = `Milo ${Date.now() % 10000}`;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
// Un contexte = un appareil : cookies et localStorage séparés. Onboarding marqué fait sans données = l'état laissé
// par « Passer » puis un rechargement : l'app crée alors un animal vide, qui faisait échouer toute la synchro (500).
async function device() {
  const context = await browser.newContext({ baseURL: base, viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => { localStorage.setItem('vetbook_onboarding_done', 'done'); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, errors };
}
// Un compte sans pays reçoit le dialogue « Où vis-tu ? » ; un compte qui en a déjà un ne le revoit pas.
async function answerCountry(page) {
  const choice = page.locator('.accd__panel').getByRole('button', { name: 'Madagascar' });
  const shown = await choice.waitFor({ timeout: 5000 }).then(() => true, () => false);
  if (shown) { await choice.click(); await page.locator('.accd__panel').waitFor({ state: 'detached' }); }
  return shown;
}
const pull = async (page) => { const r = await page.request.get('/api/sync/pull'); assert.equal(r.status(), 200); return r.json(); };

let first;
try {
  const health = await fetch(base + '/api/health').catch(() => null);
  assert.ok(health && health.ok, `API injoignable sur ${base} — lancer « docker compose up -d » d'abord.`);

  first = await device();
  const registered = await first.page.request.post('/api/auth/register', { data: { email, password, firstName: 'E2E', acceptTerms: true } });
  assert.equal(registered.status(), 201, await registered.text());
  assert.deepEqual(await pull(first.page), { found: false });

  await first.page.goto('/', { waitUntil: 'domcontentloaded' });
  assert.ok(await answerCountry(first.page), 'Un nouveau compte doit choisir son pays.');
  await first.page.locator('#btn-add-animal').click();
  await first.page.locator('#aa-name').fill(petName);
  await first.page.locator('#form-add-animal button[type="submit"]').click();
  await first.page.getByText(petName).filter({ visible: true }).first().waitFor();
  console.log('OK compte créé, animal ajouté depuis l’interface');

  // La synchro part en différé (AUTO_PUSH_DELAY_MS dans data-layer.js) : on attend qu'elle arrive en base.
  let synced = null;
  for (let i = 0; i < 30 && !synced; i++) {
    const res = await pull(first.page);
    synced = res.found && res.state.animals.find((w) => w.animal && w.animal.name === petName);
    if (!synced) await first.page.waitForTimeout(500);
  }
  assert.ok(synced, 'L’animal n’a pas été synchronisé vers le serveur en 15 s.');
  console.log('OK animal synchronisé en base');

  const second = await device();
  const login = await second.page.request.post('/api/auth/login', { data: { email, password } });
  assert.equal(login.status(), 200, await login.text());
  await second.page.goto('/', { waitUntil: 'domcontentloaded' });
  await answerCountry(second.page);
  await second.page.getByText(petName).filter({ visible: true }).first().waitFor({ timeout: 15000 });
  assert.deepEqual(second.errors, []);
  await second.context.close();
  console.log('OK second appareil : animal restauré depuis le serveur');

  assert.deepEqual(first.errors, []);
} finally {
  if (first) {
    const removed = await first.page.request.delete('/api/user/account', { data: { password } }).catch(() => null);
    if (!removed || removed.status() !== 200) console.error(`Compte de test non supprimé : ${email}`);
  }
  await browser.close();
}
