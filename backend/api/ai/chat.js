// POST /api/ai/chat { message, animalId?, history? } — assistant conseil santé/bien-être animal.
// Réservé aux formules payantes (guardAiAssistant, indépendant de subscriptions_enforced).
import { requireUser } from '../_lib/auth.js';
import { guardAiAssistant } from '../_lib/entitlements.js';
import { withClient } from '../_lib/db.js';
import { getAiConfig, resolveApiKey, callOpenRouter, buildMessages } from '../_lib/ai.js';

function ageLabel(dob) {
  if (!dob) return null;
  const years = (Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000);
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} mois`;
  return `${Math.floor(years)} an(s)`;
}

async function petContextFor(userId, animalId) {
  if (!animalId) return null;
  const row = (await withClient((c) => c.query(
    'select name, species, race, sex, dob, weight, notes from pets where id = $1 and user_id = $2', [animalId, userId]
  ))).rows[0];
  if (!row) return null;
  const parts = [
    `Nom : ${row.name}`, row.species ? `Espèce : ${row.species}` : null, row.race ? `Race : ${row.race}` : null,
    row.sex ? `Sexe : ${row.sex}` : null, ageLabel(row.dob) ? `Âge : ${ageLabel(row.dob)}` : null,
    row.weight ? `Poids : ${row.weight} kg` : null, row.notes ? `Notes du propriétaire : ${row.notes.slice(0, 300)}` : null,
  ].filter(Boolean);
  return parts.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée.' }); return; }
  const session = await requireUser(req, res);
  if (!session) return;
  if (!(await guardAiAssistant(res, session.userId))) return;

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) { res.status(400).json({ error: 'Message requis.' }); return; }
  if (message.length > 2000) { res.status(400).json({ error: 'Message trop long (2000 caractères max).' }); return; }

  const cfg = await getAiConfig();
  if (!cfg.enabled) { res.status(503).json({ error: "L'assistant IA n'est pas disponible pour le moment." }); return; }
  const apiKey = resolveApiKey(cfg);
  if (!apiKey) { res.status(503).json({ error: "L'assistant IA n'est pas configuré." }); return; }

  try {
    const petContext = await petContextFor(session.userId, body.animalId);
    const messages = buildMessages({ systemPrompt: cfg.systemPrompt, petContext, history: body.history, userMessage: message });
    const reply = await callOpenRouter({ apiKey, model: cfg.model, messages });
    res.json({ reply });
  } catch (err) {
    if (err.status === 429) { res.set('Retry-After', String(err.retryAfter || 60)); res.status(429).json({ error: 'Assistant très sollicité, réessaie dans une minute.' }); return; }
    res.status(err.status && err.status < 500 ? 400 : 502).json({ error: "L'assistant est momentanément indisponible." });
  }
}
