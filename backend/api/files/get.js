// GET /api/files/:id — stream authentifié depuis MinIO
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { getObject } from '../_lib/minio.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    // POST upload is on /api/files ; DELETE via /api/files/:id/delete
    if (req.method === 'DELETE') {
      // fallback handled by delete route; keep method check strict here
    }
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const id = req.params && req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Identifiant manquant.' });
    return;
  }

  try {
    const photo = await withClient(async (client) => {
      const { rows } = await client.query(
        `select id, storage_path, content_type from photos where id = $1 and user_id = $2`,
        [id, user.userId]
      );
      return rows[0] || null;
    });

    if (!photo || !photo.storage_path) {
      res.status(404).json({ error: 'Fichier introuvable.' });
      return;
    }

    const obj = await getObject(photo.storage_path);
    res.setHeader('Content-Type', photo.content_type || obj.ContentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (obj.ContentLength != null) res.setHeader('Content-Length', String(obj.ContentLength));

    const stream = obj.Body;
    stream.pipe(res);
  } catch (err) {
    console.error('files/get', err);
    if (!res.headersSent) res.status(500).json({ error: 'Lecture impossible.' });
  }
}
