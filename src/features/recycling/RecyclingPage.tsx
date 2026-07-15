import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../shared/api/client';
import { isTerminalStage, STAGE_LABELS } from './recyclingRules';
import { WASTE_LABELS } from '../../shared/domain/waste';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button, Input, Select } from '../../shared/ui/primitives';

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

  if (isLoading) return <p className="text-[var(--text-muted)]">Loading recycling pipeline…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recycling Pipeline"
        subtitle="Advance batches through conversion stages with traceable history."
      />
      <div>
        <Button
          type="button"
          disabled={syncingInventory}
          onClick={() => syncInventory()}
          size="sm"
        >
          Push Converted Products to Inventory
        </Button>
        {syncFeedback?.kind === 'success' ? (
          <p role="status" className="mt-2 text-sm text-[var(--status-success)]">
            {syncFeedback.message}
          </p>
        ) : null}
        {syncFeedback?.kind === 'error' ? (
          <p role="alert" className="mt-2 text-sm text-[var(--status-danger)]">
            {syncFeedback.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {batches?.map((batch) => {
          const canAdvanceWithApi = batch.stage === 'segregated' || batch.stage === 'processing';
          const nextStageValue = batch.stage === 'segregated' ? 'processing' : 'converted';

          return (
            <div key={batch.id} className="radius-xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-[var(--text-muted)]">{batch.id}</span>
                  <p className="mt-1 font-medium">
                    {WASTE_LABELS[batch.inputCategory]} {'->'}{' '}
                    {batch.outputProduct}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
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
                    <div className={`radius-full h-2.5 w-2.5 ${batch.stage === s ? 'bg-[var(--action-brand)] ring-2 ring-[var(--action-brand)]' : batch.stageHistory.some((h) => h.stage === s) ? 'bg-[var(--surface-panel-hover)]' : 'bg-[var(--border-subtle)]'}`} />
                    <span className="text-xs text-[var(--text-muted)]">{STAGE_LABELS[s]}</span>
                    {i < 3 && <div className="h-px w-6 bg-[var(--border-subtle)]" />}
                  </div>
                ))}
              </div>

              {canAdvanceWithApi && !isTerminalStage(batch.stage) && (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => mutate({ id: batch.id, stage: { stage: nextStageValue } })}
                  className="mt-4"
                  size="sm"
                >
                  Advance to {STAGE_LABELS[nextStageValue]}
                </Button>
              )}

              {batch.stage === 'converted' && (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <Input
                    label="Product Name"
                    type="text"
                    placeholder="Product name"
                    value={productDrafts[batch.id]?.productName ?? ''}
                    onChange={(next) => updateDraft(batch.id, { productName: next })}
                    className="text-xs"
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    min={1}
                    placeholder="Quantity"
                    value={productDrafts[batch.id]?.quantity || ''}
                    onChange={(next) => updateDraft(batch.id, { quantity: Number(next) })}
                    className="text-xs"
                  />
                  <Select
                    label="Unit"
                    value={productDrafts[batch.id]?.unit ?? 'kg'}
                    onChange={(next) => updateDraft(batch.id, { unit: next as 'kg' | 'units' })}
                    options={[
                      { label: 'kg', value: 'kg' },
                      { label: 'units', value: 'units' },
                    ]}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    disabled={creatingProduct}
                    onClick={() => handleCreateProduct(batch.id)}
                    className="self-end"
                    size="sm"
                  >
                    Create Product
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
