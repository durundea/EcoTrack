import { describe, expect, it } from 'vitest';
import { api } from '../../src/shared/api/client';

describe('api facade composition', () => {
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

  it('exposes service-backed auth, inventory, sales, and health modules', () => {
    expect(api.auth.login).toBeTypeOf('function');
    expect(api.inventory.getItems).toBeTypeOf('function');
    expect(api.sales.createDraft).toBeTypeOf('function');
    expect(api.health.getHealth).toBeTypeOf('function');
  });
});
