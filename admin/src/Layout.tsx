import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Modal, Input, Tooltip, Typography } from 'antd';
import { SearchOutlined, UserOutlined, LogoutOutlined, BulbOutlined, MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { NAV } from './nav';
import { ICONS } from './icons';
import { api, permits } from './api';
import { useAuth } from './auth';
import { useThemeMode } from './themeMode';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;
const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED = 60;
const OPEN_PALETTE = 'applika:open-palette';

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
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); } };
    const open = () => setPalette(true);
    window.addEventListener('keydown', h); window.addEventListener(OPEN_PALETTE, open);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener(OPEN_PALETTE, open); };
  }, []);

  const active = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));
  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tableau de bord' },
    ...NAV.map((g) => {
      const items = g.items.filter((i) => permits(permissions, i.perm));
      if (!items.length) return null;
      return { key: g.title, type: 'group' as const, label: g.title, children: items.map((i) => { const Icon = ICONS[i.icon] || DashboardOutlined; return { key: i.to, icon: <Icon />, label: i.label }; }) };
    }).filter(Boolean),
  ];
  const selectedKey = [...NAV.flatMap((g) => g.items.map((i) => i.to)), '/'].filter((to) => active(to)).sort((a, b) => b.length - a.length)[0] || '/';

  const initials = String(me?.name || me?.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={SIDEBAR_WIDTH} collapsedWidth={SIDEBAR_COLLAPSED} collapsed={collapsed} trigger={null}
        style={{ borderRight: '1px solid var(--ant-color-border)', overflow: 'auto', height: '100vh', position: 'sticky', top: 0 }}>
        <Brand open={!collapsed} />
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems as any} onClick={({ key }) => navigate(key)} style={{ borderRight: 0 }} />
      </Sider>
      <Layout>
        <Header style={{ background: 'var(--ant-color-bg-container)', borderBottom: '1px solid var(--ant-color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56 }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((c) => !c)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip title="Aller à… (Ctrl+K)"><Button type="text" icon={<SearchOutlined />} onClick={() => setPalette(true)} aria-label="Rechercher un écran" /></Tooltip>
            <Tooltip title="Thème"><Button type="text" icon={<BulbOutlined />} onClick={toggle} aria-label="Changer de thème" /></Tooltip>
            <Dropdown placement="bottomRight" menu={{
              items: [
                { key: 'who', label: <div style={{ padding: '2px 4px' }}><div style={{ fontWeight: 650, fontSize: 13 }}>{me?.name}</div><Text type="secondary" style={{ fontSize: 12 }}>{me?.email}</Text></div>, disabled: true },
                { type: 'divider' },
                { key: 'profile', icon: <UserOutlined />, label: 'Mon profil et mot de passe', onClick: () => navigate('/profile') },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Se déconnecter', onClick: () => logout() },
              ],
            }}>
              <Avatar size={30} style={{ background: 'var(--ant-color-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{initials}</Avatar>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ minHeight: 0 }}>
          <Outlet />
        </Content>
      </Layout>
      <CommandPalette open={palette} onClose={() => setPalette(false)} perms={permissions} />
    </Layout>
  );
};
export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE));
