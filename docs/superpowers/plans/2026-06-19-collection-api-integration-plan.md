# Collection API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the collection page mock-backed schedule with real pickup APIs, including assignment-history hover summaries and real pickup mutations.

**Architecture:** Keep the current collection page layout and modal workflow, but move data access into a dedicated collection service that maps backend pickup DTOs into a stable frontend model. Add a small history-summary helper that turns assignment-history events into compact tooltip text, and wire React Query invalidation around the pickup list and per-pickup history queries.

**Tech Stack:** TypeScript, React, React Query, existing `requestJson` HTTP helper, Vitest, Testing Library.

---

## File Structure

### New Files
- `src/features/collection/collectionService.ts` — real pickup API client, DTO mapping, assignment-history fetch, and fallback read helpers
- `src/features/collection/historySummary.ts` — compact tooltip text formatter for assignment history events
- `tests/unit/collection-service.test.ts` — unit tests for DTO mapping, list normalization, fallback, and mutation payloads
- `tests/unit/collection-history-summary.test.ts` — unit tests for tooltip summary formatting and missing-field defaults
- `tests/component/collection-page.test.tsx` — component tests for collection page rendering, row actions, and tooltip behavior

### Modified Files
- `src/shared/api/contracts.ts` — add or extend collection transport DTO types for pickups and assignment history
- `src/shared/api/client.ts` — route `api.collection` to the new service implementation
- `src/features/collection/useCollection.ts` — update queries and mutations to call the new service and invalidate pickup/history caches
- `src/features/collection/CollectionPage.tsx` — map pickup rows into the existing table and add the history icon tooltip entry point
- `src/features/segregation/SegregationPage.tsx` — only if the collection dispatch contract needs a matching query-key or invalidation adjustment

---

## Tasks

### Task 1: Add collection transport DTO types

**Files:**
- Modify: `src/shared/api/contracts.ts`
- Test: none yet; these are type additions used by later tasks

- [ ] **Step 1: Add the failing usage surface in the service tests first**

Create `tests/unit/collection-service.test.ts` with a compile-time target for the new DTO shape and mapper behavior:

```typescript
import { describe, expect, it } from 'vitest';
import { mapPickupDtoToTask, normalizePickupListResponse } from '../../src/features/collection/collectionService';

describe('collection service DTO mapping', () => {
  it('maps pickup dto fields into the frontend pickup row model', () => {
    const dto = {
      id: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-19T10:00:00Z',
      estimatedWeightKg: 45,
      collectedWeightKg: 30,
      status: 'assigned',
      assignedCollectorUserId: 'user-2',
      assignedCollectorDisplayName: 'Asha Kumar',
      notes: 'Back gate access',
    };

    expect(mapPickupDtoToTask(dto)).toEqual({
      id: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-19T10:00:00Z',
      estimatedWeightKg: 45,
      collectedWeightKg: 30,
      status: 'assigned',
      assignedCollectorUserId: 'user-2',
      assignedCollectorDisplayName: 'Asha Kumar',
      notes: 'Back gate access',
    });
  });

  it('accepts either a paginated envelope or a raw items array', () => {
    expect(normalizePickupListResponse({ items: [{ id: 'pickup-1' }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })).toEqual([{ id: 'pickup-1' }]);
    expect(normalizePickupListResponse([{ id: 'pickup-2' }])).toEqual([{ id: 'pickup-2' }]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- --run tests/unit/collection-service.test.ts`

Expected: failure because `mapPickupDtoToTask` and `normalizePickupListResponse` are not implemented yet.

- [ ] **Step 3: Add collection DTO types to the shared contracts file**

Add these type definitions to `src/shared/api/contracts.ts` after the existing shared types:

```typescript
export type PickupAssignmentEventDto = {
  id: string;
  pickupTaskId: string;
  previousCollectorUserId?: string | null;
  newCollectorUserId?: string | null;
  changedByUserId?: string | null;
  changedByDisplayName?: string | null;
  changedAtUtc: string;
  note?: string | null;
};

export type PickupAssignmentHistoryResponseDto = {
  events: PickupAssignmentEventDto[];
};

export type PickupTaskDto = {
  id: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  estimatedWeightKg: number;
  collectedWeightKg: number;
  status: string;
  assignedCollectorUserId?: string | null;
  assignedCollectorDisplayName?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  cancelledByUserId?: string | null;
  cancelledAtUtc?: string | null;
  cancelReason?: string | null;
  assignmentEvents?: PickupAssignmentEventDto[];
};

export type PickupListResponseDto = {
  items: PickupTaskDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
```

- [ ] **Step 4: Commit the contracts change**

Run:

```bash
git add src/shared/api/contracts.ts tests/unit/collection-service.test.ts
git commit -m "types: add collection pickup dto contracts"
```

---

### Task 2: Create pickup DTO mapping and list normalization

**Files:**
- Create: `src/features/collection/collectionService.ts`
- Test: `tests/unit/collection-service.test.ts`

- [ ] **Step 1: Keep the service test red by adding assignment-history and fallback coverage**

Extend `tests/unit/collection-service.test.ts` with a fallback/read-path case:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { collectionService } from '../../src/features/collection/collectionService';

