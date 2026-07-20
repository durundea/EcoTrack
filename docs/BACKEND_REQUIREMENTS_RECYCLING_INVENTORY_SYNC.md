# Backend Requirements: Recycling API & Inventory Sync Integration

## Overview
Frontend expects real recycling batch management and manual inventory sync APIs to replace mock data. This document specifies exact contracts, endpoints, and data models needed.

---

## 1. SEGREGATION API UPDATES

### Endpoint: POST /api/segregation/batches/{id}/record

**Current behavior:** Records segregation weights.

**New requirement:** Extend response to include recycling batch creation linkage.

#### Request (unchanged)
```json
{
  "plasticKg": number,      // >= 0
  "organicKg": number,       // >= 0
  "metalKg": number,         // >= 0
  "paperKg": number,         // >= 0
  "eWasteKg": number         // >= 0
}
```

#### Response (extended)
Merge these two fields into the existing segregation batch detail response:

```json
{
  "id": "batch-1",
  "batchCode": "SB-001",
  "status": "recorded",
  // ... existing fields ...
  "createdRecyclingBatchIds": ["RB-1", "RB-2"],  // NEW: IDs of recycling batches created
  "createdRecyclingCount": 2                       // NEW: Count of batches created
}
```

**Behavior:**
- For each non-zero category (weight > 0), create ONE recycling batch.
- Return IDs and count so frontend can show confirmation.
- Example: if plastic=10kg, organic=20kg, eWaste=0 → create 2 recycling batches (one per category).

---

## 2. NEW: RECYCLING API

### Data Model: RecyclingBatch

```typescript
{
  id: string,                                    // UUID
  segregationBatchId: string,                    // Link to source segregation batch
  pickupTaskId: string,                          // Link to original pickup task
  sourceCategory: 'plastic' | 'organic' | 'metal' | 'paper' | 'ewaste',
  sourceWeightKg: number,                        // Weight from segregation
  stage: 'collected' | 'segregated' | 'processing' | 'converted',
  outputProduct: string,                         // e.g., "Flakes", "Compost"
  outputQuantity: number,                        // Result of recycling process
  inventoryUpdated: boolean,                     // Whether stock was synced to inventory
  stageHistory: [
    { stage: string, atUtc: string },           // Timestamp for each stage transition
    ...
  ],
  createdAtUtc: string,
  updatedAtUtc: string
}
```

### Endpoint 1: GET /api/recycling/batches?page=1&pageSize=20

**Returns:** Paginated list of recycling batches.

```json
{
  "items": [
    {
      "id": "RB-1",
      "segregationBatchId": "SB-1",
      "pickupTaskId": "pickup-1",
      "sourceCategory": "plastic",
      "sourceWeightKg": 12,
      "stage": "segregated",
      "outputProduct": "Flakes",
      "outputQuantity": 5,
      "inventoryUpdated": false,
      "stageHistory": [
        { "stage": "segregated", "atUtc": "2026-07-07T10:00:00Z" }
      ]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 50,
  "totalPages": 3
}
```

### Endpoint 2: POST /api/recycling/batches/{id}/advance-stage

**Advances recycling batch through processing stages.**

Request:
```json
{
  "stage": "processing" | "converted"  // Only these two are allowed (not collected/segregated)
}
```

Response:
```json
{
  "id": "RB-1",
  "stage": "processing",  // Updated stage
  // ... rest of batch fields ...
  "stageHistory": [
    { "stage": "segregated", "atUtc": "2026-07-07T10:00:00Z" },
    { "stage": "processing", "atUtc": "2026-07-07T10:10:00Z" }
  ]
}
```

**Validation:**
- Only allow forward transitions: segregated → processing → converted
- Reject invalid transitions with error code `RECYCLING_INVALID_STAGE_TRANSITION`
- Do NOT allow moving from converted back to earlier stages

### Endpoint 3: POST /api/recycling/batches/{id}/conversions

**Creates a product conversion record when batch is in "converted" stage.**

Request:
```json
{
  "productName": "Flakes",    // Required, non-empty string
  "quantity": 5,              // Required, > 0
  "unit": "kg" | "units"      // Required
}
```

Response:
```json
{
  "id": "PC-1",                     // Conversion ID
  "recyclingBatchId": "RB-1",       // Reference to recycling batch
  "productName": "Flakes",
  "quantity": 5,
  "unit": "kg",
  "createdAt": "2026-07-07T10:15:00Z"
}
```

**Validation:**
- Only allow if batch.stage === "converted"
- Reject if stage != "converted" with error code `CONVERSION_INVALID_INPUT`

### Endpoint 4: POST /api/recycling/conversions/sync-inventory

**Manual trigger to push all unsynced conversions into inventory.**

Request:
```json
{}  // Empty body
```

Response:
```json
{
  "updatedItemsCount": 2,     // Inventory items that were updated with additional stock
  "createdItemsCount": 1,     // New inventory items that were created
  "skippedCount": 0,          // Conversions skipped (e.g., duplicate, invalid product)
  "syncRunId": "sync-1"       // Unique ID for this sync operation
}
```

**Behavior:**
- Look for all conversions where `syncedAtUtc` is null.
- For each conversion:
  - Find or create inventory item matching `productName`.
  - Add `quantity` to inventory stock (idempotent: track by conversion.id).
  - Set `syncedAtUtc` and `syncRunId` on the conversion record.
