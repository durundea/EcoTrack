# Immediate Record Reflection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make newly created collection pickups and inventory sale drafts visible immediately in the UI after create mutation success, without requiring a manual reload.

**Architecture:** Add one focused shared helper for list-cache upsert behavior, then use it in collection and inventory create mutation success handlers. Keep existing query invalidation so backend data remains authoritative while the UI updates immediately from the mutation response.

**Tech Stack:** TypeScript, React, TanStack React Query, Vitest, Testing Library.

---

## File Structure

### New Files
- `src/shared/services/queryListCache.ts` - shared list upsert helpers for React Query cache updates after create mutations.
- `tests/unit/query-list-cache.test.ts` - unit tests for list upsert behavior and duplicate prevention.
- `tests/component/collection-create-immediate-reflection.test.tsx` - integration-style component test proving immediate collection row visibility before refetch resolves.

### Modified Files
- `src/shared/services/index.ts` - export cache helper module.
- `src/features/collection/useCollection.ts` - apply shared helper in create mutation success path.
- `src/features/inventory/InventoryPage.tsx` - apply shared helper in sale draft create mutation success path.
- `tests/component/inventory-sales-records.test.tsx` - add/adjust scenario that proves immediate visibility before refetch resolves.

---

### Task 1: Build Shared Query List Cache Helper

**Files:**
- Create: `src/shared/services/queryListCache.ts`
- Create: `tests/unit/query-list-cache.test.ts`
- Modify: `src/shared/services/index.ts`

- [ ] **Step 1: Write the failing unit test for list upsert and duplicate prevention**

```ts
import { describe, expect, it } from 'vitest';
import { upsertById } from '../../src/shared/services/queryListCache';

describe('queryListCache', () => {
  it('prepends a newly created record when id does not exist', () => {
    const result = upsertById(
      [
        { id: 'A', name: 'Old A' },
        { id: 'B', name: 'Old B' },
      ],
      { id: 'C', name: 'New C' }
    );

    expect(result).toEqual([
      { id: 'C', name: 'New C' },
      { id: 'A', name: 'Old A' },
      { id: 'B', name: 'Old B' },
    ]);
  });

  it('replaces existing record when id already exists', () => {
    const result = upsertById(
      [
        { id: 'A', name: 'Old A' },
        { id: 'B', name: 'Old B' },
      ],
      { id: 'B', name: 'Fresh B' }
    );

    expect(result).toEqual([
      { id: 'B', name: 'Fresh B' },
      { id: 'A', name: 'Old A' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `npm test -- --run tests/unit/query-list-cache.test.ts`

Expected: FAIL because `queryListCache` helper does not exist yet.

- [ ] **Step 3: Implement minimal helper**

```ts
type WithId = { id: string };

export function upsertById<T extends WithId>(items: T[] | undefined, created: T): T[] {
  const list = items ?? [];
  const withoutExisting = list.filter((item) => item.id !== created.id);
  return [created, ...withoutExisting];
}
```

- [ ] **Step 4: Export helper from shared services index**

```ts
export * from './queryListCache';
```

- [ ] **Step 5: Run test to confirm pass**

Run: `npm test -- --run tests/unit/query-list-cache.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit helper task**

```bash
git add src/shared/services/queryListCache.ts src/shared/services/index.ts tests/unit/query-list-cache.test.ts
git commit -m "feat: add shared query list cache upsert helper"
```

---

### Task 2: Apply Immediate Cache Update for Collection Create Flow

**Files:**
- Modify: `src/features/collection/useCollection.ts`
- Create: `tests/component/collection-create-immediate-reflection.test.tsx`

- [ ] **Step 1: Write failing component test for immediate collection row visibility before refetch resolves**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '../../src/app/providers';
import { CollectionPage } from '../../src/features/collection/CollectionPage';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

function renderPage() {
  return render(
    <Providers>
      <MemoryRouter>
        <CollectionPage />
      </MemoryRouter>
    </Providers>
  );
}

