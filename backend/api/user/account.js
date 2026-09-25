// DELETE /api/user/account { password | confirmEmail } — supprime le compte et toutes ses données
// (base, photos, photo de profil). Irréversible.
import argon2 from 'argon2';
import { clearSessionCookie, requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { deleteObject } from '../_lib/minio.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  try {
    const outcome = await withClient(async (client) => {
      const u = (await client.query('select id, email, password_hash, avatar_key from users where id = $1', [session.userId])).rows[0];
      if (!u) return { error: 'SESSION' };
      if (u.password_hash) {
        if (typeof body.password !== 'string' || !(await argon2.verify(u.password_hash, body.password))) return { error: 'PASSWORD' };
      } else if (typeof body.confirmEmail !== 'string' || body.confirmEmail.trim().toLowerCase() !== u.email) {
        return { error: 'CONFIRM' };
      }
      const keys = (await client.query('select storage_path from photos where user_id = $1 and storage_path is not null', [u.id])).rows.map((r) => r.storage_path);
      if (u.avatar_key) keys.push(u.avatar_key);
      await client.query('delete from users where id = $1', [u.id]);
      return { keys };
    });
    if (outcome.error === 'SESSION') { res.status(401).json({ error: 'Session invalide.' }); return; }
    if (outcome.error === 'PASSWORD') { res.status(400).json({ error: 'Le mot de passe est incorrect.' }); return; }
    if (outcome.error === 'CONFIRM') { res.status(400).json({ error: 'Saisissez votre adresse e-mail exacte pour confirmer.' }); return; }
    // Les fichiers sont supprimés après la base : un échec de stockage ne bloque pas l'effacement du compte.
    await Promise.all(outcome.keys.map((k) => deleteObject(k).catch((e) => console.error('account delete object', k, e && e.message))));
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('user/account', err);
    res.status(500).json({ error: 'Suppression impossible pour le moment.' });
  }
}
