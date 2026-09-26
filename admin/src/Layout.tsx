import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar, Layout, Menu, UserMenu, MenuItemLink, Logout, TitlePortal, ToggleThemeButton, usePermissions, useGetIdentity, useSidebarState,
} from 'react-admin';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Avatar, Box, Chip, Dialog, IconButton, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { NAV } from './nav';
import { ICONS } from './icons';
import { permits } from './api';

// ── Palette de commandes (Ctrl/⌘ + K) : accès direct à n'importe quel écran.
function CommandPalette({ open, onClose, perms }: { open: boolean; onClose: () => void; perms: string[] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState(''); const [idx, setIdx] = useState(0);
  const items = useMemo(() => [{ label: 'Tableau de bord', to: '/', icon: 'dashboard', group: 'Général' },
    ...NAV.flatMap((g) => g.items.filter((i) => permits(perms, i.perm)).map((i) => ({ ...i, group: g.title }))),
    { label: 'Mon profil et mot de passe', to: '/profile', icon: 'admins', group: 'Compte' }], [perms]);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = items.filter((i) => norm(i.label + ' ' + i.group).includes(norm(q))).slice(0, 12);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { if (open) setQ(''); }, [open]);
  const go = (to: string) => { onClose(); navigate(to); };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { position: 'fixed', top: '12vh', m: 0, borderRadius: 3 } }}>
      <TextField autoFocus fullWidth placeholder="Aller à… (utilisateurs, conseils, formules)" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, shown.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
          if (e.key === 'Enter' && shown[idx]) go(shown[idx].to);
        }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, sx: { '& fieldset': { border: 0 }, fontSize: 17, py: .5 } }} />
      <List dense sx={{ borderTop: 1, borderColor: 'divider', maxHeight: 400, overflow: 'auto' }}>
        {shown.map((i, n) => {
          const Icon = ICONS[i.icon] || DashboardIcon;
          return (
            <ListItemButton key={i.to} selected={n === idx} onClick={() => go(i.to)} onMouseEnter={() => setIdx(n)}>
              <ListItemIcon sx={{ minWidth: 38 }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={i.label} />
              <Chip size="small" variant="outlined" label={i.group} />
            </ListItemButton>);
        })}
        {!shown.length ? <Typography sx={{ p: 2 }} color="text.secondary">Aucun résultat.</Typography> : null}
      </List>
    </Dialog>
  );
}

const MyUserMenu = () => {
  const { data } = useGetIdentity();
  const initials = String((data as any)?.fullName || '?').split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <UserMenu icon={<Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>{initials}</Avatar>}>
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle2">{(data as any)?.fullName}</Typography>
        <Typography variant="caption" color="text.secondary">{(data as any)?.email}</Typography>
      </Box>
      <MenuItemLink to="/profile" primaryText="Mon profil et mot de passe" leftIcon={<PersonIcon />} />
      <Logout />
    </UserMenu>
  );
};

const OPEN_PALETTE = 'applika:open-palette';
const MyAppBar = () => (
  <AppBar userMenu={<MyUserMenu />} toolbar={<>
    <Tooltip title="Aller à… (Ctrl+K)"><IconButton onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))} aria-label="Rechercher un écran"><SearchIcon /></IconButton></Tooltip>
    <ToggleThemeButton />
  </>}>
    <TitlePortal />
  </AppBar>
);

// ── Menu latéral : groupes titrés, entrées filtrées par permission, groupes vides masqués.
const MyMenu = () => {
  const { permissions } = usePermissions();
  const loc = useLocation();
  const [open] = useSidebarState();
  const active = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));
  return (
    <Menu>
      <MenuItemLink to="/" primaryText="Tableau de bord" leftIcon={<DashboardIcon />} selected={loc.pathname === '/'} />
      {NAV.map((g) => {
        const items = g.items.filter((i) => permits(permissions, i.perm));
        if (!items.length) return null;
        return (
          <Box key={g.title} sx={{ mt: 1.5 }}>
            {open ? <Typography variant="overline" sx={{ px: 2, opacity: .6, letterSpacing: '.08em' }}>{g.title}</Typography> : <Box sx={{ borderTop: 1, borderColor: 'divider', mx: 1, my: 1 }} />}
            {items.map((i) => { const Icon = ICONS[i.icon] || DashboardIcon; return <MenuItemLink key={i.to} to={i.to} primaryText={i.label} leftIcon={<Icon />} selected={active(i.to)} />; })}
          </Box>);
      })}
    </Menu>
  );
};

export const AppLayout = (props: any) => {
  const { permissions } = usePermissions();
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); } };
    const open = () => setPalette(true);
    window.addEventListener('keydown', h); window.addEventListener(OPEN_PALETTE, open);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener(OPEN_PALETTE, open); };
  }, []);
  return (
    <>
      <Layout {...props} appBar={MyAppBar} menu={MyMenu} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} perms={permissions || []} />
    </>
  );
};
