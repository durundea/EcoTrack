# Sales Records Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render all sales records from GET /api/inventory/sales on the Inventory page and support search by exact sale ID plus partial item-name match.

**Architecture:** Keep API normalization inside the shared sales service and keep UI logic in the inventory feature. Add focused, pure helper functions for joining sales with inventory item names and applying search rules, then consume those helpers in the Inventory page so rendering code stays readable and testable.

**Tech Stack:** React, TypeScript, TanStack Query, Vitest, React Testing Library.

---

## Scope Check

This spec is one subsystem (Inventory page sales records read/search behavior). A single implementation plan is sufficient.

## File Structure and Responsibilities

Service layer:
- Modify: `src/shared/services/salesService.ts`
  - Add read endpoints (`list`, `getById`) and keep DTO normalization in one place.
- Modify: `tests/unit/sales-service.test.ts`
  - Validate DTO-to-domain mapping and new read endpoints.

Inventory feature logic:
- Create: `src/features/inventory/salesRecords.ts`
  - Build joined row models (`SaleRecord` + item name) and search helpers.
- Create: `tests/unit/inventory-sales-records.test.ts`
  - Unit tests for join fallback behavior and search precedence.

Inventory screen integration:
- Modify: `src/features/inventory/InventoryPage.tsx`
  - Fetch sales list, add search state, render list/loading/error/empty/no-results UI.
- Create: `tests/component/inventory-sales-records.test.tsx`
  - Screen-level behavior tests for rendering and filtering.
- Modify: `tests/component/inventory-approval.test.tsx`
  - Replace outdated placeholder assertion with a new sales-section assertion.

### Task 1: Add Sales Read Endpoints in Service Layer

**Files:**
- Modify: `src/shared/services/salesService.ts`
- Modify: `tests/unit/sales-service.test.ts`

- [ ] **Step 1: Write the failing test for sales listing and record lookup**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';
import { salesService } from '../../src/shared/services';

describe('salesService', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'collector-token',
      user: { id: 'U-002', name: 'Collector', role: 'collector', email: 'collector@ecotrack.local' },
    });
    vi.restoreAllMocks();
  });

  it('lists sales and fetches one sale by id from backend read endpoints', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          id: 'SALE-101',
          inventoryItemId: 'INV-001',
          quantitySold: 2,
          revenueInr: 120,
          soldAtUtc: '2026-06-01T00:00:00Z',
          approvalStatus: 'pendingApproval',
          requestedByUserId: 'U-002',
        },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'SALE-101',
        inventoryItemId: 'INV-001',
        quantitySold: 2,
        revenueInr: 120,
        soldAtUtc: '2026-06-01T00:00:00Z',
        approvalStatus: 'pendingApproval',
        requestedByUserId: 'U-002',
      }), { status: 200 }));

    const rows = await salesService.list();
    const one = await salesService.getById('SALE-101');

    expect(rows).toHaveLength(1);
    expect(rows[0].approvalStatus).toBe('pending_approval');
    expect(one.id).toBe('SALE-101');
    expect(one.revenueINR).toBe(120);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run tests/unit/sales-service.test.ts`
Expected: FAIL with TypeScript/runtime errors because `salesService.list` and `salesService.getById` do not exist yet.

- [ ] **Step 3: Implement minimal read endpoints in sales service**

```ts
// src/shared/services/salesService.ts (add methods inside salesService)
async list(): Promise<SaleRecord[]> {
  const dtos = await requestJson<SaleRecordDto[]>('/api/inventory/sales', {
    method: 'GET',
  });

  return dtos.map(toSaleRecord);
},

async getById(id: string): Promise<SaleRecord> {
  const dto = await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}`, {
    method: 'GET',
  });

  return toSaleRecord(dto);
},
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `npm test -- --run tests/unit/sales-service.test.ts`
Expected: PASS and includes the new read-endpoint test.

- [ ] **Step 5: Commit service-layer changes**

```bash
git add src/shared/services/salesService.ts tests/unit/sales-service.test.ts
git commit -m "feat: add sales read endpoints to sales service"
```

### Task 2: Add Pure Join and Search Helpers

**Files:**
- Create: `src/features/inventory/salesRecords.ts`
- Create: `tests/unit/inventory-sales-records.test.ts`

- [ ] **Step 1: Write failing tests for row join and search behavior**

```ts
import { describe, expect, it } from 'vitest';
import type { InventoryItem, SaleRecord } from '../../src/shared/api/contracts';
import { buildSalesRows, filterSalesRows } from '../../src/features/inventory/salesRecords';

const items: InventoryItem[] = [
  { id: 'INV-001', name: 'Compost Premium', category: 'recycled-product', quantityKg: 30, unit: 'kg', standardPriceINR: 60 },
  { id: 'INV-002', name: 'Eco Bricks', category: 'recycled-product', quantityKg: 50, unit: 'units', standardPriceINR: 40 },
];

