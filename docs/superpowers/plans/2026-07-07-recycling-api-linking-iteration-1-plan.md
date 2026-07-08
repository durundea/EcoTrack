# Recycling API Linking Iteration 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement contract-first frontend integration for the approved segregation -> recycling -> inventory flow so the app can consume real recycling APIs and preserve manual push-to-inventory behavior.

**Architecture:** Introduce a dedicated recycling service that mirrors the segregation service pattern, wire it into the shared API facade, and extend segregation/inventory contracts for linkage metadata and idempotent sync summary. Keep UI changes minimal: existing pages remain, but they consume new response shapes and show linkage feedback. Use TDD with unit tests for service mapping and component tests for recycling page behavior.

**Tech Stack:** TypeScript, React, TanStack React Query, existing requestJson HTTP helper, Vitest, Testing Library.

---

## Scope and Decomposition

This workspace is frontend-focused, so this plan implements contract and integration changes in this repository.
Backend service implementation should follow these same contracts in the API repository.

---

## File Structure

### New Files
- `src/features/recycling/recyclingService.ts` - real recycling API client, DTO mappers, and sync endpoint wiring.
- `tests/unit/recycling-service.test.ts` - unit tests for recycling service mapping and request payloads.
- `tests/component/recycling-page.test.tsx` - component tests for stage transitions, conversion create, and inventory sync behavior.

### Modified Files
- `src/shared/api/contracts.ts` - add recycling transport DTOs and segregation record response linkage fields.
- `src/features/segregation/segregationService.ts` - update record return type to include recycling linkage summary.
- `src/features/segregation/SegregationPage.tsx` - display created recycling batch count after save.
- `src/shared/services/inventoryService.ts` - add inventory sync method and response mapping.
- `src/shared/api/client.ts` - replace legacy recycling and inventory sync wiring with service-backed methods.
- `src/features/recycling/RecyclingPage.tsx` - adapt to typed service response and new stage transition payload.
- `tests/unit/mock-api.test.ts` - update facade assertions for new recycling and inventory sync functions.

---

### Task 1: Lock Contract Shape With Failing Tests

**Files:**
- Modify: `src/shared/api/contracts.ts`
- Create: `tests/unit/recycling-service.test.ts`

- [ ] **Step 1: Write failing unit tests for recycling service contract mapping**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapRecyclingBatch,
  mapInventorySyncSummary,
  recyclingService,
} from '../../src/features/recycling/recyclingService';
import { requestJson } from '../../src/shared/services/http';

vi.mock('../../src/shared/services/http', () => ({
  requestJson: vi.fn(),
}));

describe('recycling service mapping', () => {
  it('maps recycling batch dto into ui model', () => {
    const mapped = mapRecyclingBatch({
      id: 'RB-1',
      segregationBatchId: 'SB-1',
      pickupTaskId: 'pickup-1',
      sourceCategory: 'plastic',
      sourceWeightKg: 12,
      stage: 'segregated',
      outputProduct: 'Flakes',
      outputQuantity: 5,
      inventoryUpdated: false,
      stageHistory: [{ stage: 'segregated', atUtc: '2026-07-07T10:00:00Z' }],
    });

    expect(mapped.id).toBe('RB-1');
    expect(mapped.inputCategory).toBe('plastic');
    expect(mapped.inputWeightKg).toBe(12);
  });

  it('maps sync summary dto defaults', () => {
    const mapped = mapInventorySyncSummary({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });

    expect(mapped).toEqual({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });
  });
});

