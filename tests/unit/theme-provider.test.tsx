import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../src/shared/ui/theme/ThemeProvider';
import { useTheme } from '../../src/shared/ui/theme/useTheme';

describe('ThemeProvider', () => {
  it('prefers system dark theme when user preference is system', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );

    const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.activeTheme).toBe('dark');
  });
});
