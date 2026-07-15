import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../../src/app/layouts/AppShell';
import { LoaderProvider } from '../../src/shared/services/LoaderContext';
import { ThemeProvider } from '../../src/shared/ui/theme/ThemeProvider';

describe('AppShell', () => {
  it('renders primary navigation landmarks', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LoaderProvider>
            <AppShell><div>Body</div></AppShell>
          </LoaderProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders all nav items', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LoaderProvider>
            <AppShell><div>Body</div></AppShell>
          </LoaderProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Collection' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inventory' })).toBeInTheDocument();
  });

  it('renders a theme preference toggle with system, dark, and light options', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LoaderProvider>
            <AppShell><div>Body</div></AppShell>
          </LoaderProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('combobox', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /system/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /light/i })).toBeInTheDocument();
  });

  it('updates document theme and stored preference when changing theme selection', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ThemeProvider>
          <LoaderProvider>
            <AppShell><div>Body</div></AppShell>
          </LoaderProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const themeSelect = screen.getByRole('combobox', { name: /theme preference/i });

    await user.selectOptions(themeSelect, 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('ecotrack_theme_preference')).toBe('dark');

    await user.selectOptions(themeSelect, 'light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('ecotrack_theme_preference')).toBe('light');

    await user.selectOptions(themeSelect, 'system');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('ecotrack_theme_preference')).toBe('system');
  });
});