describe('collection service fallback behavior', () => {
  it('returns mapped fallback pickups when the backend list call fails', async () => {
    const result = await collectionService.getSchedule({
      requestJson: vi.fn().mockRejectedValue(new Error('backend unavailable')),
      fallback: vi.fn().mockResolvedValue([{ id: 'fallback-1' }]),
    });

    expect(result).toEqual([{ id: 'fallback-1' }]);
  });
});
```

- [ ] **Step 2: Run the service test and confirm it still fails**

Run: `npm test -- --run tests/unit/collection-service.test.ts`

Expected: failure because the service has not been implemented yet.

- [ ] **Step 3: Implement the real collection service**

Create `src/features/collection/collectionService.ts` with the real API client, normalization helpers, and mutation methods:

```typescript
import type {
  PickupAssignmentEventDto,
  PickupAssignmentHistoryResponseDto,
  PickupListResponseDto,
  PickupTaskDto,
} from '../../shared/api/contracts';
import { requestJson } from '../../shared/services/http';

export type PickupTask = {
  id: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  estimatedWeightKg: number;
  collectedWeightKg: number;
  status: string;
  assignedCollectorUserId: string;
  assignedCollectorDisplayName: string;
  notes: string;
};

export type PickupListResponse = PickupTask[];

type RequestJsonFn = typeof requestJson;

function normalizeString(value: string | null | undefined): string {
  return value ?? '';
}

export function mapPickupDtoToTask(dto: PickupTaskDto): PickupTask {
  return {
    id: dto.id,
    pickupCode: dto.pickupCode,
    siteName: normalizeString(dto.siteName),
    siteAddressText: normalizeString(dto.siteAddressText),
    scheduledAtUtc: dto.scheduledAtUtc,
    estimatedWeightKg: dto.estimatedWeightKg ?? 0,
    collectedWeightKg: dto.collectedWeightKg ?? 0,
    status: dto.status,
    assignedCollectorUserId: normalizeString(dto.assignedCollectorUserId),
    assignedCollectorDisplayName: normalizeString(dto.assignedCollectorDisplayName),
    notes: normalizeString(dto.notes),
  };
}

export function normalizePickupListResponse(payload: PickupTaskDto[] | PickupListResponseDto): PickupTaskDto[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function normalizeAssignmentHistoryResponse(payload: PickupAssignmentHistoryResponseDto | { events?: PickupAssignmentEventDto[] }): PickupAssignmentEventDto[] {
  return payload.events ?? [];
}

async function getWithFallback<T>(read: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback();
  }
}

