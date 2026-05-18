export type DashboardFilters = {
  range: '7d' | '30d' | '90d';
  wasteType: 'all' | 'plastic' | 'organic' | 'metal' | 'paper' | 'ewaste';
  collectorId: string;
  site: string;
};

export const DEFAULT_FILTERS: DashboardFilters = {
  range: '30d',
  wasteType: 'all',
  collectorId: 'all',
  site: 'all',
};

export function buildDashboardFilterKey(filters: DashboardFilters): string {
  return `${filters.range}|${filters.wasteType}|${filters.collectorId}|${filters.site}`;
}
