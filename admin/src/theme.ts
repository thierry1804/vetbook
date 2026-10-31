import { theme as antdTheme, type ThemeConfig } from 'antd';

// ── Jetons de design ─────────────────────────────────────────────────────────────────────────
// Palette restreinte et chaude (pas le gris froid par défaut d'antd) + le vert App'lika comme seul accent.
// Un petit vocabulaire d'états fixe, dans la même famille de teintes, plutôt qu'un arc-en-ciel par carte.
export const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
export const RADIUS = 6;

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

export function themeConfig(mode: 'light' | 'dark'): ThemeConfig {
  const t = tone[mode];
  return {
    token: {
      colorPrimary: t.accent,
      colorBgBase: t.bg,
      colorBgContainer: t.paper,
      colorBgLayout: t.bg,
      colorBgElevated: t.paper,
      colorBorder: t.divider,
      colorBorderSecondary: t.divider,
      colorText: t.text,
      colorTextSecondary: t.textSecondary,
      // antd dérive les légendes (Typography "secondary"), les états vides de Table et le texte désactivé
      // de colorTextTertiary/Quaternary/Disabled — sans cette surcharge ils retombent sur ses gris par défaut
      // (45%/25% noir), illisibles sur nos fonds chauds (contraste mesuré ~3,3:1 et ~1,8:1, sous WCAG AA).
      colorTextTertiary: t.textSecondary,
      colorTextQuaternary: t.textSecondary,
      colorTextDisabled: t.textSecondary,
      colorSuccess: t.success,
      colorWarning: t.warning,
      colorError: t.error,
      colorInfo: t.accent,
      borderRadius: RADIUS,
      fontFamily: FONT,
      fontSize: 13.5,
      colorLink: t.accent,
      colorLinkHover: t.accent,
    },
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    components: {
      Layout: { bodyBg: t.bg, headerBg: t.paper, siderBg: t.paperAlt },
      Menu: { itemBg: 'transparent', itemColor: t.textSecondary, itemHoverBg: t.hover, itemHoverColor: t.text, itemSelectedBg: t.accentSoft, itemSelectedColor: t.accent, itemBorderRadius: 7, subMenuItemBg: 'transparent' },
      Table: { headerBg: 'transparent', headerColor: t.textSecondary, borderColor: t.divider, rowHoverBg: t.hover },
      Card: { paddingLG: 16 },
      Button: { borderRadius: RADIUS, fontWeight: 600 },
      Tag: { defaultBg: t.neutralSoft },
      Input: { borderRadius: RADIUS },
      Select: { borderRadius: RADIUS },
      Modal: { borderRadiusLG: 14 },
    },
  };
}
