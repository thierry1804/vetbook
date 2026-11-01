import { withClient } from './_lib/db.js';
import { getSessionTokenFromRequest, requireUser } from './_lib/auth.js';

const silentResponse = { status() { return this; }, json() { return this; }, clearCookie() { return this; } };

export async function mySupportRequests(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const rows = (await withClient((c) => c.query(`
      select s.id,s.subject,s.description,s.status,s.created_at,s.updated_at,
        coalesce((select json_agg(json_build_object('id',r.id,'body',r.body,'created_at',r.created_at) order by r.id)
          from support_request_replies r where r.request_id=s.id),'[]'::json) as replies
      from support_requests s where s.user_id=$1 order by s.created_at desc limit 100`, [user.userId]))).rows;
    res.json({ rows });
  } catch (error) {
    console.error('mySupportRequests', error);
    res.status(500).json({ error: 'Demandes de support indisponibles.' });
  }
}

export default async function support(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  const { email, subject, description } = req.body || {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 200 ||
      typeof subject !== 'string' || subject.trim().length < 3 || subject.length > 160 ||
      typeof description !== 'string' || description.trim().length < 10 || description.length > 4000) {
    return res.status(400).json({ error: 'Indiquez un e-mail valide, un sujet et une description d’au moins 10 caractères.' });
  }
  try {
    const user = getSessionTokenFromRequest(req) ? await requireUser(req, silentResponse) : null;
    const row = (await withClient((c) => c.query(
      'insert into support_requests (email,subject,description,user_id) values ($1,$2,$3,$4) returning id',
      [email.trim().toLowerCase(), subject.trim(), description.trim(), user?.userId || null]))).rows[0];
    res.status(201).json({ id: row.id });
  } catch (error) {
    console.error('support', error);
    res.status(500).json({ error: 'Demande non enregistrée. Réessayez.' });
  }
}
