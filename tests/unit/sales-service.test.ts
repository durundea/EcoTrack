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
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          id: 'SALE-201',
          inventoryItemId: 'INV-010',
          quantitySold: 3,
          revenueInr: 450,
          soldAtUtc: '2026-06-01T00:00:00Z',
          approvalStatus: 'approved',
          requestedByUserId: 'U-002',
          approvedByUserId: 'U-001',
          approvedAtUtc: '2026-06-01T01:00:00Z',
        },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'SALE-201',
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
    const sale = await salesService.getById('SALE-201');

    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({
      id: 'SALE-201',
      approvalStatus: 'approved',
      revenueINR: 450,
    });

    expect(sale).toMatchObject({
      id: 'SALE-201',
      approvalStatus: 'approved',
      revenueINR: 450,
    });
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