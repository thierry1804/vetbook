import { RES } from './resources';

export type NavItem = { label: string; to: string; icon: string; perm: string };
export type NavGroup = { title: string; items: NavItem[] };

// Navigation unique (menu latéral + palette de commandes) : les entrées sont filtrées par permission.
export const NAV: NavGroup[] = [
  { title: 'Activité', items: [
    { label: 'Utilisateurs', to: '/users', icon: 'users', perm: 'users.read' },
    { label: 'Journal d\'audit', to: '/audit', icon: 'audit', perm: 'audit.read' },
  ] },
  ...['Contenus', 'Annuaire', 'Référentiels'].map((g) => ({
    title: g, items: RES.filter((r) => r.group === g).map((r) => ({ label: r.label, to: '/' + r.name, icon: r.name, perm: r.perm })),
  })),
  { title: 'Publication', items: [{ label: 'Versions publiées', to: '/releases', icon: 'releases', perm: 'referentiels.read' }] },
  { title: 'Abonnements', items: [
    { label: 'Matrice des droits', to: '/plan-matrix', icon: 'matrix', perm: 'billing.read' },
    ...RES.filter((r) => r.group === 'Abonnements').map((r) => ({ label: r.label, to: '/' + r.name, icon: r.name, perm: r.perm })),
  ] },
  { title: 'Système', items: RES.filter((r) => r.group === 'Système').map((r) => ({ label: r.label, to: '/' + r.name, icon: r.name, perm: r.perm })) },
  { title: 'Administration', items: [{ label: 'Administrateurs', to: '/admins', icon: 'admins', perm: 'admins.manage' }] },
];
