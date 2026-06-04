import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('inventory sales records', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'collector-token',
      user: {
        id: 'U-002',
        name: 'Field Collector',
        role: 'collector',
        email: 'collector@ecotrack.local',
      },
    });
    vi.restoreAllMocks();
  });

  it('renders sales rows from api list and falls back to inventory item id when name is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const pathname = new URL(String(input)).pathname;

      if (pathname === '/api/inventory/items') {
        return new Response(
          JSON.stringify([
            { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
          ]),
          { status: 200 }
        );
      }

      if (pathname === '/api/inventory/sales') {
        return new Response(
          JSON.stringify([
            {
              id: 'SALE-001',
              inventoryItemId: 'INV-001',
              quantitySold: 2,
              revenueInr: 120,
              soldAtUtc: '2026-06-01T00:00:00Z',
              approvalStatus: 'approved',
              requestedByUserId: 'U-002',
            },
            {
              id: 'SALE-002',
              inventoryItemId: 'INV-404',
              quantitySold: 1,
              revenueInr: 50,
              soldAtUtc: '2026-06-02T00:00:00Z',
              approvalStatus: 'pendingApproval',
              requestedByUserId: 'U-002',
            },
          ]),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    renderInventory();

    expect(await screen.findByRole('heading', { name: /sales records/i })).toBeInTheDocument();
    expect(await screen.findByText('SALE-001')).toBeInTheDocument();
    expect((await screen.findAllByText('Compost')).length).toBeGreaterThan(0);
    expect(await screen.findByText('INV-404')).toBeInTheDocument();
  });

  it('filters sales rows by search query and shows a no-results state', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const pathname = new URL(String(input)).pathname;

      if (pathname === '/api/inventory/items') {
        return new Response(
          JSON.stringify([
            { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
          ]),
          { status: 200 }
        );
      }

      if (pathname === '/api/inventory/sales') {
        return new Response(
          JSON.stringify([
            {
              id: 'SALE-001',
              inventoryItemId: 'INV-001',
              quantitySold: 2,
              revenueInr: 120,
              soldAtUtc: '2026-06-01T00:00:00Z',
              approvalStatus: 'approved',
              requestedByUserId: 'U-002',
            },
            {
              id: 'SALE-002',
              inventoryItemId: 'INV-001',
              quantitySold: 3,
              revenueInr: 180,
              soldAtUtc: '2026-06-02T00:00:00Z',
              approvalStatus: 'draft',
              requestedByUserId: 'U-002',
            },
          ]),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    renderInventory();

    expect(await screen.findByText('SALE-001')).toBeInTheDocument();
    const searchInput = screen.getByRole('textbox', { name: /search sales/i });

    fireEvent.change(searchInput, { target: { value: 'sale-002' } });
    await waitFor(() => {
      expect(screen.getByText('SALE-002')).toBeInTheDocument();
      expect(screen.queryByText('SALE-001')).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'unknown' } });
    expect(await screen.findByText(/no sales records match your search/i)).toBeInTheDocument();
  });
});