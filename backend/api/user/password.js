// POST /api/user/change-password { currentPassword?, newPassword }
// Le mot de passe actuel est exigé sauf pour un compte créé via Google qui n'en a pas encore.
import argon2 from 'argon2';
import { requireUser, setSessionCookie, startSession } from '../_lib/auth.js';
import { withTransaction } from '../_lib/db.js';
import { sendMail } from '../_lib/mailer.js';
import { passwordChanged } from '../_lib/emails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (next.length < 8) { res.status(400).json({ error: 'Le nouveau mot de passe doit faire 8 caractères minimum.' }); return; }

  try {
    const out = await withTransaction(async (client) => {
      const { rows } = await client.query('select id, email, password_hash from users where id = $1 for update', [session.userId]);
      const u = rows[0];
      if (!u) return { error: 'SESSION' };
      if (u.password_hash) {
        if (!current || !(await argon2.verify(u.password_hash, current))) return { error: 'CURRENT' };
        if (await argon2.verify(u.password_hash, next)) return { error: 'SAME' };
      }
      const hash = await argon2.hash(next, { type: argon2.argon2id });
      // Déconnecte tous les autres appareils ; celui-ci reçoit une session neuve.
      await client.query('update users set password_hash = $2, session_epoch = now(), updated_at = now() where id = $1', [u.id, hash]);
      await client.query('update user_sessions set revoked_at = now() where user_id = $1 and revoked_at is null', [u.id]);
      const token = await startSession(client, u, req);
      return { token, email: u.email, hadPassword: !!u.password_hash };
    });
    if (out.error === 'SESSION') { res.status(401).json({ error: 'Session invalide.' }); return; }
    if (out.error === 'CURRENT') { res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' }); return; }
    if (out.error === 'SAME') { res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l’actuel.' }); return; }
    setSessionCookie(res, out.token);
    sendMail({ to: out.email, ...passwordChanged() }).catch(() => {});
    res.status(200).json({ ok: true, hadPassword: out.hadPassword });
  } catch (err) {
    console.error('user/change-password', err);
    res.status(500).json({ error: 'Changement de mot de passe impossible.' });
  }
}
