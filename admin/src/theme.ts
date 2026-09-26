import { createTheme, ThemeOptions } from '@mui/material/styles';
import { defaultTheme } from 'react-admin';

const font = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const shared = (mode: 'light' | 'dark'): ThemeOptions => ({
  ...defaultTheme,
  palette: {
    mode,
    primary: { main: mode === 'light' ? '#1f5c4b' : '#5fc2a5' },
    secondary: { main: '#c27a1a' },
    background: mode === 'light' ? { default: '#f4f6f5', paper: '#ffffff' } : { default: '#101614', paper: '#18211e' },
    divider: mode === 'light' ? 'rgba(20,40,32,.10)' : 'rgba(255,255,255,.10)',
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: font, h5: { fontWeight: 650, letterSpacing: '-.01em' }, h6: { fontWeight: 650 }, button: { textTransform: 'none', fontWeight: 600 } },
  sidebar: { width: 264, closedWidth: 64 },
  components: {
    ...defaultTheme.components,
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { styleOverrides: { root: ({ theme }) => ({ border: `1px solid ${theme.palette.divider}`, boxShadow: '0 1px 2px rgba(16,40,30,.04)' }) } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiFilledInput: { styleOverrides: { root: { borderRadius: 10, '&:before,&:after': { display: 'none' } } } },
    MuiAppBar: { styleOverrides: { root: ({ theme }) => ({ backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, boxShadow: 'none', borderBottom: `1px solid ${theme.palette.divider}` }) } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 650, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', opacity: .75 } } },
    RaDatagrid: { styleOverrides: { root: { '& .RaDatagrid-headerCell': { backgroundColor: 'transparent' }, '& .RaDatagrid-row:hover': { backgroundColor: 'rgba(31,92,75,.05)' } } } },
    RaList: { styleOverrides: { root: { '& .RaList-content': { border: '1px solid rgba(128,128,128,.18)', borderRadius: 12 } } } },
    RaSidebar: { styleOverrides: { root: { '& .RaSidebar-fixed': { backgroundColor: 'transparent' } } } },
  },
} as ThemeOptions);

export const lightTheme = createTheme(shared('light'));
export const darkTheme = createTheme(shared('dark'));
