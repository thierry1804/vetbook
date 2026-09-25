// GET /api/user/sessions · DELETE /api/user/sessions/:id · POST /api/user/sessions/revoke-others
import { requireUser, setSessionCookie, startSession } from '../_lib/auth.js';
import { withTransaction, withClient } from '../_lib/db.js';

// Libellé lisible depuis le user-agent : « Chrome sur Linux ».
export function deviceLabel(ua) {
  const s = String(ua || '');
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Navigateur';
  const os = /Windows/.test(s) ? 'Windows' : /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iOS' : /Mac OS X/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'appareil inconnu';
  return `${browser} sur ${os}`;
}

export default async function handler(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const sub = req.params && req.params.id;

  try {
    if (req.method === 'GET') {
      const rows = (await withClient((c) => c.query(
        `select id, created_at, last_seen_at, user_agent, ip from user_sessions
          where user_id = $1 and revoked_at is null and expires_at > now() order by last_seen_at desc`, [session.userId]))).rows;
      const list = rows.map((r) => ({ id: r.id, current: r.id === session.sid, label: deviceLabel(r.user_agent), ip: r.ip, createdAt: r.created_at, lastSeenAt: r.last_seen_at }));
      // Session ouverte avant l'introduction du suivi des appareils : pas de ligne en base, mais bien connectée.
      if (!session.sid) list.unshift({ id: 'legacy', current: true, label: deviceLabel(req.headers['user-agent']), ip: req.ip, createdAt: null, lastSeenAt: new Date().toISOString(), legacy: true });
      res.status(200).json({ sessions: list });
      return;
    }

    if (req.method === 'DELETE' && sub) {
      if (sub === 'legacy' || !/^[0-9a-f-]{36}$/i.test(sub)) {
        res.status(400).json({ error: 'Cette session ne peut pas être fermée individuellement : utilisez « Me déconnecter partout ».' });
        return;
      }
      const r = await withClient((c) => c.query(
        'update user_sessions set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null returning id', [sub, session.userId]));
      if (!r.rows[0]) { res.status(404).json({ error: 'Appareil introuvable.' }); return; }
      res.status(200).json({ ok: true, self: sub === session.sid });
      return;
    }

    if (req.method === 'POST' && sub === 'revoke-others') {
      const token = await withTransaction(async (client) => {
        const u = (await client.query('select id, email from users where id = $1 for update', [session.userId])).rows[0];
        await client.query('update users set session_epoch = now() where id = $1', [u.id]);
        await client.query('update user_sessions set revoked_at = now() where user_id = $1 and revoked_at is null', [u.id]);
        return startSession(client, u, req);
      });
      setSessionCookie(res, token);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('user/sessions', err);
    res.status(500).json({ error: 'Appareils indisponibles.' });
  }
}
