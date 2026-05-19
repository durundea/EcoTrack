# Collection to Inventory Controlled Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a strict operational flow where collected pickups become immutable, are partially or fully dispatched to segregation, then advanced to recycling, converted into products, and reflected in inventory.

**Architecture:** Extend domain contracts to track material movement quantities and dispatch state, then enforce workflow rules in the mock API layer so every feature module uses one source of truth. Update Collection, Segregation, Recycling, and Inventory pages to consume these new APIs and prevent invalid actions in the UI. Keep module boundaries unchanged and follow existing React Query + page-level state patterns.

**Tech Stack:** React, TypeScript, Vite, TanStack Query, existing mock API client (`src/shared/api/client.ts`), existing UI primitives.

---

## Scope Note

Per user request, automated test-case authoring is intentionally skipped for this iteration. Each task includes manual verification commands instead.

## File Structure and Responsibilities

- Modify: `src/shared/api/contracts.ts`
  - Add workflow-tracking types and fields for segregation/recycling/product conversion state.
- Modify: `src/shared/api/mockData.ts`
  - Seed sample values for new tracking fields and product conversion records.
- Modify: `src/shared/api/client.ts`
  - Enforce business rules and expose new mutation/query functions used by feature pages.
- Modify: `src/features/collection/useCollection.ts`
  - Add hooks for dispatching collected quantities to segregation and querying dispatch availability.
- Modify: `src/features/collection/CollectionPage.tsx`
  - Hide edit/delete for collected tasks, lock collected weight edits, and add dispatch-to-segregation controls.
- Modify: `src/features/segregation/SegregationPage.tsx`
  - Replace free-form pickup input with dispatch-backed intake and show segregated vs pending quantities.
- Modify: `src/features/recycling/RecyclingPage.tsx`
  - Allow recycling dispatch from segregated material, then product conversion action.
- Modify: `src/features/inventory/InventoryPage.tsx`
  - Show converted products generated from recycling and updated stock totals.
- Modify: `README.md`
  - Document new workflow constraints and manual QA checklist.

### Task 1: Extend Contracts for Controlled Material Flow

**Files:**
- Modify: `src/shared/api/contracts.ts`

- [ ] **Step 1: Add dispatch and conversion types**

```ts
export type SegregationDispatch = {
  id: string;
  pickupTaskId: string;
  dispatchedWeightKg: number;
  segregatedWeightKg: number;
  pendingSegregationWeightKg: number;
  status: 'pending' | 'partial' | 'complete';
  createdAt: string;
};

export type ProductConversion = {
  id: string;
  recyclingBatchId: string;
  productName: string;
  quantity: number;
  unit: 'kg' | 'units';
  createdAt: string;
};
```

- [ ] **Step 2: Extend existing domain entities with workflow fields**

```ts
export type PickupTask = {
  id: string;
  site: string;
  status: PickupStatus;
  assignedCollectorId?: string;
  scheduledDate: string;
  estimatedWeightKg: number;
  lockedAfterCollection?: boolean;
  segregatedWeightKg?: number;
};

export type SegregationBatch = {
  id: string;
  pickupTaskId: string;
  dispatchId: string;
  weights: Record<WasteCategory, number>;
  inputWeightKg: number;
  status: 'pending' | 'complete';
  createdAt: string;
};

export type RecyclingBatch = {
  id: string;
  segregationBatchId: string;
  stage: RecyclingStage;
  inputCategory: WasteCategory;
  outputProduct: string;
  inputWeightKg: number;
  outputQuantity: number;
  inventoryUpdated?: boolean;
  stageHistory: { stage: RecyclingStage; at: string }[];
};
```

- [ ] **Step 3: Commit contract updates**

```bash
git add src/shared/api/contracts.ts
git commit -m "feat: extend contracts for controlled workflow state"
```

### Task 2: Seed and API Enforcement for Workflow Rules

