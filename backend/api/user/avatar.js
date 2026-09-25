// GET /api/user/avatar (image du compte connecté) · POST /api/user/avatar (multipart "file") · DELETE /api/user/avatar
import multer from 'multer';
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { deleteObject, getObject, putObject } from '../_lib/minio.js';
import { USER_COLUMNS, fullProfile } from '../_lib/profile.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) { cb(ALLOWED.has(file.mimetype) ? null : new Error('TYPE'), ALLOWED.has(file.mimetype)); },
});
const runMulter = (req, res) => new Promise((resolve, reject) => upload.single('file')(req, res, (e) => (e ? reject(e) : resolve())));

export default async function handler(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const row = (await withClient((c) => c.query('select avatar_key, avatar_type from users where id = $1', [session.userId]))).rows[0];
      if (!row || !row.avatar_key) { res.status(404).json({ error: 'Aucune photo.' }); return; }
      const obj = await getObject(row.avatar_key);
      res.setHeader('Content-Type', row.avatar_type || obj.ContentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      if (obj.ContentLength != null) res.setHeader('Content-Length', String(obj.ContentLength));
      obj.Body.pipe(res);
      return;
    }

    if (req.method === 'POST') {
      try { await runMulter(req, res); } catch (err) {
        if (err && err.message === 'TYPE') { res.status(400).json({ error: 'Format non pris en charge (jpeg, png ou webp).' }); return; }
        if (err && err.code === 'LIMIT_FILE_SIZE') { res.status(400).json({ error: 'Image trop lourde (5 Mo maximum).' }); return; }
        res.status(400).json({ error: 'Envoi invalide.' }); return;
      }
      if (!req.file) { res.status(400).json({ error: 'Fichier manquant.' }); return; }
      const key = `avatars/${session.userId}/${Date.now()}`;
      await putObject(key, req.file.buffer, req.file.mimetype);
      const previous = (await withClient((c) => c.query('select avatar_key from users where id = $1', [session.userId]))).rows[0];
      const profile = await withClient(async (c) => {
        await c.query('update users set avatar_key = $2, avatar_type = $3, avatar_updated_at = now(), updated_at = now() where id = $1', [session.userId, key, req.file.mimetype]);
        return (await c.query(`select ${USER_COLUMNS} from users where id = $1`, [session.userId])).rows[0];
      });
      if (previous && previous.avatar_key) deleteObject(previous.avatar_key).catch(() => {});
      res.status(200).json(fullProfile(profile));
      return;
    }

    if (req.method === 'DELETE') {
      const previous = (await withClient((c) => c.query('select avatar_key from users where id = $1', [session.userId]))).rows[0];
      const profile = await withClient(async (c) => {
        await c.query('update users set avatar_key = null, avatar_type = null, avatar_updated_at = null, updated_at = now() where id = $1', [session.userId]);
        return (await c.query(`select ${USER_COLUMNS} from users where id = $1`, [session.userId])).rows[0];
      });
      if (previous && previous.avatar_key) deleteObject(previous.avatar_key).catch(() => {});
      res.status(200).json(fullProfile(profile));
      return;
    }

    res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('user/avatar', err);
    if (!res.headersSent) res.status(500).json({ error: 'Photo de profil indisponible.' });
  }
}
