import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../../src/app/layouts/AppShell';

describe('AppShell', () => {
  it('renders primary navigation landmarks', () => {
    render(
      <MemoryRouter>
        <AppShell><div>Body</div></AppShell>
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders all nav items', () => {
    render(
      <MemoryRouter>
        <AppShell><div>Body</div></AppShell>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Collection' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inventory' })).toBeInTheDocument();
  });
});
