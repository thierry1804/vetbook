// Médaille d'identité : un lien public stable par animal.
//   POST /api/identity                 { petLocalId }  → { token }
//   GET  /api/identity/public/:token               fiche limitée
//   GET  /api/identity/public/:token/photo         dernier portrait
// Le jeton n'expire pas : une médaille imprimée doit rester valable.
// La fiche ne contient ni carnet, ni notes, ni adresse.
import { requireUser } from './_lib/auth.js';
import { withClient } from './_lib/db.js';
import { guardFeature } from './_lib/entitlements.js';
import { fromRow, ANIMAL_FIELDS } from './_lib/mapping.js';
import { getObject } from './_lib/minio.js';
import { newRawToken } from './_lib/tokens.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{20,80}$/;

function asDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

function identityCard(pet, owner, hasPhoto, tag) {
  const animal = fromRow(pet, ANIMAL_FIELDS);
  const weight = pet.weight == null || pet.weight === '' ? null : Number(pet.weight);
  return {
    name: animal.name || pet.name || '',
    species: tag.show_species ? (animal.species || '') : '',
    race: tag.show_race ? (animal.race || '') : '',
    sex: tag.show_sex ? (animal.sex || '') : '',
    dob: tag.show_dob ? asDate(animal.dob) : '',
    color: tag.show_color ? (animal.color || '') : '',
    chip: tag.show_chip ? (animal.chip || '') : '',
    sterilise: tag.show_sterilise ? (animal.sterilise || '') : '',
    weight: tag.show_weight && Number.isFinite(weight) ? weight : null,
    ownerName: tag.show_owner_name ? (owner.name || '') : '',
    phone: tag.show_phone ? (owner.phone || '') : '',
    hasPhoto: tag.show_photo && !!hasPhoto,
  };
}

async function tagFromToken(client, token) {
  if (!TOKEN_RE.test(token || '')) return null;
  const { rows } = await client.query(
    'select * from identity_tags where token = $1',
    [token]);
  return rows[0] || null;
}

export async function identityMint(req, res) {
  if (!['GET', 'POST'].includes(req.method)) { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  const petLocalId = Number(req.method === 'GET' ? req.query.petLocalId : req.body?.petLocalId);
  if (!Number.isFinite(petLocalId)) { res.status(400).json({ error: 'Animal invalide.' }); return; }
  if (!(await guardFeature(res, session.userId, 'qr_identity'))) return;
  try {
    const token = await withClient(async (c) => {
      const pet = (await c.query(
        'select id from pets where user_id = $1 and local_id = $2',
        [session.userId, petLocalId])).rows[0];
      if (!pet) return null;
      const existing = (await c.query('select * from identity_tags where pet_id = $1', [pet.id])).rows[0];
      if (existing) return existing;
      if (req.method === 'GET') return 'absent';
      const fresh = newRawToken();
      const ins = await c.query(
        `insert into identity_tags (pet_id, user_id, token) values ($1, $2, $3)
         on conflict (pet_id) do nothing returning *`,
        [pet.id, session.userId, fresh]);
      if (ins.rows[0]) return ins.rows[0];
      return (await c.query('select * from identity_tags where pet_id = $1', [pet.id])).rows[0] || null;
    });
    if (token === 'absent') { res.status(404).json({ error: 'Aucune médaille active.' }); return; }
    if (!token) { res.status(404).json({ error: 'Animal introuvable. Sauvegardez d’abord le carnet.' }); return; }
    res.status(200).json({ token: token.token, settings: settings(token) });
  } catch (err) {
    console.error('identity/mint', err);
    res.status(500).json({ error: 'La médaille ne peut pas être préparée.' });
  }
}

const FIELDS = ['show_phone', 'show_chip', 'show_owner_name', 'show_photo', 'show_species', 'show_race', 'show_sex', 'show_dob', 'show_color', 'show_sterilise', 'show_weight'];
function settings(tag) { return Object.fromEntries(FIELDS.map((key) => [key, tag[key] === true])); }

export async function identityManage(req, res) {
  if (!['PATCH', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Méthode non autorisée.' });
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardFeature(res, session.userId, 'qr_identity'))) return;
  const petLocalId = Number(req.body?.petLocalId);
  if (!Number.isSafeInteger(petLocalId) || petLocalId < 0) return res.status(400).json({ error: 'Animal invalide.' });
  if (req.method === 'PATCH' && (!req.body?.settings || FIELDS.some((key) => typeof req.body.settings[key] !== 'boolean'))) return res.status(400).json({ error: 'Visibilité invalide.' });
  try {
    const row = await withClient(async (c) => {
      const tag = (await c.query(`select t.* from identity_tags t join pets p on p.id=t.pet_id where p.user_id=$1 and p.local_id=$2`, [session.userId, petLocalId])).rows[0];
      if (!tag) return null;
      if (req.method === 'DELETE') { await c.query('delete from identity_tags where pet_id=$1', [tag.pet_id]); return { revoked: true }; }
      if (req.method === 'POST') return (await c.query('update identity_tags set token=$2 where pet_id=$1 returning *', [tag.pet_id, newRawToken()])).rows[0];
      const assignments = FIELDS.map((key, index) => `${key}=$${index + 2}`).join(',');
      return (await c.query(`update identity_tags set ${assignments} where pet_id=$1 returning *`, [tag.pet_id, ...FIELDS.map((key) => req.body.settings[key])])).rows[0];
    });
    if (!row) return res.status(404).json({ error: 'Médaille introuvable.' });
    res.json(row.revoked ? row : { token: row.token, settings: settings(row) });
  } catch (err) {
    console.error('identity/manage', err);
    res.status(500).json({ error: 'La médaille ne peut pas être modifiée.' });
  }
}

export async function identityPublic(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const card = await withClient(async (c) => {
      const tag = await tagFromToken(c, req.params.token);
      if (!tag) return null;
      const pet = (await c.query('select * from pets where id = $1', [tag.pet_id])).rows[0];
      if (!pet) return null;
      const owner = (await c.query(
        "select coalesce(nullif(o.name, ''), u.name) as name, o.phone from users u left join owners o on o.user_id = u.id where u.id = $1",
        [tag.user_id])).rows[0] || {};
      const photo = (await c.query(
        'select 1 from photos where pet_id = $1 and storage_path is not null limit 1',
        [tag.pet_id])).rows[0];
      return identityCard(pet, owner, !!photo, tag);
    });
    if (!card) { res.status(404).json({ error: 'Cette médaille n’est plus disponible.' }); return; }
    res.status(200).json(card);
  } catch (err) {
    console.error('identity/public', err);
    res.status(500).json({ error: 'Fiche indisponible.' });
  }
}

export async function identityPublicPhoto(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  try {
    const photo = await withClient(async (c) => {
      const tag = await tagFromToken(c, req.params.token);
      if (!tag || !tag.show_photo) return null;
      return (await c.query(
        `select storage_path, content_type from photos
          where pet_id = $1 and storage_path is not null
          order by created_at desc nulls last, local_id desc limit 1`,
        [tag.pet_id])).rows[0] || null;
    });
    if (!photo || !photo.storage_path) { res.status(404).json({ error: 'Photo introuvable.' }); return; }
    const obj = await getObject(photo.storage_path);
    res.setHeader('Content-Type', photo.content_type || obj.ContentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    obj.Body.pipe(res);
  } catch (err) {
    console.error('identity/photo', err);
    if (!res.headersSent) res.status(404).json({ error: 'Photo introuvable.' });
  }
}
