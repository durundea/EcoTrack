import { describe, expect, it } from 'vitest';
import { api } from '../../src/shared/api/client';

describe('mock api', () => {
  it('returns pickup schedule list', async () => {
    const result = await api.collection.getSchedule();
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns segregation batches', async () => {
    const result = await api.segregation.getBatches();
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns dashboard summary with co2 reduction', async () => {
    const result = await api.dashboard.getSummary();
    expect(result.co2ReductionKg).toBeGreaterThan(0);
  });

  it('blocks collector from changing standard item price', async () => {
    await expect(
      api.inventory.updateItemPrice('INV-001', 999, { actorRole: 'collector', actorUserId: 'U-002' })
    ).rejects.toThrow(/admin/i);
  });

  it('creates draft sale and submits for approval', async () => {
    const created = await api.inventory.createSaleDraft({
      inventoryItemId: 'INV-001',
      quantitySold: 2,
      soldAt: '2026-05-20',
      requestedByUserId: 'U-002',
    });

    expect(created.approvalStatus).toBe('draft');

    const submitted = await api.inventory.submitSaleForApproval(created.id, {
      actorRole: 'collector',
      actorUserId: 'U-002',
    });

    expect(submitted.approvalStatus).toBe('pending_approval');
  });

  it('locks approved sale from edit', async () => {
    await expect(
      api.inventory.updateSale(
        'SALE-001',
        { quantitySold: 10 },
        { actorRole: 'admin', actorUserId: 'U-001' }
      )
    ).rejects.toThrow(/approved/i);
  });
});
