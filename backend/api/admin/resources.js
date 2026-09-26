// Ressources CRUD génériques du backoffice (whitelist de colonnes, audit avant/après, pagination
// compatible ra-data-simple-rest : ?range=[0,24]&sort=["col","ASC"]&filter={"q":"…"} → Content-Range).
import express from 'express';
import { withClient, withTransaction } from '../_lib/db.js';
import { requireAdmin, audit } from '../_lib/admin-auth.js';
import { cleanHtml } from '../_lib/html.js';

// type : text | html (WYSIWYG, assaini) | int | num | bool | json | date | ts | texts (text[])
const R = (table, pk, perms, cols, opts = {}) => ({ table, pk, perms, cols, ...opts });
const ref = { read: 'referentiels.read', write: 'referentiels.write' };
const contents = { read: 'contents.read', write: 'contents.write' };
const directory = { read: 'directory.read', write: 'directory.write' };
const plansPerm = { read: 'billing.read', write: 'billing.plans_write' };

export const RESOURCES = {
  species: R('ref_species', 'code', ref, { code: 'text', label: 'text', sort_order: 'int', status: 'text' }, { search: ['code', 'label'], order: 'sort_order' }),
  breeds: R('ref_breeds', 'id', ref, { species_code: 'text', name: 'text', aliases: 'texts', weight_min: 'num', weight_max: 'num', height_min: 'num', height_max: 'num', fci_number: 'text', cc_slug: 'text', status: 'text' }, { search: ['name', 'fci_number'], order: 'name', deletable: true }),
  vaccines: R('ref_vaccines', 'id', ref, { species_code: 'text', name: 'text', laboratory: 'text', valences: 'text', default_interval_days: 'int', status: 'text' }, { search: ['name', 'laboratory'], order: 'name', deletable: true }),
  antiparasitics: R('ref_antiparasitics', 'id', ref, { species_code: 'text', name: 'text', kind: 'text', default_interval_days: 'int', status: 'text' }, { search: ['name'], order: 'name', deletable: true }),
  lists: R('ref_lists', 'id', ref, { list_type: 'text', label: 'text', sort_order: 'int', meta: 'json', active: 'bool' }, { search: ['label', 'list_type'], order: 'list_type', deletable: true }),
  checkup: R('ref_checkup_criteria', 'key', ref, { key: 'text', label: 'text', icon: 'text', levels: 'json', advice: 'json', sort_order: 'int', active: 'bool' }, { search: ['key', 'label'], order: 'sort_order', deletable: true }),
  registries: R('ref_registries', 'code', ref, { code: 'text', label: 'text', country: 'text', number_regex: 'text', lookup_url: 'text', delays: 'json', status: 'text' }, { search: ['code', 'label'], order: 'code' }),
  tips: R('content_tips', 'id', contents, { title: 'text', body: 'html', category: 'text', species: 'text', country: 'text', author: 'text', vet_reviewed: 'bool', featured: 'bool', status: 'text', published_at: 'ts' }, { search: ['title', 'body'], order: 'id', deletable: true }),
  events: R('content_events', 'id', contents, { title: 'text', description: 'text', month: 'int', day: 'int', event_date: 'date', recurring: 'bool', location: 'text', country: 'text', link: 'text', status: 'text' }, { search: ['title'], order: 'id', deletable: true }),
  pages: R('content_pages', 'id', contents, { slug: 'text', kind: 'text', title: 'text', body: 'html', version: 'text', status: 'text', force_reaccept: 'bool', published_at: 'ts' }, { search: ['slug', 'title'], order: 'id', deletable: true }),
  clinics: R('directory_clinics', 'id', directory, { name: 'text', address: 'text', city: 'text', country: 'text', lat: 'num', lng: 'num', phone: 'text', email: 'text', hours: 'text', on_call: 'bool', emergency: 'bool', species: 'texts', source: 'text', status: 'text' }, { search: ['name', 'city'], order: 'id', deletable: true }),
  emergency_numbers: R('emergency_numbers', 'id', directory, { country: 'text', label: 'text', phone: 'text', hours: 'text', sort_order: 'int', status: 'text' }, { search: ['label', 'country'], order: 'country', deletable: true }),
  plans: R('plans', 'code', plansPerm, { code: 'text', name: 'text', audience: 'text', price_mga: 'int', period: 'text', trial_days: 'int', country: 'text', visible: 'bool', archived: 'bool', sort_order: 'int' }, { search: ['code', 'name'], order: 'sort_order' }),
  features: R('features', 'code', plansPerm, { code: 'text', label: 'text', kind: 'text' }, { search: ['code', 'label'], order: 'code' }),
  coupons: R('coupons', 'code', plansPerm, { code: 'text', percent_off: 'int', amount_off_mga: 'int', valid_until: 'date', max_uses: 'int', active: 'bool' }, { search: ['code'], order: 'code', deletable: true }),
  subscriptions: R('subscriptions', 'id', { read: 'billing.read', write: 'billing.payment' }, { user_id: 'text', plan_code: 'text', status: 'text', started_at: 'ts', ends_at: 'ts', auto_renew: 'bool' }, { search: ['plan_code', 'status'], order: 'created_at' }),
  payments: R('payments', 'id', { read: 'billing.read', write: 'billing.payment' }, {}, { search: ['reference', 'method'], order: 'paid_at', readOnly: true }),
  invoices: R('invoices', 'id', { read: 'billing.read', write: 'billing.payment' }, {}, { search: ['number'], order: 'issued_at', readOnly: true }),
  overrides: R('entitlement_overrides', 'id', { read: 'billing.read', write: 'billing.extend' }, { user_id: 'text', feature_code: 'text', enabled: 'bool', quota: 'num', reason: 'text', expires_at: 'ts' }, { order: 'id', deletable: true, reasonRequired: true }),
  settings: R('app_settings', 'key', { read: 'system.read', write: 'system.write' }, { key: 'text', value: 'json' }, { search: ['key'], order: 'key' }),
  flags: R('feature_flags', 'key', { read: 'system.read', write: 'system.write' }, { key: 'text', enabled: 'bool', note: 'text' }, { search: ['key'], order: 'key', deletable: true }),
  jobs: R('job_runs', 'id', { read: 'notifications.read', write: 'system.write' }, {}, { order: 'id', readOnly: true }),
  messages: R('message_log', 'id', { read: 'notifications.read', write: 'system.write' }, {}, { search: ['recipient', 'template'], order: 'id', readOnly: true }),
};

