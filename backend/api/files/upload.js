// POST /api/files  multipart: file, petLocalId, localId?, caption?, date?
import multer from 'multer';
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { putObject } from '../_lib/minio.js';
import { effectiveLimit, guardQuota } from '../_lib/entitlements.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 50 * 1024 * 1024; // plafond dur ; la limite réglable (max_upload_mb) est vérifiée après réception

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new Error('TYPE'));
      return;
    }
    cb(null, true);
  },
});

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    await runMulter(req, res);
  } catch (err) {
    if (err && err.message === 'TYPE') {
      res.status(400).json({ error: 'Type de fichier non autorisé (jpeg, png, webp, gif).' });
      return;
    }
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Fichier trop volumineux (max 12 Mo).' });
      return;
    }
    res.status(400).json({ error: 'Upload invalide.' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Fichier manquant.' });
    return;
  }

  // Limites réglables (backoffice) : taille max par fichier, nombre de photos et stockage de la formule.
  const maxMb = await effectiveLimit(user.userId, null, 'max_upload_mb', 12);
  if (maxMb != null && req.file.size > maxMb * 1024 * 1024) {
    res.status(400).json({ error: `Fichier trop volumineux (max ${maxMb} Mo).` });
    return;
  }
  const usage = (await withClient((c) => c.query('select count(*)::int as n, coalesce(sum(byte_size),0)::bigint as bytes from photos where user_id = $1', [user.userId]))).rows[0];
  if (!(await guardQuota(res, user.userId, 'photos_count', usage.n, null, null))) return;
  const storageMb = await effectiveLimit(user.userId, 'photos_storage_mb', 'storage_quota_mb', null);
  if (storageMb != null && Number(usage.bytes) + req.file.size > storageMb * 1024 * 1024) {
    res.status(402).json({ error: 'Espace photo de votre formule atteint.', feature: 'photos_storage_mb', quota: storageMb });
    return;
  }

  const petLocalId = Number(req.body.petLocalId);
  let localId = req.body.localId != null && req.body.localId !== '' ? Number(req.body.localId) : null;
  const caption = typeof req.body.caption === 'string' ? req.body.caption : null;
  const date = typeof req.body.date === 'string' && req.body.date ? req.body.date : null;

  if (!Number.isFinite(petLocalId)) {
    res.status(400).json({ error: 'petLocalId invalide.' });
    return;
  }

  try {
    const result = await withClient(async (client) => {
      const petRes = await client.query(
        `select id from pets where user_id = $1 and local_id = $2`,
        [user.userId, petLocalId]
      );
      const pet = petRes.rows[0];
      if (!pet) {
        const err = new Error('PET_NOT_FOUND');
        throw err;
      }

      if (!Number.isFinite(localId)) {
        const maxRes = await client.query(
          `select coalesce(max(local_id), 0) + 1 as next from photos where pet_id = $1`,
          [pet.id]
        );
        localId = Number(maxRes.rows[0].next);
      }

      const objectKey = `${user.userId}/${pet.id}/${localId}`;
      await putObject(objectKey, req.file.buffer, req.file.mimetype);

      const { rows } = await client.query(
        `insert into photos (pet_id, user_id, local_id, date, caption, storage_path, content_type, byte_size)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (pet_id, local_id) do update set
           date = excluded.date,
           caption = excluded.caption,
           storage_path = excluded.storage_path,
           content_type = excluded.content_type,
           byte_size = excluded.byte_size
         returning id, local_id, storage_path, content_type, byte_size, caption, date`,
        [pet.id, user.userId, localId, date, caption, objectKey, req.file.mimetype, req.file.size]
      );
      return rows[0];
    });

    res.status(201).json({
      id: result.id,
      localId: result.local_id,
      contentType: result.content_type,
      size: result.byte_size,
      caption: result.caption,
      date: result.date,
      url: `/api/files/${result.id}`,
    });
  } catch (err) {
    if (err && err.message === 'PET_NOT_FOUND') {
      res.status(404).json({ error: 'Animal introuvable. Sauvegarde d\'abord le carnet (sync).' });
      return;
    }
    console.error('files/upload', err);
    res.status(500).json({ error: 'Échec de l\'upload.' });
  }
}
