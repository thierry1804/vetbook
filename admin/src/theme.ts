import { createTheme, ThemeOptions } from '@mui/material/styles';
import { defaultTheme } from 'react-admin';

// ── Jetons de design ─────────────────────────────────────────────────────────────────────────
// Palette restreinte et chaude (pas le gris froid de MUI) + le vert App'lika comme seul accent.
// Un petit vocabulaire d'états fixe, dans la même famille de teintes, plutôt qu'un arc-en-ciel par carte.
const font = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const RADIUS = 8;

export const tone = {
  light: {
    bg: '#f6f4f0', paper: '#ffffff', paperAlt: '#efece5', text: '#201d17', textSecondary: '#6c6358',
    divider: 'rgba(32,29,23,.12)', hover: 'rgba(32,29,23,.045)', accent: '#1f5c4b', accentSoft: 'rgba(31,92,75,.10)',
    success: '#3c7a5a', successSoft: 'rgba(60,122,90,.12)', warning: '#8f6a28', warningSoft: 'rgba(143,106,40,.13)',
    error: '#9a4433', errorSoft: 'rgba(154,68,51,.12)', neutralSoft: 'rgba(32,29,23,.07)',
  },
  dark: {
    bg: '#17160f', paper: '#1e1c15', paperAlt: '#242219', text: '#f1ece1', textSecondary: '#a39b8b',
    divider: 'rgba(241,236,225,.12)', hover: 'rgba(241,236,225,.055)', accent: '#6bcdac', accentSoft: 'rgba(107,205,172,.13)',
    success: '#7bbd9a', successSoft: 'rgba(123,189,154,.14)', warning: '#d3ac67', warningSoft: 'rgba(211,172,103,.14)',
    error: '#d48f7e', errorSoft: 'rgba(212,143,126,.14)', neutralSoft: 'rgba(241,236,225,.08)',
  },
} as const;
export type Tone = typeof tone.light;

