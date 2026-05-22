# Inventory Pricing and Sales Approval Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standard stock pricing with admin-only price updates, allow collectors to submit sales for approval, and lock approved sales from further edits.

**Architecture:** Extend inventory and sale contracts to include pricing and approval state, then enforce role and state rules in the mock API layer so the UI cannot bypass workflow constraints. Keep one inventory page with role-aware actions and add an admin approval panel in dashboard for pending sales. Route access is adjusted so collectors can enter sales while admin retains approval authority.

**Tech Stack:** React, TypeScript, TanStack Query, React Router, existing mock API client in src/shared/api/client.ts.

---

## Scope and Commit Policy

- This plan covers one subsystem: inventory pricing plus sales approval workflow.
- Per current request, do not commit intermediate work. Commit only once after final user confirmation.

## File Structure and Responsibilities

- Modify: `src/shared/api/contracts.ts`
  - Add standard price field to ledger items and approval lifecycle fields to sales.
- Modify: `src/shared/api/mockData.ts`
  - Seed stock prices and mixed sale approval statuses.
- Modify: `src/shared/api/client.ts`
  - Enforce role checks and state transitions for pricing and sales approval.
- Modify: `src/features/auth/sessionStore.ts`
  - Allow collectors to access inventory screen.
- Modify: `src/features/inventory/InventoryPage.tsx`
  - Role-aware UI for admin pricing controls and collector sales submission.
- Modify: `src/features/dashboard/DashboardPage.tsx`
  - Add admin approval queue for pending sales records.
- Modify: `src/features/inventory/useInventoryApproval.ts` (new)
  - Shared query/mutation hooks for approval flow to reduce page complexity.
- Modify: `tests/unit/mock-api.test.ts`
  - API-level workflow tests for lock and role restrictions.
- Modify: `tests/component/inventory-approval.test.tsx` (new)
  - UI behavior tests for collector submit and admin approve flow.
- Modify: `README.md`
  - Document pricing and approval workflow rules.

### Task 1: Extend Domain Types for Price and Approval State

**Files:**
- Modify: `src/shared/api/contracts.ts`
- Test: `tests/unit/mock-api.test.ts`

- [ ] **Step 1: Add failing type usage in test to drive contract shape**

```ts
it('tracks sale approval lifecycle fields', async () => {
  const created = await api.inventory.createSaleDraft({
    inventoryItemId: 'INV-001',
    quantitySold: 2,
    soldAt: '2026-05-20',
    requestedByUserId: 'U-002',
  });

  expect(created.approvalStatus).toBe('draft');
  expect(created.requestedByUserId).toBe('U-002');
});
```

- [ ] **Step 2: Run test to confirm compile/test failure**

Run: `npm test -- --run tests/unit/mock-api.test.ts -t "approval lifecycle"`
Expected: FAIL with missing properties or missing method errors.

- [ ] **Step 3: Update contracts with explicit pricing and approval fields**

```ts
export type InventoryItem = {
  id: string;
  name: string;
  category: 'raw-waste' | 'recycled-product';
  quantityKg: number;
  unit: 'kg' | 'units';
  standardPriceINR: number;
};

export type SaleApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export type SaleRecord = {
  id: string;
  inventoryItemId: string;
  quantitySold: number;
  revenueINR: number;
  soldAt: string;
  approvalStatus: SaleApprovalStatus;
  requestedByUserId: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
};
```

- [ ] **Step 4: Re-run targeted test**

Run: `npm test -- --run tests/unit/mock-api.test.ts -t "approval lifecycle"`
Expected: still FAIL, but now due to unimplemented API behavior rather than missing types.

- [ ] **Step 5: Stage checkpoint (no commit yet)**

Run: `git add src/shared/api/contracts.ts tests/unit/mock-api.test.ts`
Expected: files staged for this task, no commit created.

### Task 2: Implement API Rules for Pricing and Approval Lifecycle

**Files:**
- Modify: `src/shared/api/mockData.ts`
- Modify: `src/shared/api/client.ts`
- Test: `tests/unit/mock-api.test.ts`

- [ ] **Step 1: Add failing unit tests for role and status enforcement**