export function coerce(type, v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return (type === 'text' || type === 'html') ? (v === '' ? '' : null) : null;
  switch (type) {
    case 'int': { const n = Number(v); if (!Number.isInteger(n)) throw new Error('entier attendu'); return n; }
    case 'num': { const n = Number(v); if (!Number.isFinite(n)) throw new Error('nombre attendu'); return n; }
    case 'html': return cleanHtml(v);
    case 'bool': return v === true || v === 'true' || v === 1;
    case 'json': return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v);
    case 'texts': { if (!Array.isArray(v)) throw new Error('liste attendue'); return v.map(String); }
    default: return String(v);
  }
}

function parseList(req, def) {
  let range = [0, 24], sort = [def.order || def.pk, 'ASC'], filter = {};
  try { if (req.query.range) range = JSON.parse(req.query.range); } catch { /* défaut */ }
  try { if (req.query.sort) sort = JSON.parse(req.query.sort); } catch { /* défaut */ }
  try { if (req.query.filter) filter = JSON.parse(req.query.filter); } catch { /* défaut */ }
  const limit = Math.min(Math.max(Number(range[1]) - Number(range[0]) + 1, 1), 200);
  return { offset: Math.max(Number(range[0]) || 0, 0), limit, sort, filter };
}

export function listSql(def, { sort, filter }) {
  const allowed = new Set([def.pk, def.order, ...Object.keys(def.cols), 'created_at', 'paid_at', 'issued_at', 'started_at'].filter(Boolean));
  const params = []; const where = [];
  if (filter.q && def.search) {
    params.push(`%${String(filter.q).slice(0, 80)}%`);
    where.push('(' + def.search.map((c) => `${c}::text ilike $${params.length}`).join(' or ') + ')');
  }
  for (const [k, v] of Object.entries(filter)) {
    if (k === 'q' || !allowed.has(k) || v === '' || v == null) continue;
    params.push(v); where.push(`${k}::text = $${params.length}::text`);
  }
  const col = allowed.has(sort[0]) ? sort[0] : def.pk;
  const dir = String(sort[1]).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  return { where: where.length ? 'where ' + where.join(' and ') : '', params, orderBy: `${col} ${dir}` };
}