const shared = (mode: 'light' | 'dark'): ThemeOptions => {
  const t = tone[mode];
  return {
    ...defaultTheme,
    palette: {
      mode,
      primary: { main: t.accent, contrastText: mode === 'light' ? '#ffffff' : '#0d241d' },
      secondary: { main: t.accent },
      success: { main: t.success }, warning: { main: t.warning }, error: { main: t.error }, info: { main: t.accent },
      background: { default: t.bg, paper: t.paper },
      divider: t.divider,
      text: { primary: t.text, secondary: t.textSecondary },
    },
    shape: { borderRadius: RADIUS },
    typography: {
      fontFamily: font,
      fontSize: 13.5,
      h4: { fontWeight: 650, letterSpacing: '-.015em', fontSize: '1.75rem' },
      h5: { fontWeight: 650, letterSpacing: '-.012em', fontSize: '1.375rem' },
      h6: { fontWeight: 650, letterSpacing: '-.008em', fontSize: '1.0625rem' },
      subtitle1: { fontWeight: 650, fontSize: '0.9375rem' },
      subtitle2: { fontWeight: 650, fontSize: '0.8125rem' },
      body1: { fontSize: '0.875rem' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem' },
      overline: { fontSize: '0.6875rem', fontWeight: 650, letterSpacing: '.08em' },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' },
    },
    sidebar: { width: 256, closedWidth: 60 },
    components: {
      ...defaultTheme.components,
      MuiCssBaseline: {
        styleOverrides: {
          // Les surfaces que le code ne dessine pas (sélection de texte, chiffres tabulaires) portent aussi le système.
          '::selection': { backgroundColor: t.accentSoft, color: t.text },
          'table, .ra-field, .MuiTableCell-root': { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: { styleOverrides: { root: { border: `1px solid ${t.divider}`, boxShadow: 'none', borderRadius: RADIUS } } },
      MuiCardContent: { styleOverrides: { root: { padding: 16, '&:last-child': { paddingBottom: 16 } } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: RADIUS, fontWeight: 600 },
          outlined: { borderColor: t.divider },
          outlinedInherit: { borderColor: t.divider },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: RADIUS } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: RADIUS } } },
      // Les quatre teintes d'état (succès/attention/erreur/info), jamais le bleu générique de MUI pour "info" :
      // un seul vocabulaire de couleur, celui de la marque, sur toute la surface.
      MuiAlert: {
        styleOverrides: {
          standardSuccess: { backgroundColor: t.successSoft, color: t.success, '& .MuiAlert-icon': { color: t.success } },
          standardWarning: { backgroundColor: t.warningSoft, color: t.warning, '& .MuiAlert-icon': { color: t.warning } },
          standardError: { backgroundColor: t.errorSoft, color: t.error, '& .MuiAlert-icon': { color: t.error } },
          standardInfo: { backgroundColor: t.accentSoft, color: t.accent, '& .MuiAlert-icon': { color: t.accent } },
          outlinedSuccess: { borderColor: t.success, color: t.success },
          outlinedWarning: { borderColor: t.warning, color: t.warning },
          outlinedError: { borderColor: t.error, color: t.error },
          outlinedInfo: { borderColor: t.accent, color: t.accent },
        },
      },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: RADIUS, backgroundColor: mode === 'light' ? '#fff' : t.paperAlt } } },
      MuiFilledInput: { styleOverrides: { root: { borderRadius: RADIUS, '&:before,&:after': { display: 'none' } } } },
      MuiInputLabel: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 14, border: `1px solid ${t.divider}`, boxShadow: mode === 'light' ? '0 24px 60px -16px rgba(32,29,23,.28)' : '0 24px 60px -16px rgba(0,0,0,.6)' } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 650, fontSize: '1.0625rem' } } },
      MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: mode === 'light' ? t.text : t.paperAlt, border: mode === 'light' ? 'none' : `1px solid ${t.divider}`, fontSize: '0.75rem', borderRadius: 6 } } },
      MuiMenu: { styleOverrides: { paper: { border: `1px solid ${t.divider}`, boxShadow: mode === 'light' ? '0 12px 32px -12px rgba(32,29,23,.25)' : '0 12px 32px -12px rgba(0,0,0,.6)' } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.divider, padding: '10px 14px' },
          head: { fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.055em', color: t.textSecondary, backgroundColor: 'transparent' },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { height: 2.5, borderRadius: 2 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 40 } } },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundColor: t.paper, color: t.text, boxShadow: 'none', borderBottom: `1px solid ${t.divider}` },
        },
      },
      RaDatagrid: {
        styleOverrides: {
          root: {
            '& .RaDatagrid-headerCell': { backgroundColor: 'transparent' },
            '& .RaDatagrid-row': { transition: 'background-color 120ms ease' },
            '& .RaDatagrid-row:hover': { backgroundColor: t.hover },
            '& .RaDatagrid-rowCell': { borderColor: t.divider },
          },
        },
      },
      RaList: {
        styleOverrides: {
          root: { '& .RaList-content': { border: `1px solid ${t.divider}`, borderRadius: RADIUS, boxShadow: 'none', backgroundColor: t.paper } },
        },
      },
      // Le menu latéral est fixe (hauteur de l'écran) : sans défilement propre, les dernières entrées (Système,
      // Administration…) restent inaccessibles quand le panneau de droite est court. La barre native ne se peint
      // pas de façon fiable sur cet élément imbriqué (Layout.tsx dessine donc la sienne) ; ceci garde le défilement
      // fonctionnel au clavier/molette et neutralise le Paper de MUI qui rognait l'espace réservé.
      RaSidebar: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            '& .MuiDrawer-paper': { overflow: 'visible', backgroundColor: t.paperAlt, borderRight: `1px solid ${t.divider}` },
            '& .RaSidebar-fixed': { backgroundColor: 'transparent', overflowY: 'scroll', overflowX: 'hidden', paddingBottom: 16, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } },
          },
        },
      },
      RaMenuItemLink: {
        styleOverrides: {
          root: {
            borderRadius: 7, marginInline: 8, marginBlock: 1, color: t.textSecondary,
            '&:hover': { backgroundColor: t.hover, color: t.text },
            '&.RaMenuItemLink-active': { backgroundColor: t.accentSoft, color: t.accent, fontWeight: 650 },
            '& .RaMenuItemLink-icon': { color: 'inherit', minWidth: 34 },
          },
        },
      },
    },
  } as ThemeOptions;
};

export const lightTheme = createTheme(shared('light'));
export const darkTheme = createTheme(shared('dark'));