describe('collection create immediate reflection', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'admin-token',
      user: { id: 'U-001', name: 'Admin', role: 'admin', email: 'admin@ecotrack.local' },
    });
    vi.restoreAllMocks();
  });

  it('shows newly created pickup row before refetch resolves', async () => {
    let pickupGetCount = 0;
    let releaseSecondGet: (() => void) | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const pathname = new URL(requestUrl).pathname;
      const method = init?.method ?? 'GET';

      if (pathname === '/api/collection/dispatches') {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      if (pathname === '/api/collection/pickups' && method === 'GET') {
        pickupGetCount += 1;

        if (pickupGetCount === 1) {
          return new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }), { status: 200 });
        }

        await new Promise<void>((resolve) => {
          releaseSecondGet = resolve;
        });

        return new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }), { status: 200 });
      }

      if (pathname === '/api/collection/pickups' && method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'pickup-900',
            pickupCode: 'PK-900',
            siteName: 'Immediate Site',
            siteAddressText: 'Immediate Site',
            scheduledAtUtc: '2026-07-03T00:00:00Z',
            estimatedWeightKg: 20,
            collectedWeightKg: 0,
            status: 'scheduled',
            assignedCollectorUserId: null,
            assignedCollectorDisplayName: null,
            notes: '',
          }),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /schedule new pickup/i }));
    fireEvent.change(screen.getByLabelText(/site/i), { target: { value: 'Immediate Site' } });
    fireEvent.change(screen.getByLabelText(/estimated weight/i), { target: { value: 20 } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText('Immediate Site')).toBeInTheDocument();
    });

    expect(pickupGetCount).toBeGreaterThanOrEqual(2);
    releaseSecondGet?.();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `npm test -- --run tests/component/collection-create-immediate-reflection.test.tsx`

Expected: FAIL because create success currently relies on invalidation/refetch and does not write created row to cache immediately.

- [ ] **Step 3: Update collection create mutation success to write cache first, then invalidate**

```ts
import { upsertById } from '../../shared/services/queryListCache';

export function useCreatePickupTask() {
  const queryClient = useQueryClient();
  const invalidate = useScheduleInvalidator();

  return useMutation({
    mutationFn: (input: Omit<PickupTask, 'id'>) =>
      api.collection.createTask({
        siteName: input.site,
        siteAddressText: input.site,
        scheduledAtUtc: new Date(`${input.scheduledDate}T00:00:00.000Z`).toISOString(),
        estimatedWeightKg: input.estimatedWeightKg,
        notes: input.notes ?? '',
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<PickupTask[]>(['collection', 'schedule'], (current) => upsertById(current, created));
      invalidate();
    },
  });
}
```

- [ ] **Step 4: Run test to confirm pass**

Run: `npm test -- --run tests/component/collection-create-immediate-reflection.test.tsx`

Expected: PASS and created row visible before second GET resolves.

- [ ] **Step 5: Run nearby collection tests for regression**

