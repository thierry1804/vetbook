import { Notifications } from './Notifications';
import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Modal, Input, Tooltip, Typography } from 'antd';
import { SearchOutlined, UserOutlined, LogoutOutlined, BulbOutlined, MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { NAV, HUBS } from './nav';
import { ICONS } from './icons';
import { api, permits } from './api';
import { useAuth } from './auth';
import { useThemeMode } from './themeMode';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;
const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED = 60;
const OPEN_PALETTE = 'applika:open-palette';

// Pastille fixe dans la barre du haut : remplace le bandeau par page (qui n'apparaissait que sur certains
// écrans et décalait le titre vers le bas). Un seul indicateur, partout, jamais de saut de mise en page.
function ReleasePill() {
  const navigate = useNavigate();
  const [st, setSt] = useState<any>(null);
  useEffect(() => {
    const load = () => api('/release-status').then((r) => setSt(r.json)).catch(() => undefined);
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  if (!st || !st.pending) return null;
  const n = Object.values(st.changed || {}).filter(Boolean).length;
  return (
    <Tooltip title={st.draft_version ? `Brouillon v${st.draft_version} — ${n} section(s) modifiée(s), pas encore publiées` : `${n} section(s) modifiée(s), pas encore publiées`}>
      <Button className="release-indicator" size="small" onClick={() => navigate('/releases')}
        style={{ background: 'var(--ant-color-warning-bg)', borderColor: 'var(--ant-color-warning-border)', color: 'var(--ant-color-warning-text)', fontWeight: 600 }}>
        {st.draft_version ? `Brouillon v${st.draft_version}` : `${n} modification(s)`} · Publier
      </Button>
    </Tooltip>
  );
}

function Brand({ open }: { open: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: open ? '16px 16px 12px' : '16px 0 12px', justifyContent: open ? 'flex-start' : 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--ant-color-primary)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flex: 'none' }}>A</div>
      {open ? (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.15 }}>App'lika</div>
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>Backoffice</Text>
        </div>
      ) : null}
    </div>
  );
}

// ── Palette de commandes (Ctrl/⌘ + K) : accès direct à n'importe quel écran.
// Résultats directs (enregistrements, pas juste des écrans) pour les ressources où on cherche
// le plus souvent une fiche précise plutôt qu'une liste — email d'utilisateur, nom de clinique, titre de conseil.
const RECORD_SEARCHES: { resource: string; base: string; perm: string; group: string; icon: string; label: (r: any) => string }[] = [
  { resource: 'users', base: '/users', perm: 'users.read', group: 'Utilisateurs', icon: 'users', label: (r) => `${r.name || r.email} — ${r.email}` },
  { resource: 'clinics', base: '/r/clinics', perm: 'directory.read', group: 'Cliniques', icon: 'clinics', label: (r) => [r.name, r.city].filter(Boolean).join(' — ') },
  { resource: 'tips', base: '/r/tips', perm: 'contents.read', group: 'Conseils', icon: 'tips', label: (r) => r.title },
];