export const collectionService = {
  async getSchedule(options?: { requestJson?: RequestJsonFn; fallback?: () => Promise<PickupTask[]> }): Promise<PickupTask[]> {
    const read = options?.requestJson ?? requestJson;
    return getWithFallback(
      async () => {
        const payload = await read<PickupTaskDto[] | PickupListResponseDto>('/api/collection/pickups');
        return normalizePickupListResponse(payload).map(mapPickupDtoToTask);
      },
      options?.fallback ?? (async () => [])
    );
  },
  async getPickupById(id: string): Promise<PickupTask> {
    return mapPickupDtoToTask(await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`));
  },
  async getAssignmentHistory(id: string): Promise<PickupAssignmentEventDto[]> {
    const payload = await requestJson<PickupAssignmentHistoryResponseDto>(`/api/collection/pickups/${id}/assignment-history`);
    return normalizeAssignmentHistoryResponse(payload);
  },
  async createTask(input: Omit<PickupTask, 'id'>): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>('/api/collection/pickups', {
        method: 'POST',
        body: JSON.stringify({
          siteName: input.siteName,
          siteAddressText: input.siteAddressText,
          scheduledAtUtc: input.scheduledAtUtc,
          estimatedWeightKg: input.estimatedWeightKg,
          notes: input.notes,
        }),
      })
    );
  },
  async updateTask(id: string, input: Partial<Omit<PickupTask, 'id'>>): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
    );
  },
  async deleteTask(id: string, reason: string): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      })
    );
  },
  async assignTask(id: string, assignedCollectorUserId: string, note: string): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedCollectorUserId, note }),
      })
    );
  },
  async markCollected(id: string, collectedWeightKg: number): Promise<PickupTask> {
    return mapPickupDtoToTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/mark-collected`, {
        method: 'POST',
        body: JSON.stringify({ collectedWeightKg }),
      })
    );
  },
  async sendToSegregation(id: string): Promise<PickupTask> {
    return mapPickupDtoToTask(await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/send-to-segregation`, { method: 'POST' }));
  },
};
```

- [ ] **Step 4: Run the unit test and confirm the mapper passes**

Run: `npm test -- --run tests/unit/collection-service.test.ts`

Expected: PASS for mapping and normalization assertions; any remaining failures should point to missing fallback or mutation assertions.

- [ ] **Step 5: Commit the service implementation**

Run:

```bash
git add src/features/collection/collectionService.ts tests/unit/collection-service.test.ts
git commit -m "feat: add collection pickup service"
```

---

### Task 3: Add compact assignment-history tooltip formatting

**Files:**
- Create: `src/features/collection/historySummary.ts`
- Test: `tests/unit/collection-history-summary.test.ts`

- [ ] **Step 1: Write the failing tooltip-format test**

Create `tests/unit/collection-history-summary.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { formatAssignmentHistorySummary } from '../../src/features/collection/historySummary';

describe('assignment history summary', () => {
  it('renders who changed it, when, and the note', () => {
    const lines = formatAssignmentHistorySummary([
      {
        id: 'event-1',
        pickupTaskId: 'pickup-1',
        previousCollectorUserId: 'collector-1',
        newCollectorUserId: 'collector-2',
        changedByUserId: 'admin-1',
        changedByDisplayName: 'Rita Shah',
        changedAtUtc: '2026-06-19T09:15:00Z',
        note: 'Reassigned for route coverage',
      },
    ]);

    expect(lines).toContain('Changed by Rita Shah at 2026-06-19 09:15 UTC — Reassigned for route coverage');
  });

  it('uses safe placeholders when fields are missing', () => {
    const lines = formatAssignmentHistorySummary([
      {
        id: 'event-2',
        pickupTaskId: 'pickup-1',
        changedAtUtc: '2026-06-19T10:00:00Z',
      },
    ]);

    expect(lines).toContain('Changed by Unknown user at 2026-06-19 10:00 UTC — No note provided');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- --run tests/unit/collection-history-summary.test.ts`

Expected: failure because the formatter does not exist yet.

- [ ] **Step 3: Implement the summary formatter**

Create `src/features/collection/historySummary.ts`:

```typescript
import type { PickupAssignmentEventDto } from '../../shared/api/contracts';

function formatUtcTimestamp(isoUtc: string): string {
  const date = new Date(isoUtc);
  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toISOString().slice(11, 16);
  return `${datePart} ${timePart} UTC`;
}

function getDisplayName(event: PickupAssignmentEventDto): string {
  return event.changedByDisplayName?.trim() || 'Unknown user';
}

function getNote(event: PickupAssignmentEventDto): string {
  return event.note?.trim() || 'No note provided';
}

export function formatAssignmentHistorySummary(events: PickupAssignmentEventDto[]): string[] {
  return (events ?? []).map((event) => `Changed by ${getDisplayName(event)} at ${formatUtcTimestamp(event.changedAtUtc)} — ${getNote(event)}`);
}
```

- [ ] **Step 4: Run the formatter test and confirm it passes**

Run: `npm test -- --run tests/unit/collection-history-summary.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the tooltip formatter**

Run:

```bash
git add src/features/collection/historySummary.ts tests/unit/collection-history-summary.test.ts
git commit -m "feat: add collection history summary formatter"
```

---

### Task 4: Wire the real service into the collection hook and API client

**Files:**
- Modify: `src/shared/api/client.ts`
- Modify: `src/features/collection/useCollection.ts`

- [ ] **Step 1: Add tests for query invalidation and service wiring**

Extend `tests/unit/collection-service.test.ts` with a mutation and query key assertion:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { collectionService } from '../../src/features/collection/collectionService';

describe('collection service mutations', () => {
  it('submits the assign payload to the assign endpoint', async () => {
    const requestJson = vi.fn().mockResolvedValue({
      id: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-19T10:00:00Z',
      estimatedWeightKg: 45,
      collectedWeightKg: 30,
      status: 'assigned',
    });

    await collectionService.assignTask('pickup-1', 'collector-9', 'Dispatch reroute', requestJson);

    expect(requestJson).toHaveBeenCalledWith('/api/collection/pickups/pickup-1/assign', expect.objectContaining({ method: 'POST' }));
  });
});
```

- [ ] **Step 2: Update the API client to point collection at the real service**

Modify `src/shared/api/client.ts` so it imports and exports the new collection service instead of the legacy mock collection facade:

```typescript
import { authService, healthService, inventoryService, salesService } from '../services';
import { collectionService } from '../../features/collection/collectionService';
import { dashboard, inventoryLegacy, recycling, segregation } from './legacyClient';

export const api = {
  auth: authService,
  health: healthService,
  collection: collectionService,
  segregation,
  recycling,
  dashboard,
  inventory: {
    getItems: inventoryService.getItems,
    createItem: inventoryService.createItem,
    updateItemPrice: inventoryService.updatePrice,
    syncInventoryFromConversions: inventoryLegacy.syncInventoryFromConversions,
  },
  sales: salesService,
};
```

- [ ] **Step 3: Update the collection hook to use the real service methods and cache keys**

Modify `src/features/collection/useCollection.ts` so the queries point at `api.collection.getSchedule()` and any pickup-history query uses a stable key such as `['collection', 'history', pickupId]`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function useCollectionSchedule() {
  return useQuery({
    queryKey: ['collection', 'schedule'],
    queryFn: () => api.collection.getSchedule(),
  });
}

export function usePickupAssignmentHistory(pickupId: string | null) {
  return useQuery({
    queryKey: ['collection', 'history', pickupId],
    queryFn: () => api.collection.getAssignmentHistory(pickupId as string),
    enabled: Boolean(pickupId),
  });
}
```

Then update the existing mutations so they call the corresponding service methods and invalidate `['collection', 'schedule']` plus `['collection', 'history', id]` when assignment-related actions succeed.

- [ ] **Step 4: Run the targeted unit tests**

Run: `npm test -- --run tests/unit/collection-service.test.ts tests/unit/collection-history-summary.test.ts`

Expected: PASS for mapping, formatting, and service wiring assertions.

- [ ] **Step 5: Commit the wiring update**

Run:

```bash
git add src/shared/api/client.ts src/features/collection/useCollection.ts tests/unit/collection-service.test.ts
git commit -m "feat: wire collection api into query hooks"
```

---

### Task 5: Update the collection page to render tooltip history and real pickup fields

**Files:**
- Modify: `src/features/collection/CollectionPage.tsx`
- Test: `tests/component/collection-page.test.tsx`

- [ ] **Step 1: Write the failing component assertions**

Create `tests/component/collection-page.test.tsx` with one render check and one tooltip check:

```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionPage } from '../../src/features/collection/CollectionPage';

describe('CollectionPage', () => {
  it('renders pickup rows from the backend model', () => {
    render(<CollectionPage />);
    expect(screen.getByText('Pickup Schedule')).toBeInTheDocument();
  });

  it('shows a history tooltip entry point for each row', () => {
    render(<CollectionPage />);
    expect(screen.getAllByLabelText('View assignment history').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the component test and confirm it fails**

Run: `npm test -- --run tests/component/collection-page.test.tsx`

Expected: failure because the tooltip icon and backend row model are not wired yet.

- [ ] **Step 3: Update the row model and tooltip rendering**

Modify `src/features/collection/CollectionPage.tsx` so the row component accepts the mapped pickup fields and an assignment-history summary string array. Add a small history button with an accessible label:

```typescript
<button
  type="button"
  aria-label="View assignment history"
  title={historySummary.join('\n')}
  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
>
  <span aria-hidden="true">i</span>
</button>
```

When the row is rendered, request assignment history for that pickup through the hook from Task 4 and feed it into `formatAssignmentHistorySummary(...)`.

- [ ] **Step 4: Run the component test and confirm it passes**

Run: `npm test -- --run tests/component/collection-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the collection page update**

Run:

```bash
git add src/features/collection/CollectionPage.tsx tests/component/collection-page.test.tsx
git commit -m "feat: add collection pickup history tooltip"
```

---

### Task 6: Verify end-to-end collection behavior

**Files:**
- Modified files from Tasks 1-5
- Tests: the collection unit and component tests above

- [ ] **Step 1: Run the focused collection test set**

Run:

```bash
npm test -- --run tests/unit/collection-service.test.ts tests/unit/collection-history-summary.test.ts tests/component/collection-page.test.tsx
```

Expected: all focused collection tests pass.

- [ ] **Step 2: Run the repo’s broader smoke tests if the focused set passes**

Run:

```bash
npm test -- --run tests/unit/smoke.test.ts
```

Expected: PASS, or any existing unrelated failure should be noted before widening scope.

- [ ] **Step 3: Commit the validation pass**

Run:

```bash
git add src tests
git commit -m "test: verify collection api integration"
```

---

## Self-Review

### Spec Coverage Check
- Collection data source migration: Task 2 and Task 4
- DTO-to-frontend mapping: Task 1 and Task 2
- Real mutations: Task 2 and Task 4
- History hover tooltip: Task 3 and Task 5
- Focused tests: Tasks 1, 2, 3, 5, and 6

### Placeholder Scan
- No TBD/TODO placeholders remain in the plan steps.
- Each code step includes explicit code, not vague instructions.

### Type Consistency Check
- `PickupTaskDto`, `PickupListResponseDto`, and `PickupAssignmentHistoryResponseDto` are introduced before they are used in the service.
- `mapPickupDtoToTask`, `normalizePickupListResponse`, and `formatAssignmentHistorySummary` are defined once and referenced consistently across later tasks.
- The collection query key pattern is consistent: `['collection', 'schedule']` for the list and `['collection', 'history', pickupId]` for tooltip data.
# Collection API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the collection page mock-backed data flow with real pickup APIs, while keeping the current table/modal workflow and adding a compact hover tooltip for assignment history.

**Architecture:** Introduce a dedicated collection service that normalizes backend pickup DTOs into frontend models, a small formatter for assignment-history summaries, and a lightweight tooltip component used by each pickup row. Keep the page structure intact and limit changes to the collection slice plus the shared API/service boundary.

**Tech Stack:** TypeScript, React, React Query, existing `requestJson` HTTP helper, Vitest, React Testing Library.

---

## File Structure

### New Files
- `src/shared/services/collectionService.ts` — real pickup API client, DTO mapping, and read fallback behavior
- `src/features/collection/historySummary.ts` — pure formatter for assignment-history tooltip text
- `src/features/collection/PickupHistoryTooltip.tsx` — hover tooltip trigger and content for a pickup row
- `tests/unit/collection-service.test.ts` — service mapping and fallback tests
- `tests/unit/collection-history-summary.test.ts` — assignment-history formatting tests
- `tests/component/collection-page.test.tsx` — page-level behavior tests for the tooltip and API wiring

### Modified Files
- `src/shared/api/contracts.ts` — add collection DTOs and paginated pickup response types
- `src/shared/services/index.ts` — export the new collection service
- `src/shared/api/client.ts` — route collection API access to the new service instead of the legacy mock facade
- `src/features/collection/useCollection.ts` — keep collection queries/mutations in one hook layer, switch to the real service, and add assignment-history query invalidation
- `src/features/collection/CollectionPage.tsx` — render pickup rows from the mapped API model and include the history icon/tooltip in the actions area

---

## Tasks

### Task 1: Add collection DTO contracts and the real collection service

**Files:**
- Modify: `src/shared/api/contracts.ts`
- Create: `src/shared/services/collectionService.ts`
- Modify: `src/shared/services/index.ts`
- Modify: `src/shared/api/client.ts`
- Test: `tests/unit/collection-service.test.ts`

- [ ] **Step 1: Write the failing service tests first**

Create `tests/unit/collection-service.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { collectionService } from '../../src/shared/services/collectionService';
import { requestJson } from '../../src/shared/services/http';

vi.mock('../../src/shared/services/http', () => ({
  requestJson: vi.fn(),
}));

describe('collectionService', () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset();
  });

  it('maps a paginated pickup list response into frontend rows', async () => {
    vi.mocked(requestJson).mockResolvedValue({
      items: [
        {
          id: 'pickup-1',
          pickupCode: 'P-1001',
          siteName: 'North Gate',
          siteAddressText: '12 Market Road',
          scheduledAtUtc: '2026-06-19T10:00:00Z',
          estimatedWeightKg: 120,
          collectedWeightKg: 0,
          status: 'scheduled',
          assignedCollectorUserId: null,
          assignedCollectorDisplayName: null,
          notes: 'Call on arrival',
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });

    const result = await collectionService.listPickups();

    expect(result.items[0].pickupCode).toBe('P-1001');
    expect(result.items[0].siteName).toBe('North Gate');
    expect(result.totalCount).toBe(1);
  });

  it('falls back to legacy mock data when pickup list request fails', async () => {
    vi.mocked(requestJson).mockRejectedValue(new Error('backend unavailable'));

    const result = await collectionService.listPickups();

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.totalCount).toBeGreaterThan(0);
  });

  it('maps assignment history into API-friendly events', async () => {
    vi.mocked(requestJson).mockResolvedValue({
      events: [
        {
          id: 'event-1',
          pickupTaskId: 'pickup-1',
          previousCollectorUserId: 'collector-a',
          newCollectorUserId: 'collector-b',
          changedByUserId: 'admin-1',
          changedAtUtc: '2026-06-19T11:00:00Z',
          note: 'Reassigned due to route change',
        },
      ],
    });

    const result = await collectionService.getAssignmentHistory('pickup-1');

    expect(result.events[0].note).toBe('Reassigned due to route change');
    expect(result.events[0].changedByUserId).toBe('admin-1');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails on the missing service**

Run: `npm test -- --run tests/unit/collection-service.test.ts`

Expected: FAIL with the collection service or DTO types not being defined yet.

- [ ] **Step 3: Add the DTOs and implement the service mapping**

Update `src/shared/api/contracts.ts` with these collection types near the existing shared domain types:

```typescript
export type PickupStatus = 'scheduled' | 'assigned' | 'collected' | 'cancelled';

export type PickupAssignmentEvent = {
  id: string;
  pickupTaskId: string;
  previousCollectorUserId: string | null;
  newCollectorUserId: string | null;
  changedByUserId: string | null;
  changedAtUtc: string;
  note: string | null;
};

export type PickupTask = {
  id: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  estimatedWeightKg: number;
  collectedWeightKg: number;
  status: PickupStatus;
  assignedCollectorUserId: string | null;
  assignedCollectorDisplayName: string | null;
  notes: string | null;
  createdByUserId?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  cancelledByUserId?: string | null;
  cancelledAtUtc?: string | null;
  cancelReason?: string | null;
  assignmentEvents?: PickupAssignmentEvent[];
};

export type PickupTaskListResponse = {
  items: PickupTask[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type PickupTaskCreateInput = {
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  estimatedWeightKg: number;
  notes: string;
};

export type PickupTaskUpdateInput = PickupTaskCreateInput;

export type PickupCancelInput = {
  reason: string;
};

export type PickupAssignInput = {
  assignedCollectorUserId: string;
  note: string;
};

export type PickupMarkCollectedInput = {
  collectedWeightKg: number;
};

export type PickupAssignmentHistoryResponse = {
  events: PickupAssignmentEvent[];
};
```

Create `src/shared/services/collectionService.ts` with request/mapping helpers and a mock fallback for reads:

```typescript
import { requestJson } from './http';
import { legacyClient } from '../api/legacyClient';
import type {
  PickupAssignInput,
  PickupAssignmentEvent,
  PickupAssignmentHistoryResponse,
  PickupCancelInput,
  PickupMarkCollectedInput,
  PickupTask,
  PickupTaskCreateInput,
  PickupTaskListResponse,
  PickupTaskUpdateInput,
} from '../api/contracts';

type PickupTaskDto = PickupTask;
type PaginatedPickupTaskDto = {
  items: PickupTaskDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type AssignmentHistoryDto = PickupAssignmentHistoryResponse;

function normalizePickupList(payload: PickupTaskDto[] | PaginatedPickupTaskDto): PickupTaskListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: 1,
      pageSize: payload.length,
      totalCount: payload.length,
      totalPages: 1,
    };
  }

  return {
    items: payload.items ?? [],
    page: payload.page ?? 1,
    pageSize: payload.pageSize ?? payload.items?.length ?? 0,
    totalCount: payload.totalCount ?? payload.items?.length ?? 0,
    totalPages: payload.totalPages ?? 1,
  };
}

function toPickupTask(dto: PickupTaskDto): PickupTask {
  return {
    id: dto.id,
    pickupCode: dto.pickupCode ?? '',
    siteName: dto.siteName ?? '',
    siteAddressText: dto.siteAddressText ?? '',
    scheduledAtUtc: dto.scheduledAtUtc ?? '',
    estimatedWeightKg: dto.estimatedWeightKg ?? 0,
    collectedWeightKg: dto.collectedWeightKg ?? 0,
    status: dto.status ?? 'scheduled',
    assignedCollectorUserId: dto.assignedCollectorUserId ?? null,
    assignedCollectorDisplayName: dto.assignedCollectorDisplayName ?? null,
    notes: dto.notes ?? null,
    createdByUserId: dto.createdByUserId ?? null,
    createdAtUtc: dto.createdAtUtc ?? null,
    updatedAtUtc: dto.updatedAtUtc ?? null,
    cancelledByUserId: dto.cancelledByUserId ?? null,
    cancelledAtUtc: dto.cancelledAtUtc ?? null,
    cancelReason: dto.cancelReason ?? null,
    assignmentEvents: dto.assignmentEvents ?? [],
  };
}

async function readPickupList(): Promise<PickupTaskListResponse> {
  try {
    const payload = await requestJson<PickupTaskDto[] | PaginatedPickupTaskDto>('/api/collection/pickups');
    return normalizePickupList(payload);
  } catch {
    const fallback = await legacyClient.collection.getSchedule();
    return normalizePickupList(fallback as unknown as PickupTaskDto[]);
  }
}

export const collectionService = {
  async listPickups(): Promise<PickupTaskListResponse> {
    const payload = await readPickupList();
    return {
      ...payload,
      items: payload.items.map(toPickupTask),
    };
  },
  async getPickupById(id: string): Promise<PickupTask> {
    try {
      return toPickupTask(await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`));
    } catch {
      const fallbackItems = await legacyClient.collection.getSchedule();
      const fallback = fallbackItems.find((item) => item.id === id);
      if (!fallback) {
        throw new Error(`Pickup ${id} not found`);
      }
      return toPickupTask(fallback as unknown as PickupTaskDto);
    }
  },
  async createPickup(input: PickupTaskCreateInput): Promise<PickupTask> {
    return toPickupTask(
      await requestJson<PickupTaskDto>('/api/collection/pickups', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
  },
  async updatePickup(id: string, input: PickupTaskUpdateInput): Promise<PickupTask> {
    return toPickupTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
    );
  },
  async deletePickup(id: string): Promise<PickupTask> {
    return toPickupTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}`, {
        method: 'DELETE',
      })
    );
  },
  async assignPickup(id: string, input: PickupAssignInput): Promise<PickupTask> {
    return toPickupTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
  },
  async markCollected(id: string, input: PickupMarkCollectedInput): Promise<PickupTask> {
    return toPickupTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/mark-collected`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
  },
  async sendToSegregation(id: string): Promise<PickupTask> {
    return toPickupTask(
      await requestJson<PickupTaskDto>(`/api/collection/pickups/${id}/send-to-segregation`, {
        method: 'POST',
      })
    );
  },
  async getAssignmentHistory(id: string): Promise<PickupAssignmentHistoryResponse> {
    try {
      return await requestJson<AssignmentHistoryDto>(`/api/collection/pickups/${id}/assignment-history`);
    } catch {
      const pickup = await this.getPickupById(id);
      return { events: pickup.assignmentEvents ?? [] };
    }
  },
};
```

Export the new service from `src/shared/services/index.ts` and point `src/shared/api/client.ts` at it:

```typescript
// src/shared/services/index.ts
export * from './collectionService';

// src/shared/api/client.ts
import { authService, healthService, inventoryService, salesService } from '../services';
import { collectionService } from '../services/collectionService';

export const api = {
  auth: authService,
  health: healthService,
  collection: collectionService,
  segregation,
  recycling,
  dashboard,
  inventory: {
    getItems: inventoryService.getItems,
    createItem: inventoryService.createItem,
    updateItemPrice: inventoryService.updatePrice,
    syncInventoryFromConversions: inventoryLegacy.syncInventoryFromConversions,
  },
  sales: salesService,
};
```

- [ ] **Step 4: Run the collection service tests until they pass**

Run: `npm test -- --run tests/unit/collection-service.test.ts`

Expected: PASS with the pickup list mapping and fallback assertions green.

- [ ] **Step 5: Commit the service and contract changes**

```bash
git add src/shared/api/contracts.ts src/shared/services/collectionService.ts src/shared/services/index.ts src/shared/api/client.ts tests/unit/collection-service.test.ts
git commit -m "feat: add real collection pickup service"
```

---

### Task 2: Add assignment-history formatting and tooltip UI

**Files:**
- Create: `src/features/collection/historySummary.ts`
- Create: `src/features/collection/PickupHistoryTooltip.tsx`
- Test: `tests/unit/collection-history-summary.test.ts`

- [ ] **Step 1: Write failing tests for the history summary formatter**

Create `tests/unit/collection-history-summary.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { formatAssignmentHistoryEvent, formatAssignmentHistoryEvents } from '../../src/features/collection/historySummary';

describe('collection history summary', () => {
  it('formats one event as a compact human-readable line', () => {
    const result = formatAssignmentHistoryEvent({
      id: 'event-1',
      pickupTaskId: 'pickup-1',
      previousCollectorUserId: 'collector-a',
      newCollectorUserId: 'collector-b',
      changedByUserId: 'manager-1',
      changedAtUtc: '2026-06-19T11:00:00Z',
      note: 'Route changed after rain',
    });

    expect(result).toContain('Changed by manager-1');
    expect(result).toContain('Route changed after rain');
  });

  it('falls back to placeholders when fields are missing', () => {
    const result = formatAssignmentHistoryEvent({
      id: 'event-2',
      pickupTaskId: 'pickup-1',
      previousCollectorUserId: null,
      newCollectorUserId: null,
      changedByUserId: null,
      changedAtUtc: '2026-06-19T11:00:00Z',
      note: null,
    });

    expect(result).toContain('Changed by Unknown user');
    expect(result).toContain('No note provided');
  });

  it('formats multiple events into a line list', () => {
    const result = formatAssignmentHistoryEvents([
      {
        id: 'event-1',
        pickupTaskId: 'pickup-1',
        previousCollectorUserId: null,
        newCollectorUserId: 'collector-b',
        changedByUserId: 'manager-1',
        changedAtUtc: '2026-06-19T11:00:00Z',
        note: 'First reassignment',
      },
      {
        id: 'event-2',
        pickupTaskId: 'pickup-1',
        previousCollectorUserId: 'collector-b',
        newCollectorUserId: 'collector-c',
        changedByUserId: 'manager-2',
        changedAtUtc: '2026-06-19T12:00:00Z',
        note: 'Second reassignment',
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toContain('First reassignment');
    expect(result[1]).toContain('Second reassignment');
  });
});
```

- [ ] **Step 2: Run the formatter tests to confirm the current implementation is missing**

Run: `npm test -- --run tests/unit/collection-history-summary.test.ts`

Expected: FAIL because the formatter module does not exist yet.

- [ ] **Step 3: Implement the formatter and tooltip component**

Create `src/features/collection/historySummary.ts`:

```typescript
import type { PickupAssignmentEvent } from '../../shared/api/contracts';

function formatLocalTimestamp(utcValue: string): string {
  const date = new Date(utcValue);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
}

export function formatAssignmentHistoryEvent(event: PickupAssignmentEvent): string {
  const changedBy = event.changedByUserId ?? 'Unknown user';
  const when = formatLocalTimestamp(event.changedAtUtc);
  const note = event.note?.trim() ? event.note.trim() : 'No note provided';

  return `Changed by ${changedBy} at ${when} — ${note}`;
}

export function formatAssignmentHistoryEvents(events: PickupAssignmentEvent[]): string[] {
  return (events ?? []).map(formatAssignmentHistoryEvent);
}
```

Create `src/features/collection/PickupHistoryTooltip.tsx` with a small hover trigger and compact popup:

```tsx
import { useState } from 'react';
import type { PickupAssignmentEvent } from '../../shared/api/contracts';
import { formatAssignmentHistoryEvents } from './historySummary';

type PickupHistoryTooltipProps = {
  pickupId: string;
  events: PickupAssignmentEvent[];
};

export function PickupHistoryTooltip({ pickupId, events }: PickupHistoryTooltipProps) {
  const [open, setOpen] = useState(false);
  const lines = formatAssignmentHistoryEvents(events);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`View assignment history for ${pickupId}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
      >
        i
      </button>
      {open && lines.length > 0 ? (
        <div className="absolute left-0 top-9 z-20 w-96 rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 shadow-xl">
          <p className="mb-2 font-semibold text-slate-300">Assignment history</p>
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li key={`${pickupId}-${index}`} className="leading-5 text-slate-200">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 4: Run the formatter tests until they pass**

Run: `npm test -- --run tests/unit/collection-history-summary.test.ts`

Expected: PASS with the summary lines and placeholder behavior verified.

- [ ] **Step 5: Commit the formatter and tooltip changes**

```bash
git add src/features/collection/historySummary.ts src/features/collection/PickupHistoryTooltip.tsx tests/unit/collection-history-summary.test.ts
git commit -m "feat: add pickup assignment history tooltip"
```

---

### Task 3: Wire the real service into the collection hook and page

**Files:**
- Modify: `src/features/collection/useCollection.ts`
- Modify: `src/features/collection/CollectionPage.tsx`
- Test: `tests/component/collection-page.test.tsx`

- [ ] **Step 1: Write a failing component test that expects the history icon and API-backed rows**

Create `tests/component/collection-page.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionPage } from '../../src/features/collection/CollectionPage';

vi.mock('../../src/features/collection/useCollection', () => ({
  useCollectionSchedule: () => ({
    data: {
      items: [
        {
          id: 'pickup-1',
          pickupCode: 'P-1001',
          siteName: 'North Gate',
          siteAddressText: '12 Market Road',
          scheduledAtUtc: '2026-06-19T10:00:00Z',
          estimatedWeightKg: 120,
          collectedWeightKg: 0,
          status: 'scheduled',
          assignedCollectorUserId: null,
          assignedCollectorDisplayName: null,
          notes: 'Call on arrival',
          assignmentEvents: [],
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    },
    isLoading: false,
    isError: false,
  }),
  useSegregationDispatches: () => ({ data: [] }),
  useCreatePickupTask: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePickupTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeletePickupTask: () => ({ mutate: vi.fn() }),
  useDispatchToSegregation: () => ({ mutate: vi.fn() }),
  usePickupAssignmentHistory: () => ({ data: { events: [] }, isLoading: false }),
}));

describe('CollectionPage', () => {
  it('renders the pickup row and history icon', () => {
    render(<CollectionPage />);

    expect(screen.getByText('P-1001')).toBeInTheDocument();
    expect(screen.getByLabelText('View assignment history for pickup-1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the page test and confirm the current hook/page shape does not satisfy it yet**

Run: `npm test -- --run tests/component/collection-page.test.tsx`

Expected: FAIL until the collection page uses the new service-backed model and tooltip component.

- [ ] **Step 3: Update the hook layer to call the real service and add history-query invalidation**

Update `src/features/collection/useCollection.ts` to use the service methods and add a dedicated history query hook:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import type {
  PickupAssignInput,
  PickupMarkCollectedInput,
  PickupTaskCreateInput,
  PickupTaskUpdateInput,
} from '../../shared/api/contracts';

export function useCollectionSchedule() {
  return useQuery({
    queryKey: ['collection', 'pickups'],
    queryFn: () => api.collection.listPickups(),
  });
}

export function usePickupAssignmentHistory(pickupId: string, enabled = true) {
  return useQuery({
    queryKey: ['collection', 'pickups', pickupId, 'history'],
    queryFn: () => api.collection.getAssignmentHistory(pickupId),
    enabled: enabled && pickupId.length > 0,
  });
}

export function useCreatePickupTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PickupTaskCreateInput) => api.collection.createPickup(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collection', 'pickups'] });
    },
  });
}

export function useUpdatePickupTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PickupTaskUpdateInput }) => api.collection.updatePickup(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collection', 'pickups'] });
    },
  });
}

export function useDeletePickupTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.collection.deletePickup(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collection', 'pickups'] });
    },
  });
}

export function useAssignPickup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PickupAssignInput }) => api.collection.assignPickup(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['collection', 'pickups'] });
      await queryClient.invalidateQueries({ queryKey: ['collection', 'pickups', variables.id, 'history'] });
    },
  });
}

