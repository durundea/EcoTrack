# Dashboard API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dashboard page mock data with real backend API calls, adding date/filter-to-query conversion and defensive fallback behavior.

**Architecture:** Minimal patch approach preserving UI while introducing a dedicated date converter utility, API service method, and updated dashboard hook that builds query params from filters and manages fallback behavior.

**Tech Stack:** TypeScript, React Query, existing http.requestJson infrastructure, UTC date manipulation.

---

## File Structure

### New Files
- `src/features/dashboard/dateRangeConverter.ts` — Pure utility for local calendar window to UTC conversion
- `src/features/dashboard/dashboardService.ts` — Dedicated service for dashboard API calls + mapping + fallback
- `tests/unit/dashboard-date-range-converter.test.ts` — Unit tests for date conversion logic
- `tests/unit/dashboard-service.test.ts` — Unit tests for mapping and fallback behavior

### Modified Files
- `src/features/dashboard/useDashboardData.ts` — Update to use new service, build query params from filters
- `src/features/dashboard/DashboardPage.tsx` — Remove inventory approvals hook, use unified dashboard payload
- `src/shared/api/contracts.ts` — Add backend dashboard DTO types

---

## Tasks

### Task 1: Add backend dashboard DTO contracts

**Files:**
- Modify: `src/shared/api/contracts.ts`
- Test: (no new tests, these are type definitions)

- [ ] **Step 1: Add DTO type definitions at end of contracts file**

Add these type definitions after existing exports:

```typescript
// ─── Dashboard ─────────────────────────────────────────────────────────────
export type DashboardAnalyticsKpis = {
  totalWasteProcessedKg: number;
  revenueInr: number;
  recyclingEfficiencyPercent: number;
  co2ReductionKg: number;
};

export type DashboardWasteCategory = {
  category: string;
  weightKg: number;
  sharePercent: number;
};

export type DashboardPendingSalesApprovals = {
  count: number;
  isDataAvailable: boolean;
  message: string;
};

export type DashboardAnalyticsRange = {
  fromUtc: string;
  toUtc: string;
  label: string;
};

export type DashboardAnalyticsResponse = {
  range: DashboardAnalyticsRange;
  kpis: DashboardAnalyticsKpis;
  wasteByCategory: DashboardWasteCategory[];
  categoryDistribution: DashboardWasteCategory[];
  pendingSalesApprovals: DashboardPendingSalesApprovals;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/api/contracts.ts
git commit -m "types: add dashboard analytics DTO contracts"
```

---

### Task 2: Create date range converter utility

**Files:**
- Create: `src/features/dashboard/dateRangeConverter.ts`
- Test: `tests/unit/dashboard-date-range-converter.test.ts`

- [ ] **Step 1: Write failing tests for date range conversion**

Create `tests/unit/dashboard-date-range-converter.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { convertDashboardRangeToUtc } from '../../src/features/dashboard/dateRangeConverter';

describe('dashboard date range converter', () => {
  // Mock current date for consistent testing
  const now = new Date('2026-06-16T15:30:45Z');
  const mockNow = () => now;

  it('converts 7d range to start of day 6 days ago through end of today in UTC', () => {
    const result = convertDashboardRangeToUtc('7d', mockNow);
    // 6 days ago from 2026-06-16 = 2026-06-10 start of day
    // today = 2026-06-16 end of day
    expect(result.fromUtc).toBe('2026-06-10T00:00:00Z');
    expect(result.toUtc).toBe('2026-06-16T23:59:59Z');
  });

  it('converts 30d range to start of day 29 days ago through end of today in UTC', () => {
    const result = convertDashboardRangeToUtc('30d', mockNow);
    // 29 days ago from 2026-06-16 = 2026-05-18 start of day
    expect(result.fromUtc).toBe('2026-05-18T00:00:00Z');
    expect(result.toUtc).toBe('2026-06-16T23:59:59Z');
  });

  it('converts 90d range to start of day 89 days ago through end of today in UTC', () => {
    const result = convertDashboardRangeToUtc('90d', mockNow);
    // 89 days ago from 2026-06-16 = 2026-03-19 start of day
    expect(result.fromUtc).toBe('2026-03-19T00:00:00Z');
    expect(result.toUtc).toBe('2026-06-16T23:59:59Z');
  });

  it('handles boundary month transitions correctly', () => {
    const mayDate = new Date('2026-05-05T10:00:00Z');
    const result = convertDashboardRangeToUtc('7d', () => mayDate);
    expect(result.fromUtc).toBe('2026-04-29T00:00:00Z');
    expect(result.toUtc).toBe('2026-05-05T23:59:59Z');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run tests/unit/dashboard-date-range-converter.test.ts
```

