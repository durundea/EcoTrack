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
});
