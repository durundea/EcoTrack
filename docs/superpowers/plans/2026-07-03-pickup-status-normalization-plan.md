# Pickup Status Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the backend pickup status exactly enough to render Assigned and Collected correctly on the Collection page, even when the API sends capitalized status strings.

**Architecture:** `src/shared/services/collectionService.ts` is the single normalization boundary between backend pickup DTOs and the frontend `PickupTask` model. The Collection page already binds to `task.status`, so the fix should stay in the mapper instead of adding UI fallbacks. A single regression test in the collection service suite should prove that mixed-case backend values map into the expected frontend enum.

**Tech Stack:** TypeScript, React, Vitest, Vite

---

### Task 1: Add a regression test for capitalized pickup status values

**Files:**
- Modify: `tests/unit/collection-service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('normalizes capitalized pickup statuses from the backend', () => {
  const task = mapPickupDtoToTask({
    id: 'pickup-3',
    pickupCode: 'PK-003',
    siteName: 'West Campus',
    siteAddressText: '44 River Road',
    scheduledAtUtc: '2026-06-21T10:00:00Z',
    estimatedWeightKg: 18,
    collectedWeightKg: 0,
    status: 'Assigned',
    assignedCollectorUserId: 'user-7',
    assignedCollectorDisplayName: 'Ravi Kumar',
    notes: 'Gate B',
  });

  expect(task.status).toBe('assigned');
  expect(task.lockedAfterCollection).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run tests/unit/collection-service.test.ts`

Expected: the new test fails because `mapPickupDtoToTask()` currently falls back to `scheduled` for `Assigned`.

---

### Task 2: Normalize backend status strings in the collection mapper

**Files:**
- Modify: `src/shared/services/collectionService.ts`

- [ ] **Step 1: Write the minimal implementation**

```ts
function mapStatus(status: string): PickupTask['status'] {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === 'scheduled' || normalizedStatus === 'assigned' || normalizedStatus === 'collected') {
    return normalizedStatus;
  }

  return 'scheduled';
}

export function mapPickupDtoToTask(dto: PickupTaskDto): PickupTask {
  const status = mapStatus(dto.status);

  return {
    id: dto.id,
    site: dto.siteName,
    status,
    assignedCollectorId: dto.assignedCollectorUserId ?? undefined,
    scheduledDate: scheduledDateFromUtc(dto.scheduledAtUtc),
    estimatedWeightKg: dto.estimatedWeightKg ?? 0,
    lockedAfterCollection: status === 'collected',
    pickupCode: dto.pickupCode,
    siteName: dto.siteName,
    siteAddressText: dto.siteAddressText,
    scheduledAtUtc: dto.scheduledAtUtc,
    collectedWeightKg: dto.collectedWeightKg ?? 0,
    assignedCollectorDisplayName: normalizeText(dto.assignedCollectorDisplayName),
    notes: normalizeText(dto.notes),
    assignmentEvents: dto.assignmentEvents ?? [],
  };
}
```

- [ ] **Step 2: Run the targeted unit test again**

Run: `npm test -- --run tests/unit/collection-service.test.ts`

Expected: all tests in `tests/unit/collection-service.test.ts` pass, including the new capitalized-status regression.

---

### Task 3: Confirm the Collection page still consumes the normalized status directly

**Files:**
- Review only: `src/features/collection/CollectionPage.tsx`

- [ ] **Step 1: Verify no UI fallback is needed**

Confirm the row badge and action buttons still read from `task.status` and `task.status` only. No code change should be necessary here because the mapper now guarantees the frontend enum values.

- [ ] **Step 2: Commit the focused fix**

```bash
git add tests/unit/collection-service.test.ts src/shared/services/collectionService.ts
git commit -m "fix: normalize pickup status casing"
```
