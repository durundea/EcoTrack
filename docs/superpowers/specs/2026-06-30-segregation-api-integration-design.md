# Segregation API Integration Design

Date: 2026-06-30
Project: EcoTrack Segregation API Integration
Status: Draft for review

## 1. Goal and Scope

Goal:
- Replace segregation mock data usage with real backend data from the segregation APIs.

In scope:
- Segregation page data source migration to backend APIs
- Pending segregation queue integration for the record form dropdown
- Real API mutations for recording segregation weights and marking batches as recycled
- Read-only detail popup for batch context and timestamps
- Focused unit and component test updates related to this integration

Out of scope:
- Visual redesign of the segregation page
- Recycling page workflow changes beyond reflecting updated segregation status through existing downstream data flow
- Silent mock fallback for segregation reads or writes

## 2. Final Decisions Captured

1. Page structure:
- Keep the current segregation page layout with the top record form and bottom history table.

2. Pending queue source:
- The dropdown should be populated from `GET /api/segregation/batches/pending`.
- These entries represent waste that has already been collected and sent to segregation from the collection workflow.

3. Record behavior:
- Selecting a dropdown entry binds the pending segregation batch `id`.
- Saving the form should call `POST /api/segregation/batches/{id}/record` with the five category weights.

4. History behavior:
- The table should load from `GET /api/segregation/batches`.
- A popup should load `GET /api/segregation/batches/{id}` for full batch details.

5. Recycling handoff:
- The segregation page should expose a direct `Send to Recycling` row action.
- That action should call `POST /api/segregation/batches/{id}/mark-recycled` with no extra form.

6. Mock removal:
- The segregation page should stop using dummy segregation data entirely.
- Read and mutation failures should surface in the UI instead of falling back silently.

## 3. Architecture and Boundaries

### 3.1 Existing UI preserved

The existing page structure stays in place:
- top form for recording segregation weights
- bottom table for segregation history

The only UI additions are:
- a read-only detail popup for a selected batch
- a row action for sending a segregated batch to recycling

### 3.2 Data entry points

- `GET /api/segregation/batches/pending` drives the dropdown queue.
- `GET /api/segregation/batches` drives the compact history table.
- `GET /api/segregation/batches/{id}` drives the popup detail view.
- `POST /api/segregation/batches/{id}/record` records category weights.
- `POST /api/segregation/batches/{id}/mark-recycled` advances the batch out of segregation and into recycling.

### 3.3 Integration boundary

- Replace `api.segregation` in the shared API client so it points to a real segregation service instead of the legacy segregation mock facade.
- Keep request mapping and DTO normalization inside the segregation service.
- Keep `SegregationPage` focused on rendering, local form state, popup state, and query/mutation wiring.

### 3.4 Query behavior

- Pending queue, history list, and detail view should have distinct React Query keys.
- After a successful record or mark-recycled mutation, invalidate the pending queue and history list queries.
- If the detail popup is open for the same batch, invalidate or refetch the detail query so the popup reflects the latest backend state.

## 4. API Contract and Mapping Rules

Primary endpoints:
- `GET /api/segregation/batches`
- `GET /api/segregation/batches/pending`
- `GET /api/segregation/batches/{id}`
- `POST /api/segregation/batches/{id}/record`
- `POST /api/segregation/batches/{id}/mark-recycled`

### 4.1 Pending queue mapping

Pending queue entries should expose at least:
- `id`
- `pickupTaskId`
- `batchCode`
- `pickupCode`
- `status`
- `recordedAtUtc`
- `recycledAtUtc`

Recommended dropdown label format:
- `batchCode | pickupCode | status`
- append recorded timestamp only when present

The UI should omit empty placeholders for missing timestamps.

### 4.2 History list mapping

History rows should map from the list response into a stable frontend table model exposing at least:
- `id`
- `batchCode`
- `pickupTaskId`
- `pickupCode`
- `status`
- `recordedAtUtc`
- `recycledAtUtc`

The existing compact table can remain, but the column values should come from the backend response instead of the legacy grouped mock object.

### 4.3 Detail mapping

