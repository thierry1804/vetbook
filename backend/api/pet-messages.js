// Messages entre le propriétaire d'un animal visible et un autre abonné.
//   GET   /api/pet-threads
//   POST  /api/pet-threads                        { petId }
//   GET   /api/pet-threads/:id
//   POST  /api/pet-threads/:id/messages           { body }
//   POST  /api/pet-threads/:id/photo               multipart: file
//   GET   /api/pet-threads/:id/messages/:mid/photo
//   POST  /api/pet-threads/:id/close
import multer from 'multer';
import { requireUser } from './_lib/auth.js';
import { withClient, withTransaction } from './_lib/db.js';
import { checkFeature, guardFeature, effectiveLimit } from './_lib/entitlements.js';
import { putObject, getObject } from './_lib/minio.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PHOTO_MAX_BYTES = 50 * 1024 * 1024; // plafond dur ; max_upload_mb (réglable) est vérifié après réception

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) { cb(PHOTO_TYPES.has(file.mimetype) ? null : new Error('TYPE'), PHOTO_TYPES.has(file.mimetype)); },
});
function runPhotoUpload(req, res) {
  return new Promise((resolve, reject) => { photoUpload.single('file')(req, res, (err) => (err ? reject(err) : resolve())); });
}

// Vérifications communes à l'envoi d'un message, texte ou photo : fil non clos, pas de blocage
// mutuel, limite de fréquence (anti-spam, partagée entre texte et photo pour un même fil).
async function assertCanPost(c, thread, userId) {
  const locked = (await c.query('select closed_at from pet_threads where id=$1 for update', [thread.id])).rows[0];
  if (locked.closed_at) return 'closed';
  const recipient = thread.owner_id === userId ? thread.requester_id : thread.owner_id;
  if (await blocked(c, userId, recipient)) return 'blocked';
  const recent = (await c.query(`select count(*)::int as n from pet_messages where thread_id=$1 and author_id=$2 and created_at > now()-interval '1 minute'`, [thread.id, userId])).rows[0].n;
  if (recent >= 5) return 'limited';
  return null;
}
function postErrorResponse(res, outcome) {
  if (outcome === 'closed') { res.status(409).json({ error: 'Cette conversation est close.' }); return true; }
  if (outcome === 'blocked') { res.status(403).json({ error: 'Ce contact est bloqué.' }); return true; }
  if (outcome === 'limited') { res.status(429).json({ error: 'Attendez une minute avant d’envoyer un autre message.' }); return true; }
  return false;
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function cleanBody(value) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, 2000);
}

async function threadFor(client, threadId, userId) {
  if (!UUID_RE.test(threadId || '')) return null;
  const row = (await client.query(
    `select t.*, p.name as pet_name,
            coalesce(nullif(oo.name, ''), ou.name) as owner_name,
            coalesce(nullif(ro.name, ''), ru.name) as requester_name
       from pet_threads t
       join pets p on p.id = t.pet_id
       join users ou on ou.id = t.owner_id
       join users ru on ru.id = t.requester_id
       left join owners oo on oo.user_id = t.owner_id
       left join owners ro on ro.user_id = t.requester_id
      where t.id = $1 and (t.owner_id = $2 or t.requester_id = $2)`,
    [threadId, userId])).rows[0];
  return row || null;
}

async function blocked(client, userId, otherId) {
  return !!(await client.query('select 1 from pet_blocks where (user_id=$1 and blocked_user_id=$2) or (user_id=$2 and blocked_user_id=$1) limit 1', [userId, otherId])).rows[0];
}

function summary(row, userId) {
  const mineIsOwner = row.owner_id === userId;
  return {
    id: row.id,
    petId: row.pet_id,
    petName: row.pet_name || '',
    otherName: firstName(mineIsOwner ? row.requester_name : row.owner_name),
    role: mineIsOwner ? 'owner' : 'requester',
    closed: !!row.closed_at,
    blocked: !!row.blocked,
    blockedByMe: !!row.blocked_by_me,
    preview: row.preview || '',
    updatedAt: row.last_message_at || row.created_at,
  };
}

