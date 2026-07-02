# Segregation API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace segregation page dummy data with real segregation backend APIs, including pending queue selection, record submission, detail popup, and send-to-recycling action.

**Architecture:** Keep the existing Segregation page layout and migrate only the data access layer to a dedicated segregation service. Use React Query for pending queue, history list, and detail popup state, and invalidate those queries after record and mark-recycled mutations. Keep mapping logic in the service so UI code renders a stable frontend model rather than raw transport DTOs.

**Tech Stack:** TypeScript, React, React Query, existing requestJson HTTP helper, Vitest, Testing Library.

---

## File Structure

### New Files
- `src/features/segregation/segregationService.ts` - segregation API client, DTO mapping, and mutation methods
- `tests/unit/segregation-service.test.ts` - unit tests for segregation service mapping and payload behavior
- `tests/component/segregation-page.test.tsx` - component behavior tests for dropdown, record action, popup, and send-to-recycling

### Modified Files
- `src/shared/api/contracts.ts` - add segregation transport DTO types for list, pending, detail, and record input
- `src/shared/api/client.ts` - route `api.segregation` to the new service
- `src/features/segregation/SegregationPage.tsx` - replace legacy calls with real segregation queries and mutations, add popup and send-to-recycling action
- `tests/unit/mock-api.test.ts` - update facade assertions to match non-mock integration behavior

---

### Task 1: Add segregation transport types and lock API shape with tests

**Files:**
- Modify: `src/shared/api/contracts.ts`
- Create: `tests/unit/segregation-service.test.ts`

- [ ] **Step 1: Write failing unit tests for expected segregation transport mapping surface**

```ts
import { describe, expect, it } from 'vitest';
import {
  mapSegregationListItem,
  mapSegregationDetail,
  mapPendingSegregationItem,
} from '../../src/features/segregation/segregationService';

describe('segregation service mapping', () => {
  it('maps pending queue item fields', () => {
    const mapped = mapPendingSegregationItem({
      id: 'batch-1',
      pickupTaskId: 'pickup-1',
      batchCode: 'SB-001',
      pickupCode: 'PK-001',
      status: 'pending',
      recordedAtUtc: null,
      recycledAtUtc: null,
    });

    expect(mapped).toEqual({
      id: 'batch-1',
      pickupTaskId: 'pickup-1',
      batchCode: 'SB-001',
      pickupCode: 'PK-001',
      status: 'pending',
      recordedAtUtc: '',
      recycledAtUtc: '',
    });
  });

  it('maps detail payload numeric fields with defaults', () => {
    const mapped = mapSegregationDetail({
      id: 'batch-1',
      batchCode: 'SB-001',
      status: 'recorded',
      pickupTaskId: 'pickup-1',
      pickupCode: 'PK-001',
      siteName: 'North Campus',
      siteAddressText: '12 Green Street',
      scheduledAtUtc: '2026-06-30T10:00:00Z',
      collectedWeightKg: 120,
      plasticKg: undefined,
      organicKg: 40,
      metalKg: 20,
      paperKg: undefined,
      eWasteKg: 5,
      recordedByUserId: null,
      recordedAtUtc: null,
      recycledByUserId: null,
      recycledAtUtc: null,
      createdAtUtc: '2026-06-30T09:00:00Z',
      updatedAtUtc: '2026-06-30T09:10:00Z',
    });

    expect(mapped.plasticKg).toBe(0);
    expect(mapped.paperKg).toBe(0);
    expect(mapped.recordedAtUtc).toBe('');
  });

  it('maps history list payload', () => {
    const mapped = mapSegregationListItem({
      id: 'batch-2',
      pickupTaskId: 'pickup-2',
      batchCode: 'SB-002',
      pickupCode: 'PK-002',
      status: 'recycled',
      recordedAtUtc: '2026-06-30T08:00:00Z',
      recycledAtUtc: '2026-06-30T09:00:00Z',
    });

    expect(mapped.status).toBe('recycled');
    expect(mapped.batchCode).toBe('SB-002');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail before implementation**

Run: `npm test -- --run tests/unit/segregation-service.test.ts`
Expected: FAIL because segregation service mapping exports do not exist yet.

- [ ] **Step 3: Add segregation DTO types to contracts**

```ts
export type SegregationBatchListItemDto = {
  id: string;
  pickupTaskId: string;
  batchCode: string;
  pickupCode: string;
  status: string;
  recordedAtUtc?: string | null;
  recycledAtUtc?: string | null;
};

