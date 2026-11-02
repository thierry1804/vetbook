// Recherche des animaux rendus visibles par leur propriétaire.
//   POST /api/me/pets/:localId/discoverable   { enabled }
//   GET  /api/directory/pets?species&sex&sterilise&q&offset
//   GET  /api/directory/pets/:id
//   GET  /api/directory/pets/:id/photo
// La fiche publique se limite à l'identité. Téléphone, puce, notes et carnet restent privés.
import { requireUser } from './_lib/auth.js';
import { withClient } from './_lib/db.js';
import { checkFeature, guardFeature } from './_lib/entitlements.js';
import { getObject } from './_lib/minio.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SPECIES = new Set(['Canine', 'Féline', 'Autre']);
const SEXES = new Set(['Mâle', 'Femelle']);
const STERILE = new Set(['Oui', 'Non']);

function ageLabel(dob) {
  if (!dob) return '';
  const ms = Date.now() - new Date(dob).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const months = Math.floor(ms / (30.44 * 86400000));
  if (months < 24) return `${Math.max(months, 0)} mois`;
  const years = Math.floor(months / 12);
  return `${years} ${years > 1 ? 'ans' : 'an'}`;
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function card(row) {
  return {
    id: row.id,
    name: row.name || '',
    species: row.species || '',
    race: row.race || '',
    sex: row.sex || '',
    age: ageLabel(row.dob),
    color: row.color || '',
    sterilise: row.sterilise || '',
    ownerName: firstName(row.owner_name),
    hasPhoto: !!row.has_photo,
  };
}

async function ownerVisible(userId, enforced) {
  if (!enforced) return true;
  return (await checkFeature(userId, 'pet_directory')).ok;
}

async function visiblePet(client, petId, viewerId) {
  if (!UUID_RE.test(petId || '')) return null;
  const row = (await client.query(
    `select p.*, coalesce(nullif(o.name, ''), u.name) as owner_name,
            exists(select 1 from photos ph where ph.pet_id = p.id and ph.storage_path is not null) as has_photo
       from pets p
       join users u on u.id = p.user_id and u.status <> 'suspendu'
       left join owners o on o.user_id = u.id
      where p.id = $1 and p.discoverable = true and p.user_id <> $2`,
    [petId, viewerId])).rows[0];
  return row || null;
}

export async function petDeviceState(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const pets = await withClient(async (c) => (await c.query(
      'select local_id, discoverable, avatar_server_id from pets where user_id = $1 order by local_id',
      [session.userId])).rows.map((row) => ({
      localId: Number(row.local_id),
      discoverable: row.discoverable === true,
      avatarServerId: row.avatar_server_id || '',
    })));
    res.status(200).json({ pets });
  } catch (err) {
    console.error('pets/device-state', err);
    res.status(500).json({ error: 'État des animaux indisponible.' });
  }
}

export async function petPortrait(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  const localId = Number(req.params.localId);
  const serverId = req.body && req.body.serverId;
  if (!Number.isFinite(localId) || !UUID_RE.test(serverId || '')) {
    res.status(400).json({ error: 'Portrait invalide.' });
    return;
  }
  try {
    const saved = await withClient(async (c) => {
      const pet = (await c.query('select id from pets where user_id = $1 and local_id = $2', [session.userId, localId])).rows[0];
      if (!pet) return null;
      const photo = (await c.query('select id from photos where id = $1 and pet_id = $2 and user_id = $3', [serverId, pet.id, session.userId])).rows[0];
      if (!photo) return false;
      await c.query('update pets set avatar_server_id = $2, updated_at = now() where id = $1', [pet.id, photo.id]);
      return true;
    });
    if (saved === null) { res.status(404).json({ error: 'Animal introuvable. Sauvegardez d’abord le carnet.' }); return; }
    if (!saved) { res.status(404).json({ error: 'Photo introuvable.' }); return; }
    res.status(200).json({ avatarServerId: serverId });
  } catch (err) {
    console.error('pets/portrait', err);
    res.status(500).json({ error: 'Le portrait ne peut pas être enregistré.' });
  }
}

export async function petDiscoverable(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  const localId = Number(req.params.localId);
  const enabled = !!(req.body && req.body.enabled === true);
  if (!Number.isFinite(localId)) { res.status(400).json({ error: 'Animal invalide.' }); return; }
  if (enabled && !(await guardFeature(res, session.userId, 'pet_directory'))) return;
  try {
    const row = await withClient(async (c) => {
      const pet = (await c.query('select id, name from pets where user_id = $1 and local_id = $2', [session.userId, localId])).rows[0];
      if (!pet) return null;
      if (enabled && !String(pet.name || '').trim()) return 'name';
      await c.query('update pets set discoverable = $3, updated_at = now() where id = $1 and user_id = $2', [pet.id, session.userId, enabled]);
      return { enabled };
    });
    if (row === 'name') { res.status(400).json({ error: 'Donnez un nom à l’animal avant de le rendre visible.' }); return; }
    if (!row) { res.status(404).json({ error: 'Animal introuvable. Sauvegardez d’abord le carnet.' }); return; }
    res.status(200).json(row);
  } catch (err) {
    console.error('pets/discoverable', err);
    res.status(500).json({ error: 'La visibilité ne peut pas être modifiée.' });
  }
}

