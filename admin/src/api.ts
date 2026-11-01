export const API = '/api/admin';

// `crypto.randomUUID` n'existe que dans un contexte sécurisé (HTTPS, ou localhost strict) — un accès
// direct en HTTP (interne, debug, avant un proxy qui termine le TLS) le fait planter toute la page avec
// « crypto.randomUUID is not a function ». Repli RFC 4122 v4 sans dépendance.
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Appel de l'API du backoffice (cookie admin_session, jamais de jeton en JS).
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<{ json: T; headers: Headers }> {
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    credentials: 'include',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* corps vide */ }
  if (!res.ok) throw new ApiError((json && json.error) || `Erreur ${res.status}`, res.status, json);
  return { json, headers: res.headers };
}

export const permits = (perms: string[] | undefined, needed?: string) => {
  if (!needed) return true;
  const [mod] = needed.split('.');
  return (perms || []).some((p) => p === '*' || p === needed || p === `${mod}.*`);
};
