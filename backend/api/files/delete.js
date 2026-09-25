// POST /api/files/:id/delete  (ou DELETE via ce handler monté en all)
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { deleteObject } from '../_lib/minio.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
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
        `select id, storage_path from photos where id = $1 and user_id = $2`,
        [id, user.userId]
      );
      const row = rows[0];
      if (!row) return null;
      await client.query(`delete from photos where id = $1 and user_id = $2`, [id, user.userId]);
      return row;
    });

    if (!photo) {
      res.status(404).json({ error: 'Fichier introuvable.' });
      return;
    }

    if (photo.storage_path) {
      try { await deleteObject(photo.storage_path); } catch (e) {
        console.warn('files/delete minio', e.message);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('files/delete', err);
    res.status(500).json({ error: 'Suppression impossible.' });
  }
}
