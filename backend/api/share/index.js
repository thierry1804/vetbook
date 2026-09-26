// Liens de partage vétérinaire (lecture seule, expirants, révocables).
//   POST   /api/share/links          { petLocalId, days, label?, includeNotes?, includeContact?, includePhotos? }
//   GET    /api/share/links
//   DELETE /api/share/links/:id
//   GET    /api/share/public/:token            (public)
//   GET    /api/share/public/:token/photo/:id  (public, si le lien inclut les photos)
import { hashToken, requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { checkFeature } from '../_lib/entitlements.js';
import { appUrl } from '../_lib/mailer.js';
import { getObject } from '../_lib/minio.js';
import { newRawToken } from '../_lib/tokens.js';
import { petSnapshot } from '../_lib/snapshot.js';

const MAX_DAYS = 90;

export async function shareLinks(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const id = req.params && req.params.id;
  try {
    if (req.method === 'GET') {
      const rows = (await withClient((c) => c.query(
        `select l.id, l.label, l.expires_at, l.revoked_at, l.view_count, l.last_viewed_at, l.created_at,
                l.include_notes, l.include_contact, l.include_photos, p.name as pet_name, p.local_id as pet_local_id
           from share_links l join pets p on p.id = l.pet_id
          where l.user_id = $1 order by l.created_at desc limit 50`, [session.userId]))).rows;
      res.status(200).json({ links: rows.map((r) => ({
        id: r.id, label: r.label, petName: r.pet_name, petLocalId: Number(r.pet_local_id), expiresAt: r.expires_at, revokedAt: r.revoked_at,
        active: !r.revoked_at && new Date(r.expires_at) > new Date(), viewCount: r.view_count, lastViewedAt: r.last_viewed_at, createdAt: r.created_at,
        includeNotes: r.include_notes, includeContact: r.include_contact, includePhotos: r.include_photos })) });
      return;
    }
    if (req.method === 'POST') {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const petLocalId = Number(b.petLocalId);
      let days = Math.min(MAX_DAYS, Math.max(1, Math.round(Number(b.days) || 7)));
      // Durée maximale du lien selon la formule (quota share_link_days ; sans effet tant que l'application des droits est désactivée).
      const ent = await checkFeature(session.userId, 'share_link_days');
      if (ent.quota != null) days = Math.min(days, ent.quota);
      if (!Number.isFinite(petLocalId)) { res.status(400).json({ error: 'Animal invalide.' }); return; }
      const raw = newRawToken();
      const created = await withClient(async (c) => {
        const pet = (await c.query('select id, name from pets where user_id = $1 and local_id = $2', [session.userId, petLocalId])).rows[0];
        if (!pet) return null;
        const ins = await c.query(
          `insert into share_links (user_id, pet_id, token_hash, label, include_notes, include_contact, include_photos, expires_at)
           values ($1, $2, $3, $4, $5, $6, $7, now() + ($8 || ' days')::interval) returning id, expires_at`,
          [session.userId, pet.id, hashToken(raw), typeof b.label === 'string' ? b.label.trim().slice(0, 80) : null,
            b.includeNotes === true, b.includeContact === true, b.includePhotos === true, String(days)]);
        return { id: ins.rows[0].id, expiresAt: ins.rows[0].expires_at, petName: pet.name };
      });
      if (!created) { res.status(404).json({ error: 'Animal introuvable. Sauvegardez d’abord vos carnets (synchronisation).' }); return; }
      // Le lien complet n'est renvoyé qu'ici : seul son hachage est conservé.
      res.status(201).json({ ...created, url: `${appUrl()}/share.html?t=${raw}` });
      return;
    }
    if (req.method === 'DELETE' && id) {
      const r = await withClient((c) => c.query('update share_links set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null returning id', [id, session.userId]));
      if (!r.rows[0]) { res.status(404).json({ error: 'Lien introuvable.' }); return; }
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('share/links', err);
    res.status(500).json({ error: 'Partage indisponible.' });
  }
}

async function linkFromToken(client, token) {
  if (typeof token !== 'string' || token.length < 20) return null;
  const { rows } = await client.query(
    `select l.*, p.id as pet_uuid from share_links l join pets p on p.id = l.pet_id
      where l.token_hash = $1 and l.revoked_at is null and l.expires_at > now()`, [hashToken(token)]);
  return rows[0] || null;
}

export async function sharePublic(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const out = await withClient(async (c) => {
      const link = await linkFromToken(c, req.params.token);
      if (!link) return null;
      await c.query('update share_links set view_count = view_count + 1, last_viewed_at = now() where id = $1', [link.id]);
      const pet = (await c.query('select * from pets where id = $1', [link.pet_id])).rows[0];
      const owner = (await c.query("select coalesce(nullif(o.name, ''), u.name) as name, o.phone, o.clinic from users u left join owners o on o.user_id = u.id where u.id = $1", [link.user_id])).rows[0] || {};
      const snap = await petSnapshot(c, pet, { includeNotes: link.include_notes, includePhotos: link.include_photos });
      return {
        sharedAt: link.created_at, expiresAt: link.expires_at, label: link.label,
        owner: { name: owner.name || null, phone: link.include_contact ? (owner.phone || null) : null, clinic: link.include_contact ? (owner.clinic || null) : null },
        ...snap,
      };
    });
    if (!out) { res.status(404).json({ error: 'Ce lien est invalide, expiré ou a été révoqué.' }); return; }
    res.status(200).json(out);
  } catch (err) {
    console.error('share/public', err);
    res.status(500).json({ error: 'Carnet indisponible.' });
  }
}

export async function sharePublicPhoto(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  try {
    const photo = await withClient(async (c) => {
      const link = await linkFromToken(c, req.params.token);
      if (!link || !link.include_photos) return null;
      return (await c.query('select storage_path, content_type from photos where id = $1 and pet_id = $2', [req.params.id, link.pet_id])).rows[0] || null;
    });
    if (!photo || !photo.storage_path) { res.status(404).json({ error: 'Photo introuvable.' }); return; }
    const obj = await getObject(photo.storage_path);
    res.setHeader('Content-Type', photo.content_type || obj.ContentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    obj.Body.pipe(res);
  } catch (err) {
    console.error('share/public/photo', err);
    if (!res.headersSent) res.status(500).json({ error: 'Photo indisponible.' });
  }
}