describe('recycling service requests', () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset();
  });

  it('posts stage transition payload', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      id: 'RB-1',
      segregationBatchId: 'SB-1',
      pickupTaskId: 'pickup-1',
      sourceCategory: 'plastic',
      sourceWeightKg: 12,
      stage: 'processing',
      outputProduct: 'Flakes',
      outputQuantity: 5,
      inventoryUpdated: false,
      stageHistory: [
        { stage: 'segregated', atUtc: '2026-07-07T10:00:00Z' },
        { stage: 'processing', atUtc: '2026-07-07T10:10:00Z' },
      ],
    });

    await recyclingService.advanceStage('RB-1', 'processing');

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/recycling/batches/RB-1/advance-stage', {
      method: 'POST',
      body: JSON.stringify({ stage: 'processing' }),
    });
  });

  it('posts inventory sync endpoint', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });

    await recyclingService.syncInventoryFromConversions();

    expect(vi.mocked(requestJson)).toHaveBeenCalledWith('/api/recycling/conversions/sync-inventory', {
      method: 'POST',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/recycling-service.test.ts`
Expected: FAIL because `recyclingService` does not exist yet.

- [ ] **Step 3: Add contract types used by the tests**

```ts
export type RecyclingStageDto = 'collected' | 'segregated' | 'processing' | 'converted';

export type RecyclingStageHistoryDto = {
  stage: RecyclingStageDto;
  atUtc: string;
};

export type RecyclingBatchDto = {
  id: string;
  segregationBatchId: string;
  pickupTaskId: string;
  sourceCategory: WasteCategory;
  sourceWeightKg: number;
  stage: RecyclingStageDto;
  outputProduct: string;
  outputQuantity: number;
  inventoryUpdated: boolean;
  stageHistory: RecyclingStageHistoryDto[];
};

export type RecyclingBatchListResponseDto = {
  items: RecyclingBatchDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type RecyclingAdvanceStageInputDto = {
  stage: Exclude<RecyclingStage, 'collected' | 'segregated'>;
};

export type InventorySyncSummaryDto = {
  updatedItemsCount: number;
  createdItemsCount: number;
  skippedCount: number;
  syncRunId: string;
};

export type SegregationRecordResultDto = SegregationBatchDetailDto & {
  createdRecyclingBatchIds: string[];
  createdRecyclingCount: number;
};
```

- [ ] **Step 4: Re-run test and keep it red until service exists**

Run: `npm test -- --run tests/unit/recycling-service.test.ts`
Expected: FAIL because service implementation still missing.

- [ ] **Step 5: Commit contract groundwork**

Run:
`git add src/shared/api/contracts.ts tests/unit/recycling-service.test.ts`
`git commit -m "test: add failing recycling service contract tests"`

---

### Task 2: Implement Real Recycling Service and API Wiring

**Files:**
- Create: `src/features/recycling/recyclingService.ts`
- Modify: `src/shared/api/client.ts`
- Modify: `tests/unit/recycling-service.test.ts`

- [ ] **Step 1: Implement recycling service methods and mappers**

```ts
import type {
  InventorySyncSummaryDto,
  ProductConversion,
  RecyclingBatch,
  RecyclingBatchDto,
  RecyclingBatchListResponseDto,
  RecyclingStage,
} from '../../shared/api/contracts';
import { requestJson } from '../../shared/services/http';

function normalizeText(value: string | null | undefined): string {
  return value ?? '';
}

function normalizeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function normalizeBatchList(payload: RecyclingBatchDto[] | RecyclingBatchListResponseDto): RecyclingBatchDto[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export function mapRecyclingBatch(dto: RecyclingBatchDto): RecyclingBatch {
  return {
    id: dto.id,
    segregationBatchId: dto.segregationBatchId,
    stage: dto.stage,
    inputCategory: dto.sourceCategory,
    outputProduct: normalizeText(dto.outputProduct),
    inputWeightKg: normalizeNumber(dto.sourceWeightKg),
    outputQuantity: normalizeNumber(dto.outputQuantity),
    inventoryUpdated: Boolean(dto.inventoryUpdated),
    stageHistory: (dto.stageHistory ?? []).map((entry) => ({ stage: entry.stage, at: normalizeText(entry.atUtc) })),
  };
}

export function mapInventorySyncSummary(dto: InventorySyncSummaryDto): InventorySyncSummaryDto {
  return {
    updatedItemsCount: normalizeNumber(dto.updatedItemsCount),
    createdItemsCount: normalizeNumber(dto.createdItemsCount),
    skippedCount: normalizeNumber(dto.skippedCount),
    syncRunId: normalizeText(dto.syncRunId),
  };
}

export const recyclingService = {
  async getBatches(page = 1, pageSize = 20): Promise<RecyclingBatch[]> {
    const payload = await requestJson<RecyclingBatchDto[] | RecyclingBatchListResponseDto>(
      `/api/recycling/batches?page=${page}&pageSize=${pageSize}`
    );

    return normalizeBatchList(payload).map(mapRecyclingBatch);
  },

  async advanceStage(id: string, stage: Extract<RecyclingStage, 'processing' | 'converted'>): Promise<RecyclingBatch> {
    const payload = await requestJson<RecyclingBatchDto>(`/api/recycling/batches/${id}/advance-stage`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    });

    return mapRecyclingBatch(payload);
  },

  async createProductConversion(input: {
    recyclingBatchId: string;
    productName: string;
    quantity: number;
    unit: 'kg' | 'units';
  }): Promise<ProductConversion> {
    return requestJson<ProductConversion>(`/api/recycling/batches/${input.recyclingBatchId}/conversions`, {
      method: 'POST',
      body: JSON.stringify({
        productName: input.productName,
        quantity: input.quantity,
        unit: input.unit,
      }),
    });
  },

  async syncInventoryFromConversions(): Promise<InventorySyncSummaryDto> {
    const payload = await requestJson<InventorySyncSummaryDto>('/api/recycling/conversions/sync-inventory', {
      method: 'POST',
    });

    return mapInventorySyncSummary(payload);
  },
};
```

- [ ] **Step 2: Wire shared API facade to real recycling service**

```ts
import { collectionService } from '../../features/collection/collectionService';
import { recyclingService } from '../../features/recycling/recyclingService';
import { segregationService } from '../../features/segregation/segregationService';
import { authService, healthService, inventoryService, salesService } from '../services';
import { dashboard } from './legacyClient';

export const api = {
  auth: authService,
  health: healthService,
  collection: collectionService,
  segregation: segregationService,
  recycling: recyclingService,
  dashboard,
  inventory: {
    getItems: inventoryService.getItems,
    createItem: inventoryService.createItem,
    updateItemPrice: inventoryService.updatePrice,
    syncInventoryFromConversions: recyclingService.syncInventoryFromConversions,
  },
  sales: salesService,
};
```

- [ ] **Step 3: Run recycling service unit tests**

Run: `npm test -- --run tests/unit/recycling-service.test.ts`
Expected: PASS.

- [ ] **Step 4: Update facade composition test assertions**

```ts
it('exposes service-backed auth, segregation, recycling, inventory, sales, and health modules', () => {
  expect(api.recycling.getBatches).toBeTypeOf('function');
  expect(api.recycling.advanceStage).toBeTypeOf('function');
  expect(api.recycling.createProductConversion).toBeTypeOf('function');
  expect(api.inventory.syncInventoryFromConversions).toBeTypeOf('function');
});
```

- [ ] **Step 5: Run facade unit test**

Run: `npm test -- --run tests/unit/mock-api.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit service wiring task**

Run:
`git add src/features/recycling/recyclingService.ts src/shared/api/client.ts tests/unit/recycling-service.test.ts tests/unit/mock-api.test.ts`
`git commit -m "feat: wire real recycling api service into facade"`

---

### Task 3: Extend Segregation Save Result for Recycling Link Feedback

**Files:**
- Modify: `src/features/segregation/segregationService.ts`
- Modify: `src/features/segregation/SegregationPage.tsx`
- Modify: `tests/component/segregation-page.test.tsx`

- [ ] **Step 1: Add failing component test for created recycling count message**

```ts
it('shows recycling batch creation count after successful segregation save', async () => {
  const user = userEvent.setup();

  apiMock.segregation.recordBatch.mockResolvedValueOnce({
    id: 'batch-1',
    batchCode: 'SB-001',
    status: 'recorded',
    pickupTaskId: 'pickup-1',
    pickupCode: 'PK-001',
    siteName: 'North Campus',
    siteAddressText: '12 Green Street',
    scheduledAtUtc: '2026-06-30T10:00:00Z',
    collectedWeightKg: 120,
    plasticKg: 10,
    organicKg: 0,
    metalKg: 0,
    paperKg: 0,
    eWasteKg: 0,
    recordedByUserId: 'user-1',
    recordedAtUtc: '2026-06-30T10:10:00Z',
    recycledByUserId: '',
    recycledAtUtc: '',
    createdAtUtc: '2026-06-30T09:00:00Z',
    updatedAtUtc: '2026-06-30T09:10:00Z',
    createdRecyclingBatchIds: ['RB-1'],
    createdRecyclingCount: 1,
  });

  renderPage();

  await user.selectOptions(await screen.findByLabelText(/Segregation Queue Entry/i), 'batch-1');
  await user.clear(screen.getByLabelText(/Plastic \(kg\)/i));
  await user.type(screen.getByLabelText(/Plastic \(kg\)/i), '10');
  await user.click(screen.getByRole('button', { name: /Save Batch/i }));

  expect(await screen.findByText(/Created 1 recycling batch/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm test -- --run tests/component/segregation-page.test.tsx`
Expected: FAIL because success message is not rendered.

- [ ] **Step 3: Update segregation service return type and mapping**

```ts
import type { SegregationRecordResultDto } from '../../shared/api/contracts';

export type SegregationRecordResult = SegregationBatchDetail & {
  createdRecyclingBatchIds: string[];
  createdRecyclingCount: number;
};

async recordBatch(id: string, input: SegregationRecordInputDto): Promise<SegregationRecordResult> {
  const payload = await requestJson<SegregationRecordResultDto>(`/api/segregation/batches/${id}/record`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return {
    ...mapSegregationDetail(payload),
    createdRecyclingBatchIds: payload.createdRecyclingBatchIds ?? [],
    createdRecyclingCount: payload.createdRecyclingCount ?? 0,
  };
}
```

- [ ] **Step 4: Render linkage feedback in segregation page**

```ts
const [saveSuccess, setSaveSuccess] = useState('');

const { mutate, isPending } = useMutation({
  mutationFn: () =>
    api.segregation.recordBatch(selectedBatchId, {
      plasticKg: weights.plastic,
      organicKg: weights.organic,
      metalKg: weights.metal,
      paperKg: weights.paper,
      eWasteKg: weights.ewaste,
    }),
  onSuccess: (result) => {
    setSaveSuccess(`Created ${result.createdRecyclingCount} recycling batch${result.createdRecyclingCount === 1 ? '' : 'es'}.`);
    queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
    queryClient.invalidateQueries({ queryKey: ['segregation', 'pending-batches'] });
    if (selectedDetailId) {
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batch-detail', selectedDetailId] });
    }
    setWeights(emptyWeights());
    setSelectedBatchId('');
    setFormError('');
  },
  onError: (error) => {
    setSaveSuccess('');
    const message = error instanceof Error ? error.message : 'Failed to record segregation batch.';
    setFormError(message);
  },
});

{saveSuccess ? <p className="text-sm text-emerald-300">{saveSuccess}</p> : null}
```

- [ ] **Step 5: Run segregation component tests**

Run: `npm test -- --run tests/component/segregation-page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit segregation linkage feedback**

Run:
`git add src/features/segregation/segregationService.ts src/features/segregation/SegregationPage.tsx tests/component/segregation-page.test.tsx`
`git commit -m "feat: show recycling linkage count after segregation save"`

---

### Task 4: Add Recycling Page Component Coverage for Real API Flow

**Files:**
- Create: `tests/component/recycling-page.test.tsx`
- Modify: `src/features/recycling/RecyclingPage.tsx`

- [ ] **Step 1: Write failing recycling page component test suite**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecyclingPage } from '../../src/features/recycling/RecyclingPage';

const apiMock = {
  recycling: {
    getBatches: vi.fn(),
    advanceStage: vi.fn(),
    createProductConversion: vi.fn(),
  },
  inventory: {
    syncInventoryFromConversions: vi.fn(),
  },
};

vi.mock('../../src/shared/api/client', () => ({ api: apiMock }));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RecyclingPage />
    </QueryClientProvider>
  );
}

describe('RecyclingPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMock.recycling.getBatches.mockResolvedValue([
      {
        id: 'RB-1',
        segregationBatchId: 'SB-1',
        stage: 'segregated',
        inputCategory: 'plastic',
        outputProduct: 'Flakes',
        inputWeightKg: 12,
        outputQuantity: 5,
        inventoryUpdated: false,
        stageHistory: [{ stage: 'segregated', at: '2026-07-07T10:00:00Z' }],
      },
    ]);

    apiMock.recycling.advanceStage.mockResolvedValue({ id: 'RB-1', stage: 'processing' });
    apiMock.recycling.createProductConversion.mockResolvedValue({ id: 'PC-1' });
    apiMock.inventory.syncInventoryFromConversions.mockResolvedValue({
      updatedItemsCount: 2,
      createdItemsCount: 1,
      skippedCount: 0,
      syncRunId: 'sync-1',
    });
  });

  it('calls advance stage endpoint', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Advance to Processing/i }));

    await waitFor(() => {
      expect(apiMock.recycling.advanceStage).toHaveBeenCalledWith('RB-1', 'processing');
    });
  });

  it('calls manual inventory sync endpoint', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Push Converted Products to Inventory/i }));

    await waitFor(() => {
      expect(apiMock.inventory.syncInventoryFromConversions).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test and confirm initial failure**

Run: `npm test -- --run tests/component/recycling-page.test.tsx`
Expected: FAIL until page uses the expected calls and text assertions are aligned.

- [ ] **Step 3: Update recycling page to surface sync summary message**

```ts
const [syncSummary, setSyncSummary] = useState('');

const { mutate: syncInventory, isPending: syncingInventory } = useMutation({
  mutationFn: () => api.inventory.syncInventoryFromConversions(),
  onSuccess: (summary) => {
    setSyncSummary(
      `Inventory sync complete. Updated ${summary.updatedItemsCount}, created ${summary.createdItemsCount}, skipped ${summary.skippedCount}.`
    );
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
  },
});

{syncSummary ? <p className="text-xs text-emerald-300">{syncSummary}</p> : null}
```

- [ ] **Step 4: Run recycling component tests**

Run: `npm test -- --run tests/component/recycling-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit recycling component coverage**

Run:
`git add src/features/recycling/RecyclingPage.tsx tests/component/recycling-page.test.tsx`
`git commit -m "test: add recycling page api flow coverage"`

---

### Task 5: Add Inventory Sync Service Mapping and End-to-End Verification

**Files:**
- Modify: `src/shared/services/inventoryService.ts`
- Modify: `tests/unit/inventory-service.test.ts`

- [ ] **Step 1: Add failing inventory service unit test for sync response mapping**

```ts
it('maps inventory sync summary response', async () => {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        updatedItemsCount: 3,
        createdItemsCount: 1,
        skippedCount: 0,
        syncRunId: 'sync-100',
      }),
      { status: 200 }
    )
  );

  const summary = await inventoryService.syncFromRecyclingConversions();

  expect(summary).toEqual({
    updatedItemsCount: 3,
    createdItemsCount: 1,
    skippedCount: 0,
    syncRunId: 'sync-100',
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- --run tests/unit/inventory-service.test.ts`
Expected: FAIL because sync method is missing.

- [ ] **Step 3: Implement inventory sync method**

```ts
type InventorySyncSummary = {
  updatedItemsCount: number;
  createdItemsCount: number;
  skippedCount: number;
  syncRunId: string;
};

async syncFromRecyclingConversions(): Promise<InventorySyncSummary> {
  return requestJson<InventorySyncSummary>('/api/recycling/conversions/sync-inventory', {
    method: 'POST',
  });
}
```

- [ ] **Step 4: Run focused unit tests**

Run: `npm test -- --run tests/unit/inventory-service.test.ts tests/unit/recycling-service.test.ts tests/unit/mock-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit inventory sync service update**

Run:
`git add src/shared/services/inventoryService.ts tests/unit/inventory-service.test.ts`
`git commit -m "feat: add inventory sync summary mapping for recycling conversions"`

---

### Task 6: Final Verification Sweep

**Files:**
- Verify only

- [ ] **Step 1: Run all affected component and unit tests**

Run:
`npm test -- --run tests/unit/recycling-service.test.ts tests/unit/recycling-rules.test.ts tests/unit/segregation-service.test.ts tests/unit/inventory-service.test.ts tests/unit/mock-api.test.ts tests/component/segregation-page.test.tsx tests/component/recycling-page.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run lint/type check guardrails**

Run:
`npm run build`

Expected: PASS.

- [ ] **Step 3: Commit final stabilization updates if any**

Run:
`git add -A`
`git commit -m "chore: finalize recycling api linking iteration 1 integration"`

---

## Plan Self-Review

### Spec coverage

- Automatic recycling batch creation linkage from segregation save: covered by contract extension and segregation task.
- One batch per non-zero category: represented by contract and mapping tasks; backend semantics documented in tests and payload shape.
- Manual push to inventory: covered by recycling page and inventory sync tasks.
- Full traceability fields: covered by contract task and recycling mapping.
- Error-safe and idempotent sync behavior: covered by inventory service and verification tasks.

### Placeholder scan

No unresolved placeholders remain.
All tasks include concrete file paths, code snippets, commands, and expected outcomes.

### Type consistency

- `createdRecyclingBatchIds`, `createdRecyclingCount` names are consistent across contracts, service, and component tests.
- Sync summary fields (`updatedItemsCount`, `createdItemsCount`, `skippedCount`, `syncRunId`) are consistent across service and component usage.
- Stage transition payload uses `stage` consistently.