function CommandPalette({ open, onClose, perms }: { open: boolean; onClose: () => void; perms: string[] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState(''); const [idx, setIdx] = useState(0);
  const [records, setRecords] = useState<{ label: string; to: string; icon: string; group: string }[]>([]);
  const items = useMemo(() => [{ label: 'Tableau de bord', to: '/', icon: 'dashboard', group: 'Général' },
    ...NAV.flatMap((g) => g.items.filter((i) => permits(perms, i.perm)).map((i) => ({ ...i, group: g.title }))),
    // Le menu replie chaque hub (Référentiels/Offres/Facturation) en une seule entrée ; la recherche doit
    // quand même trouver directement « Races », « Coupons »… sans passer par le hub.
    ...HUBS.flatMap((h) => {
      const hubNav = NAV.find((g) => g.title === h.title)?.items[0];
      if (!hubNav || !permits(perms, hubNav.perm)) return [];
      return h.tabs.map((t) => ({ label: t.label, to: '/' + t.key, icon: t.key, group: h.title, perm: hubNav.perm }));
    }),
    { label: 'Mon profil et mot de passe', to: '/profile', icon: 'admins', group: 'Compte' },
    ...([
      { label: 'Nouveau conseil', to: '/tips/create', icon: 'tips', perm: 'contents.write' },
      { label: 'Nouvelle clinique', to: '/clinics/create', icon: 'clinics', perm: 'directory.write' },
      { label: 'Nouvel administrateur', to: '/admins/create', icon: 'admins', perm: 'admins.manage' },
    ].filter((a) => permits(perms, a.perm)).map((a) => ({ ...a, group: 'Actions rapides' }))),
  ], [perms]);
  const normQ = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const navMatches = items.filter((i) => normQ(i.label + ' ' + i.group).includes(normQ(q))).slice(0, 8);
  const shown = [...records, ...navMatches].slice(0, 12);
  useEffect(() => { setIdx(0); }, [q, records]);
  useEffect(() => { if (open) { setQ(''); setRecords([]); } }, [open]);
  // Recherche d'enregistrements : débattue (300 ms), à partir de 2 caractères, pour ne pas appeler l'API à chaque frappe.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setRecords([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      Promise.all(RECORD_SEARCHES.filter((s) => permits(perms, s.perm)).map((s) =>
        api<any[]>(`${s.base}?range=${encodeURIComponent(JSON.stringify([0, 3]))}&sort=${encodeURIComponent(JSON.stringify(['id', 'DESC']))}&filter=${encodeURIComponent(JSON.stringify({ q: query }))}`)
          .then((r) => r.json.map((row: any) => ({ label: s.label(row), to: `${s.resource === 'users' ? '/users' : '/' + s.resource}/${row.id}`, icon: s.icon, group: s.group })))
          .catch(() => []),
      )).then((groups) => { if (!cancelled) setRecords(groups.flat()); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, perms]);
  const go = (to: string) => { onClose(); navigate(to); };
  return (
    <Modal open={open} onCancel={onClose} footer={null} closable={false} width={520} styles={{ body: { padding: 0 } }} style={{ top: '12vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px', borderBottom: '1px solid var(--ant-color-border)' }}>
        <SearchOutlined style={{ color: 'var(--ant-color-text-secondary)', marginRight: 10 }} />
        <Input autoFocus variant="borderless" placeholder="Aller à… ou rechercher un utilisateur, une clinique, un conseil" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, shown.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && shown[idx]) go(shown[idx].to);
          }}
          style={{ fontSize: 15, padding: '12px 0' }} />
      </div>
      <div style={{ maxHeight: 400, overflow: 'auto', padding: '4px 0' }}>
        {shown.map((i, n) => {
          const Icon = ICONS[i.icon] || DashboardOutlined;
          return (
            <div key={i.to} onClick={() => go(i.to)} onMouseEnter={() => setIdx(n)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 6px', padding: '7px 10px', borderRadius: 6, cursor: 'pointer', background: n === idx ? 'var(--ant-color-primary-bg)' : 'transparent' }}>
              <Icon style={{ fontSize: 14, width: 20 }} />
              <span style={{ fontSize: 14, flex: 1 }}>{i.label}</span>
              <Text type="secondary" style={{ fontSize: 12 }}>{i.group}</Text>
            </div>);
        })}
        {!shown.length ? <Text type="secondary" style={{ display: 'block', padding: 16, fontSize: 13 }}>Aucun résultat.</Text> : null}
      </div>
    </Modal>
  );
}