Expected: FAIL with "convertDashboardRangeToUtc is not defined"

- [ ] **Step 3: Write minimal implementation**

Create `src/features/dashboard/dateRangeConverter.ts`:

```typescript
export type DateRange = '7d' | '30d' | '90d';

export function convertDashboardRangeToUtc(
  range: DateRange,
  now: () => Date = () => new Date(),
): { fromUtc: string; toUtc: string } {
  const currentDate = now();

  // Calculate days to subtract
  const daysToSubtract = range === '7d' ? 6 : range === '30d' ? 29 : 89;

  // Create start-of-day N days ago
  const startDate = new Date(currentDate);
  startDate.setUTCDate(startDate.getUTCDate() - daysToSubtract);
  startDate.setUTCHours(0, 0, 0, 0);

  // Create end-of-day today
  const endDate = new Date(currentDate);
  endDate.setUTCHours(23, 59, 59, 999);

  return {
    fromUtc: startDate.toISOString(),
    toUtc: endDate.toISOString(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --run tests/unit/dashboard-date-range-converter.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/dateRangeConverter.ts tests/unit/dashboard-date-range-converter.test.ts
git commit -m "feat: add dashboard date range to UTC converter"
```

---

### Task 3: Create dashboard service with mapping and fallback

**Files:**
- Create: `src/features/dashboard/dashboardService.ts`
- Test: `tests/unit/dashboard-service.test.ts`
- Reference: `src/shared/api/contracts.ts` (existing)

- [ ] **Step 1: Write failing tests for dashboard service**

Create `tests/unit/dashboard-service.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { dashboardService } from '../../src/features/dashboard/dashboardService';
import type { DashboardSummary } from '../../src/shared/api/contracts';

describe('dashboard service', () => {
  it('maps backend kpi fields to frontend summary', () => {
    const backendResponse = {
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
      ],
      categoryDistribution: [],
      pendingSalesApprovals: { count: 2, isDataAvailable: true, message: '' },
    };

    const result = dashboardService.mapBackendToDashboardSummary(backendResponse);

    expect(result.totalWasteProcessedKg).toBe(1000);
    expect(result.revenueINR).toBe(50000);
    expect(result.recyclingEfficiencyPct).toBe(75);
    expect(result.co2ReductionKg).toBe(500);
    expect(result.byCategory.plastic).toBe(400);
    expect(result.byCategory.organic).toBe(600);
  });

  it('initializes all categories to 0 before mapping', () => {
    const backendResponse = {
      range: { fromUtc: '2026-06-10T00:00:00Z', toUtc: '2026-06-16T23:59:59Z', label: '7d' },
      kpis: { totalWasteProcessedKg: 100, revenueInr: 5000, recyclingEfficiencyPercent: 50, co2ReductionKg: 50 },
      wasteByCategory: [{ category: 'plastic', weightKg: 100, sharePercent: 100 }],
      categoryDistribution: [],
      pendingSalesApprovals: { count: 0, isDataAvailable: true, message: '' },
    };

    const result = dashboardService.mapBackendToDashboardSummary(backendResponse);

    expect(result.byCategory.plastic).toBe(100);
    expect(result.byCategory.organic).toBe(0);
    expect(result.byCategory.metal).toBe(0);
    expect(result.byCategory.paper).toBe(0);
    expect(result.byCategory.ewaste).toBe(0);
  });

  it('falls back to categoryDistribution when wasteByCategory is empty', () => {
    const backendResponse = {
      range: { fromUtc: '2026-06-10T00:00:00Z', toUtc: '2026-06-16T23:59:59Z', label: '7d' },
      kpis: { totalWasteProcessedKg: 200, revenueInr: 10000, recyclingEfficiencyPercent: 60, co2ReductionKg: 100 },
      wasteByCategory: [],
      categoryDistribution: [
        { category: 'metal', weightKg: 200, sharePercent: 100 },
      ],
      pendingSalesApprovals: { count: 0, isDataAvailable: true, message: '' },
    };

    const result = dashboardService.mapBackendToDashboardSummary(backendResponse);

    expect(result.byCategory.metal).toBe(200);
  });

  it('ignores unknown category labels', () => {
    const backendResponse = {
      range: { fromUtc: '2026-06-10T00:00:00Z', toUtc: '2026-06-16T23:59:59Z', label: '7d' },
      kpis: { totalWasteProcessedKg: 300, revenueInr: 15000, recyclingEfficiencyPercent: 65, co2ReductionKg: 150 },
      wasteByCategory: [
        { category: 'plastic', weightKg: 100, sharePercent: 33.3 },
        { category: 'unknown_type', weightKg: 100, sharePercent: 33.3 },
        { category: 'organic', weightKg: 100, sharePercent: 33.3 },
      ],
      categoryDistribution: [],
      pendingSalesApprovals: { count: 0, isDataAvailable: true, message: '' },
    };

    const result = dashboardService.mapBackendToDashboardSummary(backendResponse);

    expect(result.byCategory.plastic).toBe(100);
    expect(result.byCategory.organic).toBe(100);
    // unknown_type is ignored, no field created
    expect((result.byCategory as any).unknown_type).toBeUndefined();
  });

  it('defaults missing numeric fields to 0', () => {
    const backendResponse = {
      range: { fromUtc: '2026-06-10T00:00:00Z', toUtc: '2026-06-16T23:59:59Z', label: '7d' },
      kpis: {
        totalWasteProcessedKg: undefined,
        revenueInr: undefined,
        recyclingEfficiencyPercent: undefined,
        co2ReductionKg: undefined,
      } as any,
      wasteByCategory: [],
      categoryDistribution: [],
      pendingSalesApprovals: { count: 0, isDataAvailable: true, message: '' },
    };

    const result = dashboardService.mapBackendToDashboardSummary(backendResponse);

    expect(result.totalWasteProcessedKg).toBe(0);
    expect(result.revenueINR).toBe(0);
    expect(result.recyclingEfficiencyPct).toBe(0);
    expect(result.co2ReductionKg).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run tests/unit/dashboard-service.test.ts
```