export function useMarkCollected() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PickupMarkCollectedInput }) => api.collection.markCollected(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['collection', 'pickups'] });
      await queryClient.invalidateQueries({ queryKey: ['collection', 'pickups', variables.id, 'history'] });
    },
  });
}
```

Update `src/features/collection/CollectionPage.tsx` so each row renders the mapped pickup model and the history tooltip:

```tsx
import { PickupHistoryTooltip } from './PickupHistoryTooltip';
import { useCollectionSchedule, useDeletePickupTask, useCreatePickupTask, useUpdatePickupTask, useAssignPickup, useMarkCollected } from './useCollection';

// inside the row actions cell
<PickupHistoryTooltip pickupId={task.id} events={task.assignmentEvents ?? []} />
```

- [ ] **Step 4: Run the page test and the hook tests together**

Run: `npm test -- --run tests/unit/collection-service.test.ts tests/unit/collection-history-summary.test.ts tests/component/collection-page.test.tsx`

Expected: PASS with the new query keys, row rendering, and tooltip wiring.

- [ ] **Step 5: Commit the hook and page updates**

```bash
git add src/features/collection/useCollection.ts src/features/collection/CollectionPage.tsx tests/component/collection-page.test.tsx
git commit -m "feat: wire collection page to real pickup APIs"
```

---

### Task 4: Tighten the final collection page behavior and test the full flow

**Files:**
- Modify: `src/features/collection/CollectionPage.tsx`
- Modify: `src/features/collection/PickupHistoryTooltip.tsx`
- Modify: `src/features/collection/useCollection.ts`
- Test: `tests/component/collection-page.test.tsx`

- [ ] **Step 1: Add the missing row-level behaviors to the page**

Finish the collection row behaviors so the page uses the new API-backed model consistently:

```tsx
// row rendering should use backend fields directly
<td className="px-4 py-3 font-mono text-sm text-slate-400">{task.pickupCode}</td>
<td className="px-4 py-3">{task.siteName}</td>
<td className="px-4 py-3">{new Date(task.scheduledAtUtc).toLocaleDateString()}</td>
<td className="px-4 py-3">{task.estimatedWeightKg} kg</td>
```

Use the new history tooltip in the action cluster alongside the existing buttons:

```tsx
<PickupHistoryTooltip pickupId={task.id} events={task.assignmentEvents ?? []} />
```

- [ ] **Step 2: Make the tooltip content resilient to empty history**

Update `src/features/collection/PickupHistoryTooltip.tsx` so it renders a compact no-history message when there are no events:

```tsx
{open ? (
  <div className="absolute left-0 top-9 z-20 w-96 rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 shadow-xl">
    <p className="mb-2 font-semibold text-slate-300">Assignment history</p>
    {lines.length > 0 ? (
      <ul className="space-y-2">
        {lines.map((line, index) => (
          <li key={`${pickupId}-${index}`} className="leading-5 text-slate-200">
            {line}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-slate-400">No assignment history yet.</p>
    )}
  </div>
) : null}
```

- [ ] **Step 3: Run the full targeted collection test set**

Run: `npm test -- --run tests/unit/collection-service.test.ts tests/unit/collection-history-summary.test.ts tests/component/collection-page.test.tsx`

Expected: PASS with the collection page rendering API-backed data and the tooltip behaving on hover/focus.

- [ ] **Step 4: Commit the final collection integration slice**

```bash
git add src/features/collection/CollectionPage.tsx src/features/collection/PickupHistoryTooltip.tsx src/features/collection/useCollection.ts
git commit -m "feat: finish collection pickup api integration"
```

---

## Self-Review Coverage

- Spec requirement: collection page uses backend pickup APIs instead of raw dummy data.
  - Covered by Task 1 service work and Task 3/4 hook-page wiring.

- Spec requirement: compact hover summary for assignment history.
  - Covered by Task 2 formatter and tooltip tasks.

- Spec requirement: real API mutations for create, update, delete, assign, mark-collected, and send-to-segregation.
  - Covered by Task 1 service methods and Task 3 mutation hooks.

- Spec requirement: fallback only where backend is unavailable or a read path lacks coverage.
  - Covered by Task 1 read-path fallback tests and service implementation.

- Spec requirement: collection-specific targeted tests.
  - Covered by Tasks 1-4 with one unit file per pure behavior slice and one component file for the page.

---

Plan complete and saved to `docs/superpowers/plans/2026-06-19-collection-api-integration-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?