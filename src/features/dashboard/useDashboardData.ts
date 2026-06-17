import { useQuery } from '@tanstack/react-query';
import { dashboardService } from './dashboardService';
import { convertDashboardRangeToUtcWindow } from './dateRangeConverter';
import type { DashboardFilters } from './filters';

export function useDashboardData(filters: DashboardFilters) {
  const effectiveWasteType = filters.wasteType === 'all' ? undefined : filters.wasteType;
  const { fromUtc, toUtc } = convertDashboardRangeToUtcWindow(filters.range);
  const query = effectiveWasteType
    ? { fromUtc, toUtc, wasteType: effectiveWasteType }
    : { fromUtc, toUtc };

  return useQuery({
    queryKey: ['dashboard', 'summary', query],
    queryFn: () => dashboardService.getSummary(query),
    staleTime: 60_000,
  });
}
