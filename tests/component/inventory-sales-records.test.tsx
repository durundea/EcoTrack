import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

async function findSalesTable() {
  const salesIdHeader = await screen.findByRole('columnheader', { name: /sale id/i });
  const salesTable = salesIdHeader.closest('table');

  if (!salesTable) {
    throw new Error('Sales table not found');
  }

  return salesTable;
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
    const salesTable = await findSalesTable();
    expect(within(salesTable).getByText('SALE-001')).toBeInTheDocument();
    expect(within(salesTable).getByText('Compost')).toBeInTheDocument();
    expect(within(salesTable).getByText('INV-404')).toBeInTheDocument();
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

    const salesTable = await findSalesTable();
    expect(within(salesTable).getByText('SALE-001')).toBeInTheDocument();
    const searchInput = screen.getByRole('textbox', { name: /search sales/i });

    fireEvent.change(searchInput, { target: { value: 'sale-002' } });
    await waitFor(() => {
      const filteredSalesTable = screen.getByRole('columnheader', { name: /sale id/i }).closest('table');
      expect(filteredSalesTable).not.toBeNull();
      expect(within(filteredSalesTable as HTMLTableElement).getByText('SALE-002')).toBeInTheDocument();
      expect(within(filteredSalesTable as HTMLTableElement).queryByText('SALE-001')).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'unknown' } });
    expect(await screen.findByText(/no sales records match your search/i)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /sale id/i })).not.toBeInTheDocument();
  });

  it('refreshes sales records list after creating a sale draft', async () => {
    let salesListCalls = 0;
    let draftCreated = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input.url;
      const pathname = new URL(requestUrl).pathname;
      const method = init?.method ?? 'GET';

      if (pathname === '/api/inventory/items') {
        return new Response(
          JSON.stringify([
            { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
          ]),
          { status: 200 }
        );
      }

      if (pathname === '/api/inventory/sales' && method === 'GET') {
        salesListCalls += 1;

        if (!draftCreated) {
          return new Response(JSON.stringify([]), { status: 200 });
        }

        return new Response(
          JSON.stringify([
            {
              id: 'SALE-900',
              inventoryItemId: 'INV-001',
              quantitySold: 4,
              revenueInr: 240,
              soldAtUtc: '2026-06-03T00:00:00Z',
              approvalStatus: 'draft',
              requestedByUserId: 'U-002',
            },
          ]),
          { status: 200 }
        );
      }

      if (pathname === '/api/inventory/sales' && method === 'POST') {
        draftCreated = true;
        return new Response(
          JSON.stringify({
            id: 'SALE-900',
            inventoryItemId: 'INV-001',
            quantitySold: 4,
            revenueInr: 240,
            soldAtUtc: '2026-06-03T00:00:00Z',
            approvalStatus: 'draft',
            requestedByUserId: 'U-002',
          }),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    renderInventory();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'INV-001' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 4 } });
    fireEvent.click(screen.getByRole('button', { name: /create sale draft/i }));

    const salesTable = await findSalesTable();
    await waitFor(() => {
      expect(within(salesTable).getByText('SALE-900')).toBeInTheDocument();
    });
    expect(salesListCalls).toBeGreaterThanOrEqual(1);
  });
});