- Return summary counts.

**Critical:** Must be idempotent.
- If called twice with same conversions, second call should return same result but NOT double-increment stock.
- Use conversion ID as deduplication key.

---

## 3. SEGREGATION BATCH AUTO-CREATION OF RECYCLING BATCHES

When segregation record is saved with weights, backend MUST automatically create recycling batches.

**Logic:**
```
For each category in [plastic, organic, metal, paper, ewaste]:
  if category.weight > 0:
    create RecyclingBatch with:
      sourceCategory = category.name
      sourceWeightKg = category.weight
      segregationBatchId = saved_batch.id
      pickupTaskId = saved_batch.pickupTaskId
      stage = 'segregated'
      outputProduct = '' (empty initially)
      outputQuantity = 0
      stageHistory = [{ stage: 'segregated', atUtc: now }]
```

Return IDs and count in segregation record response.

---

## 4. DATA MODEL: ProductConversion

```typescript
{
  id: string,                          // UUID
  recyclingBatchId: string,            // Which batch this product came from
  productName: string,                 // e.g., "Flakes", "Compost"
  quantity: number,                    // Amount produced
  unit: 'kg' | 'units',
  syncedAtUtc: string | null,          // When pushed to inventory (null if not synced)
  syncRunId: string | null,            // Which sync run included this conversion
  createdAt: string
}
```

---

## 5. ERROR CODES & RESPONSES

Use consistent error response across all endpoints:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}  // Optional additional context
}
```

**Domain Error Codes:**
- `RECYCLING_BATCH_NOT_FOUND` - Batch ID doesn't exist
- `RECYCLING_INVALID_STAGE_TRANSITION` - Attempted invalid stage transition
- `RECYCLING_STAGE_MISMATCH` - Operation not allowed for current stage
- `CONVERSION_INVALID_INPUT` - Missing or invalid conversion data
- `CONVERSION_REQUIRES_CONVERTED_STAGE` - Can only create conversion when stage="converted"
- `INVENTORY_SYNC_DUPLICATE_IGNORED` - Conversion already synced (was ignored)

---

## 6. AUDIT & OBSERVABILITY

Track these fields on recycling & conversion records:

- `createdByUserId` - Who initiated the recycling batch creation
- `updatedByUserId` - Who last advanced the stage
- `syncedByUserId` - Who triggered the inventory sync
- `createdAtUtc`, `updatedAtUtc` - Timestamps for audit trail

Log:
- Each stage transition with correlation ID
- Each sync operation including counts and any skipped items

---

## 7. INTEGRATION CHECKLIST

Frontend expects:

- [ ] GET /api/recycling/batches returns paginated real batches
- [ ] POST /api/recycling/batches/{id}/advance-stage updates stage with validation
- [ ] POST /api/recycling/batches/{id}/conversions creates conversion when stage="converted"
- [ ] POST /api/recycling/conversions/sync-inventory syncs unsynced conversions to inventory idempotently
- [ ] POST /api/segregation/batches/{id}/record creates recycling batches automatically and returns counts
- [ ] All endpoints return proper error codes on validation failures
- [ ] Conversions are marked as synced after inventory sync (syncedAtUtc + syncRunId)

---

## 8. EXAMPLE WORKFLOW

```
1. User saves segregation: plastic=10kg, organic=20kg
   → Backend creates 2 recycling batches (one per category) in "segregated" stage
   → Response includes: createdRecyclingBatchIds: ["RB-1", "RB-2"], createdRecyclingCount: 2

2. Frontend loads recycling page:
   → GET /api/recycling/batches returns [RB-1, RB-2]

3. User advances RB-1 to processing:
   → POST /api/recycling/batches/RB-1/advance-stage { stage: "processing" }
   → Response shows updated stageHistory

4. User advances RB-1 to converted:
   → POST /api/recycling/batches/RB-1/advance-stage { stage: "converted" }

5. User creates product from RB-1:
   → POST /api/recycling/batches/RB-1/conversions { productName: "Flakes", quantity: 8, unit: "kg" }
   → Response: { id: "PC-1", recyclingBatchId: "RB-1", ... }

6. User clicks "Push to Inventory":
   → POST /api/recycling/conversions/sync-inventory {}
   → Response: { updatedItemsCount: 1, createdItemsCount: 0, skippedCount: 0, syncRunId: "sync-1" }
   → Backend: mark PC-1 as synced, update inventory stock
```

---

## Summary

**New endpoints to implement:**
1. GET /api/recycling/batches (list)
2. POST /api/recycling/batches/{id}/advance-stage (update stage)
3. POST /api/recycling/batches/{id}/conversions (create conversion)
4. POST /api/recycling/conversions/sync-inventory (manual sync trigger)

**Existing endpoints to extend:**
1. POST /api/segregation/batches/{id}/record (add createdRecyclingBatchIds, createdRecyclingCount)

**Auto-create behavior:**
- Segregation save triggers automatic recycling batch creation (one per non-zero category)

**Key invariants:**
- Conversions can only be created when batch stage = "converted"
- Stage transitions are forward-only
- Inventory sync is idempotent (track by conversion ID)
