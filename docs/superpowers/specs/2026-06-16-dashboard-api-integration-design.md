# Dashboard API Integration Design

Date: 2026-06-16
Project: EcoTrack Dashboard API Integration
Status: Draft for review

## 1. Goal and Scope

Goal:
- Replace dashboard mock data usage with real backend data from `GET /api/analytics/dashboard`.

In scope:
- Dashboard page data source migration to backend API
- Filter-to-query parameter conversion (`FromUtc`, `ToUtc`, `WasteType`)
- Backend DTO to frontend model mapping
- API failure fallback to existing mock dashboard data
- Pending approvals panel sourced only from dashboard API response
- Focused unit and component test updates related to this integration

Out of scope:
- Dashboard visual redesign
- Global replacement of mocks in non-dashboard modules
- New analytics endpoints beyond dashboard summary endpoint

## 2. Final Decisions Captured

1. Date range behavior:
- Use local calendar windows and convert to UTC before sending query params.
- `7d` = start of day 6 days ago to end of today.
- `30d` = start of day 29 days ago to end of today.
- `90d` = start of day 89 days ago to end of today.

2. Error behavior:
- Dashboard is API-first with fallback to existing mock summary data when API call fails.

3. Pending approvals source:
- Use only `pendingSalesApprovals` from dashboard API response.
- Remove separate inventory approvals fetch from dashboard page.

4. Integration approach:
- Minimal patch approach that preserves existing dashboard page structure while replacing data source behavior.

## 3. Architecture and Boundaries

### 3.1 Existing UI preserved

The dashboard page layout, cards, charts, and table remain in place. Integration work stays in data retrieval and mapping paths.

### 3.2 Data retrieval path

- Keep dashboard hook as the dashboard page data entry point.
- Replace current call to legacy dashboard mock summary with real API call.
- Keep React Query-based caching behavior with deterministic query keys tied to filters.

### 3.3 Mapping boundary

- Introduce explicit mapping from backend dashboard DTO to frontend dashboard summary model.
- Keep mapping logic isolated from UI rendering concerns.
- Ensure deterministic and defensive handling for missing/partial backend fields.

## 4. API Contract and Mapping Rules

Endpoint:
- `GET /api/analytics/dashboard`

Query parameters:
- `FromUtc` (string, date-time)
- `ToUtc` (string, date-time)
- `WasteType` (string, optional)

Response shape includes:
- `range`
- `kpis`
- `wasteByCategory`
- `categoryDistribution`
- `pendingSalesApprovals`

### 4.1 KPI mapping

Frontend fields are mapped as:
- `totalWasteProcessedKg` <- `kpis.totalWasteProcessedKg`
- `revenueINR` <- `kpis.revenueInr`
- `recyclingEfficiencyPct` <- `kpis.recyclingEfficiencyPercent`
- `co2ReductionKg` <- `kpis.co2ReductionKg`

### 4.2 Category mapping

- Primary source: `wasteByCategory`
- Secondary source: `categoryDistribution` when primary is absent or empty
- Normalize incoming category names to supported frontend keys:
  - `plastic`, `organic`, `metal`, `paper`, `ewaste`
- Unknown categories are ignored.
- Initialize all supported categories to `0` before applying values.

### 4.3 Pending approvals mapping

- Use `pendingSalesApprovals.count`, `pendingSalesApprovals.isDataAvailable`, and `pendingSalesApprovals.message`.
- Admin panel behavior is driven by this block only.
- No secondary approvals source is queried by dashboard page.

### 4.4 Defensive defaults

- Missing numeric fields default to `0`.
- Missing arrays are treated as empty arrays.
- Mapping never throws due to partial payloads.

## 5. Filter Conversion and Query Behavior

### 5.1 Date range conversion

For selected range in local timezone:
1. Compute local start-of-day boundary.
2. Compute local end-of-day boundary.
3. Convert both to UTC ISO strings.
4. Send as `FromUtc` and `ToUtc` query params.

### 5.2 Waste type conversion

- If `wasteType` is `all`, omit `WasteType` query parameter.
- Otherwise include selected category value.

### 5.3 Query keys and stale time

- Keep query key deterministic from existing filter key generation.
- Keep stale time at 60 seconds.

## 6. Failure and Fallback Behavior

Flow:
1. Attempt backend dashboard API call.
2. If successful, map backend response and return API-backed summary.
3. If API fails, return mapped existing mock dashboard summary data.

Expected UX effect:
- Dashboard remains functional even when backend is unavailable.
- Existing page does not crash due to dashboard endpoint failures.

## 7. Component Behavior Updates

Dashboard page updates:
- Continue rendering KPI cards, charts, and category table from unified summary model.
- Remove dependency on inventory approvals hook for pending approvals section.
- Pending approvals card reads only dashboard summary pending approvals data.

## 8. Testing Strategy

### 8.1 Unit tests

Add or update tests for:
- KPI mapping correctness
- Category mapping priority and unknown-category ignore behavior
- Default handling for missing payload fields
- Date-range conversion for `7d`, `30d`, and `90d`
- WasteType query omission/inclusion behavior

### 8.2 Hook/service behavior tests

Add or update tests for:
- API success path returns mapped API data
- API failure path returns mapped mock fallback data without throwing

### 8.3 Component tests

Update dashboard-specific assertions so admin pending approvals card behavior is driven by unified dashboard payload and not inventory approvals hook.

## 9. Risks and Mitigations

Risk:
- Backend category labels may not exactly match frontend category keys.
Mitigation:
- Use explicit category normalization map and ignore unknown labels safely.

Risk:
- Time boundary mismatches across timezones.
Mitigation:
- Use explicit local start/end-of-day conversion rules and unit tests for conversion behavior.

Risk:
- Silent fallback may mask backend outages.
Mitigation:
- Keep fallback deterministic and test-covered; optionally expose a source flag for future non-blocking UI notice.

## 10. Acceptance Criteria

1. Dashboard data is fetched from backend endpoint with filter-derived query params.
2. Dashboard page does not depend on legacy dashboard mock in normal success path.
3. Dashboard page falls back to existing mock summary only when API request fails.
4. Pending approvals card uses `pendingSalesApprovals` from dashboard API payload only.
5. All targeted unit/component tests for mapping, conversion, and fallback behavior pass.