Run: `npm test -- --run tests/component/collection-page.test.tsx tests/unit/collection-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit collection task**

```bash
git add src/features/collection/useCollection.ts tests/component/collection-create-immediate-reflection.test.tsx
git commit -m "fix: reflect created collection pickups immediately"
```

---

### Task 3: Apply Immediate Cache Update for Inventory Draft Create Flow

**Files:**
- Modify: `src/features/inventory/InventoryPage.tsx`
- Modify: `tests/component/inventory-sales-records.test.tsx`

- [ ] **Step 1: Write/adjust failing inventory component test for immediate sales row visibility before refetch resolves**

Use the existing create-draft test pattern and hold the second `GET /api/inventory/sales` promise unresolved until after asserting the new row is visible.

```ts
it('shows newly created sale draft row before sales refetch resolves', async () => {
  let salesListCalls = 0;
  let releaseSecondGet: (() => void) | null = null;

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const pathname = new URL(requestUrl).pathname;
    const method = init?.method ?? 'GET';

    if (pathname === '/api/inventory/items') {
      return new Response(JSON.stringify([
        { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
      ]), { status: 200 });
    }

    if (pathname === '/api/inventory/sales' && method === 'GET') {
      salesListCalls += 1;
      if (salesListCalls === 1) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      await new Promise<void>((resolve) => {
        releaseSecondGet = resolve;
      });

      return new Response(JSON.stringify([]), { status: 200 });
    }

    if (pathname === '/api/inventory/sales' && method === 'POST') {
      return new Response(JSON.stringify({
        id: 'SALE-901',
        inventoryItemId: 'INV-001',
        quantitySold: 4,
        revenueInr: 240,
        soldAtUtc: '2026-06-03T00:00:00Z',
        approvalStatus: 'draft',
        requestedByUserId: 'U-002',
      }), { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  });

  renderInventory();
  const itemSelect = await screen.findByRole('combobox');
  fireEvent.change(itemSelect, { target: { value: 'INV-001' } });
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 4 } });
  fireEvent.click(screen.getByRole('button', { name: /create sale draft/i }));

  await waitFor(() => {
    expect(screen.getByText(formatExpectedSoldAt('2026-06-03T00:00:00Z'))).toBeInTheDocument();
  });

  releaseSecondGet?.();
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `npm test -- --run tests/component/inventory-sales-records.test.tsx -t "before sales refetch resolves"`

Expected: FAIL because current behavior depends on refetch/invalidation path.

- [ ] **Step 3: Update inventory create mutation success to cache-upsert created sale before invalidation**

```ts
import { upsertById } from '../../shared/services/queryListCache';

const { mutate: createSaleDraft, isPending: creatingSaleDraft } = useMutation({
  mutationFn: (input: { inventoryItemId: string; quantitySold: number; soldAt: string }) => api.sales.createDraft(input),
  onSuccess: (created) => {
    setLatestDraft(created);
    queryClient.setQueryData<SaleRecord[]>(['inventory', 'sales'], (current) => upsertById(current, created));
    invalidateSales();
  },
});
```

- [ ] **Step 4: Run targeted inventory tests to confirm pass**

Run: `npm test -- --run tests/component/inventory-sales-records.test.tsx tests/component/inventory-approval.test.tsx tests/unit/inventory-sales-records.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit inventory task**

```bash
git add src/features/inventory/InventoryPage.tsx tests/component/inventory-sales-records.test.tsx
git commit -m "fix: reflect created inventory sales immediately"
```

---

### Task 4: Final Verification

**Files:**
- Modify: none
- Test: run targeted suite

- [ ] **Step 1: Run full focused verification command**

Run:

```bash
npm test -- --run tests/unit/query-list-cache.test.ts tests/component/collection-create-immediate-reflection.test.tsx tests/component/collection-page.test.tsx tests/component/inventory-sales-records.test.tsx tests/component/inventory-approval.test.tsx tests/unit/collection-service.test.ts tests/unit/inventory-sales-records.test.ts
```

Expected: PASS.

- [ ] **Step 2: Verify diff scope**

Run: `git status --short`

Expected: only files listed in this plan are modified.

- [ ] **Step 3: Commit verification note (optional, if project prefers single-task commits only skip this step)**

```bash
git commit --allow-empty -m "chore: verify immediate record reflection test suite"
```

---

## Plan Self-Review

### 1. Spec coverage check
- Immediate collection visibility: covered in Task 2.
- Immediate inventory visibility: covered in Task 3.
- Shared helper approach: covered in Task 1 and reused in Tasks 2 and 3.
- Preserve invalidation for backend reconciliation: covered in Tasks 2 and 3.
- Targeted tests for immediate reflection: covered in Tasks 1, 2, and 3 with final verification in Task 4.

### 2. Placeholder scan
- No TBD/TODO placeholders.
- Every implementation step includes concrete code snippets and exact commands.

### 3. Type and signature consistency
- Shared helper signature uses objects with `id: string`, matching `PickupTask` and `SaleRecord`.
- Query keys are consistent with existing usage: `['collection', 'schedule']` and `['inventory', 'sales']`.
