import type {
  DashboardAnalyticsResponse,
  DashboardSummary,
  DashboardSummaryPendingApprovals,
  DashboardWasteCategory,
  WasteCategory,
} from '../../shared/api/contracts';
import { dashboardSummary as mockDashboardSummary } from '../../shared/api/mockData';
import { WASTE_CATEGORIES } from '../../shared/domain/waste';
import { requestJson } from '../../shared/services';

export type DashboardSummaryQuery = {
  fromUtc: string;
  toUtc: string;
  wasteType?: string;
};

function createEmptyCategoryMap(): Record<WasteCategory, number> {
  return WASTE_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {} as Record<WasteCategory, number>);
}

function toKnownCategory(category: string): WasteCategory | null {
  const normalized = category.trim().toLowerCase();
  return WASTE_CATEGORIES.includes(normalized as WasteCategory) ? (normalized as WasteCategory) : null;
}

function mapCategories(categories: DashboardWasteCategory[] | undefined): Record<WasteCategory, number> {
  const byCategory = createEmptyCategoryMap();

  for (const item of categories ?? []) {
    const category = toKnownCategory(item.category ?? '');
    if (!category) {
      continue;
    }

    byCategory[category] = typeof item.weightKg === 'number' ? item.weightKg : 0;
  }

  return byCategory;
}

function mapPendingApprovals(source: Partial<DashboardSummaryPendingApprovals> | undefined): DashboardSummaryPendingApprovals {
  return {
    count: typeof source?.count === 'number' ? source.count : 0,
    isDataAvailable: typeof source?.isDataAvailable === 'boolean' ? source.isDataAvailable : false,
    message: source?.message ?? '',
  };
}

export function mapDashboardAnalyticsResponse(dto: Partial<DashboardAnalyticsResponse>): DashboardSummary {
  const primaryCategories = dto.wasteByCategory?.length ? dto.wasteByCategory : dto.categoryDistribution;

  return {
    totalWasteProcessedKg: typeof dto.kpis?.totalWasteProcessedKg === 'number' ? dto.kpis.totalWasteProcessedKg : 0,
    revenueINR: typeof dto.kpis?.revenueInr === 'number' ? dto.kpis.revenueInr : 0,
    recyclingEfficiencyPct:
      typeof dto.kpis?.recyclingEfficiencyPercent === 'number' ? dto.kpis.recyclingEfficiencyPercent : 0,
    co2ReductionKg: typeof dto.kpis?.co2ReductionKg === 'number' ? dto.kpis.co2ReductionKg : 0,
    byCategory: mapCategories(primaryCategories),
    pendingSalesApprovals: mapPendingApprovals(dto.pendingSalesApprovals),
  };
}

function mapMockDashboardSummary(summary: DashboardSummary): DashboardSummary {
  return {
    totalWasteProcessedKg: summary.totalWasteProcessedKg,
    revenueINR: summary.revenueINR,
    recyclingEfficiencyPct: summary.recyclingEfficiencyPct,
    co2ReductionKg: summary.co2ReductionKg,
    byCategory: { ...summary.byCategory },
    pendingSalesApprovals: mapPendingApprovals(summary.pendingSalesApprovals),
  };
}

function buildDashboardUrl(query: DashboardSummaryQuery): string {
  const searchParams = new URLSearchParams({
    FromUtc: query.fromUtc,
    ToUtc: query.toUtc,
  });

  if (query.wasteType) {
    searchParams.set('WasteType', query.wasteType);
  }

  return `/api/analytics/dashboard?${searchParams.toString()}`;
}

export const dashboardService = {
  async getSummary(query: DashboardSummaryQuery): Promise<DashboardSummary> {
    try {
      const response = await requestJson<DashboardAnalyticsResponse>(buildDashboardUrl(query));
      return mapDashboardAnalyticsResponse(response);
    } catch {
      return mapMockDashboardSummary(mockDashboardSummary);
    }
  },
};