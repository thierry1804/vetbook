// Chiffrement au repos des secrets stockés en base (ex. clé API OpenRouter) — AES-256-GCM, clé dérivée
// de JWT_SECRET (déjà obligatoire, pas de nouvelle variable d'environnement). Jamais de secret en clair en base.
import crypto from 'node:crypto';

let cachedKey = null;
function deriveKey() {
  if (cachedKey) return cachedKey;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant.');
  cachedKey = crypto.scryptSync(secret, 'applika-secrets-v1', 32);
  return cachedKey;
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(ciphertext) {
  const buf = Buffer.from(String(ciphertext), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