```ts
it('blocks collector from changing standard item price', async () => {
  await expect(
    api.inventory.updateItemPrice('INV-001', 999, { actorRole: 'collector', actorUserId: 'U-002' })
  ).rejects.toThrow(/admin/i);
});

it('locks approved sale from edit', async () => {
  await expect(
    api.inventory.updateSale('SALE-APPROVED', { quantitySold: 10 }, { actorRole: 'admin', actorUserId: 'U-001' })
  ).rejects.toThrow(/approved/i);
});
```

- [ ] **Step 2: Run tests to verify failure before implementation**

Run: `npm test -- --run tests/unit/mock-api.test.ts -t "price|approved sale"`
Expected: FAIL with missing API methods or behavior.

- [ ] **Step 3: Seed mock data with standard prices and approval states**

```ts
export const inventoryItems: InventoryItem[] = [
  { id: 'INV-001', name: 'Compost (Organic)', category: 'recycled-product', quantityKg: 45, unit: 'kg', standardPriceINR: 60 },
  { id: 'INV-002', name: 'Eco-bricks (Plastic)', category: 'recycled-product', quantityKg: 60, unit: 'units', standardPriceINR: 35 },
];

export const saleRecords: SaleRecord[] = [
  {
    id: 'SALE-001',
    inventoryItemId: 'INV-001',
    quantitySold: 20,
    revenueINR: 1200,
    soldAt: '2026-05-17T09:00:00Z',
    approvalStatus: 'approved',
    requestedByUserId: 'U-002',
    approvedByUserId: 'U-001',
    approvedAt: '2026-05-17T10:00:00Z',
  },
];
```

- [ ] **Step 4: Implement API methods and guards**

```ts
async updateItemPrice(
  id: string,
  standardPriceINR: number,
  actor: { actorRole: 'admin' | 'collector'; actorUserId: string }
): Promise<InventoryItem> {
  await delay();
  if (actor.actorRole !== 'admin') throw new Error('Only admin can update standard price');
  const item = inventoryItems.find((i) => i.id === id);
  if (!item) throw new Error(`Inventory item ${id} not found`);
  if (standardPriceINR < 0) throw new Error('Standard price must be non-negative');
  item.standardPriceINR = standardPriceINR;
  return { ...item };
}

async createSaleDraft(
  input: { inventoryItemId: string; quantitySold: number; soldAt: string; requestedByUserId: string },
): Promise<SaleRecord> {
  await delay();
  const item = inventoryItems.find((i) => i.id === input.inventoryItemId);
  if (!item) throw new Error('Inventory item not found');
  const revenue = item.standardPriceINR * input.quantitySold;
  const created: SaleRecord = {
    id: `SALE-${Date.now()}`,
    inventoryItemId: input.inventoryItemId,
    quantitySold: input.quantitySold,
    revenueINR: revenue,
    soldAt: input.soldAt,
    approvalStatus: 'draft',
    requestedByUserId: input.requestedByUserId,
  };
  saleRecords.unshift(created);
  return { ...created };
}

async submitSaleForApproval(id: string, actor: { actorRole: 'admin' | 'collector'; actorUserId: string }): Promise<SaleRecord> {
  await delay();
  const sale = saleRecords.find((s) => s.id === id);
  if (!sale) throw new Error('Sale not found');
  if (sale.approvalStatus !== 'draft') throw new Error('Only draft sale can be submitted');
  if (sale.requestedByUserId !== actor.actorUserId && actor.actorRole !== 'admin') {
    throw new Error('Only creator or admin can submit this sale');
  }
  sale.approvalStatus = 'pending_approval';
  return { ...sale };
}

async approveSale(id: string, actor: { actorRole: 'admin' | 'collector'; actorUserId: string }): Promise<SaleRecord> {
  await delay();
  if (actor.actorRole !== 'admin') throw new Error('Only admin can approve sales');
  const sale = saleRecords.find((s) => s.id === id);
  if (!sale) throw new Error('Sale not found');
  if (sale.approvalStatus !== 'pending_approval') throw new Error('Only pending sale can be approved');
  sale.approvalStatus = 'approved';
  sale.approvedByUserId = actor.actorUserId;
  sale.approvedAt = new Date().toISOString();
  return { ...sale };
}
```

- [ ] **Step 5: Lock sale edits after approval in update/delete methods**