const sales: SaleRecord[] = [
  {
    id: 'SALE-101',
    inventoryItemId: 'INV-001',
    quantitySold: 2,
    revenueINR: 120,
    soldAt: '2026-06-01T00:00:00Z',
    approvalStatus: 'pending_approval',
    requestedByUserId: 'U-002',
  },
  {
    id: 'SALE-404',
    inventoryItemId: 'INV-404',
    quantitySold: 1,
    revenueINR: 90,
    soldAt: '2026-06-02T00:00:00Z',
    approvalStatus: 'draft',
    requestedByUserId: 'U-002',
  },
];

describe('salesRecords helpers', () => {
  it('joins item names and falls back to inventory item id when unresolved', () => {
    const rows = buildSalesRows(sales, items);

    expect(rows[0].itemName).toBe('Compost Premium');
    expect(rows[1].itemName).toBe('INV-404');
  });

  it('returns exact sale id match before item-name search', () => {
    const rows = buildSalesRows(sales, items);

    const byId = filterSalesRows(rows, 'SALE-101');
    expect(byId).toHaveLength(1);
    expect(byId[0].id).toBe('SALE-101');

    const byItemName = filterSalesRows(rows, 'compost');
    expect(byItemName).toHaveLength(1);
    expect(byItemName[0].id).toBe('SALE-101');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run tests/unit/inventory-sales-records.test.ts`
Expected: FAIL because `salesRecords.ts` and exported helpers do not exist yet.

- [ ] **Step 3: Implement the pure helper module**

```ts
// src/features/inventory/salesRecords.ts
import type { InventoryItem, SaleRecord } from '../../shared/api/contracts';

export type SalesRecordRow = SaleRecord & {
  itemName: string;
  searchableItemName: string;
};

export function buildSalesRows(sales: SaleRecord[], items: InventoryItem[]): SalesRecordRow[] {
  const nameById = new Map(items.map((item) => [item.id, item.name]));

  return sales.map((sale) => {
    const itemName = nameById.get(sale.inventoryItemId) ?? sale.inventoryItemId;
    return {
      ...sale,
      itemName,
      searchableItemName: itemName.toLowerCase(),
    };
  });
}

export function filterSalesRows(rows: SalesRecordRow[], rawSearch: string): SalesRecordRow[] {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return rows;

  const byExactId = rows.filter((row) => row.id.toLowerCase() === search);
  if (byExactId.length > 0) return byExactId;

  return rows.filter((row) => row.searchableItemName.includes(search));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run tests/unit/inventory-sales-records.test.ts`
Expected: PASS and confirms fallback plus search precedence.

- [ ] **Step 5: Commit helper-layer changes**

```bash
git add src/features/inventory/salesRecords.ts tests/unit/inventory-sales-records.test.ts
git commit -m "feat: add sales record join and search helpers"
```

### Task 3: Integrate Sales List and Search into Inventory Page

**Files:**
- Modify: `src/features/inventory/InventoryPage.tsx`
- Create: `tests/component/inventory-sales-records.test.tsx`
- Modify: `tests/component/inventory-approval.test.tsx`

- [ ] **Step 1: Write failing component tests for list rendering and search**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '../../src/app/providers';
import { InventoryPage } from '../../src/features/inventory/InventoryPage';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

function renderInventory() {
  return render(
    <Providers>
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    </Providers>
  );
}

describe('inventory sales records section', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
    setSession({
      token: 'collector-token',
      user: { id: 'U-002', name: 'Collector', role: 'collector', email: 'collector@ecotrack.local' },
    });
  });

  it('renders sales rows from GET /api/inventory/sales and supports item-name search', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 'INV-001', name: 'Compost Premium', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          id: 'SALE-101',
          inventoryItemId: 'INV-001',
          quantitySold: 2,
          revenueInr: 120,
          soldAtUtc: '2026-06-01T00:00:00Z',
          approvalStatus: 'pendingApproval',
          requestedByUserId: 'U-002',
        },
      ]), { status: 200 }));

    renderInventory();

    expect(await screen.findByText(/SALE-101/i)).toBeInTheDocument();
    expect(screen.getByText(/Compost Premium/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /search sales/i }), {
      target: { value: 'compost' },
    });

    expect(screen.getByText(/SALE-101/i)).toBeInTheDocument();
  });

  it('shows fallback item label when inventory item is missing', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          id: 'SALE-404',
          inventoryItemId: 'INV-404',
          quantitySold: 1,
          revenueInr: 90,
          soldAtUtc: '2026-06-02T00:00:00Z',
          approvalStatus: 'draft',
          requestedByUserId: 'U-002',
        },
      ]), { status: 200 }));

    renderInventory();

    expect(await screen.findByText(/INV-404/i)).toBeInTheDocument();
  });
});
```

Update outdated expectation in `tests/component/inventory-approval.test.tsx`:

```tsx
// Replace this assertion:
// expect(await screen.findByText(/backend does not expose get \/api\/inventory\/sales/i)).toBeInTheDocument();

// With this assertion:
expect(await screen.findByRole('heading', { name: /sales records/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run component tests to verify they fail first**

Run: `npm test -- --run tests/component/inventory-sales-records.test.tsx tests/component/inventory-approval.test.tsx`
Expected: FAIL because the page still shows placeholder copy and has no search input or sales list.

- [ ] **Step 3: Implement Inventory page query, derived rows, search input, and table rendering**

```tsx
// src/features/inventory/InventoryPage.tsx (key additions)
import { buildSalesRows, filterSalesRows } from './salesRecords';

const { data: sales, isLoading: loadingSales, isError: salesError } = useQuery({
  queryKey: ['inventory', 'sales'],
  queryFn: () => api.sales.list(),
});

const [salesSearch, setSalesSearch] = useState('');

const salesRows = useMemo(
  () => buildSalesRows(sales ?? [], items ?? []),
  [sales, items]
);

const visibleSalesRows = useMemo(
  () => filterSalesRows(salesRows, salesSearch),
  [salesRows, salesSearch]
);
```

```tsx
// src/features/inventory/InventoryPage.tsx (replace Sales Records placeholder block)
<div>
  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h2 className="text-lg font-medium">Sales Records</h2>
    <div className="sm:w-80">
      <label htmlFor="sales-search" className="mb-1 block text-xs text-slate-400">Search Sales</label>
      <input
        id="sales-search"
        type="text"
        value={salesSearch}
        onChange={(event) => setSalesSearch(event.target.value)}
        placeholder="Search by sale ID or item name"
        className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      />
    </div>
  </div>

  {loadingSales ? (
    <p className="text-slate-400">Loading sales records...</p>
  ) : salesError ? (
    <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
      Sales records are temporarily unavailable.
    </div>
  ) : salesRows.length === 0 ? (
    <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-300">
      No sales records found.
    </div>
  ) : visibleSalesRows.length === 0 ? (
    <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-300">
      No sales match your search.
    </div>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/75 shadow-lg shadow-slate-950/30">
      <table className="w-full text-sm text-slate-100">
        <thead className="bg-slate-800 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Sale ID</th>
            <th className="px-4 py-3 text-left">Item</th>
            <th className="px-4 py-3 text-left">Qty</th>
            <th className="px-4 py-3 text-left">Revenue (INR)</th>
            <th className="px-4 py-3 text-left">Sold At</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleSalesRows.map((sale) => (
            <tr key={sale.id} className="border-b border-slate-800 hover:bg-slate-800/50">
              <td className="px-4 py-3 font-mono text-slate-300">{sale.id}</td>
              <td className="px-4 py-3">{sale.itemName}</td>
              <td className="px-4 py-3">{sale.quantitySold}</td>
              <td className="px-4 py-3">₹{sale.revenueINR.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3">{sale.soldAt.slice(0, 10)}</td>
              <td className="px-4 py-3">
                <StatusBadge variant={sale.approvalStatus === 'pending_approval' ? 'warning' : sale.approvalStatus === 'approved' ? 'success' : 'info'}>
                  {sale.approvalStatus}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
```

- [ ] **Step 4: Run component tests to verify they pass**

Run: `npm test -- --run tests/component/inventory-sales-records.test.tsx tests/component/inventory-approval.test.tsx`
Expected: PASS and no placeholder-message assertions remain.

- [ ] **Step 5: Commit page integration changes**

```bash
git add src/features/inventory/InventoryPage.tsx tests/component/inventory-sales-records.test.tsx tests/component/inventory-approval.test.tsx
git commit -m "feat: render searchable sales records in inventory page"
```

### Task 4: End-to-End Verification for Targeted Area

**Files:**
- Modify: none
- Test: `tests/unit/sales-service.test.ts`
- Test: `tests/unit/inventory-sales-records.test.ts`
- Test: `tests/component/inventory-sales-records.test.tsx`
- Test: `tests/component/inventory-approval.test.tsx`

- [ ] **Step 1: Run the targeted suite for this feature**

Run:
`npm test -- --run tests/unit/sales-service.test.ts tests/unit/inventory-sales-records.test.ts tests/component/inventory-sales-records.test.tsx tests/component/inventory-approval.test.tsx`

Expected: PASS for all four files.

- [ ] **Step 2: Commit verification evidence (if test snapshots or expected outputs changed)**

```bash
git add -A
git commit -m "test: verify sales records list and search integration"
```

- [ ] **Step 3: Capture final branch status for handoff**

Run: `git status --short`
Expected: no output (clean working tree).

## Self-Review

1. **Spec coverage check:**
- GET /api/inventory/sales integration: covered in Task 1 and Task 3.
- Search by item name (partial): covered in Task 2 and Task 3.
- Sale ID lookup support: covered via `salesService.getById` in Task 1 and exact-ID search precedence in Task 2.
- Empty/loading/error/no-result states: covered in Task 3.
- Test coverage requirement: covered in Tasks 1-4.

2. **Placeholder scan:**
- No `TODO`, `TBD`, or deferred placeholders remain.
- Every code-changing step contains concrete code blocks.

3. **Type consistency check:**
- Uses existing `SaleRecord` / `InventoryItem` contracts.
- New helper exports (`buildSalesRows`, `filterSalesRows`) are consistently named in tests and UI steps.