export const AppLayout = () => {
  const { me, permissions, logout } = useAuth();
  const { mode, toggle } = useThemeMode();
  const navigate = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); } };
    const open = () => setPalette(true);
    window.addEventListener('keydown', h); window.addEventListener(OPEN_PALETTE, open);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener(OPEN_PALETTE, open); };
  }, []);

  const active = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));
  // « Système » (réglages, tâches planifiées…) consulté rarement — replié par défaut pour alléger le menu,
  // mais s'ouvre tout seul si on arrive directement sur une de ses pages (lien direct, retour en arrière).
  const COLLAPSIBLE = new Set(['Système']);
  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tableau de bord' },
    ...NAV.map((g) => {
      const items = g.items.filter((i) => permits(permissions, i.perm));
      if (!items.length) return null;
      const children = items.map((i) => { const Icon = ICONS[i.icon] || DashboardOutlined; return { key: i.to, icon: <Icon />, label: i.label }; });
      return COLLAPSIBLE.has(g.title)
        ? { key: g.title, icon: <SettingOutlined />, label: g.title, children }
        : { key: g.title, type: 'group' as const, label: g.title, children };
    }).filter(Boolean),
  ];
  const defaultOpenKeys = NAV.filter((g) => COLLAPSIBLE.has(g.title) && g.items.some((i) => active(i.to))).map((g) => g.title);
  // Un onglet de hub (ex. /breeds) doit surligner l'entrée de menu du hub (ex. « Référentiels », key /species),
  // pas rester sans sélection : on retombe sur l'entrée NAV dont un des onglets du hub correspondant matche.
  const hubEntryFor = (pathname: string) => {
    const hub = HUBS.find((h) => h.tabs.some((t) => pathname === '/' + t.key || pathname.startsWith('/' + t.key + '/')));
    return hub ? NAV.find((g) => g.title === hub.title)?.items[0]?.to : undefined;
  };
  const selectedKey = hubEntryFor(loc.pathname) || [...NAV.flatMap((g) => g.items.map((i) => i.to)), '/'].filter((to) => active(to)).sort((a, b) => b.length - a.length)[0] || '/';

  const initials = String(me?.name || me?.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" onBreakpoint={(broken) => setCollapsed(broken)} width={SIDEBAR_WIDTH} collapsedWidth={SIDEBAR_COLLAPSED} collapsed={collapsed} trigger={null}
        style={{ borderRight: '1px solid var(--ant-color-border)', overflow: 'auto', height: '100vh', position: 'sticky', top: 0 }}>
        <Brand open={!collapsed} />
        <Menu mode="inline" selectedKeys={[selectedKey]} defaultOpenKeys={defaultOpenKeys} items={menuItems as any} onClick={({ key }) => navigate(key)} style={{ borderRight: 0 }} />
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header style={{ background: 'var(--ant-color-bg-container)', borderBottom: '1px solid var(--ant-color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56 }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ReleasePill />
            <Notifications />
            <Tooltip title="Aller à… ou rechercher (Ctrl+K)"><Button type="text" icon={<SearchOutlined />} onClick={() => setPalette(true)} aria-label="Ouvrir la recherche" /></Tooltip>
            <Tooltip title="Thème clair/sombre"><Button type="text" icon={<BulbOutlined />} onClick={toggle} aria-label="Changer de thème (clair/sombre)" /></Tooltip>
            <Dropdown placement="bottomRight" menu={{
              items: [
                { key: 'who', label: <div style={{ padding: '2px 4px' }}><div style={{ fontWeight: 650, fontSize: 13 }}>{me?.name}</div><Text type="secondary" style={{ fontSize: 12 }}>{me?.email}</Text></div>, disabled: true },
                { type: 'divider' },
                { key: 'profile', icon: <UserOutlined />, label: 'Mon profil et mot de passe', onClick: () => navigate('/profile') },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Se déconnecter', onClick: () => logout() },
              ],
            }}>
              <span role="button" tabIndex={0} aria-label={`Menu du compte, ${me?.name || me?.email || ''}`}>
                <Avatar size={30} style={{ background: 'var(--ant-color-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{initials}</Avatar>
              </span>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content" style={{ minHeight: 0, minWidth: 0, width: '100%' }}>
          <Outlet />
        </Content>
      </Layout>
      <CommandPalette open={palette} onClose={() => setPalette(false)} perms={permissions} />
    </Layout>
  );
};
export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE));
