import { withClient } from './_lib/db.js';

export default async function support(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  const { email, subject, description } = req.body || {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 200 ||
      typeof subject !== 'string' || subject.trim().length < 3 || subject.length > 160 ||
      typeof description !== 'string' || description.trim().length < 10 || description.length > 4000) {
    return res.status(400).json({ error: 'Indiquez un e-mail valide, un sujet et une description d’au moins 10 caractères.' });
  }
  try {
    const row = (await withClient((c) => c.query(
      'insert into support_requests (email,subject,description) values ($1,$2,$3) returning id',
      [email.trim().toLowerCase(), subject.trim(), description.trim()]))).rows[0];
    res.status(201).json({ id: row.id });
  } catch (error) {
    console.error('support', error);
    res.status(500).json({ error: 'Demande non enregistrée. Réessayez.' });
  }
}
