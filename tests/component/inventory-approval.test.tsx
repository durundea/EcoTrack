import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('shows collector sales draft controls but hides price update action', async () => {
    setSession({
      token: 'collector-token',
      user: {
        id: 'U-002',
        name: 'Field Collector',
        role: 'collector',
        email: 'collector@ecotrack.local',
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
        ]),
        { status: 200 }
      )
    );

    renderInventory();

    expect(await screen.findByRole('button', { name: /create sale draft/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update price/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/backend does not expose get \/api\/inventory\/sales/i)).toBeInTheDocument();
  });

  it('shows admin price update action and hides unsupported item edit actions', async () => {
    setSession({
      token: 'admin-token',
      user: {
        id: 'U-001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@ecotrack.local',
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
        ]),
        { status: 200 }
      )
    );

    renderInventory();

    const priceButtons = await screen.findAllByRole('button', { name: /update price/i });
    expect(priceButtons.length).toBeGreaterThan(0);
    expect(await screen.findByText(/price update only/i)).toBeInTheDocument();
  });
});