export async function directoryPets(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardFeature(res, session.userId, 'pet_directory'))) return;
  const species = SPECIES.has(req.query.species) ? req.query.species : '';
  const sex = SEXES.has(req.query.sex) ? req.query.sex : '';
  const sterilise = STERILE.has(req.query.sterilise) ? req.query.sterilise : '';
  const q = String(req.query.q || '').trim().slice(0, 40);
  const offset = Math.max(0, Math.min(80, Math.floor(Number(req.query.offset) || 0)));
  if (!species && !sex && !sterilise && q.length < 2) {
    res.status(400).json({ error: 'Indiquez une espèce, un sexe, ou au moins deux lettres.' });
    return;
  }
  try {
    const enforced = (await checkFeature(session.userId, 'pet_directory')).entitlements.enforced;
    const pets = await withClient(async (c) => {
      const params = [session.userId];
      const where = ['p.discoverable = true', 'p.user_id <> $1', "u.status <> 'suspendu'"];
      if (species) { params.push(species); where.push(`p.species = $${params.length}`); }
      if (sex) { params.push(sex); where.push(`p.sex = $${params.length}`); }
      if (sterilise) { params.push(sterilise); where.push(`p.sterilise = $${params.length}`); }
      if (q.length >= 2) {
        params.push(`%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
        where.push(`(p.name ilike $${params.length} escape '\\' or coalesce(p.race, '') ilike $${params.length} escape '\\')`);
      }
      params.push(offset);
      const rows = (await c.query(
        `select p.id, p.user_id, p.name, p.species, p.race, p.sex, p.dob, p.color, p.sterilise,
                coalesce(nullif(o.name, ''), u.name) as owner_name,
                exists(select 1 from photos ph where ph.pet_id = p.id and ph.storage_path is not null) as has_photo
           from pets p
           join users u on u.id = p.user_id
           left join owners o on o.user_id = u.id
          where ${where.join(' and ')}
          order by p.updated_at desc
          limit 20 offset $${params.length}`,
        params)).rows;
      const visible = [];
      for (const row of rows) {
        if (await ownerVisible(row.user_id, enforced)) visible.push(card(row));
      }
      return { pets: visible, next: rows.length === 20 ? offset + 20 : null };
    });
    res.status(200).json(pets);
  } catch (err) {
    console.error('directory/pets', err);
    res.status(500).json({ error: 'La recherche est indisponible.' });
  }
}

export async function directoryPet(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardFeature(res, session.userId, 'pet_directory'))) return;
  try {
    const enforced = (await checkFeature(session.userId, 'pet_directory')).entitlements.enforced;
    const pet = await withClient(async (c) => {
      const row = await visiblePet(c, req.params.id, session.userId);
      if (!row || !(await ownerVisible(row.user_id, enforced))) return null;
      return card(row);
    });
    if (!pet) { res.status(404).json({ error: 'Cet animal n’est plus visible.' }); return; }
    res.status(200).json(pet);
  } catch (err) {
    console.error('directory/pet', err);
    res.status(500).json({ error: 'Fiche indisponible.' });
  }
}

export async function directoryPhoto(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardFeature(res, session.userId, 'pet_directory'))) return;
  try {
    const enforced = (await checkFeature(session.userId, 'pet_directory')).entitlements.enforced;
    const photo = await withClient(async (c) => {
      const row = await visiblePet(c, req.params.id, session.userId);
      if (!row || !(await ownerVisible(row.user_id, enforced))) return null;
      if (row.avatar_server_id) {
        const chosen = (await c.query(
          `select storage_path, content_type from photos
            where id = $1 and pet_id = $2 and storage_path is not null`,
          [row.avatar_server_id, row.id])).rows[0];
        if (chosen) return chosen;
      }
      return (await c.query(
        `select storage_path, content_type from photos
          where pet_id = $1 and storage_path is not null
          order by created_at desc nulls last, local_id desc limit 1`,
        [row.id])).rows[0] || null;
    });
    if (!photo || !photo.storage_path) { res.status(404).json({ error: 'Photo introuvable.' }); return; }
    const obj = await getObject(photo.storage_path);
    res.setHeader('Content-Type', photo.content_type || obj.ContentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    obj.Body.pipe(res);
  } catch (err) {
    console.error('directory/photo', err);
    if (!res.headersSent) res.status(404).json({ error: 'Photo introuvable.' });
  }
}
