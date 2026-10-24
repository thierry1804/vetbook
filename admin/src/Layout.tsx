import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar, Layout, Menu, UserMenu, MenuItemLink, Logout, TitlePortal, ToggleThemeButton, usePermissions, useGetIdentity, useSidebarState,
} from 'react-admin';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Avatar, Box, Dialog, IconButton, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { NAV } from './nav';
import { ICONS } from './icons';
import { permits } from './api';

const SIDEBAR_WIDTH = 256;
const SIDEBAR_CLOSED_WIDTH = 60;

// ── Marque, en tête du menu latéral : un repère de marque minimal, pas de bandeau décoratif.
function Brand({ open }: { open: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: open ? 2 : 0, pt: 2, pb: 1.5, justifyContent: open ? 'flex-start' : 'center' }}>
      <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flex: 'none' }}>A</Box>
      {open ? <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.15 }}>App'lika</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Backoffice</Typography>
      </Box> : null}
    </Box>
  );
}

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { position: 'fixed', top: '12vh', m: 0, borderRadius: '14px', overflow: 'hidden' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1.25 }} />
        <TextField autoFocus fullWidth variant="standard" placeholder="Aller à… (utilisateurs, conseils, formules)" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, shown.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && shown[idx]) go(shown[idx].to);
          }}
          InputProps={{ disableUnderline: true, sx: { fontSize: '0.9375rem', py: 1.5 } }} />
      </Box>
      <List dense disablePadding sx={{ maxHeight: 400, overflow: 'auto', py: .5 }}>
        {shown.map((i, n) => {
          const Icon = ICONS[i.icon] || DashboardIcon;
          return (
            <ListItemButton key={i.to} selected={n === idx} onClick={() => go(i.to)} onMouseEnter={() => setIdx(n)} sx={{ mx: .75, borderRadius: '6px', py: .625 }}>
              <ListItemIcon sx={{ minWidth: 34 }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={i.label} primaryTypographyProps={{ fontSize: '0.875rem' }} />
              <Typography variant="caption" color="text.secondary">{i.group}</Typography>
            </ListItemButton>);
        })}
        {!shown.length ? <Typography sx={{ p: 2 }} color="text.secondary" variant="body2">Aucun résultat.</Typography> : null}
      </List>
    </Dialog>
  );
}

const MyUserMenu = () => {
  const { data } = useGetIdentity();
  const initials = String((data as any)?.fullName || '?').split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <UserMenu icon={<Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 12.5, fontWeight: 700 }}>{initials}</Avatar>}>
      <Box sx={{ px: 2, py: 1.25 }}>
        <Typography variant="subtitle2">{(data as any)?.fullName}</Typography>
        <Typography variant="caption" color="text.secondary">{(data as any)?.email}</Typography>
      </Box>
      <MenuItemLink to="/profile" primaryText="Mon profil et mot de passe" leftIcon={<PersonIcon fontSize="small" />} />
      <Logout />
    </UserMenu>
  );
};

const OPEN_PALETTE = 'applika:open-palette';
const MyAppBar = () => (
  <AppBar userMenu={<MyUserMenu />} toolbar={<>
    <Tooltip title="Aller à… (Ctrl+K)">
      <IconButton onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))} aria-label="Rechercher un écran" size="small" sx={{ mr: .5 }}><SearchIcon fontSize="small" /></IconButton>
    </Tooltip>
    <ToggleThemeButton />
  </>}>
    <TitlePortal />
  </AppBar>
);

