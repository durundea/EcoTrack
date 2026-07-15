import { createContext, type ReactNode, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ActiveTheme } from './themeTokens';
import { getStoredThemePreference, setStoredThemePreference, type ThemePreference } from './themeStorage';

export type ThemeContextValue = {
  activeTheme: ActiveTheme;
  userOverride: ThemePreference;
  isSystemMode: boolean;
  setThemePreference: (next: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ActiveTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveInitialActiveTheme(): ActiveTheme {
  const preference = getStoredThemePreference();
  return preference === 'system' ? getSystemTheme() : preference;
}

function applyThemeToDocument(theme: ActiveTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

// Apply theme during module evaluation so the initial paint uses the resolved scheme.
if (typeof window !== 'undefined') {
  applyThemeToDocument(resolveInitialActiveTheme());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [userOverride, setUserOverride] = useState<ThemePreference>(() => getStoredThemePreference());
  const [systemTheme, setSystemTheme] = useState<ActiveTheme>(() => getSystemTheme());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  const activeTheme: ActiveTheme = userOverride === 'system' ? systemTheme : userOverride;

  useLayoutEffect(() => {
    applyThemeToDocument(activeTheme);
  }, [activeTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      activeTheme,
      userOverride,
      isSystemMode: userOverride === 'system',
      setThemePreference: (next: ThemePreference) => {
        setUserOverride(next);
        setStoredThemePreference(next);
      },
    }),
    [activeTheme, userOverride]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
