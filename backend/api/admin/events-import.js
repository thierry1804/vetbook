// Import d'un événement depuis un lien externe (Facebook, site d'une association…) : récupère la page,
// en extrait titre/description/date/lieu via l'assistant IA (même intégration OpenRouter que « Assistant
// IA », indépendant de son interrupteur « activé pour les utilisateurs » — c'est un outil admin). Ne fait
// que proposer des champs pré-remplis ; l'admin relit, corrige et enregistre via le formulaire normal.
import { requireAdmin } from '../_lib/admin-auth.js';
import { getAiConfig, resolveApiKey, callOpenRouter } from '../_lib/ai.js';
import { fetchPublicUrl, extractPageSummary } from '../_lib/url-fetch.js';

const SYSTEM_PROMPT = "Tu extrais les informations d'un événement (salon, exposition canine, journée de sensibilisation, campagne de vaccination…) "
  + "à partir du contenu d'une page web, pour une fiche dans le carnet de santé App'lika. Réponds UNIQUEMENT avec un objet JSON, sans texte autour, "
  + 'avec exactement ces clés : {"title": string, "description": string (2-4 phrases, factuel, sans emoji), "date": string ou null (format AAAA-MM-JJ, '
  + 'la date précise de l\'événement si trouvée ; null si pas de date identifiable ou si plusieurs dates sans date de début claire), '
  + '"location": string ou null (ville ou lieu), "link": string ou null (URL officielle de l\'événement si différente de la page source)}. '
  + "Si l'événement se répète chaque année sans date précise pour l'édition à venir, mets date à null. N'invente jamais une date : si elle n'est pas clairement écrite dans le texte, mets null.";

function parseJsonLoose(text) {
  const cleaned = String(text || '').trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function mountEventsImport(router) {
  router.post('/events/extract', requireAdmin('contents.write'), async (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) { res.status(400).json({ error: 'Lien requis.' }); return; }
    try {
      const cfg = await getAiConfig();
      const apiKey = resolveApiKey(cfg);
      if (!apiKey) { res.status(400).json({ error: "Aucune clé API OpenRouter enregistrée (réglages Assistant IA)." }); return; }

      const { finalUrl, html } = await fetchPublicUrl(url);
      const page = extractPageSummary(html);
      if (!page.title && !page.description && !page.text) { res.status(422).json({ error: "Rien d'exploitable trouvé sur cette page." }); return; }

      const todayIso = new Date().toISOString().slice(0, 10);
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Date du jour : ${todayIso}. Page source : ${finalUrl}\n\nTitre : ${page.title}\nDescription (meta) : ${page.description}\n\nContenu de la page :\n${page.text}` },
      ];
      const reply = await callOpenRouter({ apiKey, model: cfg.model, messages, source: 'admin', timeoutMs: 25000 });
      const extracted = parseJsonLoose(reply);
      if (!extracted) { res.status(502).json({ error: "L'IA n'a pas renvoyé un résultat exploitable. Réessaie, ou saisis l'événement à la main." }); return; }

      const date = typeof extracted.date === 'string' && DATE_RE.test(extracted.date) ? extracted.date : null;
      res.json({
        title: typeof extracted.title === 'string' ? extracted.title.slice(0, 200) : '',
        description: typeof extracted.description === 'string' ? extracted.description.slice(0, 2000) : '',
        location: typeof extracted.location === 'string' ? extracted.location.slice(0, 200) : '',
        link: typeof extracted.link === 'string' && /^https?:\/\//i.test(extracted.link) ? extracted.link.slice(0, 500) : finalUrl,
        date,
        sourceImage: page.image || null,
      });
    } catch (err) {
      const status = err.status && err.status < 500 ? err.status : 502;
      res.status(status).json({ error: status < 500 ? err.message : "Import impossible depuis ce lien pour le moment." });
    }
  });
}