**Files:**
- Modify: `src/shared/api/mockData.ts`
- Modify: `src/shared/api/client.ts`

- [ ] **Step 1: Seed new mock collections for dispatch and conversion**

```ts
export const segregationDispatches: SegregationDispatch[] = [
  {
    id: 'SD-001',
    pickupTaskId: 'P-1003',
    dispatchedWeightKg: 200,
    segregatedWeightKg: 120,
    pendingSegregationWeightKg: 80,
    status: 'partial',
    createdAt: '2026-05-18T09:00:00Z',
  },
];

export const productConversions: ProductConversion[] = [];
```

- [ ] **Step 2: Enforce immutable collected pickups in update and delete APIs**

```ts
if (task.status === 'collected') {
  throw new Error(`Collected task ${id} is locked and cannot be edited`);
}
```

```ts
if (task.status === 'collected') {
  throw new Error(`Collected task ${id} is locked and cannot be deleted`);
}
```

- [ ] **Step 3: Add collection dispatch APIs**

```ts
async getDispatches(): Promise<SegregationDispatch[]> {
  await delay();
  return [...segregationDispatches];
},

async dispatchToSegregation(pickupTaskId: string, dispatchedWeightKg: number): Promise<SegregationDispatch> {
  await delay();
  const task = pickupTasks.find((t) => t.id === pickupTaskId);
  if (!task) throw new Error(`Task ${pickupTaskId} not found`);
  if (task.status !== 'collected') throw new Error('Only collected tasks can be dispatched to segregation');

  const alreadyDispatched = segregationDispatches
    .filter((d) => d.pickupTaskId === pickupTaskId)
    .reduce((sum, d) => sum + d.dispatchedWeightKg, 0);

  const available = task.estimatedWeightKg - alreadyDispatched;
  if (dispatchedWeightKg <= 0 || dispatchedWeightKg > available) {
    throw new Error(`Dispatch must be within available collected weight (${available} kg)`);
  }

  const created: SegregationDispatch = {
    id: `SD-${Date.now()}`,
    pickupTaskId,
    dispatchedWeightKg,
    segregatedWeightKg: 0,
    pendingSegregationWeightKg: dispatchedWeightKg,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  segregationDispatches.unshift(created);
  return { ...created };
}
```

- [ ] **Step 4: Enforce segregation intake from dispatch records only**

```ts
async createBatch(dispatchId: string, weights: Record<WasteCategory, number>): Promise<SegregationBatch> {
  await delay();
  const dispatch = segregationDispatches.find((d) => d.id === dispatchId);
  if (!dispatch) throw new Error(`Dispatch ${dispatchId} not found`);

  const total = Object.values(weights).reduce((sum, n) => sum + n, 0);
  if (total <= 0 || total > dispatch.pendingSegregationWeightKg) {
    throw new Error(`Segregation total must be <= pending weight (${dispatch.pendingSegregationWeightKg} kg)`);
  }

  dispatch.segregatedWeightKg += total;
  dispatch.pendingSegregationWeightKg -= total;
  dispatch.status = dispatch.pendingSegregationWeightKg === 0 ? 'complete' : 'partial';

  const batch: SegregationBatch = {
    id: `SB-${Date.now()}`,
    pickupTaskId: dispatch.pickupTaskId,
    dispatchId,
    weights,
    inputWeightKg: total,
    status: 'complete',
    createdAt: new Date().toISOString(),
  };

  segregationBatches.unshift(batch);
  return { ...batch };
}
```

- [ ] **Step 5: Add product-conversion API and inventory update API**

