import { HttpError } from 'react-admin';

export const API = '/api/admin';

// Appel de l'API du backoffice (cookie admin_session, jamais de jeton en JS). Les erreurs sont des HttpError :
// react-admin déconnecte automatiquement sur 401 (voir authProvider.checkError).
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<{ json: T; headers: Headers }> {
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    credentials: 'include',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* corps vide */ }
  if (!res.ok) throw new HttpError((json && json.error) || `Erreur ${res.status}`, res.status, json);
  return { json, headers: res.headers };
}

export const permits = (perms: string[] | undefined, needed?: string) => {
  if (!needed) return true;
  const [mod] = needed.split('.');
  return (perms || []).some((p) => p === '*' || p === needed || p === `${mod}.*`);
};