Expected: FAIL with "dashboardService is not defined"

- [ ] **Step 3: Write implementation**

Create `src/features/dashboard/dashboardService.ts`:

```typescript
import type { WasteCategory, DashboardSummary, DashboardAnalyticsResponse } from '../../shared/api/contracts';
import { requestJson } from '../../shared/services/http';
import { dashboardSummary as mockDashboardSummary } from '../../shared/api/mockData';

export const dashboardService = {
  async fetchDashboardAnalytics(params: {
    fromUtc: string;
    toUtc: string;
    wasteType?: string;
  }): Promise<DashboardSummary> {
    try {
      // Build query string, omitting wasteType if not provided
      const searchParams = new URLSearchParams({
        FromUtc: params.fromUtc,
        ToUtc: params.toUtc,
      });
      if (params.wasteType) {
        searchParams.set('WasteType', params.wasteType);
      }

      const response = await requestJson<DashboardAnalyticsResponse>(
        `/api/analytics/dashboard?${searchParams.toString()}`,
      );

      return this.mapBackendToDashboardSummary(response);
    } catch (error) {
      // Fallback to mock data on API failure
      console.warn('Dashboard API failed, falling back to mock data:', error);
      return this.mapBackendToDashboardSummary(this.getMockResponse());
    }
  },

  mapBackendToDashboardSummary(response: DashboardAnalyticsResponse): DashboardSummary {
    // Initialize all categories to 0
    const categoryMap: Record<WasteCategory, number> = {
      plastic: 0,
      organic: 0,
      metal: 0,
      paper: 0,
      ewaste: 0,
    };

    // Use wasteByCategory as primary, fallback to categoryDistribution
    const sourceCategories = response.wasteByCategory?.length > 0 
      ? response.wasteByCategory 
      : response.categoryDistribution || [];

    // Map backend categories to frontend keys, ignoring unknown categories
    sourceCategories.forEach((cat) => {
      const category = cat.category.toLowerCase() as WasteCategory;
      if (category in categoryMap) {
        categoryMap[category] = (cat.weightKg ?? 0) + (categoryMap[category] ?? 0);
      }
    });

    return {
      totalWasteProcessedKg: response.kpis?.totalWasteProcessedKg ?? 0,
      revenueINR: response.kpis?.revenueInr ?? 0,
      recyclingEfficiencyPct: response.kpis?.recyclingEfficiencyPercent ?? 0,
      co2ReductionKg: response.kpis?.co2ReductionKg ?? 0,
      byCategory: categoryMap,
      pendingSalesApprovals: {
        count: response.pendingSalesApprovals?.count ?? 0,
        isDataAvailable: response.pendingSalesApprovals?.isDataAvailable ?? false,
        message: response.pendingSalesApprovals?.message ?? '',
      },
    };
  },

  private getMockResponse(): DashboardAnalyticsResponse {
    // Convert mock DashboardSummary to backend response format
    return {
      range: {
        fromUtc: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        toUtc: new Date().toISOString(),
        label: '30d',
      },
      kpis: {
        totalWasteProcessedKg: mockDashboardSummary.totalWasteProcessedKg,
        revenueInr: mockDashboardSummary.revenueINR,
        recyclingEfficiencyPercent: mockDashboardSummary.recyclingEfficiencyPct,
        co2ReductionKg: mockDashboardSummary.co2ReductionKg,
      },
      wasteByCategory: Object.entries(mockDashboardSummary.byCategory).map(([category, weightKg]) => ({
        category,
        weightKg,
        sharePercent: (weightKg / mockDashboardSummary.totalWasteProcessedKg) * 100,
      })),
      categoryDistribution: [],
      pendingSalesApprovals: {
        count: 0,
        isDataAvailable: false,
        message: 'Mock data in use',
      },
    };
  },
};
```

