// GET /api/user/profile · PATCH /api/user/profile { firstName, lastName, phone, preferences, emergencyContact }
import { requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { USER_COLUMNS, displayName, fullProfile } from '../_lib/profile.js';
import { cleanPhone, sanitizeEmergencyContact, sanitizePreferences } from '../_lib/prefs.js';

const clean = (v, max = 80) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }
  const session = await requireUser(req, res);
  if (!session) return;

  try {
    const profile = await withClient(async (client) => {
      const cur = (await client.query(`select ${USER_COLUMNS} from users where id = $1`, [session.userId])).rows[0];
      if (!cur) return null;
      if (req.method === 'GET') return cur;

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const first = clean(body.firstName);
      const last = clean(body.lastName);
      if (first !== undefined && !first) throw new Error('FIRST_NAME');
      const phone = body.phone !== undefined ? cleanPhone(body.phone) : undefined;
      if (phone === null) throw new Error('PHONE');
      const firstName = first !== undefined ? first : cur.first_name;
      const lastName = last !== undefined ? (last || null) : cur.last_name;
      const prefs = body.preferences !== undefined ? sanitizePreferences(body.preferences, cur.preferences) : cur.preferences;
      const emergency = body.emergencyContact !== undefined ? sanitizeEmergencyContact(body.emergencyContact, cur.emergency_contact) : cur.emergency_contact;
      await client.query(
        `update users set first_name = $2, last_name = $3, name = $4, phone = $5, preferences = $6, emergency_contact = $7, updated_at = now()
          where id = $1`,
        [session.userId, firstName, lastName, displayName(firstName, lastName, cur.name), phone !== undefined ? (phone || null) : cur.phone,
          JSON.stringify(prefs), JSON.stringify(emergency)]
      );
      return (await client.query(`select ${USER_COLUMNS} from users where id = $1`, [session.userId])).rows[0];
    });
    if (!profile) {
      res.status(401).json({ error: 'Session invalide.' });
      return;
    }
    res.status(200).json(fullProfile(profile));
  } catch (err) {
    if (err && err.message === 'FIRST_NAME') { res.status(400).json({ error: 'Le prénom ne peut pas être vide.' }); return; }
    if (err && err.message === 'PHONE') { res.status(400).json({ error: 'Numéro de téléphone invalide.' }); return; }
    console.error('user/profile', err);
    res.status(500).json({ error: 'Profil indisponible.' });
  }
}
