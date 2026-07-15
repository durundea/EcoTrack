export type ActiveTheme = 'light' | 'dark';

export type ThemeTokens = {
  surfaceApp: string;
  surfacePanel: string;
  surfacePanelHover: string;
  borderSubtle: string;
  textPrimary: string;
  textMuted: string;
  actionBrand: string;
};

export const THEME_TOKENS: Record<ActiveTheme, ThemeTokens> = {
  dark: {
    surfaceApp: '#020617',
    surfacePanel: '#0b1220',
    surfacePanelHover: '#162036',
    borderSubtle: '#1e293b',
    textPrimary: '#e2e8f0',
    textMuted: '#94a3b8',
    actionBrand: '#16a34a',
  },
  light: {
    surfaceApp: '#f8fafc',
    surfacePanel: '#ffffff',
    surfacePanelHover: '#f1f5f9',
    borderSubtle: '#cbd5e1',
    textPrimary: '#0f172a',
    textMuted: '#475569',
    actionBrand: '#15803d',
  },
};