```ts
async createProductConversion(input: {
  recyclingBatchId: string;
  productName: string;
  quantity: number;
  unit: 'kg' | 'units';
}): Promise<ProductConversion> {
  await delay();
  const batch = recyclingBatches.find((b) => b.id === input.recyclingBatchId);
  if (!batch) throw new Error(`Recycling batch ${input.recyclingBatchId} not found`);
  if (batch.stage !== 'converted') throw new Error('Products can be created only after recycling is converted');

  const conversion: ProductConversion = {
    id: `PC-${Date.now()}`,
    recyclingBatchId: input.recyclingBatchId,
    productName: input.productName,
    quantity: input.quantity,
    unit: input.unit,
    createdAt: new Date().toISOString(),
  };

  productConversions.unshift(conversion);
  return { ...conversion };
}
```

```ts
async syncInventoryFromConversions(): Promise<{ updated: number }> {
  await delay();
  let updated = 0;

  for (const conversion of productConversions) {
    const existing = inventoryItems.find((i) => i.name === conversion.productName && i.category === 'recycled-product');
    if (existing) {
      existing.quantityKg += conversion.quantity;
      existing.unit = conversion.unit;
    } else {
      inventoryItems.unshift({
        id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        name: conversion.productName,
        category: 'recycled-product',
        quantityKg: conversion.quantity,
        unit: conversion.unit,
      });
    }
    updated += 1;
  }

  productConversions.length = 0;
  return { updated };
}
```

- [ ] **Step 6: Manual verification run**

Run: `npm run dev`
Expected: app loads; API errors appear when trying to mutate collected task or over-dispatch weights.

- [ ] **Step 7: Commit API workflow rules**

```bash
git add src/shared/api/mockData.ts src/shared/api/client.ts
git commit -m "feat: enforce workflow rules across mock api"
```

### Task 3: Collection Page Lock + Segregation Dispatch Controls

**Files:**
- Modify: `src/features/collection/useCollection.ts`
- Modify: `src/features/collection/CollectionPage.tsx`

- [ ] **Step 1: Add hooks for dispatch queries and mutations**

```ts
export function useSegregationDispatches() {
  return useQuery({
    queryKey: ['collection', 'dispatches'],
    queryFn: () => api.collection.getDispatches(),
  });
}

export function useDispatchToSegregation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pickupTaskId, dispatchedWeightKg }: { pickupTaskId: string; dispatchedWeightKg: number }) =>
      api.collection.dispatchToSegregation(pickupTaskId, dispatchedWeightKg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['collection', 'dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
    },
  });
}
```

- [ ] **Step 2: Hide edit/delete actions for collected tasks**

```tsx
{task.status !== 'collected' ? (
  <CrudActions onEdit={() => onEdit(task)} onDelete={() => onDelete(task)} />
) : (
  <span className="text-xs text-slate-500">Locked after collection</span>
)}
```

- [ ] **Step 3: Prevent collected rows from entering edit modal and lock weight field in edit form**

```tsx
function handleEdit(task: PickupTask) {
  if (task.status === 'collected') return;
  openEditModal(task);
}
```

```tsx
<input
  type="number"
  min={0}
  value={formState.estimatedWeightKg}
  disabled={editingTask?.status === 'collected'}
  onChange={(e) => onFormFieldChange('estimatedWeightKg', Number(e.target.value))}
  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
/>
```

- [ ] **Step 4: Add dispatch weight input and dispatch action for collected tasks**

```tsx
{task.status === 'collected' && (
  <div className="flex items-center gap-2">
    <input
      type="number"
      min={1}
      value={dispatchInputs[task.id] ?? ''}
      onChange={(e) => setDispatchInputs((prev) => ({ ...prev, [task.id]: Number(e.target.value) }))}
      placeholder="kg to segregation"
      className="w-32 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
    />
    <button
      type="button"
      onClick={() => dispatchMutate({ pickupTaskId: task.id, dispatchedWeightKg: dispatchInputs[task.id] ?? 0 })}
      className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
    >
      Send to Segregation
    </button>
  </div>
)}
```

- [ ] **Step 5: Manual verification run**

Run: `npm run dev`
Expected: collected rows show lock state, no edit/delete controls, and dispatch action works only for collected rows.

