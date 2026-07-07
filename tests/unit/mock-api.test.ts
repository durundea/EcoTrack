import { describe, expect, it } from 'vitest';
import { api } from '../../src/shared/api/client';

describe('api facade composition', () => {
  it('exposes collection schedule endpoint', () => {
    expect(api.collection.getSchedule).toBeTypeOf('function');
  });

  it('returns dashboard summary with co2 reduction and pending sales approvals metadata', async () => {
    const result = await api.dashboard.getSummary();
    expect(result.co2ReductionKg).toBeGreaterThan(0);
    expect(result.pendingSalesApprovals).toBeDefined();
    expect(typeof result.pendingSalesApprovals.count).toBe('number');
    expect(typeof result.pendingSalesApprovals.isDataAvailable).toBe('boolean');
    expect(typeof result.pendingSalesApprovals.message).toBe('string');
  });

  it('exposes service-backed auth, inventory, sales, and health modules', () => {
    expect(api.auth.login).toBeTypeOf('function');
    expect(api.segregation.getBatches).toBeTypeOf('function');
    expect(api.segregation.getPendingBatches).toBeTypeOf('function');
    expect(api.segregation.getBatchById).toBeTypeOf('function');
    expect(api.segregation.recordBatch).toBeTypeOf('function');
    expect(api.segregation.markRecycled).toBeTypeOf('function');
    expect(api.recycling.getBatches).toBeTypeOf('function');
    expect(api.recycling.advanceStage).toBeTypeOf('function');
    expect(api.recycling.createProductConversion).toBeTypeOf('function');
    expect(api.recycling.syncInventoryFromConversions).toBeTypeOf('function');
    expect(api.inventory.getItems).toBeTypeOf('function');
    expect(api.inventory.syncInventoryFromConversions).toBe(api.recycling.syncInventoryFromConversions);
    expect(api.sales.createDraft).toBeTypeOf('function');
    expect(api.health.getHealth).toBeTypeOf('function');
  });
});
