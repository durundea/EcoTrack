import { describe, expect, it } from 'vitest';
import { buildDashboardFilterKey, DEFAULT_FILTERS } from '../../src/features/dashboard/filters';

describe('dashboard filters', () => {
  it('builds deterministic cache key', () => {
    const key = buildDashboardFilterKey({ wasteType: 'plastic', collectorId: 'C-12', range: '30d', site: 'all' });
    expect(key).toBe('30d|plastic|C-12|all');
  });

  it('default filters build valid key', () => {
    const key = buildDashboardFilterKey(DEFAULT_FILTERS);
    expect(key).toBe('30d|all|all|all');
  });

  it('keys differ when filter changes', () => {
    const k1 = buildDashboardFilterKey({ ...DEFAULT_FILTERS, range: '7d' });
    const k2 = buildDashboardFilterKey({ ...DEFAULT_FILTERS, range: '90d' });
    expect(k1).not.toBe(k2);
  });
});