export async function petThreadList(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  const before = String(req.query.before || '');
  if (before && !UUID_RE.test(before)) return res.status(400).json({ error: 'Page invalide.' });
  try {
    const rows = await withClient(async (c) => (await c.query(
      `select t.*, p.name as pet_name,
              coalesce(nullif(oo.name, ''), ou.name) as owner_name,
              coalesce(nullif(ro.name, ''), ru.name) as requester_name,
              (select body from pet_messages m where m.thread_id = t.id order by m.created_at desc,m.id desc limit 1) as preview
         from pet_threads t
         join pets p on p.id = t.pet_id
         join users ou on ou.id = t.owner_id
         join users ru on ru.id = t.requester_id
         left join owners oo on oo.user_id = t.owner_id
         left join owners ro on ro.user_id = t.requester_id
        where (t.owner_id = $1 or t.requester_id = $1)
          and ($2::uuid is null or (coalesce(t.last_message_at,t.created_at),t.id) <
            (select coalesce(cursor.last_message_at,cursor.created_at),cursor.id from pet_threads cursor
              where cursor.id=$2 and (cursor.owner_id=$1 or cursor.requester_id=$1)))
        order by coalesce(t.last_message_at,t.created_at) desc,t.id desc
        limit 21`,
      [session.userId, before || null])).rows);
    const threads = rows.slice(0, 20).map((row) => summary(row, session.userId));
    res.status(200).json({ threads, nextBefore: rows.length > 20 ? threads[threads.length - 1].id : null });
  } catch (err) {
    console.error('pet-threads/list', err);
    res.status(500).json({ error: 'Les messages sont indisponibles.' });
  }
}

export async function petThreadOpen(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardFeature(res, session.userId, 'pet_messages'))) return;
  const petId = req.body && req.body.petId;
  if (!UUID_RE.test(petId || '')) { res.status(400).json({ error: 'Animal invalide.' }); return; }
  try {
    const thread = await withClient(async (c) => {
      const pet = (await c.query(
        `select p.id, p.user_id, p.name from pets p
           join users u on u.id = p.user_id and u.status <> 'suspendu'
          where p.id = $1 and p.discoverable = true`,
        [petId])).rows[0];
      if (!pet || pet.user_id === session.userId) return null;
      if (await blocked(c, session.userId, pet.user_id)) return 'blocked';
      const existing = (await c.query(
        'select id from pet_threads where pet_id = $1 and requester_id = $2',
        [pet.id, session.userId])).rows[0];
      if (existing) return existing.id;
      const ownerCanReply = (await checkFeature(pet.user_id, 'pet_messages')).ok && (await checkFeature(pet.user_id, 'pet_directory')).ok;
      if (!ownerCanReply) return null;
      const created = await c.query(
        `insert into pet_threads (pet_id, owner_id, requester_id) values ($1, $2, $3) returning id`,
        [pet.id, pet.user_id, session.userId]);
      return created.rows[0].id;
    });
    if (thread === 'blocked') { res.status(403).json({ error: 'Ce contact est bloqué.' }); return; }
    if (!thread) { res.status(404).json({ error: 'Cet animal n’est plus visible.' }); return; }
    res.status(200).json({ id: thread });
  } catch (err) {
    console.error('pet-threads/open', err);
    res.status(500).json({ error: 'La conversation ne peut pas être ouverte.' });
  }
}

export async function petThreadRead(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const out = await withClient(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      const before = String(req.query.before || '');
      if (before && !UUID_RE.test(before)) return 'invalid';
      const rows = (await c.query(
        `select id, author_id, body, photo_path is not null as has_photo, created_at from pet_messages where thread_id=$1
          and ($2::uuid is null or (created_at,id) < (select created_at,id from pet_messages where id=$2 and thread_id=$1))
          order by created_at desc,id desc limit 51`,
        [thread.id, before || null])).rows;
      const messages = rows.slice(0, 50).reverse().map((row) => ({
        id: row.id, mine: row.author_id === session.userId, body: row.body, hasPhoto: row.has_photo, createdAt: row.created_at,
      }));
      const other = thread.owner_id === session.userId ? thread.requester_id : thread.owner_id;
      thread.blocked = await blocked(c, session.userId, other);
      thread.blocked_by_me = !!(await c.query('select 1 from pet_blocks where user_id=$1 and blocked_user_id=$2', [session.userId, other])).rows[0];
      return { thread: summary(thread, session.userId), messages, nextBefore: rows.length > 50 ? messages[0].id : null };
    });
    if (out === 'invalid') { res.status(400).json({ error: 'Page invalide.' }); return; }
    if (!out) { res.status(404).json({ error: 'Conversation introuvable.' }); return; }
    res.status(200).json(out);
  } catch (err) {
    console.error('pet-threads/read', err);
    res.status(500).json({ error: 'La conversation est indisponible.' });
  }
}

