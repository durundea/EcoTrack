import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';
import { salesService } from '../../src/shared/services';

describe('salesService', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'collector-token',
      user: { id: 'U-002', name: 'Collector', role: 'collector', email: 'collector@ecotrack.local' },
    });
    vi.restoreAllMocks();
  });

  it('lists sales records and gets a record by id using backend endpoints', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            id: 'SALE-101',
            inventoryItemId: 'INV-010',
            quantitySold: 3,
            revenueInr: 450,
            soldAtUtc: '2026-06-01T00:00:00Z',
            approvalStatus: 'approved',
            requestedByUserId: 'U-002',
            approvedByUserId: 'U-001',
            approvedAtUtc: '2026-06-01T01:00:00Z',
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'SALE-101',
        inventoryItemId: 'INV-010',
        quantitySold: 3,
        revenueInr: 450,
        soldAtUtc: '2026-06-01T00:00:00Z',
        approvalStatus: 'approved',
        requestedByUserId: 'U-002',
        approvedByUserId: 'U-001',
        approvedAtUtc: '2026-06-01T01:00:00Z',
      }), { status: 200 }));

    const sales = await salesService.list();
    const sale = await salesService.getById('SALE-101');

    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({
      id: 'SALE-101',
      approvalStatus: 'approved',
      revenueINR: 450,
    });

    expect(sale).toMatchObject({
      id: 'SALE-101',
      approvalStatus: 'approved',
      revenueINR: 450,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const [firstUrl, firstInit] = fetchSpy.mock.calls[0];
    const [secondUrl, secondInit] = fetchSpy.mock.calls[1];

    expect(new URL(String(firstUrl)).pathname).toBe('/api/inventory/sales');
    expect(firstInit?.method ?? 'GET').toBe('GET');

    expect(new URL(String(secondUrl)).pathname).toBe('/api/inventory/sales/SALE-101');
    expect(secondInit?.method ?? 'GET').toBe('GET');
  });

  it('creates and submits a draft sale using backend endpoints', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'SALE-101',
        inventoryItemId: 'INV-001',
        quantitySold: 2,
        revenueInr: 120,
        soldAtUtc: '2026-05-28T00:00:00Z',
        approvalStatus: 'draft',
        requestedByUserId: 'U-002',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'SALE-101',
        inventoryItemId: 'INV-001',
        quantitySold: 2,
        revenueInr: 120,
        soldAtUtc: '2026-05-28T00:00:00Z',
        approvalStatus: 'pendingApproval',
        requestedByUserId: 'U-002',
      }), { status: 200 }));

    const created = await salesService.createDraft({ inventoryItemId: 'INV-001', quantitySold: 2, soldAt: '2026-05-28' });
    const submitted = await salesService.submitDraft(created.id);

    expect(created.approvalStatus).toBe('draft');
    expect(submitted.approvalStatus).toBe('pending_approval');
  });
});