- [ ] **Step 6: Commit collection UI updates**

```bash
git add src/features/collection/useCollection.ts src/features/collection/CollectionPage.tsx
git commit -m "feat: lock collected pickups and add segregation dispatch"
```

### Task 4: Segregation Page Intake from Dispatch Queue

**Files:**
- Modify: `src/features/segregation/SegregationPage.tsx`

- [ ] **Step 1: Load dispatch queue and drive form selection from dispatch IDs**

```ts
const { data: dispatches } = useQuery({
  queryKey: ['collection', 'dispatches'],
  queryFn: () => api.collection.getDispatches(),
});

const pendingDispatches = (dispatches ?? []).filter((d) => d.pendingSegregationWeightKg > 0);
const [selectedDispatchId, setSelectedDispatchId] = useState('');
```

- [ ] **Step 2: Replace free-text pickup ID input with dispatch dropdown + pending context**

```tsx
<select
  value={selectedDispatchId}
  onChange={(e) => setSelectedDispatchId(e.target.value)}
  className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
>
  <option value="">Select dispatch</option>
  {pendingDispatches.map((d) => (
    <option key={d.id} value={d.id}>
      {d.id} | Pickup {d.pickupTaskId} | Pending {d.pendingSegregationWeightKg} kg
    </option>
  ))}
</select>
```

- [ ] **Step 3: Submit segregation by dispatch ID and invalidate dispatch list on success**

```ts
const { mutate, isPending } = useMutation({
  mutationFn: () => api.segregation.createBatch(selectedDispatchId, weights),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
    queryClient.invalidateQueries({ queryKey: ['collection', 'dispatches'] });
    setWeights(emptyWeights());
    setSelectedDispatchId('');
  },
});
```

- [ ] **Step 4: Add summary columns for segregated/pending quantities in history table**

```tsx
<th className="px-4 py-3 text-left">Input Kg</th>
<th className="px-4 py-3 text-left">Dispatch</th>
```

```tsx
<td className="px-4 py-3">{b.inputWeightKg} kg</td>
<td className="px-4 py-3">{b.dispatchId}</td>
```

- [ ] **Step 5: Manual verification run**

Run: `npm run dev`
Expected: segregation can be created only from dispatch entries; over-allocation is blocked.

- [ ] **Step 6: Commit segregation intake changes**

```bash
git add src/features/segregation/SegregationPage.tsx
git commit -m "feat: enforce segregation intake from dispatched collection loads"
```

### Task 5: Recycling to Product Conversion Workflow

**Files:**
- Modify: `src/features/recycling/RecyclingPage.tsx`

- [ ] **Step 1: Add mutation for product creation after converted stage**

```ts
const { mutate: createProduct, isPending: creatingProduct } = useMutation({
  mutationFn: (input: { recyclingBatchId: string; productName: string; quantity: number; unit: 'kg' | 'units' }) =>
    api.recycling.createProductConversion(input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['recycling', 'batches'] });
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
  },
});
```

- [ ] **Step 2: Add UI form per converted batch for product name/quantity/unit**

```tsx
{batch.stage === 'converted' && (
  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
    <input
      type="text"
      placeholder="Product name"
      value={productDrafts[batch.id]?.productName ?? ''}
      onChange={(e) => setProductDraft(batch.id, { productName: e.target.value })}
      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
    />
    <input
      type="number"
      min={1}
      placeholder="Quantity"
      value={productDrafts[batch.id]?.quantity ?? ''}
      onChange={(e) => setProductDraft(batch.id, { quantity: Number(e.target.value) })}
      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
    />
    <select
      value={productDrafts[batch.id]?.unit ?? 'kg'}
      onChange={(e) => setProductDraft(batch.id, { unit: e.target.value as 'kg' | 'units' })}
      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
    >
      <option value="kg">kg</option>
      <option value="units">units</option>
    </select>
    <button
      type="button"
      disabled={creatingProduct}
      onClick={() => createProduct({ recyclingBatchId: batch.id, ...productDrafts[batch.id] })}
      className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
    >
      Create Product
    </button>
  </div>
)}
```