export function buildResourceRouter() {
  const router = express.Router();
  for (const [name, def] of Object.entries(RESOURCES)) {
    const base = `/r/${name}`;

    router.get(base, requireAdmin(def.perms.read), async (req, res, next) => {
      try {
        const { offset, limit, sort, filter } = parseList(req, def);
        const { where, params, orderBy } = listSql(def, { sort, filter });
        const out = await withClient(async (c) => {
          const total = Number((await c.query(`select count(*) from ${def.table} ${where}`, params)).rows[0].count);
          const rows = (await c.query(`select *, ${def.pk} as id from ${def.table} ${where} order by ${orderBy} limit ${limit} offset ${offset}`, params)).rows;
          return { total, rows };
        });
        res.set('Content-Range', `${name} ${offset}-${offset + out.rows.length - 1}/${out.total}`).set('Access-Control-Expose-Headers', 'Content-Range');
        res.json(out.rows);
      } catch (err) { next(err); }
    });

    router.get(`${base}/:id`, requireAdmin(def.perms.read), async (req, res, next) => {
      try {
        const row = (await withClient((c) => c.query(`select *, ${def.pk} as id from ${def.table} where ${def.pk}::text = $1`, [req.params.id]))).rows[0];
        if (!row) { res.status(404).json({ error: 'Introuvable.' }); return; }
        res.json(row);
      } catch (err) { next(err); }
    });

    if (def.readOnly) continue;

    const writable = (body) => {
      const out = {};
      for (const [col, type] of Object.entries(def.cols)) if (col in body) out[col] = coerce(type, body[col]);
      return out;
    };
    const needReason = (req, res) => {
      if (!def.reasonRequired) return true;
      const r = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (r.length < 5) { res.status(400).json({ error: 'Motif obligatoire (5 caractères min.).' }); return false; }
      return true;
    };

    router.post(base, requireAdmin(def.perms.write), async (req, res, next) => {
      try {
        if (!needReason(req, res)) return;
        const data = writable(req.body || {});
        const cols = Object.keys(data);
        if (!cols.length) { res.status(400).json({ error: 'Aucun champ valide.' }); return; }
        const row = await withTransaction(async (c) => {
          const r = (await c.query(
            `insert into ${def.table} (${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) returning *, ${def.pk} as id`,
            cols.map((k) => data[k]))).rows[0];
          await audit(req, res, { action: `${name}.create`, targetType: name, targetId: r.id, after: r, reason: req.body?.reason || null }, c);
          return r;
        });
        res.status(201).json(row);
      } catch (err) {
        if (err.code === '23505') { res.status(409).json({ error: 'Doublon.' }); return; }
        if (err.code === '23503') { res.status(400).json({ error: 'Référence invalide.' }); return; }
        if (err.message && /attendu/.test(err.message)) { res.status(400).json({ error: err.message }); return; }
        next(err);
      }
    });

    router.put(`${base}/:id`, requireAdmin(def.perms.write), async (req, res, next) => {
      try {
        if (!needReason(req, res)) return;
        const data = writable(req.body || {});
        delete data[def.pk];
        const cols = Object.keys(data);
        if (!cols.length) { res.status(400).json({ error: 'Aucun champ valide.' }); return; }
        const out = await withTransaction(async (c) => {
          const before = (await c.query(`select * from ${def.table} where ${def.pk}::text = $1 for update`, [req.params.id])).rows[0];
          if (!before) return null;
          const after = (await c.query(
            `update ${def.table} set ${cols.map((k, i) => `${k} = $${i + 2}`).join(',')} where ${def.pk}::text = $1 returning *, ${def.pk} as id`,
            [req.params.id, ...cols.map((k) => data[k])])).rows[0];
          await audit(req, res, { action: `${name}.update`, targetType: name, targetId: req.params.id, before, after, reason: req.body?.reason || null }, c);
          return after;
        });
        if (!out) { res.status(404).json({ error: 'Introuvable.' }); return; }
        res.json(out);
      } catch (err) {
        if (err.code === '23505') { res.status(409).json({ error: 'Doublon.' }); return; }
        if (err.message && /attendu/.test(err.message)) { res.status(400).json({ error: err.message }); return; }
        next(err);
      }
    });

    if (def.deletable) {
      router.delete(`${base}/:id`, requireAdmin(def.perms.write), async (req, res, next) => {
        try {
          if (!needReason(req, res)) return;
          const out = await withTransaction(async (c) => {
            const before = (await c.query(`delete from ${def.table} where ${def.pk}::text = $1 returning *`, [req.params.id])).rows[0];
            if (before) await audit(req, res, { action: `${name}.delete`, targetType: name, targetId: req.params.id, before, reason: req.body?.reason || null }, c);
            return before;
          });
          if (!out) { res.status(404).json({ error: 'Introuvable.' }); return; }
          res.json({ id: req.params.id });
        } catch (err) { next(err); }
      });
    }
  }
  return router;
}
