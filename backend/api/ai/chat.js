// POST /api/ai/chat { message, animalId?, history? } — assistant conseil santé/bien-être animal.
// Réservé aux formules payantes (guardAiAssistant, indépendant de subscriptions_enforced).
import { requireUser } from '../_lib/auth.js';
import { guardAiAssistant } from '../_lib/entitlements.js';
import { withClient } from '../_lib/db.js';
import { getAiConfig, resolveApiKey, streamOpenRouter, buildMessages } from '../_lib/ai.js';

function ageLabel(dob) {
  if (!dob) return null;
  const years = (Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000);
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} mois`;
  return `${Math.floor(years)} an(s)`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function petContextFor(userId, animalId) {
  if (!animalId || !UUID_RE.test(animalId)) return null;
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

  let petContext, messages;
  try {
    petContext = await petContextFor(session.userId, body.animalId);
    messages = buildMessages({ systemPrompt: cfg.systemPrompt, petContext, history: body.history, userMessage: message });
  } catch (err) {
    console.error('ai/chat prepare', err);
    res.status(500).json({ error: "L'assistant est momentanément indisponible." });
    return;
  }

  // Diffusion au fil de l'eau (SSE) : le premier fragment arrive en 1-2s, bien avant qu'une réponse
  // longue (parfois 10-40s au total, non streamée côté modèle) ait une chance de dépasser un timeout
  // proxy — c'est ce qui causait des 502 intermittents en attente de la réponse complète.
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-store', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
  res.flushHeaders();
  try {
    await streamOpenRouter({
      apiKey, model: cfg.model, messages,
      onDelta: (text) => { res.write(`event: delta\ndata: ${JSON.stringify({ text })}\n\n`); },
    });
    res.write('event: done\ndata: {}\n\n');
  } catch (err) {
    const message = err.status === 429 ? 'Assistant très sollicité, réessaie dans une minute.' : "L'assistant est momentanément indisponible.";
    res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
  }
  res.end();
}
