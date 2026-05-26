import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryPage } from '../../src/features/inventory/InventoryPage';
import { Providers } from '../../src/app/providers';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

function renderInventory() {
  return render(
    <Providers>
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    </Providers>
  );
}

describe('inventory approval workflow', () => {
  beforeEach(() => clearSession());

  it('shows collector sales draft controls but hides price update action', async () => {
    setSession({
      id: 'U-002',
      name: 'Field Collector',
      role: 'collector',
      email: 'collector@ecotrack.local',
    });

    renderInventory();

    expect(await screen.findByRole('button', { name: /create sale draft/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update price/i })).not.toBeInTheDocument();
  });

  it('shows admin price update action and locked approved sale row', async () => {
    setSession({
      id: 'U-001',
      name: 'Admin User',
      role: 'admin',
      email: 'admin@ecotrack.local',
    });

    renderInventory();

    const priceButtons = await screen.findAllByRole('button', { name: /update price/i });
    expect(priceButtons.length).toBeGreaterThan(0);
    expect(await screen.findByText(/locked after approval/i)).toBeInTheDocument();
  });
});
