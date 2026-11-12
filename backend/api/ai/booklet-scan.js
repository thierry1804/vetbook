// POST /api/ai/booklet-scan (multipart : photo, petLocalId) — lecture d'une page du carnet de santé.
// Renvoie des propositions à vérifier ; rien n'est écrit en base (le front enregistre après validation)
// et la photo n'est ni stockée ni journalisée. Réservé aux formules qui incluent « booklet_scan ».
import multer from 'multer';
import { requireUser } from '../_lib/auth.js';
import { guardPaidFeature } from '../_lib/entitlements.js';
import { withClient } from '../_lib/db.js';
import { getAiConfig, resolveApiKey, callOpenRouter } from '../_lib/ai.js';
import { bookletPrompt, extractJson, normalizeBookletResult, estimateReminders } from '../_lib/booklet.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024;
const TOO_DENSE = 'La page est trop dense pour être lue d’un coup. Photographie-la en deux parties, bien à plat.';
const NOTHING_READ = 'Aucun acte lisible sur cette photo. Essaie avec plus de lumière, la page bien à plat.';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) { cb(ALLOWED.has(file.mimetype) ? null : new Error('TYPE'), ALLOWED.has(file.mimetype)); },
});
const runMulter = (req, res) => new Promise((resolve, reject) => upload.single('photo')(req, res, (err) => (err ? reject(err) : resolve())));

const sameName = (a, b) => String(a || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  === String(b || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const digits = (s) => String(s || '').replace(/\D/g, '');

export function makeBookletScan({ fetchImpl = fetch } = {}) {
  return async function bookletScan(req, res) {
    const session = await requireUser(req, res);
    if (!session) return;
    if (!(await guardPaidFeature(res, session.userId, 'booklet_scan', "La lecture du carnet n'est pas incluse dans votre formule."))) return;

    try { await runMulter(req, res); } catch (err) {
      if (err && err.code === 'LIMIT_FILE_SIZE') { res.status(413).json({ error: 'Photo trop lourde (8 Mo maximum).' }); return; }
      if (err && err.message === 'TYPE') { res.status(415).json({ error: 'Envoie une photo (JPEG, PNG ou WebP).' }); return; }
      res.status(400).json({ error: 'Envoi de la photo invalide.' }); return;
    }
    if (!req.file) { res.status(415).json({ error: 'Envoie une photo (JPEG, PNG ou WebP).' }); return; }

    const cfg = await getAiConfig();
    const apiKey = cfg.enabled ? resolveApiKey(cfg) : null;
    if (!apiKey) { res.status(503).json({ error: "La lecture du carnet n'est pas disponible pour le moment." }); return; }

    const petLocalId = Number.parseInt(req.body && req.body.petLocalId, 10);
    const pet = Number.isFinite(petLocalId) ? (await withClient((c) => c.query(
      'select name, species, chip from pets where user_id = $1 and local_id = $2', [session.userId, petLocalId]
    ))).rows[0] : null;
    if (!pet) { res.status(404).json({ error: 'Animal introuvable.' }); return; }

    let content;
    const meta = {};
    try {
      content = await callOpenRouter({
        apiKey, model: cfg.visionModel, fetchImpl, source: 'booklet', timeoutMs: 45000,
        temperature: 0, maxTokens: 4000, meta, responseFormat: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'text', text: bookletPrompt(pet.name, pet.species) },
          { type: 'image_url', image_url: { url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` } },
        ] }],
      });
    } catch (err) {
      console.error('ai/booklet-scan', err && err.message);
      res.status(502).json({ error: 'La lecture du carnet a échoué, réessaie dans un instant.' });
      return;
    }

    try {
      const out = await withClient(async (c) => {
        const hygieneTypes = (await c.query("select label from ref_lists where list_type = 'hygiene' and active")).rows.map((r) => r.label);
        const parsed = extractJson(content);
        if (!parsed && meta.finishReason === 'length') return { truncated: true };
        const read = normalizeBookletResult(parsed, { today: new Date().toISOString().slice(0, 10), hygieneTypes });
        return { ...read, entries: await estimateReminders(c, read.entries, pet.species) };
      });
      if (out.truncated) { res.status(422).json({ error: TOO_DENSE }); return; }
      if (!out.entries.length) { res.status(422).json({ error: NOTHING_READ }); return; }
      const mismatch = (!!out.petName && !sameName(out.petName, pet.name))
        || (!!digits(out.chip) && !!digits(pet.chip) && digits(out.chip) !== digits(pet.chip));
      res.status(200).set('Cache-Control', 'no-store').json({ petName: out.petName, chip: out.chip, mismatch, entries: out.entries });
    } catch (err) {
      console.error('ai/booklet-scan normalize', err);
      res.status(500).json({ error: 'La lecture du carnet a échoué.' });
    }
  };
}

export default makeBookletScan();
