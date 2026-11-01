import { RES } from './resources';

export type NavItem = { label: string; to: string; icon: string; perm: string };
export type NavGroup = { title: string; items: NavItem[] };

// Un hub = plusieurs écrans liés regroupés sous une seule entrée de menu, affichés en onglets (Hub.tsx).
// « tabs » liste les chemins (resource name, ou route dédiée) dans l'ordre d'affichage.
export type HubDef = { key: string; title: string; subtitle: string; tabs: { key: string; label: string }[] };

export const HUBS: HubDef[] = [
  {
    key: 'referentiels', title: 'Référentiels', subtitle: 'Les listes de référence utilisées dans toute l\'application (espèces, races, vaccins…).',
    tabs: [
      { key: 'species', label: 'Espèces' }, { key: 'breeds', label: 'Races' }, { key: 'vaccines', label: 'Vaccins' },
      { key: 'antiparasitics', label: 'Antiparasitaires' }, { key: 'registries', label: 'Registres' },
      { key: 'lists', label: 'Listes' }, { key: 'checkup', label: 'Check-up' },
    ],
  },
  {
    key: 'offres', title: 'Offres', subtitle: 'Le catalogue : ce qui est vendu et ce que chaque formule inclut. Pour qui a quoi, voir Abonnements.',
    tabs: [
      { key: 'plans', label: 'Formules' }, { key: 'plan-matrix', label: 'Matrice des droits' },
      { key: 'features', label: 'Fonctionnalités' }, { key: 'coupons', label: 'Coupons' },
    ],
  },
  {
    key: 'facturation', title: 'Facturation', subtitle: 'Paiements reçus et factures émises.',
    tabs: [{ key: 'payments', label: 'Paiements' }, { key: 'invoices', label: 'Factures' }],
  },
];

const hubPerm = (key: string) => RES.find((r) => r.name === key)?.perm || 'billing.read';

// Navigation unique (menu latéral + palette de commandes) : les entrées sont filtrées par permission.
// Les groupes Référentiels/Offres/Facturation n'apparaissent plus en rafale d'entrées : un hub = une seule
// entrée, le détail se choisit par onglet une fois dedans (HUBS ci-dessus).
export const NAV: NavGroup[] = [
  { title: 'Activité', items: [
    { label: 'Utilisateurs', to: '/users', icon: 'users', perm: 'users.read' },
    { label: 'Support', to: '/support-requests', icon: 'users', perm: 'users.support' },
    { label: 'Journal d\'audit', to: '/audit', icon: 'audit', perm: 'audit.read' },
  ] },
  ...['Contenus', 'Annuaire'].map((g) => ({
    title: g, items: RES.filter((r) => r.group === g).map((r) => ({ label: r.label, to: '/' + r.name, icon: r.name, perm: r.perm })),
  })),
  { title: 'Référentiels', items: [{ label: 'Référentiels', to: '/species', icon: 'species', perm: hubPerm('species') }] },
  { title: 'Publication', items: [{ label: 'Versions publiées', to: '/releases', icon: 'releases', perm: 'referentiels.read' }] },
  { title: 'Offres', items: [{ label: 'Offres', to: '/plans', icon: 'matrix', perm: hubPerm('plans') }] },
  { title: 'Abonnements', items: [
    { label: 'Demandes', to: '/subscription-requests', icon: 'subscriptions', perm: 'subscriptions.read' },
    ...RES.filter((r) => r.name === 'subscriptions' || r.name === 'overrides').map((r) => ({ label: r.label, to: '/' + r.name, icon: r.name, perm: r.perm })),
  ] },
  { title: 'Facturation', items: [{ label: 'Facturation', to: '/payments', icon: 'invoices', perm: hubPerm('payments') }] },
  { title: 'Système', items: [
    { label: 'Réglages', to: '/app-settings', icon: 'settings', perm: 'system.read' },
    ...RES.filter((r) => r.group === 'Système').map((r) => ({ label: r.label, to: '/' + r.name, icon: r.name, perm: r.perm })),
    { label: 'Assistant IA', to: '/ai-settings', icon: 'ai', perm: 'system.write' },
  ] },
  { title: 'Administration', items: [{ label: 'Administrateurs', to: '/admins', icon: 'admins', perm: 'admins.manage' }] },
];
