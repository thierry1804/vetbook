// GET /api/lookup/acym?name=&owner=&breeder=&race=
// Recherche publique dans l'annuaire des chiens de l'ACYM (LOMAD, Madagascar) :
// https://acymadagascar.org/recherche (formulaire POST, sans compte). L'annuaire
// ne publie ni n° de puce ni généalogie — seulement nom, affixe, n° LOMAD, dates,
// race, propriétaire et éleveur — donc utile pour retrouver/confirmer le n° LOMAD,
// pas pour reconstituer l'arbre. Requête déclenchée à la main par un utilisateur
// connecté (proxy nécessaire : le navigateur ne peut pas poster vers ce domaine).
import { requireUser } from '../_lib/auth.js';
import { guardFeature } from '../_lib/entitlements.js';

const ACYM_URL = 'https://acymadagascar.org/recherche/';
const MAX_RESULTS = 25;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
  return String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, e) => (ENTITIES[e.toLowerCase()] !== undefined ? ENTITIES[e.toLowerCase()] : m))
    .replace(/\s+/g, ' ')
    .trim();
}
function isoDate(dmy) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

export function parseAcymResults(html) {
  const table = /<table[^>]*id="resultatRecherche"[\s\S]*?<\/table>/i.exec(html);
  if (!table) return [];
  const body = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(table[0]);
  if (!body) return [];
  const rows = body[1].match(/<tr[\s\S]*?<\/tr>/gi) || [];
  return rows.map((row) => {
    const c = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(decode);
    return {
      name: c[0] || '', affix: c[1] || '', lomad: c[2] || '',
      birthDate: isoDate(c[3]), deathDate: isoDate(c[4]),
      breed: c[5] || '', owner: c[6] || '', breeder: c[7] || '',
    };
  }).filter((r) => r.name);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await guardFeature(res, user.userId, 'acym_lookup'))) return;

  const q = (k) => (typeof req.query[k] === 'string' ? req.query[k].trim().slice(0, 80) : '');
  const name = q('name'), owner = q('owner'), breeder = q('breeder'), race = q('race');
  if (name.length < 2 && owner.length < 2 && breeder.length < 2) {
    res.status(400).json({ error: 'Indique au moins 2 caractères (nom du chien, propriétaire ou éleveur).' });
    return;
  }

  try {
    const r = await fetch(ACYM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'App-lika/1.0 (recherche LOMAD à la demande de l\'utilisateur)' },
      body: new URLSearchParams({ nomChien: name, nomElevage: breeder, nomProprietaire: owner, race }).toString(),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const all = parseAcymResults(await r.text());
    res.status(200).json({
      source: 'acymadagascar.org',
      total: all.length,
      truncated: all.length > MAX_RESULTS,
      results: all.slice(0, MAX_RESULTS),
    });
  } catch (err) {
    console.error('lookup/acym', err);
    res.status(502).json({ error: 'L\'annuaire ACYM ne répond pas pour le moment. Réessaie plus tard ou consulte acymadagascar.org/recherche.' });
  }
}