```ts
if (sale.approvalStatus === 'approved') {
  throw new Error(`Sale ${id} is approved and cannot be edited`);
}
```

- [ ] **Step 6: Run targeted unit tests**

Run: `npm test -- --run tests/unit/mock-api.test.ts`
Expected: PASS for price restrictions and approval lock behavior.

- [ ] **Step 7: Stage checkpoint (no commit yet)**

Run: `git add src/shared/api/mockData.ts src/shared/api/client.ts tests/unit/mock-api.test.ts`
Expected: API workflow changes staged, no commit created.

### Task 3: Enable Collector Inventory Access and Role-Aware Hooks

**Files:**
- Modify: `src/features/auth/sessionStore.ts`
- Create: `src/features/inventory/useInventoryApproval.ts`
- Test: `tests/component/inventory-approval.test.tsx`

- [ ] **Step 1: Add failing component test for collector inventory access path**

```tsx
it('allows collector to view inventory page and submit sale', async () => {
  setSession({ id: 'U-002', name: 'Collector', role: 'collector', email: 'collector@ecotrack.local' });
  render(<AppRoutes />);
  expect(await screen.findByText(/sales records/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run targeted test and verify it fails**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx -t "collector"`
Expected: FAIL because collector cannot access inventory yet.

- [ ] **Step 3: Add inventory to collector allowed areas**

```ts
const collectorAreas: AppArea[] = ['collection', 'segregation', 'recycling', 'inventory'];
```

- [ ] **Step 4: Add dedicated approval hooks file**

```ts
export function usePendingSalesForApproval() {
  return useQuery({
    queryKey: ['inventory', 'sales', 'pending'],
    queryFn: () => api.inventory.getSalesByStatus('pending_approval'),
  });
}

export function useApproveSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actorUserId }: { id: string; actorUserId: string }) =>
      api.inventory.approveSale(id, { actorRole: 'admin', actorUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales', 'pending'] });
    },
  });
}
```

- [ ] **Step 5: Re-run component test**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx -t "collector"`
Expected: moves forward to next missing UI behavior.

- [ ] **Step 6: Stage checkpoint (no commit yet)**

Run: `git add src/features/auth/sessionStore.ts src/features/inventory/useInventoryApproval.ts tests/component/inventory-approval.test.tsx`
Expected: role access and hooks staged, no commit created.

### Task 4: Implement Inventory Page Role-Based Pricing and Sales Submission

**Files:**
- Modify: `src/features/inventory/InventoryPage.tsx`
- Test: `tests/component/inventory-approval.test.tsx`

- [ ] **Step 1: Add failing component tests for admin-only price edit and collector submit flow**

```tsx
it('shows standard price edit controls only for admin', async () => {
  setSession({ id: 'U-001', name: 'Admin', role: 'admin', email: 'admin@ecotrack.local' });
  render(<InventoryPage />);
  expect(await screen.findByText(/standard price/i)).toBeInTheDocument();
});

