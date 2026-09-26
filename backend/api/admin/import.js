// Import de contenus en lot : POST /api/admin/import/:ressource { rows: [...], commit: false|true }
// Sans `commit` : contrôle seul (aperçu). Avec `commit` : insère les lignes valides et non doublons, en une transaction, avec un seul événement d'audit.
// Par sécurité, une ligne sans statut arrive en brouillon / à valider : rien n'est publié par un import.
import { withClient, withTransaction } from '../_lib/db.js';
import { getSetting } from '../_lib/entitlements.js';
import { requireAdmin, audit } from '../_lib/admin-auth.js';
import { RESOURCES, coerce } from './resources.js';

const MAX_ROWS = 1000;
const CONTENT = ['brouillon', 'publie', 'archive'];
const CATEGORIES = ['sante', 'alimentation', 'education', 'hygiene', 'comportement'];

// key : colonnes identifiant un doublon ; required : colonnes obligatoires ; enums : valeurs permises ; status : statut par défaut.
export const IMPORTABLE = {
  tips: { key: ['title'], required: ['title', 'body', 'category'], enums: { status: CONTENT, category: CATEGORIES }, status: 'brouillon' },
  events: { key: ['title', 'month', 'day'], required: ['title', 'month', 'day'], enums: { status: CONTENT }, status: 'brouillon' },
  pages: { key: ['slug'], required: ['slug', 'title', 'body'], enums: { status: CONTENT, kind: ['help', 'legal', 'text'] }, status: 'brouillon' },
  clinics: { key: ['name', 'city'], required: ['name', 'country'], enums: { status: ['a_valider', 'valide', 'archive'] }, status: 'a_valider' },
  emergency_numbers: { key: ['country', 'phone'], required: ['country', 'label', 'phone'], enums: { status: ['actif', 'archive'] }, status: 'actif' },
  breeds: { key: ['species_code', 'name'], required: ['species_code', 'name'], enums: { status: ['actif', 'archive'] }, status: 'actif' },
  vaccines: { key: ['species_code', 'name'], required: ['species_code', 'name'], enums: { status: ['commercialise', 'retire'] }, status: 'commercialise' },
};

const TRUE = /^(1|true|vrai|oui|yes|x)$/i;
const FALSE = /^(0|false|faux|non|no)$/i;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Valeur brute (souvent une chaîne de CSV) → valeur typée pour `coerce`.
function normalize(type, v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string') v = v.trim();
  if (v === '') return undefined;
  switch (type) {
    case 'bool': if (typeof v === 'boolean') return v; if (TRUE.test(String(v))) return true; if (FALSE.test(String(v))) return false; throw new Error('booléen attendu (oui/non)');
    case 'int': case 'num': return typeof v === 'string' ? v.replace(',', '.') : v;
    case 'texts': return Array.isArray(v) ? v : String(v).split(/[|]/).map((x) => x.trim()).filter(Boolean);
    case 'json': return typeof v === 'string' ? JSON.parse(v) : v;
    case 'html': return /<[a-z][\s\S]*>/i.test(String(v)) ? String(v) : String(v).split(/\r?\n{1,}/).filter((p) => p.trim()).map((p) => `<p>${esc(p.trim())}</p>`).join('');
    default: return String(v);
  }
}

export function mountImport(router) {
  router.post('/import/:name', (req, res, next) => {
    const def = RESOURCES[req.params.name];
    if (!def || !IMPORTABLE[req.params.name]) { res.status(404).json({ error: 'Import indisponible pour cette ressource.' }); return; }
    return requireAdmin(def.perms.write)(req, res, next);
  }, async (req, res, next) => {
    try {
      const name = req.params.name; const def = RESOURCES[name]; const cfg = IMPORTABLE[name];
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
      if (!rows || !rows.length) { res.status(400).json({ error: 'Aucune ligne à importer.' }); return; }
      if (rows.length > MAX_ROWS) { res.status(400).json({ error: `Maximum ${MAX_ROWS} lignes par import.` }); return; }

      const open = (await withClient((c) => getSetting(c, 'open_countries', []))).map((c) => String(c.code).toUpperCase());
      const report = []; const valid = [];
      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i] || {}; const out = {};
        try {
          for (const [col, type] of Object.entries(def.cols)) {
            if (!(col in raw)) continue;
            const n = normalize(type, raw[col]);
            if (n !== undefined) out[col] = coerce(type, n);
          }
          if (def.cols.status && out.status === undefined) out.status = cfg.status;
          for (const c of cfg.required) if (out[c] === undefined || out[c] === null || out[c] === '') throw new Error(`« ${c} » est obligatoire`);
          for (const [c, allowed] of Object.entries(cfg.enums)) if (out[c] !== undefined && !allowed.includes(out[c])) throw new Error(`« ${c} » doit valoir : ${allowed.join(', ')}`);
          if (def.cols.country && out.country !== undefined) { out.country = String(out.country).toUpperCase(); if (!/^([A-Z]{2}|ALL)$/.test(out.country)) throw new Error('« country » : code pays à 2 lettres (MG, FR) ou ALL'); if (open.length && out.country !== 'ALL' && !open.includes(out.country)) throw new Error(`pays « ${out.country} » non ouvert (${open.join(', ')})`); }
          if (def.cols.month && out.month !== undefined && !(out.month >= 1 && out.month <= 12)) throw new Error('« month » doit être entre 1 et 12');
          if (def.cols.day && out.day !== undefined && !(out.day >= 1 && out.day <= 31)) throw new Error('« day » doit être entre 1 et 31');
          if (out.status === 'publie' && def.cols.published_at) out.published_at = new Date().toISOString();
          valid.push({ i, data: out });
          report.push({ row: i + 1, status: 'ok' });
        } catch (e) {
          report.push({ row: i + 1, status: 'erreur', error: e instanceof SyntaxError ? 'JSON invalide' : e.message });
        }
      }

      const result = await withTransaction(async (c) => {
        // Doublons : déjà en base ou répétés dans le fichier (la première occurrence est gardée).
        const seen = new Set(); const toInsert = [];
        for (const v of valid) {
          const k = cfg.key.map((col) => String(v.data[col] ?? '').toLowerCase());
          const keyStr = k.join('\u0001');
          const exists = seen.has(keyStr) || (await c.query(`select 1 from ${def.table} where ${cfg.key.map((col, n) => `lower(${col}::text) = $${n + 1}`).join(' and ')} limit 1`, k)).rowCount > 0;
          seen.add(keyStr);
          if (exists) report[v.i] = { row: v.i + 1, status: 'doublon' };
          else toInsert.push(v);
        }
        if (req.body?.commit === true) {
          for (const v of toInsert) {
            const cols = Object.keys(v.data);
            await c.query(`insert into ${def.table} (${cols.join(',')}) values (${cols.map((_, n) => '$' + (n + 1)).join(',')})`, cols.map((k) => v.data[k]));
          }
          await audit(req, res, { action: `${name}.import`, targetType: name, after: { rows: rows.length, created: toInsert.length, duplicates: report.filter((r) => r.status === 'doublon').length, errors: report.filter((r) => r.status === 'erreur').length } }, c);
        }
        return toInsert.length;
      });

      const count = (s) => report.filter((r) => r.status === s).length;
      res.json({ committed: req.body?.commit === true, total: rows.length, ok: result, duplicates: count('doublon'), errors: count('erreur'), report });
    } catch (err) {
      if (err.code && String(err.code).startsWith('23')) { res.status(400).json({ error: 'Une ligne viole une contrainte de la base (valeur inconnue ou trop longue) : rien n\'a été importé.' }); return; }
      next(err);
    }
  });
}
