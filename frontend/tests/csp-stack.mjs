// Politique de sécurité du contenu, vérifiée contre la vraie stack (nginx) : l'en-tête arrive bien sur les pages HTML,
// et l'app ne déclenche aucune violation (scripts en ligne, polices, appels réseau) au chargement ni sur les boutons.
// Prérequis : `docker compose up -d --build nginx`. Usage : BASE_URL=http://localhost:3080 node tests/csp-stack.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.BASE_URL || 'http://localhost:3080').replace(/\/$/, '');

for (const path of ['/', '/legal.html', '/index.html']) {
  const res = await fetch(base + path);
  const csp = res.headers.get('content-security-policy') || '';
  assert.match(csp, /default-src 'self'/, `${path} : CSP absente`);
  assert.doesNotMatch(csp.split('script-src')[1]?.split(';')[0] || '', /unsafe-inline|unsafe-eval/, `${path} : script-src trop permissif`);
  assert.match(res.headers.get('permissions-policy') || '', /camera/, `${path} : Permissions-Policy absente`);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
}
console.log('OK en-têtes de sécurité sur les pages HTML');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
try {
  const context = await browser.newContext({ baseURL: base, viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('vetbook_onboarding_done', 'done'); localStorage.setItem('vetbook_country_asked', '1');
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.app && window.app._ctx);
  // Les boutons qui avaient un onclick en ligne ouvrent leur fenêtre.
  for (const modal of ['addVaccin', 'addNote']) {
    await page.evaluate((m) => document.querySelector(`[data-open-modal="${m}"]`).click(), modal);
    await page.locator(`#modal-${modal}[aria-modal="true"]`).waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
  }
  const violations = await page.evaluate(() => window.__csp);
  assert.deepEqual(violations, []);
  assert.deepEqual(errors, []);
  console.log('OK aucune violation CSP au chargement ni sur les boutons');
  await context.close();
} finally { await browser.close(); }
