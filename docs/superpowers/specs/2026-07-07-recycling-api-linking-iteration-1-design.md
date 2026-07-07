# Recycling API Linking Iteration 1 Design

## Overview

This design links the core operational flow end-to-end for EcoTrack:

Collection -> Segregation -> Recycling -> Inventory.

Iteration 1 focuses on backend readiness with minimal disruption to existing frontend behavior:
- Recycling batches are automatically created when segregation is recorded.
- One recycling batch is created per non-zero segregation category.
- Inventory updates remain manual from the Recycling page via push action.

## Goals

- Create a reliable linkage from segregation records to recycling batches.
- Replace recycling legacy mock flow with real backend APIs for list and stage progression.
- Preserve manual inventory sync from recycling conversions in iteration 1.
- Ensure full traceability across pickup task, segregation batch, recycling batch, conversion, and inventory update.

## Non-Goals

- No automatic inventory publish on conversion.
- No redesign of existing collection and segregation UI structure.
- No broad unrelated refactor across modules.

## Constraints and Decisions

- Trigger for recycling batch creation: automatic on segregation save.
- Inventory movement timing: manual push from Recycling page.
- Batch granularity: one recycling batch per non-zero segregation category.

## Approaches Considered

### 1) Event-driven internal pipeline (recommended)

On segregation save, emit category-ready events and let recycling consume those events to create batches.

Pros:
- Clean module boundaries.
- Easy path to durable queues and retries later.
- Better long-term scalability and reliability.

Cons:
- Slightly more implementation complexity in iteration 1.

### 2) Direct service call chain

Segregation service directly calls recycling service in the same request path.

Pros:
- Fast initial implementation.

Cons:
- Tighter coupling and lower flexibility.

### 3) Database-triggered linkage

Database trigger or stored logic creates recycling rows after segregation write.

Pros:
- Strong data-level coupling.

Cons:
- Harder to test and evolve within service-layer architecture.

## Selected Approach

Iteration 1 uses a lightweight event-driven internal pipeline.

Implementation may run in-process initially, while preserving event-style boundaries so the same contract can later move to durable async transport without changing module APIs.

## Architecture

1. Segregation API records weights and persists segregation state.
2. For each category with weight > 0, emit SegregationCategoryReadyForRecycling.
3. Recycling module consumes event and creates recycling batch with stage segregated.
4. Recycling API provides list and stage transition operations.
5. Conversion records are created from converted batches.
6. Inventory sync endpoint processes unsynced conversions when manually triggered from Recycling page.

This preserves current frontend flow while enabling full backend linkage.

## Component Boundaries and API Contracts

### Segregation API

Endpoint:
- POST /api/segregation/batches/{id}/record

Request body:
- plasticKg
- organicKg
- metalKg
- paperKg
- eWasteKg

Response extension for iteration 1:
- createdRecyclingBatchIds: string[]
- createdRecyclingCount: number

Responsibilities:
- Validate segregation payload.
- Persist segregation measurements.
- Emit one event per non-zero category.

### Recycling API

Endpoints:
- GET /api/recycling/batches?page=&pageSize=
- POST /api/recycling/batches/{id}/advance-stage
- POST /api/recycling/batches/{id}/conversions
- POST /api/recycling/conversions/sync-inventory

Stage transition request body:
- stage: processing | converted

Responsibilities:
- Serve recycling list from real backend store.
- Enforce legal stage transitions.
- Accept product conversion records after conversion stage.
- Trigger manual inventory sync process.

### Inventory API integration

Manual sync endpoint returns:
- updatedItemsCount
- createdItemsCount
- skippedCount
- syncRunId

Responsibilities:
- Idempotent upsert of inventory effects from conversion records.
- Mark processed conversions as synced to avoid duplicate stock updates.

### Linking fields for traceability

Recycling batch must store:
- segregationBatchId
- pickupTaskId
- sourceCategory
- sourceWeightKg

Optional useful linkage in conversions:
- recyclingBatchId
- syncedAtUtc
- syncRunId

## Data Flow

1. User records segregation entry.
2. Backend validates and saves segregation details.
3. Backend emits category events for non-zero weights.
4. Recycling batch created for each category event.
5. User advances recycling batch stage from segregated to processing to converted.
6. User creates product conversion(s) for converted batch.
7. User triggers push to inventory.
8. Backend syncs unsynced conversions and returns run summary.

## Validation Rules

### Segregation
- Each category weight must be >= 0.
- At least one category must be > 0.
- Sum of category weights must be <= collected weight.

### Recycling stage transitions
- Only forward transitions are allowed.
- Invalid transition requests return validation errors.

### Product conversion
- Allowed only when recycling batch stage is converted.
- productName required.
- quantity must be > 0.

### Inventory sync
- Must be idempotent by conversion identifier.
- Repeated sync must not duplicate stock increments.

## Error Handling

Use consistent error payload across endpoints:
- code
- message
- details

Suggested domain error codes:
- SEGREGATION_WEIGHT_INVALID
- SEGREGATION_OVERFLOW_WEIGHT
- RECYCLING_BATCH_ALREADY_EXISTS
- RECYCLING_INVALID_STAGE_TRANSITION
- CONVERSION_INVALID_INPUT
- INVENTORY_SYNC_DUPLICATE_IGNORED

Frontend behavior guidance:
- Show actionable error message.
- Keep user-entered form state where safe.
- Refresh only affected queries.

## Observability and Audit

- Include request correlation identifiers in logs.
- Capture actor metadata where relevant:
  - recordedByUserId
  - recycledByUserId
  - syncedByUserId
- Track operational counters:
  - recycling batches created per segregation record
  - conversions synced per sync run

## Testing Strategy

### Backend tests

Unit tests:
- Segregation category-to-recycling mapping.
- Stage transition guard behavior.
- Conversion sync idempotency.

Integration tests:
- Multi-category segregation save creates multiple recycling batches.
- Repeated inventory sync does not duplicate stock updates.

### Frontend tests

- Segregation save response can display created recycling count.
- Recycling list loads backend-created batches from segregation records.
- Push-to-inventory action reports sync summary.

## Rollout Plan

### Phase 1
- Enable real recycling list and stage APIs.
- Keep controlled fallback strategy for legacy behavior if needed.

### Phase 2
- Enable automatic recycling batch creation on segregation save.

### Phase 3
- Enable sync summary and audit metadata for inventory push.

## Definition of Done

- Segregation save automatically creates one recycling batch per non-zero category.
- Recycling page consumes real backend list and stage progression endpoints.
- Manual push from Recycling syncs conversion outputs into inventory idempotently.
- Full cross-module traceability is available from pickup through inventory.
