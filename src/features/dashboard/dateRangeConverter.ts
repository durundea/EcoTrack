import type { DashboardFilters } from './filters';

export type DashboardRangeKey = DashboardFilters['range'];

export type DashboardUtcWindow = {
  fromUtc: string;
  toUtc: string;
};

export type DashboardDateRangeConverterOptions = {
  now?: Date;
};

const RANGE_DAY_SPANS: Record<DashboardRangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function convertDashboardRangeToUtcWindow(
  range: DashboardRangeKey,
  options: DashboardDateRangeConverterOptions = {},
): DashboardUtcWindow {
  const currentDateTime = options.now ? new Date(options.now) : new Date();
  const daySpan = RANGE_DAY_SPANS[range];

  const localStart = new Date(currentDateTime);
  localStart.setDate(localStart.getDate() - (daySpan - 1));
  localStart.setHours(0, 0, 0, 0);

  const localEnd = new Date(currentDateTime);
  localEnd.setHours(23, 59, 59, 999);

  return {
    fromUtc: localStart.toISOString(),
    toUtc: localEnd.toISOString(),
  };
}