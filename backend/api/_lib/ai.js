// Assistant IA (conseil santé/bien-être animal) — appel OpenRouter côté serveur uniquement, clé
// jamais exposée au client. Réglages dans app_settings (pas de nouvelle table) : ai_enabled,
// ai_model, ai_system_prompt, ai_api_key_enc (chiffrée, voir crypto.js).
import { reserveAiAttempt, finishAiAttempt } from './ai-usage.js';
import { getSetting } from './entitlements.js';
import { withClient } from './db.js';
import { decryptSecret } from './crypto.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_MODEL = 'deepseek/deepseek-chat-v3.1:free';
// Lecture du carnet par photo : il faut un modèle multimodal (DEFAULT_MODEL ne lit pas les images).
// Gemini Flash : bon en lecture manuscrite, rapide, et quelques dixièmes de centime par page.
export const DEFAULT_VISION_MODEL = 'google/gemini-2.5-flash';
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
    getSetting(c, 'ai_vision_model', DEFAULT_VISION_MODEL),
  ]);
  const [enabled, model, systemPrompt, apiKeyEnc, visionModel] = client ? await run(client) : await withClient(run);
  return { enabled: enabled === true, model, systemPrompt, hasApiKey: !!apiKeyEnc, apiKeyEnc, visionModel };
}

export function resolveApiKey(cfg) {
  if (!cfg.apiKeyEnc) return null;
  try { return decryptSecret(cfg.apiKeyEnc); } catch { return null; }
}

// Transitoire : le fournisseur a parfois une requête qui reste bloquée sans jamais répondre (le
// timeout l'interrompt, sans statut HTTP exploitable) ou renvoie un contenu vide sans erreur propre.
// Une seule retentative absorbe la plupart de ces cas sans faire attendre l'utilisateur deux fois plus.
function isTransient(error) {
  return error.name === 'AbortError' || error.message === 'Réponse vide du modèle.';
}

async function attemptOpenRouter({ apiKey, model, messages, timeoutMs, source, fetchImpl, temperature, maxTokens, responseFormat }) {
  const attemptId = await reserveAiAttempt({ source, model });
  let httpStatus = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://vetbook.boss-etech.net',
        'X-Title': "App'lika",
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, ...(responseFormat ? { response_format: responseFormat } : {}) }),
    });
    httpStatus = res.status;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (json && json.error && json.error.message) || `Erreur OpenRouter (${res.status}).`;
      const err = new Error(msg); err.status = res.status; throw err;
    }
    const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!content) { const err = new Error('Réponse vide du modèle.'); err.status = 502; throw err; }
    await finishAiAttempt(attemptId, 'success', httpStatus);
    return content;
  } catch (error) {
    await finishAiAttempt(attemptId, 'error', httpStatus);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function callOpenRouter({ apiKey, model, messages, timeoutMs = 25000, source = 'chat', fetchImpl = fetch, temperature = 0.6, maxTokens = 450, responseFormat }) {
  const opts = { apiKey, model, messages, timeoutMs, source, fetchImpl, temperature, maxTokens, responseFormat };
  try {
    return await attemptOpenRouter(opts);
  } catch (error) {
    if (!isTransient(error)) throw error;
    return attemptOpenRouter(opts);
  }
}

// Diffuse la réponse au fil de sa génération (SSE amont d'OpenRouter) plutôt que d'attendre la
// réponse complète : le premier fragment arrive en une seconde ou deux, bien avant qu'une génération
// longue (10-40s en tout) ait une chance de dépasser un timeout proxy. onDelta(text) est appelé pour
// chaque fragment ; la fonction résout avec le texte complet une fois le flux terminé.
export async function streamOpenRouter({ apiKey, model, messages, timeoutMs = 45000, source = 'chat', fetchImpl = fetch, onDelta }) {
  const attemptId = await reserveAiAttempt({ source, model });
  let httpStatus = null;
  let full = '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://vetbook.boss-etech.net',
        'X-Title': "App'lika",
      },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 450, stream: true }),
    });
    httpStatus = res.status;
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const msg = (json && json.error && json.error.message) || `Erreur OpenRouter (${res.status}).`;
      const err = new Error(msg); err.status = res.status; throw err;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        let json; try { json = JSON.parse(payload); } catch { continue; }
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) { full += delta; onDelta(delta); }
      }
    }
    if (!full) { const err = new Error('Réponse vide du modèle.'); err.status = 502; throw err; }
    await finishAiAttempt(attemptId, 'success', httpStatus);
    return full;
  } catch (error) {
    await finishAiAttempt(attemptId, 'error', httpStatus);
    error.partial = full;
    throw error;
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
