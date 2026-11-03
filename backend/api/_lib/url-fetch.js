// Récupération d'une URL fournie par un admin (import d'événement depuis un lien externe) — jamais
// appelé avec une URL venant d'un utilisateur final. Protection SSRF : seuls http/https sont acceptés,
// chaque IP résolue (y compris après redirection) est vérifiée contre les plages privées/locales avant
// connexion, la taille de la réponse est plafonnée et les redirections sont suivies manuellement.
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

function isPrivateIp(ip) {
  const kind = net.isIP(ip);
  if (kind === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local, inclut le métadata cloud 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (kind === 6) {
    const low = ip.toLowerCase();
    if (low === '::1') return true;
    if (low.startsWith('fc') || low.startsWith('fd')) return true; // fc00::/7 (unique-local)
    if (low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')) return true; // fe80::/10
    if (low.startsWith('::ffff:')) return isPrivateIp(low.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // pas une IP résolue proprement : on refuse par prudence
}

async function assertPublicHost(hostname) {
  let addresses;
  try { addresses = await dns.lookup(hostname, { all: true }); }
  catch { throw Object.assign(new Error('Nom de domaine introuvable.'), { status: 400 }); }
  if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
    throw Object.assign(new Error('Cette adresse n’est pas accessible.'), { status: 400 });
  }
}

export async function fetchPublicUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { throw Object.assign(new Error('URL invalide.'), { status: 400 }); }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw Object.assign(new Error('Seuls les liens http(s) sont acceptés.'), { status: 400 });
    }
    await assertPublicHost(url.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': "AppLikaBackoffice/1.0 (+https://vetbook.boss-etech.net)", Accept: 'text/html,application/xhtml+xml' },
      });
    } finally { clearTimeout(timer); }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), url);
      continue;
    }
    if (!res.ok) throw Object.assign(new Error(`Le lien a répondu avec une erreur (${res.status}).`), { status: 400 });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('html')) throw Object.assign(new Error('Ce lien ne pointe pas vers une page web.'), { status: 400 });
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { reader.cancel().catch(() => {}); break; }
      chunks.push(value);
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    return { finalUrl: url.toString(), html };
  }
  throw Object.assign(new Error('Trop de redirections.'), { status: 400 });
}

function metaContent(html, attr, key) {
  const m = html.match(new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, 'i'));
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Résumé d'une page pour extraction IA : balises Open Graph (fiables, structurées) + texte visible tronqué.
export function extractPageSummary(html) {
  const titleTag = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  const ogTitle = metaContent(html, 'property', 'og:title');
  const ogDescription = metaContent(html, 'property', 'og:description');
  const ogImage = metaContent(html, 'property', 'og:image');
  const text = stripHtml(html).slice(0, 6000);
  return { title: ogTitle || titleTag.trim(), description: ogDescription, image: ogImage, text };
}
