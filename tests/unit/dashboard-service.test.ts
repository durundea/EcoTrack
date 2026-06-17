import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession } from '../../src/features/auth/sessionStore';
import { dashboardService } from '../../src/features/dashboard/dashboardService';

describe('dashboardService', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('maps backend analytics dto into the frontend dashboard summary shape', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          range: { fromUtc: '2026-06-10T00:00:00Z', toUtc: '2026-06-16T23:59:59Z', label: '7d' },
          kpis: {
            totalWasteProcessedKg: 1000,
            revenueInr: 50000,
            recyclingEfficiencyPercent: 75,
            co2ReductionKg: 500,
          },
          wasteByCategory: [
            { category: 'plastic', weightKg: 400, sharePercent: 40 },
            { category: 'organic', weightKg: 600, sharePercent: 60 },
            { category: 'glass', weightKg: 20, sharePercent: 2 },
          ],
          categoryDistribution: [{ category: 'metal', weightKg: 100, sharePercent: 10 }],
          pendingSalesApprovals: {
            count: 3,
            isDataAvailable: true,
            message: '3 approvals pending',
          },
        }),
        { status: 200 }
      )
    );

    const result = await dashboardService.getSummary({
      fromUtc: '2026-06-10T00:00:00Z',
      toUtc: '2026-06-16T23:59:59Z',
      wasteType: 'plastic',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/analytics/dashboard?FromUtc=2026-06-10T00%3A00%3A00Z&ToUtc=2026-06-16T23%3A59%3A59Z&WasteType=plastic'),
      expect.objectContaining({ headers: expect.any(Headers) })
    );
    expect(result).toEqual({
      totalWasteProcessedKg: 1000,
      revenueINR: 50000,
      recyclingEfficiencyPct: 75,
      co2ReductionKg: 500,
      byCategory: {
        plastic: 400,
        organic: 600,
        metal: 0,
        paper: 0,
        ewaste: 0,
      },
      pendingSalesApprovals: {
        count: 3,
        isDataAvailable: true,
        message: '3 approvals pending',
      },
    });
  });

  it('falls back to categoryDistribution when wasteByCategory is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          range: { fromUtc: '2026-06-10T00:00:00Z', toUtc: '2026-06-16T23:59:59Z', label: '7d' },
          kpis: {
            totalWasteProcessedKg: 10,
            revenueInr: 20,
            recyclingEfficiencyPercent: 30,
            co2ReductionKg: 40,
          },
          wasteByCategory: [],
          categoryDistribution: [{ category: 'paper', weightKg: 7, sharePercent: 70 }],
          pendingSalesApprovals: {
            count: 0,
            isDataAvailable: false,
            message: 'No approval data',
          },
        }),
        { status: 200 }
      )
    );

    const result = await dashboardService.getSummary({
      fromUtc: '2026-06-10T00:00:00Z',
      toUtc: '2026-06-16T23:59:59Z',
    });

    expect(result.byCategory.paper).toBe(7);
    expect(result.byCategory.plastic).toBe(0);
  });

  it('returns mapped mock dashboard summary when the api request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(
      dashboardService.getSummary({
        fromUtc: '2026-06-10T00:00:00Z',
        toUtc: '2026-06-16T23:59:59Z',
      })
    ).resolves.toEqual({
      totalWasteProcessedKg: 1840,
      revenueINR: 42500,
      recyclingEfficiencyPct: 78,
      co2ReductionKg: 920,
      byCategory: {
        plastic: 480,
        organic: 620,
        metal: 310,
        paper: 270,
        ewaste: 160,
      },
      pendingSalesApprovals: {
        count: 0,
        isDataAvailable: false,
        message: 'Pending approvals unavailable in mock mode.',
      },
    });
  });

  it('returns mapped mock dashboard summary when api responds with non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('server error', { status: 500 }));

    await expect(
      dashboardService.getSummary({
        fromUtc: '2026-06-10T00:00:00Z',
        toUtc: '2026-06-16T23:59:59Z',
      })
    ).resolves.toEqual({
      totalWasteProcessedKg: 1840,
      revenueINR: 42500,
      recyclingEfficiencyPct: 78,
      co2ReductionKg: 920,
      byCategory: {
        plastic: 480,
        organic: 620,
        metal: 310,
        paper: 270,
        ewaste: 160,
      },
      pendingSalesApprovals: {
        count: 0,
        isDataAvailable: false,
        message: 'Pending approvals unavailable in mock mode.',
      },
    });
  });

  it('defaults missing dto fields to safe values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          kpis: {},
          wasteByCategory: [{ category: 'unknown_category', weightKg: 99, sharePercent: 100 }],
          categoryDistribution: [],
          pendingSalesApprovals: {},
        }),
        { status: 200 }
      )
    );

    const result = await dashboardService.getSummary({
      fromUtc: '2026-06-10T00:00:00Z',
      toUtc: '2026-06-16T23:59:59Z',
    });

    expect(result.totalWasteProcessedKg).toBe(0);
    expect(result.revenueINR).toBe(0);
    expect(result.recyclingEfficiencyPct).toBe(0);
    expect(result.co2ReductionKg).toBe(0);
    expect(result.byCategory).toEqual({
      plastic: 0,
      organic: 0,
      metal: 0,
      paper: 0,
      ewaste: 0,
    });
    expect(result.pendingSalesApprovals).toEqual({
      count: 0,
      isDataAvailable: false,
      message: '',
    });
  });
});