#!/usr/bin/env node
// Charge db/seed/reference.json (généré par scripts/extract-reference.mjs) dans les tables ref_* et
// content_*. Idempotent : ne remplace jamais une donnée déjà éditée dans le backoffice.
// Usage (dans le conteneur api) : node scripts/seed-reference.mjs [--publish]
import { readFile } from 'node:fs/promises';
import { withClient } from '../api/_lib/db.js';
import { ensureSchema } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { buildReleaseContent } from '../api/_lib/ref-release.js';

const data = JSON.parse(await readFile(new URL('../db/seed/reference.json', import.meta.url), 'utf8'));
await ensureSchema();
await seedAdminDefaults();

const n = await withClient(async (c) => {
  const cnt = {};
  const bump = (k, r) => { cnt[k] = (cnt[k] || 0) + (r.rowCount || 0); };
  for (const b of data.breeds) {
    bump('breeds', await c.query(
      `insert into ref_breeds (species_code, name, weight_min, weight_max, fci_number, cc_slug) values ($1,$2,$3,$4,$5,$6) on conflict (species_code, name) do nothing`,
      [b.species, b.name, b.weightMin, b.weightMax, b.fci, b.slug]));
  }
  for (const v of data.vaccines) {
    bump('vaccines', await c.query('insert into ref_vaccines (species_code, name) values ($1,$2) on conflict (species_code, name) do nothing', [v.species, v.name]));
  }
  for (const [type, items] of Object.entries(data.lists)) {
    let order = 0;
    for (const it of items) {
      const label = typeof it === 'string' ? it : it.label;
      const meta = typeof it === 'string' ? {} : (it.met != null ? { met: it.met } : {});
      bump('lists', await c.query('insert into ref_lists (list_type, label, sort_order, meta) values ($1,$2,$3,$4) on conflict (list_type, label) do nothing', [type, label, order++, JSON.stringify(meta)]));
    }
  }
  for (const k of data.checkup) {
    bump('checkup', await c.query('insert into ref_checkup_criteria (key, label, icon, levels, sort_order) values ($1,$2,$3,$4,$5) on conflict (key) do nothing', [k.key, k.label, k.icon, JSON.stringify(k.levels), k.order]));
  }
  for (const r of data.registries) {
    bump('registries', await c.query(
      'insert into ref_registries (code, label, country, number_regex, lookup_url, delays) values ($1,$2,$3,$4,$5,$6) on conflict (code) do nothing',
      [r.code, r.label, r.country, r.regex, r.lookupUrl, JSON.stringify(r.delays)]));
  }
  if ((await c.query('select 1 from content_tips limit 1')).rowCount === 0) {
    for (const t of data.tips) {
      bump('tips', await c.query("insert into content_tips (title, body, category, country, author, status, published_at) values ($1,$2,$3,'ALL',$4,'publie',now())", [t.title, t.body, t.category, t.author]));
    }
  }
  if ((await c.query('select 1 from content_events limit 1')).rowCount === 0) {
    for (const e of data.events) {
      bump('events', await c.query("insert into content_events (title, description, month, day, recurring, country, status) values ($1,$2,$3,$4,$5,'FR','publie')", [e.title, e.description, e.month, e.day, e.recurring]));
    }
  }
  if ((await c.query('select 1 from emergency_numbers limit 1')).rowCount === 0) {
    for (const e of data.emergency) {
      bump('emergency', await c.query('insert into emergency_numbers (country, label, phone, hours) values ($1,$2,$3,$4)', [e.country, e.label, e.phone, e.hours]));
    }
  }
  return cnt;
});
console.log('Insertions :', JSON.stringify(n));

if (process.argv.includes('--publish')) {
  // Version initiale = état actuel de l'app (parité stricte). Auteur/publieur nuls : amorçage système.
  const v = await withClient(async (c) => {
    const content = await buildReleaseContent(c);
    await c.query("update ref_releases set status = 'archived' where status = 'published'");
    return (await c.query("insert into ref_releases (status, note, content, published_at) values ('published', 'Version initiale (constantes de app.js)', $1, now()) returning version", [JSON.stringify(content)])).rows[0].version;
  });
  console.log('Version publiée :', v);
}
process.exit(0);
