# Immediate Record Reflection Design

Date: 2026-07-03
Project: EcoTrack immediate record reflection
Status: Draft for review

## 1. Goal and Scope

Goal:
- Make newly created records appear immediately in collection and inventory views after the create API succeeds, without requiring a manual page reload.

In scope:
- Collection task creation immediately updates the visible schedule list.
- Inventory sale draft creation immediately updates the visible sales list and latest-draft panel.
- Shared cache-update behavior for React Query create mutations.
- Focused test updates that prove the new records are visible right after mutation success.

Out of scope:
- Backend API changes.
- Visual redesign of collection or inventory pages.
- Broader optimistic editing for non-create actions unless it is needed to keep the created row visible.

## 2. Final Decisions Captured

1. Immediate update strategy:
- Use the create mutation response to update the relevant React Query cache immediately.
- Keep invalidation after the cache write so the backend remains the source of truth.

2. Scope of the shared fix:
- Apply the pattern to collection task creation and inventory sale draft creation.
- Keep the behavior reusable so additional create flows can use the same helper later.

3. User-visible behavior:
- The new row should appear in the list as soon as the mutation succeeds.
- The page should not depend on a manual reload or a delayed refetch to show the new record.

4. Failure behavior:
- If the create request fails, do not alter the cache.
- Preserve the existing mutation error handling and page state behavior.

## 3. Architecture and Boundaries

### 3.1 Shared cache update helper

Create a small helper layer around the create mutation success path so page components do not each reimplement the same cache logic. The helper will accept the returned record, the relevant query key, and a list of related keys to invalidate.

This helper should stay narrow:
- It updates one primary list cache.
- It can also update any secondary local state that is already rendered from the mutation result, such as the inventory latest-draft panel.
- It does not own data fetching or request construction.

### 3.2 Collection page boundary

Collection task creation already flows through React Query mutation hooks. The change is to make those hooks write the returned pickup task into the collection schedule cache before invalidating the schedule query.

The collection page should keep its existing modal and table layout. The visible effect is only that a newly created task appears in the list right away.

### 3.3 Inventory page boundary

Inventory sale draft creation should update the sales list cache immediately and keep the `latestDraft` panel in sync with the newly returned draft.

If the inventory page later adds more create flows, they should reuse the same immediate-update pattern so list refresh behavior stays consistent.

## 4. Data Flow and Behavior

### 4.1 Collection create flow

1. User submits the create pickup task form.
2. The mutation calls the collection API.
3. On success, the returned pickup task is inserted into the `['collection', 'schedule']` cache.
4. The schedule query is invalidated to reconcile with the backend.
5. The newly created task is visible immediately in the table.

### 4.2 Inventory create flow

1. User submits the sale draft form.
2. The mutation calls the inventory sales API.
3. On success, the returned draft is written into the `['inventory', 'sales']` cache.
4. The page updates `latestDraft` from the returned record so the draft panel reflects the same entity.
5. The sales query is invalidated to reconcile with the backend.

### 4.3 Cache consistency rules

- The cache update must use the record returned by the API, not a locally fabricated copy.
- The cache update should preserve existing ordering expectations used by the list views.
- When inserting into a list cache, avoid duplicating the same record if it is already present.
- Invalidation remains a follow-up reconciliation step, not the mechanism that makes the record visible.

## 5. Error Handling

If the create request fails:
- Leave the cache unchanged.
- Keep the current error handling path and loader behavior.
- Do not insert a placeholder record.

If the create request succeeds but the cache write fails unexpectedly:
- Prefer a safe fallback to invalidation so the next refetch can restore correctness.
- The page should still not require manual reload if the backend response is valid and the cache update succeeds.

## 6. Testing Strategy

### 6.1 Unit tests

Add or update tests for:
- The shared cache helper updates the primary list with the created record.
- Duplicate insertion is avoided when the same record is already present.
- Inventory helper behavior keeps the latest-draft state aligned with the mutation result.

### 6.2 Component tests

Add or update tests for:
- Collection page shows a newly created pickup task immediately after create success.
- Inventory page shows a newly created sale draft immediately after create success.
- The relevant visible row or draft panel is present without a manual reload.

### 6.3 Regression checks

Keep the existing success-path API tests so the create mutations still call the expected endpoints and return mapped records.

## 7. Risks and Mitigations

Risk:
- List order may shift if the new record is inserted differently than the backend would return it.
Mitigation:
- Use the returned API record and follow the current list ordering used by each page.

Risk:
- A local cache write could diverge from the backend state if the backend applies extra server-side fields.
Mitigation:
- Keep invalidation after cache writes so the page reconciles with the backend response.

Risk:
- Similar create flows might diverge if each page hand-rolls its own cache update logic.
Mitigation:
- Factor the behavior into a shared helper instead of duplicating it in the page components.

## 8. Acceptance Criteria

1. Creating a pickup task on the collection page makes the new row visible immediately.
2. Creating a sale draft on the inventory page makes the new row visible immediately.
3. The inventory latest-draft panel updates from the same create response.
4. The UI no longer depends on a manual reload to show created records.
5. Targeted tests cover the immediate-visibility behavior for both pages.