export async function petThreadMessage(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardFeature(res, session.userId, 'pet_messages'))) return;
  const body = cleanBody(req.body && req.body.body);
  if (!body) { res.status(400).json({ error: 'Écrivez un message.' }); return; }
  try {
    const message = await withTransaction(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      const outcome = await assertCanPost(c, thread, session.userId);
      if (outcome) return outcome;
      const recipient = thread.owner_id === session.userId ? thread.requester_id : thread.owner_id;
      const inserted = (await c.query(
        'insert into pet_messages (thread_id, author_id, body) values ($1, $2, $3) returning id, created_at',
        [thread.id, session.userId, body])).rows[0];
      await c.query('update pet_threads set last_message_at = $2 where id = $1', [thread.id, inserted.created_at]);
      const title = `Message au sujet de ${thread.pet_name || 'votre animal'}`;
      await c.query(
        `insert into inbox_notifications (audience, recipient_id, event_key, title, body, href)
         values ('user', $1, $2, $3, $4, $5) on conflict (audience, recipient_id, event_key) do nothing`,
        [recipient, `pet-message:${inserted.id}`, title, body.slice(0, 180), `/?pets=thread&thread=${thread.id}`]);
      return { id: inserted.id, mine: true, body, createdAt: inserted.created_at };
    });
    if (postErrorResponse(res, message)) return;
    if (!message) { res.status(404).json({ error: 'Conversation introuvable.' }); return; }
    res.status(201).json(message);
  } catch (err) {
    console.error('pet-threads/message', err);
    res.status(500).json({ error: 'Le message n’a pas été envoyé.' });
  }
}

export async function petThreadPhoto(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardFeature(res, session.userId, 'pet_messages'))) return;
  try {
    await runPhotoUpload(req, res);
  } catch (err) {
    if (err && err.message === 'TYPE') { res.status(400).json({ error: 'Type de fichier non autorisé (jpeg, png, webp, gif).' }); return; }
    if (err && err.code === 'LIMIT_FILE_SIZE') { res.status(400).json({ error: 'Photo trop volumineuse.' }); return; }
    res.status(400).json({ error: 'Envoi invalide.' });
    return;
  }
  if (!req.file) { res.status(400).json({ error: 'Photo manquante.' }); return; }
  const maxMb = await effectiveLimit(session.userId, null, 'max_upload_mb', 12);
  if (maxMb != null && req.file.size > maxMb * 1024 * 1024) { res.status(400).json({ error: `Photo trop volumineuse (max ${maxMb} Mo).` }); return; }
  try {
    const message = await withTransaction(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      const outcome = await assertCanPost(c, thread, session.userId);
      if (outcome) return outcome;
      const recipient = thread.owner_id === session.userId ? thread.requester_id : thread.owner_id;
      const msgId = (await c.query('select gen_random_uuid() as id')).rows[0].id;
      const objectKey = `pet-messages/${thread.id}/${msgId}`;
      await putObject(objectKey, req.file.buffer, req.file.mimetype);
      const inserted = (await c.query(
        'insert into pet_messages (id, thread_id, author_id, photo_path, photo_content_type) values ($1, $2, $3, $4, $5) returning id, created_at',
        [msgId, thread.id, session.userId, objectKey, req.file.mimetype])).rows[0];
      await c.query('update pet_threads set last_message_at = $2 where id = $1', [thread.id, inserted.created_at]);
      const title = `Message au sujet de ${thread.pet_name || 'votre animal'}`;
      await c.query(
        `insert into inbox_notifications (audience, recipient_id, event_key, title, body, href)
         values ('user', $1, $2, $3, $4, $5) on conflict (audience, recipient_id, event_key) do nothing`,
        [recipient, `pet-message:${inserted.id}`, title, 'Photo', `/?pets=thread&thread=${thread.id}`]);
      return { id: inserted.id, mine: true, body: null, hasPhoto: true, createdAt: inserted.created_at };
    });
    if (postErrorResponse(res, message)) return;
    if (!message) { res.status(404).json({ error: 'Conversation introuvable.' }); return; }
    res.status(201).json(message);
  } catch (err) {
    console.error('pet-threads/photo', err);
    res.status(500).json({ error: 'La photo n’a pas été envoyée.' });
  }
}

