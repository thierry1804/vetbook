import type { AuthProvider } from 'react-admin';
import { api } from './api';

type Me = { id: string; email: string; name: string; role: string; permissions: string[] };
let me: Me | null = null;

export const authProvider: AuthProvider = {
  // Connexion : e-mail + mot de passe + code TOTP (2FA obligatoire, session de 8 h).
  login: async ({ username, password, totp }: any) => {
    me = null;
    await api('/auth/login', { method: 'POST', body: { email: username, password, totp } });
  },
  logout: async () => {
    try { await api('/auth/logout', { method: 'POST', body: {} }); } catch { /* déjà déconnecté */ }
    me = null;
  },
  checkAuth: async () => {
    if (me) return;
    me = (await api<Me>('/auth/me')).json;
  },
  checkError: async (error: any) => {
    if (error && error.status === 401) { me = null; throw new Error('Session expirée'); }
  },
  getIdentity: async () => {
    if (!me) me = (await api<Me>('/auth/me')).json;
    return { id: me.id, fullName: me.name || me.email, email: me.email, role: me.role } as any;
  },
  getPermissions: async () => {
    // Sans session, aucune permission (la redirection vers /login est faite par checkAuth).
    try { if (!me) me = (await api<Me>('/auth/me')).json; } catch { return []; }
    return me.permissions;
  },
};
