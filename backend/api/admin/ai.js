// Réglages de l'assistant IA (conseil santé/bien-être animal, OpenRouter). Clé API chiffrée au
// repos (crypto.js), jamais renvoyée en clair ni même sous forme chiffrée au backoffice — seul un
// indicateur « clé enregistrée » est exposé.
import { withTransaction } from '../_lib/db.js';
import { requireAdmin, audit, requireReason } from '../_lib/admin-auth.js';
import { getAiUsage } from '../_lib/ai-usage.js';
import { encryptSecret } from '../_lib/crypto.js';
import { extractJson } from '../_lib/booklet.js';
import { DEFAULT_MODEL, DEFAULT_VISION_MODEL, DEFAULT_SYSTEM_PROMPT, getAiConfig, resolveApiKey, callOpenRouter, buildMessages } from '../_lib/ai.js';

// Carré turquoise 16×16 (PNG) pour le test de lecture d'image du backoffice.
const TEST_IMAGE_PNG = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGPgndJBEmIY1TCqYfhqAABqqikQLN19fgAAAABJRU5ErkJggg==';

export function mountAi(router) {
  router.get('/ai-settings/usage', requireAdmin('system.read'), async (_req, res, next) => {
    try { res.json(await getAiUsage()); } catch (error) { next(error); }
  });

  router.get('/ai-settings', requireAdmin('system.read'), async (_req, res, next) => {
    try {
      const cfg = await getAiConfig();
      res.json({
        enabled: cfg.enabled, model: cfg.model, visionModel: cfg.visionModel, systemPrompt: cfg.systemPrompt, hasApiKey: cfg.hasApiKey,
        defaultModel: DEFAULT_MODEL, defaultVisionModel: DEFAULT_VISION_MODEL, defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
      });
    } catch (err) { next(err); }
  });

  router.put('/ai-settings', requireAdmin('system.write'), async (req, res, next) => {
    try {
      const b = req.body || {};
      if (typeof b.enabled !== 'boolean') { res.status(400).json({ error: '« enabled » (booléen) requis.' }); return; }
      if (typeof b.systemPrompt === 'string' && b.systemPrompt.length > 4000) return res.status(400).json({ error: 'Le message système est limité à 4000 caractères.' });
      const model = typeof b.model === 'string' && b.model.trim() ? b.model.trim().slice(0, 200) : DEFAULT_MODEL;
      const visionModel = typeof b.visionModel === 'string' && b.visionModel.trim() ? b.visionModel.trim().slice(0, 200) : DEFAULT_VISION_MODEL;
      const systemPrompt = typeof b.systemPrompt === 'string' && b.systemPrompt.trim() ? b.systemPrompt.trim().slice(0, 4000) : DEFAULT_SYSTEM_PROMPT;
      const reason = requireReason(req, res); if (!reason) return;
      const before = await getAiConfig();
      await withTransaction(async (c) => {
        await c.query("insert into app_settings (key, value) values ('ai_enabled', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(b.enabled)]);
        await c.query("insert into app_settings (key, value) values ('ai_model', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(model)]);
        await c.query("insert into app_settings (key, value) values ('ai_vision_model', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(visionModel)]);
        await c.query("insert into app_settings (key, value) values ('ai_system_prompt', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(systemPrompt)]);
        if (typeof b.apiKey === 'string' && b.apiKey.trim()) {
          await c.query("insert into app_settings (key, value) values ('ai_api_key_enc', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(encryptSecret(b.apiKey.trim()))]);
        }
        await audit(req, res, {
          action: 'ai.settings', targetType: 'setting', targetId: 'ai_settings',
          before: { enabled: before.enabled, model: before.model, visionModel: before.visionModel }, after: { enabled: b.enabled, model, visionModel, apiKeyChanged: !!(b.apiKey && b.apiKey.trim()) }, reason,
        }, c);
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // Appel réel à OpenRouter avec les réglages (déjà enregistrés, sauf si une clé/un modèle de brouillon est fourni) —
  // pour vérifier la configuration avant de l'activer pour les utilisateurs.
  router.post('/ai-settings/test', requireAdmin('system.write'), async (req, res) => {
    try {
      if (typeof req.body?.systemPrompt === 'string' && req.body.systemPrompt.length > 4000) return res.status(400).json({ error: 'Le message système est limité à 4000 caractères.' });
      const cfg = await getAiConfig();
      const draftKey = typeof req.body?.apiKey === 'string' && req.body.apiKey.trim() ? req.body.apiKey.trim() : null;
      const apiKey = draftKey || resolveApiKey(cfg);
      if (!apiKey) { res.status(400).json({ error: 'Aucune clé API enregistrée.' }); return; }
      if (req.body?.vision === true) {
        // Image d'essai embarquée : vérifie que le modèle choisi accepte bien les images.
        const visionModel = (typeof req.body?.visionModel === 'string' && req.body.visionModel.trim()) || cfg.visionModel;
        // Même forme d'appel que la vraie lecture (réponse JSON demandée) : un modèle qui refuse response_format échoue ici aussi.
        const content = await callOpenRouter({ apiKey, model: visionModel, timeoutMs: 30000, source: 'admin', temperature: 0, maxTokens: 300, responseFormat: { type: 'json_object' }, messages: [{ role: 'user', content: [
          { type: 'text', text: 'Décris cette image en une phrase, en français. Réponds uniquement par un objet JSON : {"description":"ta phrase"}.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${TEST_IMAGE_PNG}` } },
        ] }] });
        const parsed = extractJson(content);
        res.json({ ok: true, reply: (parsed && typeof parsed.description === 'string' && parsed.description) || content });
        return;
      }
      const model = (typeof req.body?.model === 'string' && req.body.model.trim()) || cfg.model;
      const systemPrompt = (typeof req.body?.systemPrompt === 'string' && req.body.systemPrompt.trim()) || cfg.systemPrompt;
      const messages = buildMessages({ systemPrompt, userMessage: 'Dis bonjour en une phrase et confirme que tu es prêt à aider.' });
      const reply = await callOpenRouter({ apiKey, model, messages, timeoutMs: 20000, source: 'admin' });
      res.json({ ok: true, reply });
    } catch (err) {
      if (err.status === 429) { res.set('Retry-After', String(err.retryAfter || 60)); res.status(429).json({ ok: false, error: err.message }); return; }
      res.status(err.status && err.status < 500 ? 400 : 502).json({ ok: false, error: err.message || 'Appel OpenRouter impossible.' });
    }
  });
}
