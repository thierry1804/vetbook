import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from './api';

type Me = { id: string; email: string; name: string; role: string; permissions: string[] };
type AuthState = { status: 'loading' | 'in' | 'out'; me: Me | null };
type AuthCtx = {
  me: Me | null;
  permissions: string[];
  status: AuthState['status'];
  login: (email: string, password: string, totp: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', me: null });

  const refresh = useCallback(async () => {
    const r = await api<Me>('/auth/me');
    setState({ status: 'in', me: r.json });
  }, []);

  useEffect(() => { refresh().catch(() => setState({ status: 'out', me: null })); }, [refresh]);

  const login = useCallback(async (email: string, password: string, totp: string) => {
    await api('/auth/login', { method: 'POST', body: { email, password, totp } });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST', body: {} }); } catch { /* déjà déconnecté */ }
    setState({ status: 'out', me: null });
  }, []);

  // 401 global : toute requête échouée avec ce statut repasse l'état en "déconnecté".
  useEffect(() => {
    const onUnauthorized = () => setState({ status: 'out', me: null });
    window.addEventListener('applika:unauthorized', onUnauthorized);
    return () => window.removeEventListener('applika:unauthorized', onUnauthorized);
  }, []);

  return <Ctx.Provider value={{ me: state.me, permissions: state.me?.permissions || [], status: state.status, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Déconnexion automatique sur 401 : voir AuthProvider ci-dessus + notifyUnauthorized appelé par le QueryClient.
export function notifyUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401) window.dispatchEvent(new Event('applika:unauthorized'));
}
