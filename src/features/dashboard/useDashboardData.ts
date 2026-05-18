import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import type { DashboardFilters } from './filters';
import { buildDashboardFilterKey } from './filters';

export function useDashboardData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard', 'summary', buildDashboardFilterKey(filters)],
    queryFn: () => api.dashboard.getSummary(),
    staleTime: 60_000,
  });
}
