#!/usr/bin/env node
/**
 * One-shot : construit CENTRALE_CANINE_FCI_FILES depuis les PDF SCC.
 * Usage: node scripts/build-fci-breed-map.mjs
 * Prérequis: pdftotext (poppler-utils), réseau.
 */
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from 'fs';
import { spawnSync } from 'child_process';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { tmpdir } from 'os';
import { join } from 'path';

const APP_JS = new URL('../frontend/app.js', import.meta.url);
const OUT_DIR = new URL('./generated/', import.meta.url);
const OUT_FILE = new URL('./generated/centrale-canine-fci-files.js', import.meta.url);
const UNMATCHED_FILE = new URL('./generated/fci-unmatched.json', import.meta.url);
const BASE = 'https://www.centrale-canine.fr/sites/default/files/fci_race';
const MAX_N = 400;
const CONCURRENCY = 8;

function protectionKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function extractMap(src, varName) {
  const re = new RegExp('var ' + varName + ' = \\{([\\s\\S]*?)\\n  \\};');
  const m = src.match(re);
  if (!m) throw new Error('Map introuvable: ' + varName);
  const out = {};
  for (const [, k, v] of m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[k] = v;
  return out;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, opts = {}, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(500 * (i + 1) * (i + 1));
    }
  }
  throw lastErr;
}

async function headOk(fileId) {
  try {
    const res = await fetchWithRetry(`${BASE}/${fileId}.pdf`, { method: 'HEAD', redirect: 'follow' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    return res.ok && ct.includes('pdf') ? fileId : null;
  } catch {
    return null;
  }
}

async function resolveFileId(n) {
  const padded = String(n).padStart(3, '0');
  return (await headOk(padded)) || (await headOk(String(n)));
}

async function download(fileId, dest) {
  const res = await fetchWithRetry(`${BASE}/${fileId}.pdf`);
  if (!res.ok) throw new Error('GET ' + fileId + ' -> ' + res.status);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function extractBreedNames(pdfPath) {
  const r = spawnSync('pdftotext', ['-f', '1', '-l', '1', pdfPath, '-'], { encoding: 'utf8' });
  if (r.status !== 0) return { fci: null, names: [] };
  const text = r.stdout || '';
  const fciM = text.match(/Standard[\s-]*FCI\s*N[°oº]?\s*(\d{1,3})/i);
  const fci = fciM ? fciM[1] : null;
  const names = [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^FEDERATION|SECRETARIAT|Standard|Cette illustration|©/i.test(line)) continue;
    if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(line)) continue;
    if (/^_{3,}/.test(line)) continue;
    // Ignore garbage OCR (long runs of the same letter)
    if (/(.)\1{8,}/.test(line)) continue;
    if (/^[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ0-9 '\-]{2,}$/.test(line)) {
      names.push(line);
    }
    const paren = line.match(/^\(([^)]+)\)$/);
    if (paren) names.push(paren[1]);
    // Title Case English / mixed lines
    if (/^[A-Z][a-z]+(?:[ \-][A-Za-z]+)+$/.test(line) && line.length > 4) {
      names.push(line);
    }
  }
  return { fci, names };
}

function matchKey(names, slugs, aliases) {
  const slugKeys = new Set(Object.keys(slugs));
  for (const name of names) {
    const k = protectionKey(name);
    if (slugKeys.has(k)) return k;
    if (aliases[k] && slugKeys.has(aliases[k])) return aliases[k];
  }
  return null;
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function writeOutputs(fciFiles, unmatched) {
  mkdirSync(OUT_DIR, { recursive: true });
  const body = Object.keys(fciFiles)
    .sort()
    .map((k) => `    "${k}":"${fciFiles[k]}"`)
    .join(',\n');
  const js =
    '  // Généré par scripts/build-fci-breed-map.mjs — ne pas éditer à la main.\n' +
    '  var CENTRALE_CANINE_FCI_FILES = {\n' +
    body +
    '\n  };\n';
  writeFileSync(OUT_FILE, js);
  writeFileSync(UNMATCHED_FILE, JSON.stringify(unmatched, null, 2));
  console.log(
    'Wrote',
    OUT_FILE.pathname,
    'entries=',
    Object.keys(fciFiles).length,
    'unmatched=',
    unmatched.length
  );
}

const src = readFileSync(APP_JS, 'utf8');
const slugs = extractMap(src, 'CENTRALE_CANINE_BREED_SLUGS');
const aliases = extractMap(src, 'CENTRALE_CANINE_BREED_ALIASES');

console.error('Resolving PDF file ids 1..' + MAX_N + '…');
const nums = Array.from({ length: MAX_N }, (_, i) => i + 1);
const fileIds = (await mapPool(nums, CONCURRENCY, (n) => resolveFileId(n))).filter(Boolean);
console.error('Found', fileIds.length, 'PDF files');

const fciFiles = {};
const unmatched = [];
const tmpPdf = join(tmpdir(), 'vetbook-fci.pdf');

for (let i = 0; i < fileIds.length; i++) {
  const fileId = fileIds[i];
  try {
    await download(fileId, tmpPdf);
    const { names } = extractBreedNames(tmpPdf);
    const key = matchKey(names, slugs, aliases);
    if (key) {
      fciFiles[key] = fileId;
      console.error('OK', fileId, '→', key, names[0] || '');
    } else {
      unmatched.push({ fileId, names });
      console.error('NO MATCH', fileId, names.slice(0, 3).join(' | '));
    }
  } catch (e) {
    console.error('ERR', fileId, e.message || e);
    unmatched.push({ fileId, names: [], error: String(e.message || e) });
  }
  if ((i + 1) % 25 === 0) writeOutputs(fciFiles, unmatched);
}

writeOutputs(fciFiles, unmatched);
