// Assistant IA (conseil santé/bien-être animal) — appel OpenRouter côté serveur uniquement, clé
// jamais exposée au client. Réglages dans app_settings (pas de nouvelle table) : ai_enabled,
// ai_model, ai_system_prompt, ai_api_key_enc (chiffrée, voir crypto.js).
import { getSetting } from './entitlements.js';
import { withClient } from './db.js';
import { decryptSecret } from './crypto.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_MODEL = 'deepseek/deepseek-chat-v3.1:free';
export const DEFAULT_SYSTEM_PROMPT = "Tu es l'assistant conseil d'App'lika, une application de carnet de santé pour animaux de compagnie. "
  + "Tu aides les propriétaires sur l'alimentation, le comportement, l'entretien, les races et le bien-être général de leur animal. "
  + "Réponds en français, de façon chaleureuse et concrète.";
// Rappel de sécurité : toujours ajouté après le prompt configuré par l'admin, non contournable depuis le backoffice.
const SAFETY_SUFFIX = "\n\nRègle impérative : tu n'es pas vétérinaire et ne poses jamais de diagnostic. Pour tout symptôme, douleur, "
  + "urgence ou doute sur la santé de l'animal, oriente systématiquement et clairement vers la consultation d'un vétérinaire. "
  + "Ne prescris jamais de médicament ni de dosage.";

export async function getAiConfig(client) {
  const run = (c) => Promise.all([
    getSetting(c, 'ai_enabled', false),
    getSetting(c, 'ai_model', DEFAULT_MODEL),
    getSetting(c, 'ai_system_prompt', DEFAULT_SYSTEM_PROMPT),
    getSetting(c, 'ai_api_key_enc', null),
  ]);
  const [enabled, model, systemPrompt, apiKeyEnc] = client ? await run(client) : await withClient(run);
  return { enabled: enabled === true, model, systemPrompt, hasApiKey: !!apiKeyEnc, apiKeyEnc };
}

export function resolveApiKey(cfg) {
  if (!cfg.apiKeyEnc) return null;
  try { return decryptSecret(cfg.apiKeyEnc); } catch { return null; }
}

// Débit global : les modèles :free d'OpenRouter sont plafonnés à 20 req/min PAR COMPTE (pas par
// utilisateur final) — file simple en mémoire du process, sous la limite réelle par prudence.
const MAX_PER_MINUTE = 15;
const WINDOW_MS = 60_000;
let windowStart = Date.now();
let windowCount = 0;
export function withinGlobalRate() {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) { windowStart = now; windowCount = 0; }
  if (windowCount >= MAX_PER_MINUTE) return false;
  windowCount += 1;
  return true;
}

export async function callOpenRouter({ apiKey, model, messages, timeoutMs = 25000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://vetbook.boss-etech.net',
        'X-Title': "App'lika",
      },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 700 }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (json && json.error && json.error.message) || `Erreur OpenRouter (${res.status}).`;
      const err = new Error(msg); err.status = res.status; throw err;
    }
    const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!content) { const err = new Error('Réponse vide du modèle.'); err.status = 502; throw err; }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export function buildMessages({ systemPrompt, petContext, history, userMessage }) {
  const sys = (systemPrompt || DEFAULT_SYSTEM_PROMPT) + SAFETY_SUFFIX + (petContext ? `\n\nContexte de l'animal concerné :\n${petContext}` : '');
  const messages = [{ role: 'system', content: sys }];
  for (const m of (history || []).slice(-10)) {
    if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
      messages.push({ role: m.role, content: m.content.slice(0, 2000) });
    }
  }
  messages.push({ role: 'user', content: String(userMessage).slice(0, 2000) });
  return messages;
}