// ── Menu latéral : marque, groupes titrés, entrées filtrées par permission, groupes vides masqués.
const MyMenu = () => {
  const { permissions } = usePermissions();
  const loc = useLocation();
  const [open] = useSidebarState();
  const active = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));
  return (
    <Menu>
      <Brand open={open} />
      <MenuItemLink to="/" primaryText="Tableau de bord" leftIcon={<DashboardIcon fontSize="small" />} selected={loc.pathname === '/'} />
      {NAV.map((g) => {
        const items = g.items.filter((i) => permits(permissions, i.perm));
        if (!items.length) return null;
        return (
          <Box key={g.title} sx={{ mt: 1.25 }}>
            {open
              ? <Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2, pt: 1, pb: .25 }}>{g.title}</Typography>
              : <Box sx={{ borderTop: 1, borderColor: 'divider', mx: 1.5, my: 1 }} />}
            {items.map((i) => { const Icon = ICONS[i.icon] || DashboardIcon; return <MenuItemLink key={i.to} to={i.to} primaryText={i.label} leftIcon={<Icon fontSize="small" />} selected={active(i.to)} />; })}
          </Box>);
      })}
    </Menu>
  );
};

// Barre de défilement du menu, dessinée par l'application : la barre native ne se peint pas de façon fiable sur
// cet élément imbriqué (position fixed sous plusieurs Paper/Drawer de MUI) malgré un défilement pleinement
// fonctionnel au clavier et à la molette. Celle-ci est un élément normal, donc toujours peinte, et cliquable.
function SidebarScrollTrack() {
  const [open] = useSidebarState();
  const [metrics, setMetrics] = useState<{ top: number; height: number; thumbH: number; thumbTop: number } | null>(null);
  const elRef = React.useRef<HTMLElement | null>(null);
  const dragRef = React.useRef<{ startY: number; startTop: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = elRef.current;
      if (!el || el.scrollHeight <= el.clientHeight + 1) { setMetrics(null); return; }
      const rect = el.getBoundingClientRect();
      const thumbH = Math.max(32, (el.clientHeight / el.scrollHeight) * rect.height);
      const maxScroll = el.scrollHeight - el.clientHeight;
      const thumbTop = maxScroll > 0 ? (el.scrollTop / maxScroll) * (rect.height - thumbH) : 0;
      setMetrics({ top: rect.top, height: rect.height, thumbH, thumbTop });
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    let attached: HTMLElement | null = null;
    const attach = () => {
      const el = document.querySelector('.RaSidebar-fixed') as HTMLElement | null;
      if (el && el !== attached) {
        if (attached) attached.removeEventListener('scroll', onScroll);
        attached = el; elRef.current = el;
        el.addEventListener('scroll', onScroll, { passive: true });
        update();
      } else if (el) update();
    };
    attach();
    const mo = new MutationObserver(attach);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', update);
    const poll = window.setInterval(update, 800);
    return () => {
      mo.disconnect(); cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.clearInterval(poll);
      if (attached) attached.removeEventListener('scroll', onScroll);
    };
  }, []);

  const onThumbDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startTop: metrics?.thumbTop || 0 };
    const onMove = (ev: MouseEvent) => {
      const el = elRef.current; if (!el || !dragRef.current || !metrics) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const trackH = metrics.height - metrics.thumbH;
      const dy = ev.clientY - dragRef.current.startY;
      const nextTop = Math.min(Math.max(dragRef.current.startTop + dy, 0), trackH);
      el.scrollTop = trackH > 0 ? (nextTop / trackH) * maxScroll : 0;
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  if (!metrics) return null;
  const left = (open ? SIDEBAR_WIDTH : SIDEBAR_CLOSED_WIDTH) - 8;
  return (
    <Box aria-hidden sx={{ position: 'fixed', left, top: metrics.top, width: 6, height: metrics.height, zIndex: (t) => t.zIndex.drawer + 1, pointerEvents: 'none' }}>
      <Box onMouseDown={onThumbDown}
        sx={{ position: 'absolute', left: 0, width: 6, top: metrics.thumbTop, height: metrics.thumbH, borderRadius: 3,
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.18)'),
          pointerEvents: 'auto', cursor: 'grab',
          '&:hover': { bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.32)') } }} />
    </Box>
  );
}

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
      <SidebarScrollTrack />
      <CommandPalette open={palette} onClose={() => setPalette(false)} perms={permissions || []} />
    </>
  );
};