it('collector can create draft and submit for approval', async () => {
  setSession({ id: 'U-002', name: 'Collector', role: 'collector', email: 'collector@ecotrack.local' });
  render(<InventoryPage />);
  await userEvent.click(screen.getByRole('button', { name: /create sale draft/i }));
  await userEvent.click(screen.getByRole('button', { name: /send for approval/i }));
  expect(await screen.findByText(/pending approval/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run component tests to verify failures**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx`
Expected: FAIL on missing controls/status labels.

- [ ] **Step 3: Add standard price column and admin-only update action**

```tsx
<th className="px-4 py-3 text-left">Standard Price (INR)</th>
```

```tsx
<td className="px-4 py-3">₹{item.standardPriceINR.toLocaleString('en-IN')}</td>
```

```tsx
{isAdmin ? (
  <button onClick={() => openPriceEditor(item)} className="rounded bg-brand-600 px-2 py-1 text-xs text-white">Update Price</button>
) : null}
```

- [ ] **Step 4: Add collector sales draft form and submit action**

```tsx
<button
  type="button"
  onClick={() => createSaleDraft({ inventoryItemId, quantitySold, soldAt, requestedByUserId: user!.id })}
  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
>
  Create Sale Draft
</button>
```

```tsx
<button
  type="button"
  onClick={() => submitSaleForApproval({ id: sale.id, actorUserId: user!.id, actorRole: user!.role })}
  disabled={sale.approvalStatus !== 'draft'}
  className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
>
  Send for Approval
</button>
```

- [ ] **Step 5: Make approved sales uneditable in UI controls**

```tsx
{sale.approvalStatus === 'approved' ? (
  <span className="text-xs text-slate-500">Locked after approval</span>
) : (
  <CrudActions onEdit={() => openSaleEditor(sale)} onDelete={() => handleDeleteSale(sale)} />
)}
```

- [ ] **Step 6: Run component tests again**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx`
Expected: PASS for role visibility, submit flow, and approved lock behavior.

- [ ] **Step 7: Stage checkpoint (no commit yet)**

Run: `git add src/features/inventory/InventoryPage.tsx tests/component/inventory-approval.test.tsx`
Expected: inventory UI changes staged, no commit created.

### Task 5: Add Admin Approval Queue in Dashboard

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/features/inventory/useInventoryApproval.ts`
- Test: `tests/component/inventory-approval.test.tsx`

- [ ] **Step 1: Add failing test for admin approval queue actions**

```tsx
it('admin can approve pending sales from dashboard queue', async () => {
  setSession({ id: 'U-001', name: 'Admin', role: 'admin', email: 'admin@ecotrack.local' });
  render(<DashboardPage />);
  await userEvent.click(await screen.findByRole('button', { name: /approve sale/i }));
  expect(await screen.findByText(/approved/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify missing queue behavior**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx -t "dashboard queue"`
Expected: FAIL because queue does not exist yet.

- [ ] **Step 3: Add pending approvals section for admin dashboard**

```tsx
{isAdmin && (
  <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5">
    <h2 className="mb-3 text-sm font-semibold text-slate-200">Pending Sales Approvals</h2>
    {pendingSales.map((sale) => (
      <div key={sale.id} className="mb-2 flex items-center justify-between rounded border border-slate-800 px-3 py-2">
        <span className="text-xs text-slate-300">
          {sale.id} | Item {sale.inventoryItemId} | Qty {sale.quantitySold} | ₹{sale.revenueINR}
        </span>
        <button
          type="button"
          onClick={() => approveSale({ id: sale.id, actorUserId: user!.id })}
          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
        >
          Approve Sale
        </button>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Re-run component tests**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx`
Expected: PASS for admin queue and approval action.

- [ ] **Step 5: Stage checkpoint (no commit yet)**

Run: `git add src/features/dashboard/DashboardPage.tsx src/features/inventory/useInventoryApproval.ts tests/component/inventory-approval.test.tsx`
Expected: dashboard approval queue staged, no commit created.

### Task 6: Documentation and Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add workflow documentation**

```md
## Inventory Pricing and Sales Approval Rules

1. Every stock ledger item has a standard price.
2. Only admin can change standard price.
3. Collector can create sale drafts and submit them for approval.
4. Admin approves pending sales from dashboard approval queue.
5. Approved sales become locked and cannot be edited or deleted.
```

- [ ] **Step 2: Run full test suite and build**

Run: `npm test -- --run`
Expected: PASS.

Run: `npm run build`
Expected: successful production build.

- [ ] **Step 3: Review staged changes before final commit**

Run: `git status --short`
Expected: only expected files listed as modified/added.

- [ ] **Step 4: Create final commit only after explicit user confirmation**

```bash
git commit -m "feat: add inventory pricing and sales approval workflow"
```

Expected: single final commit created after user says to proceed.

## Self-Review

### 1) Spec coverage
- Standard price per stock ledger item: Task 1, Task 2, Task 4.
- Admin-only price update: Task 2, Task 4.
- Collector sale creation and approval submission: Task 2, Task 4.
- Admin approval dashboard: Task 5.
- Approved records locked from edits: Task 2, Task 4.

### 2) Placeholder scan
- No TODO/TBD placeholders used.
- Each implementation step includes concrete code snippets and executable commands.

### 3) Type consistency
- Sale approval state uses one enum: `SaleApprovalStatus`.
- API methods and UI references use the same status labels (`draft`, `pending_approval`, `approved`, `rejected`).
- `standardPriceINR` is used consistently in contracts, API logic, and inventory UI.