- [ ] **Step 3: Add inventory-sync action in recycling screen**

```ts
const { mutate: syncInventory, isPending: syncingInventory } = useMutation({
  mutationFn: () => api.inventory.syncInventoryFromConversions(),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] }),
});
```

```tsx
<button
  type="button"
  disabled={syncingInventory}
  onClick={() => syncInventory()}
  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
>
  Push Converted Products to Inventory
</button>
```

- [ ] **Step 4: Manual verification run**

Run: `npm run dev`
Expected: product creation available only at converted stage; sync updates inventory list.

- [ ] **Step 5: Commit recycling conversion updates**

```bash
git add src/features/recycling/RecyclingPage.tsx
git commit -m "feat: add post-recycling product creation and inventory sync"
```

### Task 6: Inventory Presentation Alignment + Documentation

**Files:**
- Modify: `src/features/inventory/InventoryPage.tsx`
- Modify: `README.md`

- [ ] **Step 1: Add converted-product visibility helpers in inventory page**

```ts
const recycledProducts = (items ?? []).filter((item) => item.category === 'recycled-product');
const rawWasteItems = (items ?? []).filter((item) => item.category === 'raw-waste');
```

- [ ] **Step 2: Add UI labels showing workflow-originated stock**

```tsx
<KpiCard label="Recycled Products" value={`${recycledProducts.length}`} />
<KpiCard label="Raw Waste Entries" value={`${rawWasteItems.length}`} />
```

```tsx
{item.category === 'recycled-product' && (
  <span className="ml-2 rounded bg-emerald-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
    From Recycling Flow
  </span>
)}
```

- [ ] **Step 3: Update README workflow section with strict rule sequence**

```md
## Operational Workflow Rules

1. Once a pickup task is marked `collected`, it is locked (no edit/delete).
2. Only collected pickups can be dispatched to segregation.
3. Segregation can only process dispatched quantities and cannot exceed pending amounts.
4. Recycling batches advance to `converted` before product creation.
5. Converted products are synced into inventory using the dedicated sync action.
```

- [ ] **Step 4: Manual verification run**

Run: `npm run dev`
Expected: inventory clearly distinguishes recycled product stock and reflects sync results.

- [ ] **Step 5: Commit inventory + docs updates**

```bash
git add src/features/inventory/InventoryPage.tsx README.md
git commit -m "docs: capture strict collection-to-inventory operational workflow"
```

## Final Manual QA Checklist (No Automated Tests in This Iteration)

- [ ] Mark an assigned pickup as collected; verify edit/delete controls disappear.
- [ ] Try editing/deleting collected task via UI paths; verify blocked behavior.
- [ ] Dispatch partial quantity to segregation; verify remaining pending quantity is visible.
- [ ] Complete segregation in one or more batches; verify over-segregation is blocked.
- [ ] Advance recycling batch to converted; verify product creation control appears.
- [ ] Create product and sync to inventory; verify item quantity is added or created.

## Self-Review

### 1) Spec coverage check
- Collected task immutability: covered in Task 2 + Task 3.
- Collection to segregation quantity split: covered in Task 2 + Task 3 + Task 4.
- Segregation to recycling progression: covered by Task 4 + existing stage flow.
- Post-recycling product creation: covered in Task 5.
- Inventory calculation/update from recycled products: covered in Task 5 + Task 6.

### 2) Placeholder scan
- No TODO/TBD placeholders left.
- Each code-changing step includes explicit code snippets.

### 3) Type consistency check
- `dispatchId`, `inputWeightKg`, and `ProductConversion` are defined in Task 1 and reused consistently in Tasks 2-5.
- `syncInventoryFromConversions` is introduced in Task 2 and consumed in Task 5.