Detail responses should map into a popup model exposing at least:
- `id`
- `batchCode`
- `status`
- `pickupTaskId`
- `pickupCode`
- `siteName`
- `siteAddressText`
- `scheduledAtUtc`
- `collectedWeightKg`
- `plasticKg`
- `organicKg`
- `metalKg`
- `paperKg`
- `eWasteKg`
- `recordedByUserId`
- `recordedAtUtc`
- `recycledByUserId`
- `recycledAtUtc`
- `createdAtUtc`
- `updatedAtUtc`

### 4.4 Record payload mapping

The record mutation request body should send:
- `plasticKg`
- `organicKg`
- `metalKg`
- `paperKg`
- `eWasteKg`

These fields should map directly from the current form inputs.

### 4.5 Defensive defaults

- Missing numeric fields default to `0` for display.
- Missing text fields default to empty strings or a safe placeholder in the popup.
- Missing timestamps remain blank rather than rendering invalid date strings.
- Mapping logic should not throw on partial but valid backend payloads.

## 5. Component Behavior

### 5.1 Record form

- The top form loads pending segregation batches from the backend queue.
- Only pending entries are shown in the dropdown.
- The selected option stores the backend batch `id`.
- Client-side validation remains in place before submit:
  - no negative values
  - total weight must be greater than zero
  - a pending batch selection is required
- On success:
  - reset the weight inputs
  - clear the selected batch
  - clear any form error
  - refresh the pending queue and history list

### 5.2 History table

- The bottom table loads from `GET /api/segregation/batches`.
- Rows should show compact operational fields and current status.
- The page should keep history visible after a batch is recycled.
- Recycled batches should no longer appear in the pending dropdown.

### 5.3 Detail popup

- Opening a row or explicit view action should fetch batch detail by `id`.
- The popup is read-only.
- It should show site context, timing, recorded data, recycled data, and waste category weights.

### 5.4 Send to Recycling action

- Each eligible history row should expose a `Send to Recycling` action.
- Clicking it should directly call `POST /api/segregation/batches/{id}/mark-recycled`.
- No additional confirmation form is required by this design.
- On success:
  - refresh pending queue and history list
  - refresh the active detail popup if it is open for that batch

## 6. Failure Behavior

Read failures:
- Show an inline error state for pending queue, history list, or detail popup failures.
- Do not silently fall back to legacy segregation mock data.

Mutation failures:
- Preserve the current form values or row state.
- Show the backend or mapped error to the user.
- Do not optimistically remove pending entries or rewrite history rows.

Expected UX effect:
- The operator can see when backend segregation data is unavailable.
- The page state remains stable when a record or recycle action fails.

## 7. Testing Strategy

### 7.1 Unit tests

Add or update tests for:
- pending queue response mapping
- history list response mapping
- detail response mapping
- record payload construction
- mark-recycled request behavior
- defensive defaults for missing optional fields

### 7.2 Component tests

Add or update tests for:
- pending batches populating the dropdown
- successful record submission refreshing the page state
- history rows rendering backend segregation data
- opening the detail popup and showing detail fields
- triggering `Send to Recycling` and refreshing visible state afterward

### 7.3 Existing validation coverage

- Keep the current segregation validation tests.
- Extend them only if the frontend validation surface changes.

## 8. Risks and Mitigations

Risk:
- The backend list response may not contain all fields currently shown in the mock-backed history table.
Mitigation:
- Keep the list table compact and derive only from guaranteed list fields; use the detail popup for richer fields.

Risk:
- Recorded and recycled timestamps may be absent depending on batch lifecycle state.
Mitigation:
- Treat lifecycle timestamps as optional and render blanks instead of invalid values.

Risk:
- The current segregation page model is built around mock-specific grouped weights.
Mitigation:
- Introduce a dedicated segregation mapper so UI code works against a stable frontend shape.

## 9. Acceptance Criteria

1. The segregation dropdown shows backend pending entries representing waste already sent from collection into segregation.
2. Saving a batch calls `POST /api/segregation/batches/{id}/record` with the category weights from the form.
3. The segregation history table loads from `GET /api/segregation/batches`.
4. The page no longer uses legacy segregation mock data.
5. A popup can load `GET /api/segregation/batches/{id}` and show full batch details.
6. `Send to Recycling` calls `POST /api/segregation/batches/{id}/mark-recycled`.
7. After record or mark-recycled succeeds, the pending queue and history list refresh to reflect backend state.
8. Read and mutation failures are surfaced in the page instead of being hidden by dummy data fallback.