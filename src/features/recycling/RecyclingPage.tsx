import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../shared/api/client';
import { nextStage, isTerminalStage, STAGE_LABELS } from './recyclingRules';
import { WASTE_LABELS } from '../../shared/domain/waste';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';

type ProductDraft = {
  productName: string;
  quantity: number;
  unit: 'kg' | 'units';
};

type SyncFeedback = {
  kind: 'success' | 'error';
  message: string;
};

export function RecyclingPage() {
  const queryClient = useQueryClient();
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({});
  const [syncFeedback, setSyncFeedback] = useState<SyncFeedback | null>(null);
  const { data: batches, isLoading } = useQuery({
    queryKey: ['recycling', 'batches'],
    queryFn: () => api.recycling.getBatches(),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Parameters<typeof api.recycling.advanceStage>[1] }) =>
      api.recycling.advanceStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recycling', 'batches'] }),
  });

  const { mutate: createProduct, isPending: creatingProduct } = useMutation({
    mutationFn: (input: {
      recyclingBatchId: string;
      productName: string;
      quantity: number;
      unit: 'kg' | 'units';
    }) => api.recycling.createProductConversion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    },
  });

  const { mutate: syncInventory, isPending: syncingInventory } = useMutation({
    mutationFn: () => api.inventory.syncInventoryFromConversions(),
    onMutate: () => {
      setSyncFeedback(null);
    },
    onSuccess: (summary) => {
      setSyncFeedback({
        kind: 'success',
        message: `Inventory sync complete. Updated ${summary.updatedItemsCount}, created ${summary.createdItemsCount}, skipped ${summary.skippedCount}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    },
    onError: () => {
      setSyncFeedback({
        kind: 'error',
        message: 'Inventory sync failed. Please retry the sync.',
      });
    },
  });

  function updateDraft(batchId: string, next: Partial<ProductDraft>) {
    setProductDrafts((prev) => ({
      ...prev,
      [batchId]: {
        productName: prev[batchId]?.productName ?? '',
        quantity: prev[batchId]?.quantity ?? 0,
        unit: prev[batchId]?.unit ?? 'kg',
        ...next,
      },
    }));
  }

  function handleCreateProduct(batchId: string) {
    const draft = productDrafts[batchId];
    if (!draft) return;
    createProduct({ recyclingBatchId: batchId, ...draft });
  }

  if (isLoading) return <p className="text-slate-400">Loading recycling pipeline…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recycling Pipeline"
        subtitle="Advance batches through conversion stages with traceable history."
      />
      <div>
        <button
          type="button"
          disabled={syncingInventory}
          onClick={() => syncInventory()}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Push Converted Products to Inventory
        </button>
        {syncFeedback?.kind === 'success' ? (
          <p role="status" className="mt-2 text-sm text-emerald-300">
            {syncFeedback.message}
          </p>
        ) : null}
        {syncFeedback?.kind === 'error' ? (
          <p role="alert" className="mt-2 text-sm text-rose-300">
            {syncFeedback.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {batches?.map((batch) => (
          <div key={batch.id} className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm text-slate-400">{batch.id}</span>
                <p className="mt-1 font-medium">
                  {WASTE_LABELS[batch.inputCategory]} {'->'}{' '}
                  {batch.outputProduct}
                </p>
                <p className="text-sm text-slate-400">
                  Input: {batch.inputWeightKg} kg | Output: {batch.outputQuantity} units
                </p>
              </div>
              <StatusBadge variant={batch.stage === 'converted' ? 'success' : batch.stage === 'processing' ? 'warning' : 'info'}>
                {STAGE_LABELS[batch.stage]}
              </StatusBadge>
            </div>

            {/* Stage timeline */}
            <div className="mt-4 flex items-center gap-2">
              {(['collected', 'segregated', 'processing', 'converted'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${batch.stage === s ? 'bg-brand-500 ring-2 ring-brand-300' : batch.stageHistory.some((h) => h.stage === s) ? 'bg-green-500' : 'bg-slate-700'}`} />
                  <span className="text-xs text-slate-400">{STAGE_LABELS[s]}</span>
                  {i < 3 && <div className="h-px w-6 bg-slate-700" />}
                </div>
              ))}
            </div>

            {!isTerminalStage(batch.stage) && (
              <button
                disabled={isPending}
                onClick={() => {
                  const next = nextStage(batch.stage);
                  if (next === 'processing' || next === 'converted') {
                    mutate({ id: batch.id, stage: { stage: next } });
                  }
                }}
                className="mt-4 rounded bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Advance to {STAGE_LABELS[nextStage(batch.stage)]}
              </button>
            )}

            {batch.stage === 'converted' && (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <input
                  type="text"
                  placeholder="Product name"
                  value={productDrafts[batch.id]?.productName ?? ''}
                  onChange={(event) => updateDraft(batch.id, { productName: event.target.value })}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Quantity"
                  value={productDrafts[batch.id]?.quantity || ''}
                  onChange={(event) => updateDraft(batch.id, { quantity: Number(event.target.value) })}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                />
                <select
                  value={productDrafts[batch.id]?.unit ?? 'kg'}
                  onChange={(event) => updateDraft(batch.id, { unit: event.target.value as 'kg' | 'units' })}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                >
                  <option value="kg">kg</option>
                  <option value="units">units</option>
                </select>
                <button
                  type="button"
                  disabled={creatingProduct}
                  onClick={() => handleCreateProduct(batch.id)}
                  className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Create Product
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
