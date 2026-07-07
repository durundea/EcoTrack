import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';
import { inventoryService } from '../../src/shared/services';

describe('inventoryService', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'jwt-token',
      user: {
        id: 'U-001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@ecotrack.local',
      },
    });
    vi.restoreAllMocks();
  });

  it('maps backend item dto to frontend inventory item shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 30, unit: 'kg', standardPriceInr: 75 },
        ]),
        { status: 200 }
      )
    );

    const items = await inventoryService.getItems();

    expect(items[0].category).toBe('recycled-product');
    expect(items[0].standardPriceINR).toBe(75);
  });

  it('maps recycling conversions sync summary response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          updatedItemsCount: 3,
          createdItemsCount: 2,
          skippedCount: 1,
          syncRunId: 'sync-2026-07-07-01',
        }),
        { status: 200 }
      )
    );

    const summary = await inventoryService.syncFromRecyclingConversions();

    expect(summary).toEqual({
      updatedItemsCount: 3,
      createdItemsCount: 2,
      skippedCount: 1,
      syncRunId: 'sync-2026-07-07-01',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/recycling/conversions/sync-inventory'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
