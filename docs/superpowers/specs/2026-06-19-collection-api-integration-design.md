# Collection API Integration Design

Date: 2026-06-19
Project: EcoTrack Collection API Integration
Status: Draft for review

## 1. Goal and Scope

Goal:
- Replace collection mock data usage with real backend data from the collection pickup APIs.

In scope:
- Collection page data source migration to backend APIs
- DTO-to-frontend model mapping for pickup tasks and assignment history
- Real API mutations for create, update, delete, assign, mark-collected, and send-to-segregation flows
- Compact hover tooltip for assignment history on each pickup row
- Focused unit and component test updates related to this integration

Out of scope:
- Collection page visual redesign
- New collection workflows beyond the exposed API surface
- Global replacement of mocks in non-collection modules

## 2. Final Decisions Captured

1. Page structure:
- Keep the current collection table and modal-driven workflow.
- Do not introduce a full detail page or drawer for this change.

2. History display:
- Add a small history/info icon in the row actions area.
- On hover, show a compact human-readable summary of assignment history.
- The tooltip should summarize who changed the assignment, when it changed, and the note.

3. API-first behavior:
- Use the real pickup APIs as the primary data source for the collection page.
- Keep a deterministic fallback to existing mock behavior only where the backend is unavailable or a specific read path still lacks coverage.

4. Integration approach:
- Minimal patch approach that preserves the existing collection page structure while replacing mock-backed behavior.

## 3. Architecture and Boundaries

### 3.1 Existing UI preserved

The collection page layout stays table-first with modal forms for create and edit actions. The main UI change is the addition of a history icon and tooltip in each pickup row.

### 3.2 Data retrieval path

- Keep the collection hook as the page data entry point.
- Replace current mock-backed reads and writes with real API calls under the shared API client.
- Keep React Query-based caching and invalidation around pickup and segregation data.
- Normalize the pickup list response so the service can accept either a paginated envelope or a direct items array.

### 3.3 Mapping boundary

- Introduce explicit mapping from backend pickup DTOs into frontend row models.
- Keep assignment-history formatting isolated from the row rendering component.
- Ensure deterministic and defensive handling for missing or partial backend fields.

## 4. API Contract and Mapping Rules

Primary endpoints:
- `GET /api/collection/pickups`
- `POST /api/collection/pickups`
- `GET /api/collection/pickups/{id}`
- `PUT /api/collection/pickups/{id}`
- `DELETE /api/collection/pickups/{id}`
- `POST /api/collection/pickups/{id}/assign`
- `POST /api/collection/pickups/{id}/mark-collected`
- `POST /api/collection/pickups/{id}/send-to-segregation`
- `GET /api/collection/pickups/{id}/assignment-history`

### 4.1 Pickup list mapping

Frontend rows should derive from the pickup list response and expose at least:
- `id`
- `pickupCode`
- `siteName`
- `siteAddressText`
- `scheduledAtUtc`
- `estimatedWeightKg`
- `collectedWeightKg`
- `status`
- `assignedCollectorUserId`
- `assignedCollectorDisplayName`
- `notes`

The list service should treat the current page as a single visible collection list and use backend defaults for paging unless the UI adds explicit pager controls later.

### 4.2 Assignment history mapping

- Use the assignment-history endpoint to load history for a pickup when needed by the tooltip.
- Render history as a compact summary string per event, not a raw JSON dump.
- Recommended summary format: `Changed by <name> at <local date/time> — <note>`.
- If a field is missing, fall back to a safe placeholder such as `Unknown user` or `No note provided`.

### 4.3 Defensive defaults

- Missing arrays are treated as empty arrays.
- Missing numeric fields default to `0`.
- Missing text fields default to empty strings or a placeholder in the tooltip.
- Mapping never throws due to partial payloads.

## 5. Filter Conversion and Query Behavior

### 5.1 List query behavior

- Preserve the current list page behavior and load pickups using the backend defaults for the visible table.
- Normalize the pickup list response so the service accepts either a paginated envelope or a direct items array.
- Keep the query key deterministic so the list refreshes correctly if paging or sorting controls are added later.

### 5.2 Mutation behavior

- On create, update, delete, assign, mark-collected, or send-to-segregation success, invalidate the pickup list query.
- If a row’s history tooltip has been opened, invalidate or refetch the specific assignment-history query for that pickup when assignment-related mutations succeed.

## 6. Failure and Fallback Behavior

Flow:
1. Attempt backend pickup API call.
2. If successful, map backend response and return API-backed collection data.
3. If a read path fails and a legacy mock fallback remains available, return the existing mock data path instead of crashing the page.

Mutation failures should surface normally so the user can see the action did not complete.

Expected UX effect:
- Collection remains usable if a read request fails.
- The page does not crash because one pickup API endpoint is unavailable.

## 7. Component Behavior Updates

Collection page updates:
- Continue rendering the table, status controls, and modal workflow from the unified pickup model.
- Replace raw dummy data with backend-sourced pickup rows.
- Add a history icon in each row.
- Show a hover tooltip with compact assignment-history summaries for that pickup.
- Keep action buttons and locked-after-collection behavior consistent with backend status.

## 8. Testing Strategy

### 8.1 Unit tests

Add or update tests for:
- Pickup DTO mapping correctness
- Assignment-history summary formatting
- Default handling for missing pickup and history fields
- Query parameter conversion for list reads if paging/sorting is wired in

### 8.2 Hook/service behavior tests

Add or update tests for:
- API success path returns mapped pickup data
- Assignment-history fetch returns formatted tooltip content
- Mutation success paths invalidate the relevant pickup queries

### 8.3 Component tests

Update collection-specific assertions so the page uses the real pickup API model and the history icon tooltip reflects assignment history summaries.

## 9. Risks and Mitigations

Risk:
- Backend pickup field names may not match the current simplified frontend model.
Mitigation:
- Use a dedicated mapper so UI code only sees stable frontend fields.

Risk:
- Assignment history can become difficult to read if too much information is shown in a tooltip.
Mitigation:
- Keep the tooltip compact and line-based, with only who, when, and note.

Risk:
- Silent fallback may mask backend outages.
Mitigation:
- Keep fallback deterministic and test-covered; surface read failures in the page state where appropriate.

## 10. Acceptance Criteria

1. Collection data is fetched from backend pickup endpoints instead of raw dummy data.
2. CRUD, assign, mark-collected, and send-to-segregation actions use real API calls.
3. Each pickup row includes a history icon with a hover tooltip.
4. The tooltip shows a compact human-readable assignment-history summary.
5. Targeted unit and component tests for mapping, tooltip formatting, and mutation behavior pass.