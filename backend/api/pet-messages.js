// Messages entre le propriétaire d'un animal visible et un autre abonné.
//   GET   /api/pet-threads
//   POST  /api/pet-threads                 { petId }
//   GET   /api/pet-threads/:id
//   POST  /api/pet-threads/:id/messages    { body }
//   POST  /api/pet-threads/:id/close
import { requireUser } from './_lib/auth.js';
import { withClient } from './_lib/db.js';
import { checkFeature, guardFeature } from './_lib/entitlements.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function summary(row, userId) {
  const mineIsOwner = row.owner_id === userId;
  return {
    id: row.id,
    petId: row.pet_id,
    petName: row.pet_name || '',
    otherName: firstName(mineIsOwner ? row.requester_name : row.owner_name),
    role: mineIsOwner ? 'owner' : 'requester',
    closed: !!row.closed_at,
    preview: row.preview || '',
    updatedAt: row.last_message_at || row.created_at,
  };
}

export async function petThreadList(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  try {
    const threads = await withClient(async (c) => (await c.query(
      `select t.*, p.name as pet_name,
              coalesce(nullif(oo.name, ''), ou.name) as owner_name,
              coalesce(nullif(ro.name, ''), ru.name) as requester_name,
              (select body from pet_messages m where m.thread_id = t.id order by m.created_at desc limit 1) as preview
         from pet_threads t
         join pets p on p.id = t.pet_id
         join users ou on ou.id = t.owner_id
         join users ru on ru.id = t.requester_id
         left join owners oo on oo.user_id = t.owner_id
         left join owners ro on ro.user_id = t.requester_id
        where t.owner_id = $1 or t.requester_id = $1
        order by coalesce(t.last_message_at, t.created_at) desc
        limit 50`,
      [session.userId])).rows.map((row) => summary(row, session.userId)));
    res.status(200).json({ threads });
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
      const messages = (await c.query(
        'select id, author_id, body, created_at from pet_messages where thread_id = $1 order by created_at asc limit 200',
        [thread.id])).rows.map((row) => ({
        id: row.id, mine: row.author_id === session.userId, body: row.body, createdAt: row.created_at,
      }));
      return { thread: summary(thread, session.userId), messages };
    });
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
    const message = await withClient(async (c) => {
      const thread = await threadFor(c, req.params.id, session.userId);
      if (!thread) return null;
      if (thread.closed_at) return 'closed';
      const inserted = (await c.query(
        'insert into pet_messages (thread_id, author_id, body) values ($1, $2, $3) returning id, created_at',
        [thread.id, session.userId, body])).rows[0];
      await c.query('update pet_threads set last_message_at = $2 where id = $1', [thread.id, inserted.created_at]);
      const recipient = thread.owner_id === session.userId ? thread.requester_id : thread.owner_id;
      const title = `Message au sujet de ${thread.pet_name || 'votre animal'}`;
      await c.query(
        `insert into inbox_notifications (audience, recipient_id, event_key, title, body, href)
         values ('user', $1, $2, $3, $4, $5) on conflict (audience, recipient_id, event_key) do nothing`,
        [recipient, `pet-message:${inserted.id}`, title, body.slice(0, 180), `/?pets=thread&thread=${thread.id}`]);
      return { id: inserted.id, mine: true, body, createdAt: inserted.created_at };
    });
    if (message === 'closed') { res.status(409).json({ error: 'Cette conversation est close.' }); return; }
    if (!message) { res.status(404).json({ error: 'Conversation introuvable.' }); return; }
    res.status(201).json(message);
  } catch (err) {
    console.error('pet-threads/message', err);
    res.status(500).json({ error: 'Le message n’a pas été envoyé.' });
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