- [ ] **Step 4: Update contracts to export pending approvals type in DashboardSummary**

Modify `src/shared/api/contracts.ts` to add pendingSalesApprovals to DashboardSummary. Find the line:

```typescript
export type DashboardSummary = {
  totalWasteProcessedKg: number;
  revenueINR: number;
  recyclingEfficiencyPct: number;
  co2ReductionKg: number;
  byCategory: Record<WasteCategory, number>;
};
```

Replace with:

```typescript
export type DashboardSummary = {
  totalWasteProcessedKg: number;
  revenueINR: number;
  recyclingEfficiencyPct: number;
  co2ReductionKg: number;
  byCategory: Record<WasteCategory, number>;
  pendingSalesApprovals: {
    count: number;
    isDataAvailable: boolean;
    message: string;
  };
};
```

- [ ] **Step 5: Update mock data to include pendingSalesApprovals**

Modify `src/shared/api/mockData.ts` in the dashboardSummary object. Find:

```typescript
export const dashboardSummary: DashboardSummary = {
  totalWasteProcessedKg: 1840,
  revenueINR: 42500,
  recyclingEfficiencyPct: 78,
  co2ReductionKg: 920,
  byCategory: { plastic: 480, organic: 620, metal: 310, paper: 270, ewaste: 160 },
};
```

Replace with:

```typescript
export const dashboardSummary: DashboardSummary = {
  totalWasteProcessedKg: 1840,
  revenueINR: 42500,
  recyclingEfficiencyPct: 78,
  co2ReductionKg: 920,
  byCategory: { plastic: 480, organic: 620, metal: 310, paper: 270, ewaste: 160 },
  pendingSalesApprovals: {
    count: 0,
    isDataAvailable: false,
    message: 'Backend sales listing not yet available',
  },
};
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- --run tests/unit/dashboard-service.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/dashboard/dashboardService.ts tests/unit/dashboard-service.test.ts src/shared/api/contracts.ts src/shared/api/mockData.ts
git commit -m "feat: add dashboard service with API call, mapping, and fallback"
```

---

### Task 4: Update dashboard hook to use service and build query params

**Files:**
- Modify: `src/features/dashboard/useDashboardData.ts`
- Reference: `src/features/dashboard/dateRangeConverter.ts`
- Reference: `src/features/dashboard/dashboardService.ts`

- [ ] **Step 1: Replace hook implementation**

Modify `src/features/dashboard/useDashboardData.ts`. Replace entire file with:

```typescript
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from './dashboardService';
import { convertDashboardRangeToUtc } from './dateRangeConverter';
import type { DashboardFilters } from './filters';
import { buildDashboardFilterKey } from './filters';

export function useDashboardData(filters: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard', 'summary', buildDashboardFilterKey(filters)],
    queryFn: async () => {
      const { fromUtc, toUtc } = convertDashboardRangeToUtc(filters.range);
      return dashboardService.fetchDashboardAnalytics({
        fromUtc,
        toUtc,
        wasteType: filters.wasteType === 'all' ? undefined : filters.wasteType,
      });
    },
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: Run existing dashboard tests to verify no breakage**

```bash
npm test -- --run tests/unit/dashboard-filters.test.ts tests/unit/mock-api.test.ts
```

Expected: PASS (mock test may need the new pendingSalesApprovals field, adjust if needed)

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/useDashboardData.ts
git commit -m "feat: update dashboard hook to use service with filter-derived query params"
```

---

### Task 5: Remove inventory approvals hook from dashboard page

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Remove inventory approvals import and hook usage**

Find the import:

