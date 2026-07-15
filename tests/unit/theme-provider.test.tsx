import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../src/shared/ui/theme/ThemeProvider';
import { useTheme } from '../../src/shared/ui/theme/useTheme';

type MatchMediaController = {
  setMatches: (next: boolean) => void;
};

function stubMatchMedia(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      get matches() {
        return matches;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.add(listener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.delete(listener);
        }
      }),
      dispatchEvent: vi.fn(),
    }))
  );

  return {
    setMatches: (next: boolean) => {
      matches = next;
      const mediaEvent = { matches: next } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(mediaEvent));
    },
  };
}

function renderThemeHook() {
  const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
  return renderHook(() => useTheme(), { wrapper });
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses user override over system preference', () => {
    stubMatchMedia(true);
    window.localStorage.setItem('ecotrack_theme_preference', 'light');

    const { result } = renderThemeHook();

    expect(result.current.userOverride).toBe('light');
    expect(result.current.activeTheme).toBe('light');
    expect(result.current.isSystemMode).toBe(false);
  });

  it('falls back invalid stored value to system and self-heals storage', () => {
    stubMatchMedia(false);
    window.localStorage.setItem('ecotrack_theme_preference', 'invalid-theme');

    const { result } = renderThemeHook();

    expect(result.current.userOverride).toBe('system');
    expect(result.current.activeTheme).toBe('light');
    expect(window.localStorage.getItem('ecotrack_theme_preference')).toBe('system');
  });

  it('only reacts to system theme changes while override is system', () => {
    const matchMediaController = stubMatchMedia(true);
    const { result } = renderThemeHook();

    expect(result.current.activeTheme).toBe('dark');

    act(() => {
      matchMediaController.setMatches(false);
    });
    expect(result.current.activeTheme).toBe('light');

    act(() => {
      result.current.setThemePreference('dark');
    });
    expect(result.current.activeTheme).toBe('dark');

    act(() => {
      matchMediaController.setMatches(false);
    });
    expect(result.current.activeTheme).toBe('dark');
  });

  it('setThemePreference updates context state and localStorage', () => {
    stubMatchMedia(true);
    const { result } = renderThemeHook();

    act(() => {
      result.current.setThemePreference('light');
    });

    expect(result.current.userOverride).toBe('light');
    expect(result.current.activeTheme).toBe('light');
    expect(result.current.isSystemMode).toBe(false);
    expect(window.localStorage.getItem('ecotrack_theme_preference')).toBe('light');
  });

  it('applies resolved theme to document on module load (prepaint path)', async () => {
    vi.resetModules();
    stubMatchMedia(false);
    window.localStorage.setItem('ecotrack_theme_preference', 'system');
    document.documentElement.dataset.theme = '';

    await import('../../src/shared/ui/theme/ThemeProvider');

    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