export type SegregationBatchListResponseDto = {
  items: SegregationBatchListItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type SegregationBatchDetailDto = {
  id: string;
  batchCode: string;
  status: string;
  pickupTaskId: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  collectedWeightKg: number;
  plasticKg?: number | null;
  organicKg?: number | null;
  metalKg?: number | null;
  paperKg?: number | null;
  eWasteKg?: number | null;
  recordedByUserId?: string | null;
  recordedAtUtc?: string | null;
  recycledByUserId?: string | null;
  recycledAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type SegregationRecordInputDto = {
  plasticKg: number;
  organicKg: number;
  metalKg: number;
  paperKg: number;
  eWasteKg: number;
};
```

- [ ] **Step 4: Re-run unit test command to keep it red for missing service implementation**

Run: `npm test -- --run tests/unit/segregation-service.test.ts`
Expected: FAIL because mapper functions are still not implemented.

- [ ] **Step 5: Commit type and failing test groundwork**

Run:
`git add src/shared/api/contracts.ts tests/unit/segregation-service.test.ts`
`git commit -m "test: add failing segregation service mapping tests"`

---

### Task 2: Implement real segregation service and wire API client

**Files:**
- Create: `src/features/segregation/segregationService.ts`
- Modify: `src/shared/api/client.ts`
- Modify: `tests/unit/segregation-service.test.ts`

- [ ] **Step 1: Implement segregation service with mappers and endpoint methods**

```ts
import type {
  SegregationBatchDetailDto,
  SegregationBatchListItemDto,
  SegregationBatchListResponseDto,
  SegregationRecordInputDto,
} from '../../shared/api/contracts';
import { requestJson } from '../../shared/services/http';

export type SegregationBatchSummary = {
  id: string;
  pickupTaskId: string;
  batchCode: string;
  pickupCode: string;
  status: string;
  recordedAtUtc: string;
  recycledAtUtc: string;
};

export type SegregationBatchDetail = {
  id: string;
  batchCode: string;
  status: string;
  pickupTaskId: string;
  pickupCode: string;
  siteName: string;
  siteAddressText: string;
  scheduledAtUtc: string;
  collectedWeightKg: number;
  plasticKg: number;
  organicKg: number;
  metalKg: number;
  paperKg: number;
  eWasteKg: number;
  recordedByUserId: string;
  recordedAtUtc: string;
  recycledByUserId: string;
  recycledAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

function normalizeText(value: string | null | undefined): string {
  return value ?? '';
}

function normalizeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function normalizeListPayload(payload: SegregationBatchListItemDto[] | SegregationBatchListResponseDto): SegregationBatchListItemDto[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function mapPendingSegregationItem(dto: SegregationBatchListItemDto): SegregationBatchSummary {
  return {
    id: dto.id,
    pickupTaskId: dto.pickupTaskId,
    batchCode: normalizeText(dto.batchCode),
    pickupCode: normalizeText(dto.pickupCode),
    status: normalizeText(dto.status),
    recordedAtUtc: normalizeText(dto.recordedAtUtc),
    recycledAtUtc: normalizeText(dto.recycledAtUtc),
  };
}

export const mapSegregationListItem = mapPendingSegregationItem;

export function mapSegregationDetail(dto: SegregationBatchDetailDto): SegregationBatchDetail {
  return {
    id: dto.id,
    batchCode: normalizeText(dto.batchCode),
    status: normalizeText(dto.status),
    pickupTaskId: dto.pickupTaskId,
    pickupCode: normalizeText(dto.pickupCode),
    siteName: normalizeText(dto.siteName),
    siteAddressText: normalizeText(dto.siteAddressText),
    scheduledAtUtc: normalizeText(dto.scheduledAtUtc),
    collectedWeightKg: normalizeNumber(dto.collectedWeightKg),
    plasticKg: normalizeNumber(dto.plasticKg),
    organicKg: normalizeNumber(dto.organicKg),
    metalKg: normalizeNumber(dto.metalKg),
    paperKg: normalizeNumber(dto.paperKg),
    eWasteKg: normalizeNumber(dto.eWasteKg),
    recordedByUserId: normalizeText(dto.recordedByUserId),
    recordedAtUtc: normalizeText(dto.recordedAtUtc),
    recycledByUserId: normalizeText(dto.recycledByUserId),
    recycledAtUtc: normalizeText(dto.recycledAtUtc),
    createdAtUtc: normalizeText(dto.createdAtUtc),
    updatedAtUtc: normalizeText(dto.updatedAtUtc),
  };
}

export const segregationService = {
  async getBatches(page = 1, pageSize = 20): Promise<SegregationBatchSummary[]> {
    const payload = await requestJson<SegregationBatchListItemDto[] | SegregationBatchListResponseDto>(
      `/api/segregation/batches?page=${page}&pageSize=${pageSize}`
    );
    return normalizeListPayload(payload).map(mapSegregationListItem);
  },
  async getPendingBatches(page = 1, pageSize = 20): Promise<SegregationBatchSummary[]> {
    const payload = await requestJson<SegregationBatchListItemDto[] | SegregationBatchListResponseDto>(
      `/api/segregation/batches/pending?page=${page}&pageSize=${pageSize}`
    );
    return normalizeListPayload(payload).map(mapPendingSegregationItem);
  },
  async getBatchById(id: string): Promise<SegregationBatchDetail> {
    const payload = await requestJson<SegregationBatchDetailDto>(`/api/segregation/batches/${id}`);
    return mapSegregationDetail(payload);
  },
  async recordBatch(id: string, input: SegregationRecordInputDto): Promise<SegregationBatchDetail> {
    const payload = await requestJson<SegregationBatchDetailDto>(`/api/segregation/batches/${id}/record`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapSegregationDetail(payload);
  },
  async markRecycled(id: string): Promise<SegregationBatchDetail> {
    const payload = await requestJson<SegregationBatchDetailDto>(`/api/segregation/batches/${id}/mark-recycled`, {
      method: 'POST',
    });
    return mapSegregationDetail(payload);
  },
};
```

- [ ] **Step 2: Wire API client to service-backed segregation module**

```ts
import { segregationService } from '../../features/segregation/segregationService';

export const api = {
  // ...other modules
  segregation: segregationService,
};
```

- [ ] **Step 3: Add request payload assertions for record and mark-recycled to unit tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { segregationService } from '../../src/features/segregation/segregationService';
import { requestJson } from '../../src/shared/services/http';

vi.mock('../../src/shared/services/http', () => ({
  requestJson: vi.fn(),
}));

describe('segregation service requests', () => {
  beforeEach(() => vi.mocked(requestJson).mockReset());

  it('posts record payload to record endpoint', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({ id: 'batch-1', batchCode: 'SB-001', status: 'recorded' });

    await segregationService.recordBatch('batch-1', {
      plasticKg: 10,
      organicKg: 20,
      metalKg: 5,
      paperKg: 3,
      eWasteKg: 1,
    });

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/segregation/batches/batch-1/record', {
      method: 'POST',
      body: JSON.stringify({ plasticKg: 10, organicKg: 20, metalKg: 5, paperKg: 3, eWasteKg: 1 }),
    });
  });

  it('posts to mark-recycled endpoint', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({ id: 'batch-1', batchCode: 'SB-001', status: 'recycled' });

    await segregationService.markRecycled('batch-1');

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/segregation/batches/batch-1/mark-recycled', {
      method: 'POST',
    });
  });
});
```

- [ ] **Step 4: Run segregation service tests and confirm pass**

Run: `npm test -- --run tests/unit/segregation-service.test.ts`
Expected: PASS with mapper and request behavior covered.

- [ ] **Step 5: Commit service implementation**

Run:
`git add src/features/segregation/segregationService.ts src/shared/api/client.ts tests/unit/segregation-service.test.ts`
`git commit -m "feat: add segregation service and api wiring"`

---

### Task 3: Integrate SegregationPage with pending queue, detail popup, and send-to-recycling

**Files:**
- Modify: `src/features/segregation/SegregationPage.tsx`
- Test: `tests/component/segregation-page.test.tsx`

- [ ] **Step 1: Add failing component test for dropdown source and record flow**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegregationPage } from '../../src/features/segregation/SegregationPage';

vi.mock('../../src/shared/api/client', () => ({
  api: {
    segregation: {
      getPendingBatches: vi.fn().mockResolvedValue([
        {
          id: 'batch-1',
          pickupTaskId: 'pickup-1',
          batchCode: 'SB-001',
          pickupCode: 'PK-001',
          status: 'pending',
          recordedAtUtc: '',
          recycledAtUtc: '',
        },
      ]),
      getBatches: vi.fn().mockResolvedValue([]),
      recordBatch: vi.fn().mockResolvedValue({ id: 'batch-1', batchCode: 'SB-001', status: 'recorded' }),
      getBatchById: vi.fn().mockResolvedValue({ id: 'batch-1', batchCode: 'SB-001', status: 'recorded' }),
      markRecycled: vi.fn().mockResolvedValue({ id: 'batch-1', batchCode: 'SB-001', status: 'recycled' }),
    },
    collection: { getDispatches: vi.fn().mockResolvedValue([]) },
  },
}));

describe('SegregationPage integration', () => {
  it('renders pending backend batches in dropdown', async () => {
    render(<SegregationPage />);
    expect(await screen.findByText(/SB-001/)).toBeInTheDocument();
  });

  it('records selected batch using record endpoint', async () => {
    const user = userEvent.setup();
    render(<SegregationPage />);

    await user.selectOptions(screen.getByLabelText(/dispatch queue entry/i), 'batch-1');
    await user.clear(screen.getByLabelText(/Plastic/i));
    await user.type(screen.getByLabelText(/Plastic/i), '10');
    await user.click(screen.getByRole('button', { name: /save batch/i }));

    expect((await import('../../src/shared/api/client')).api.segregation.recordBatch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails against current page wiring**

Run: `npm test -- --run tests/component/segregation-page.test.tsx`
Expected: FAIL because page still uses legacy collection dispatches and mock segregation methods.

- [ ] **Step 3: Replace page data wiring with segregation service queries and mutations**

```tsx
const { data: pendingBatches, isLoading: pendingLoading, isError: pendingError } = useQuery({
  queryKey: ['segregation', 'pending-batches'],
  queryFn: () => api.segregation.getPendingBatches(),
});

const { data: batches, isLoading: historyLoading, isError: historyError } = useQuery({
  queryKey: ['segregation', 'batches'],
  queryFn: () => api.segregation.getBatches(),
});

const [selectedBatchId, setSelectedBatchId] = useState('');
const [detailBatchId, setDetailBatchId] = useState<string | null>(null);

const { data: detailBatch } = useQuery({
  queryKey: ['segregation', 'batch-detail', detailBatchId],
  queryFn: () => api.segregation.getBatchById(detailBatchId as string),
  enabled: Boolean(detailBatchId),
});

const recordMutation = useMutation({
  mutationFn: () => api.segregation.recordBatch(selectedBatchId, {
    plasticKg: weights.plastic,
    organicKg: weights.organic,
    metalKg: weights.metal,
    paperKg: weights.paper,
    eWasteKg: weights.ewaste,
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['segregation', 'pending-batches'] });
    queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
    if (detailBatchId) {
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batch-detail', detailBatchId] });
    }
    setWeights(emptyWeights());
    setSelectedBatchId('');
    setFormError('');
  },
});

const markRecycledMutation = useMutation({
  mutationFn: (id: string) => api.segregation.markRecycled(id),
  onSuccess: (_, id) => {
    queryClient.invalidateQueries({ queryKey: ['segregation', 'pending-batches'] });
    queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
    if (detailBatchId === id) {
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batch-detail', id] });
    }
  },
});
```

- [ ] **Step 4: Add popup and send-to-recycling action UI path**

```tsx
<button
  type='button'
  onClick={() => setDetailBatchId(b.id)}
  className='rounded border border-slate-700 px-2 py-1 text-xs text-slate-200'
>
  View
</button>
<button
  type='button'
  disabled={b.status.toLowerCase() === 'recycled'}
  onClick={() => markRecycledMutation.mutate(b.id)}
  className='rounded bg-brand-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50'
>
  Send to Recycling
</button>

{detailBatchId && detailBatch ? (
  <div role='dialog' aria-label='Segregation batch details' className='rounded-xl border border-slate-700 bg-slate-900 p-4'>
    <p>{detailBatch.batchCode}</p>
    <p>{detailBatch.siteName}</p>
    <p>{detailBatch.siteAddressText}</p>
    <button type='button' onClick={() => setDetailBatchId(null)}>Close</button>
  </div>
) : null}
```

- [ ] **Step 5: Run component test and adjust assertions until passing**

Run: `npm test -- --run tests/component/segregation-page.test.tsx`
Expected: PASS with pending queue render, record call, popup open, and mark-recycled action covered.

- [ ] **Step 6: Commit page integration**

Run:
`git add src/features/segregation/SegregationPage.tsx tests/component/segregation-page.test.tsx`
`git commit -m "feat: integrate segregation page with backend endpoints"`

---

### Task 4: Expand tests for detail popup and recycle action refresh behavior

**Files:**
- Modify: `tests/component/segregation-page.test.tsx`
- Modify: `tests/unit/segregation-service.test.ts`

- [ ] **Step 1: Add failing tests for query refresh and detail update after mutations**

```tsx
it('refreshes pending and history after mark-recycled', async () => {
  const user = userEvent.setup();
  render(<SegregationPage />);

  await user.click(await screen.findByRole('button', { name: /send to recycling/i }));

  expect(api.segregation.markRecycled).toHaveBeenCalledWith('batch-1');
  expect(api.segregation.getPendingBatches).toHaveBeenCalledTimes(2);
  expect(api.segregation.getBatches).toHaveBeenCalledTimes(2);
});

it('loads detail endpoint when view action is clicked', async () => {
  const user = userEvent.setup();
  render(<SegregationPage />);

  await user.click(await screen.findByRole('button', { name: /view/i }));

  expect(api.segregation.getBatchById).toHaveBeenCalledWith('batch-1');
  expect(await screen.findByRole('dialog', { name: /segregation batch details/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run targeted component test and keep it red until query invalidation is correct**

Run: `npm test -- --run tests/component/segregation-page.test.tsx -t "refreshes pending and history after mark-recycled"`
Expected: FAIL if invalidation keys are incomplete.

- [ ] **Step 3: Finalize mutation onSuccess handlers and update tests accordingly**

```tsx
onSuccess: (_, id) => {
  queryClient.invalidateQueries({ queryKey: ['segregation', 'pending-batches'] });
  queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
  queryClient.invalidateQueries({ queryKey: ['segregation', 'batch-detail', id] });
}
```

- [ ] **Step 4: Run focused segregation test suite**

Run: `npm test -- --run tests/unit/segregation-service.test.ts tests/component/segregation-page.test.tsx tests/component/segregation-validation.test.ts`
Expected: PASS all targeted segregation tests.

- [ ] **Step 5: Commit test hardening**

Run:
`git add tests/unit/segregation-service.test.ts tests/component/segregation-page.test.tsx`
`git commit -m "test: cover segregation detail and recycle refresh flows"`

---

### Task 5: Update API facade coverage and final verification

**Files:**
- Modify: `tests/unit/mock-api.test.ts`

- [ ] **Step 1: Update mock-api facade expectations for segregation service methods**

```ts
it('exposes segregation service methods', () => {
  expect(api.segregation.getBatches).toBeTypeOf('function');
  expect(api.segregation.getPendingBatches).toBeTypeOf('function');
  expect(api.segregation.getBatchById).toBeTypeOf('function');
  expect(api.segregation.recordBatch).toBeTypeOf('function');
  expect(api.segregation.markRecycled).toBeTypeOf('function');
});
```

- [ ] **Step 2: Run targeted facade and segregation verification command**

Run: `npm test -- --run tests/unit/mock-api.test.ts tests/unit/segregation-service.test.ts tests/component/segregation-page.test.tsx`
Expected: PASS.

- [ ] **Step 3: Run broad regression command for related modules**

Run: `npm test -- --run tests/component/collection-page.test.tsx tests/component/segregation-validation.test.ts tests/unit/collection-service.test.ts tests/unit/mock-api.test.ts`
Expected: PASS and no collection regression from segregation API client wiring.

- [ ] **Step 4: Commit final integration and verification updates**

Run:
`git add tests/unit/mock-api.test.ts`
`git commit -m "test: align api facade coverage for segregation integration"`

---

## Final Verification Checklist

- [ ] `npm test -- --run tests/unit/segregation-service.test.ts`
- [ ] `npm test -- --run tests/component/segregation-page.test.tsx`
- [ ] `npm test -- --run tests/component/segregation-validation.test.ts`
- [ ] `npm test -- --run tests/unit/mock-api.test.ts`
- [ ] `npm test -- --run tests/component/collection-page.test.tsx tests/unit/collection-service.test.ts`

If all checks pass, the segregation page is fully integrated with backend APIs and no longer relies on dummy segregation data.