```typescript
import { usePendingSalesForApproval } from '../inventory/useInventoryApproval';
```

Delete it.

Find the line:

```typescript
const { isUnavailable: approvalQueueUnavailable } = usePendingSalesForApproval();
```

Delete it.

- [ ] **Step 2: Update pending approvals card to use dashboard summary data**

Find this section in DashboardPage:

```typescript
{isAdmin && (
  <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-5 shadow-lg shadow-slate-950/30">
    <h2 className="mb-2 text-sm font-semibold text-amber-200">Pending Sales Approvals</h2>
    <p className="text-sm text-amber-100">
      {approvalQueueUnavailable
        ? 'Approval queue is temporarily unavailable because the backend does not yet expose a sales listing endpoint.'
        : 'No pending sales approvals.'}
    </p>
  </div>
)}
```

Replace with:

```typescript
{isAdmin && (
  <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-5 shadow-lg shadow-slate-950/30">
    <h2 className="mb-2 text-sm font-semibold text-amber-200">Pending Sales Approvals</h2>
    <p className="text-sm text-amber-100">
      {summary && !summary.pendingSalesApprovals.isDataAvailable
        ? summary.pendingSalesApprovals.message
        : summary?.pendingSalesApprovals.count
          ? `${summary.pendingSalesApprovals.count} pending for approval`
          : 'No pending sales approvals.'}
    </p>
  </div>
)}
```

- [ ] **Step 3: Run component tests to verify dashboard still renders**

```bash
npm test -- --run tests/component/app-shell.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx
git commit -m "feat: use unified dashboard payload for pending approvals card"
```

---

### Task 6: Verify integration with mock and test fallback

**Files:**
- Test: `tests/unit/mock-api.test.ts` (update existing test)
- Test: `tests/component/dashboard.test.tsx` (if exists, verify; if not, verify no regressions in e2e)

- [ ] **Step 1: Update mock API test to expect pending approvals in summary**

Find in `tests/unit/mock-api.test.ts` the test:

```typescript
it('returns dashboard summary with co2 reduction', async () => {
  const result = await api.dashboard.getSummary();
  expect(result.co2ReductionKg).toBeGreaterThan(0);
});
```

Replace with:

```typescript
it('returns dashboard summary with co2 reduction and pending approvals', async () => {
  const result = await api.dashboard.getSummary();
  expect(result.co2ReductionKg).toBeGreaterThan(0);
  expect(result.pendingSalesApprovals).toBeDefined();
  expect(result.pendingSalesApprovals.isDataAvailable).toBe(false); // Mock indicates unavailable
});
```

- [ ] **Step 2: Run full test suite for dashboard and related modules**

```bash
npm test -- --run tests/unit/dashboard-*.test.ts tests/unit/mock-api.test.ts tests/component/ --grep "dashboard|Dashboard|inventory|Inventory"
```

Expected: All tests pass

- [ ] **Step 3: Optional: Verify dashboard page renders with new data flow locally**

Start dev server and navigate to dashboard page if running backend locally. Inspect Network tab to see GET /api/analytics/dashboard call (or fallback to mock if backend unavailable).

- [ ] **Step 4: Commit**

```bash
git add tests/unit/mock-api.test.ts
git commit -m "test: verify dashboard summary includes pending approvals"
```

---

### Task 7: Final cleanup and verification

**Files:**
- (All previously modified)

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass, no regressions

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Verify git history**

```bash
git log --oneline | head -10
```

Expected: Recent commits match the feature branch work

- [ ] **Step 4: Create a final summary commit or squash if needed**

If you prefer, squash all feature commits:

```bash
git rebase -i HEAD~7
```

Or leave as-is for clear task history. For now, just verify history is clean:

```bash
git log --oneline feat/dashboard-api-integration...main
```

Expected: 7 feature commits on top of main branch

---

## Spec Coverage Checklist

✓ Dashboard data fetched from backend endpoint with filter-derived query params (Task 4)
✓ Dashboard page does not depend on legacy dashboard mock in success path (Task 4, Task 3)
✓ Dashboard page falls back to mock when API fails (Task 3: getMockResponse fallback)
✓ Pending approvals card uses dashboard API payload only (Task 5)
✓ Date range conversion for 7d/30d/90d with local-to-UTC (Task 2)
✓ KPI, category, and pending approvals mapping rules (Task 3)
✓ Defensive defaults and unknown category handling (Task 3)
✓ Unit and component tests for mapping/conversion/fallback (Task 2, Task 3, Task 6)

All spec requirements are covered by tasks.