export async function petThreadMessagePhoto(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const photo = await withClient(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      if (!UUID_RE.test(req.params.mid || '')) return null;
      return (await c.query(
        'select photo_path, photo_content_type from pet_messages where id=$1 and thread_id=$2 and photo_path is not null',
        [req.params.mid, thread.id])).rows[0] || null;
    });
    if (!photo) { res.status(404).json({ error: 'Photo introuvable.' }); return; }
    const obj = await getObject(photo.photo_path);
    res.setHeader('Content-Type', photo.photo_content_type || obj.ContentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    obj.Body.pipe(res);
  } catch (err) {
    console.error('pet-threads/message-photo', err);
    if (!res.headersSent) res.status(404).json({ error: 'Photo introuvable.' });
  }
}

export async function petThreadClose(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const closed = await withClient(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      if (!thread.closed_at) {
        await c.query('update pet_threads set closed_at = now(), closed_by = $2 where id = $1', [thread.id, session.userId]);
      }
      return true;
    });
    if (!closed) { res.status(404).json({ error: 'Conversation introuvable.' }); return; }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('pet-threads/close', err);
    res.status(500).json({ error: 'La conversation ne peut pas être close.' });
  }
}

export async function petThreadBlock(req, res) {
  if (!['POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Méthode non autorisée.' });
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const result = await withTransaction(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      const other = thread.owner_id === session.userId ? thread.requester_id : thread.owner_id;
      if (req.method === 'POST') {
        await c.query('insert into pet_blocks(user_id,blocked_user_id) values($1,$2) on conflict do nothing', [session.userId, other]);
        await c.query('update pet_threads set closed_at=coalesce(closed_at,now()),closed_by=coalesce(closed_by,$2) where id=$1', [thread.id, session.userId]);
      } else await c.query('delete from pet_blocks where user_id=$1 and blocked_user_id=$2', [session.userId, other]);
      return { blocked: req.method === 'POST' };
    });
    if (!result) return res.status(404).json({ error: 'Conversation introuvable.' });
    res.json(result);
  } catch (err) { console.error('pet-threads/block', err); res.status(500).json({ error: 'Le contact ne peut pas être modifié.' }); }
}

export async function petThreadReport(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  const session = await requireUser(req, res);
  if (!session) return;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 10 || reason.length > 1000) return res.status(400).json({ error: 'Décrivez le problème en 10 à 1 000 caractères.' });
  try {
    const result = await withTransaction(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      const other = thread.owner_id === session.userId ? thread.requester_id : thread.owner_id;
      const report = (await c.query(`insert into pet_reports(thread_id,reporter_id,reported_user_id,reason) values($1,$2,$3,$4)
        on conflict(thread_id,reporter_id) do update set reason=excluded.reason,status='nouveau',reviewed_at=null returning id`, [thread.id, session.userId, other, reason])).rows[0];
      await c.query(`insert into inbox_notifications(audience,recipient_id,event_key,title,body,href,permission)
        select 'admin',a.id,$1,'Signalement de conversation',$2,'/support-requests','users.support'
        from admin_users a where a.status='actif' and exists(
          select 1 from admin_role_permissions p where p.role_code=a.role_code and p.permission in ('*','users.*','users.support'))
        on conflict(audience,recipient_id,event_key) do nothing`, [`pet-report:${report.id}:${Date.now()}`, reason.slice(0, 180)]);
      return { id: report.id };
    });
    if (!result) return res.status(404).json({ error: 'Conversation introuvable.' });
    res.status(201).json(result);
  } catch (err) { console.error('pet-threads/report', err); res.status(500).json({ error: 'Le signalement ne peut pas être envoyé.' }); }
}
