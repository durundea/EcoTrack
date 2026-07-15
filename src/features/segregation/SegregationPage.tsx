import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { validateSegregationEntry } from './validation';
import type { WasteCategory } from '../../shared/api/contracts';
import { WASTE_CATEGORIES, WASTE_LABELS } from '../../shared/domain/waste';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { CrudActions } from '../../shared/ui/CrudActions';
import { Button, DataTable, Input, Select } from '../../shared/ui/primitives';

const emptyWeights = (): Record<WasteCategory, number> => ({
  plastic: 0, organic: 0, metal: 0, paper: 0, ewaste: 0,
});

function formatUtcDate(value: string): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
}

function statusVariant(status: string): 'info' | 'warning' | 'success' {
  const normalized = status.toLowerCase();

  if (normalized.includes('recycled') || normalized.includes('complete')) {
    return 'success';
  }

  if (normalized.includes('recorded') || normalized.includes('partial')) {
    return 'warning';
  }

  return 'info';
}

export function SegregationPage() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading, isError: isHistoryError } = useQuery({
    queryKey: ['segregation', 'batches'],
    queryFn: () => api.segregation.getBatches(),
  });
  const { data: pendingBatches, isError: isPendingError } = useQuery({
    queryKey: ['segregation', 'pending-batches'],
    queryFn: () => api.segregation.getPendingBatches(),
  });

  const [weights, setWeights] = useState<Record<WasteCategory, number>>(emptyWeights());
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const pendingBatchOptions = useMemo(
    () => [
      { label: 'Select pending batch', value: '' },
      ...((pendingBatches ?? []).map((entry) => ({
        value: entry.id,
        label: `${entry.batchCode} | ${entry.pickupCode} | ${entry.status}${entry.recordedAtUtc ? ` | Recorded ${formatUtcDate(entry.recordedAtUtc)}` : ''}`,
      }))),
    ],
    [pendingBatches]
  );

  const historyColumns = [
    {
      key: 'batchCode',
      header: 'Batch Code',
      render: (batch: NonNullable<typeof batches>[number]) => <span className="font-mono text-[var(--text-muted)]">{batch.batchCode}</span>,
    },
    {
      key: 'pickupTaskId',
      header: 'Pickup Task',
      render: (batch: NonNullable<typeof batches>[number]) => batch.pickupTaskId,
    },
    {
      key: 'pickupCode',
      header: 'Pickup Code',
      render: (batch: NonNullable<typeof batches>[number]) => batch.pickupCode,
    },
    {
      key: 'recordedAtUtc',
      header: 'Recorded At',
      render: (batch: NonNullable<typeof batches>[number]) => formatUtcDate(batch.recordedAtUtc),
    },
    {
      key: 'recycledAtUtc',
      header: 'Recycled At',
      render: (batch: NonNullable<typeof batches>[number]) => formatUtcDate(batch.recycledAtUtc),
    },
    {
      key: 'status',
      header: 'Status',
      render: (batch: NonNullable<typeof batches>[number]) => (
        <StatusBadge variant={statusVariant(batch.status)}>
          {batch.status}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (batch: NonNullable<typeof batches>[number]) => (
        <CrudActions
          onEdit={() => setSelectedDetailId(batch.id)}
          editLabel="View"
          onDelete={batch.status.toLowerCase().includes('recycled') ? undefined : () => markRecycled(batch.id)}
          deleteLabel={isMarkingRecycled ? 'Sending...' : 'Send to Recycling'}
        />
      ),
    },
  ];

  const historyTableState = isLoading ? 'loading' : isHistoryError ? 'error' : (batches?.length ?? 0) === 0 ? 'empty' : 'ready';

  const {
    data: selectedDetail,
    isFetching: isFetchingDetail,
    isError: isDetailError,
  } = useQuery({
    queryKey: ['segregation', 'batch-detail', selectedDetailId],
    queryFn: () => api.segregation.getBatchById(selectedDetailId as string),
    enabled: Boolean(selectedDetailId),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.segregation.recordBatch(selectedBatchId, {
      plasticKg: weights.plastic,
      organicKg: weights.organic,
      metalKg: weights.metal,
      paperKg: weights.paper,
      eWasteKg: weights.ewaste,
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['segregation', 'pending-batches'] });
      if (selectedDetailId) {
        queryClient.invalidateQueries({ queryKey: ['segregation', 'batch-detail', selectedDetailId] });
      }
      setWeights(emptyWeights());
      setSelectedBatchId('');
      setFormError('');
      setSaveSuccessMessage(`Created ${result.createdRecyclingCount} recycling batch(es).`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to record segregation batch.';
      setSaveSuccessMessage('');
      setFormError(message);
    },
  });

  const { mutate: markRecycled, isPending: isMarkingRecycled } = useMutation({
    mutationFn: (id: string) => api.segregation.markRecycled(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['segregation', 'pending-batches'] });
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batch-detail', id] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveSuccessMessage('');
    const result = validateSegregationEntry(weights);
    if (!result.valid) { setFormError(result.message); return; }
    if (!selectedBatchId.trim()) { setFormError('Batch selection is required.'); return; }
    setFormError('');
    mutate();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Waste Segregation"
        subtitle="Capture category weights and keep the downstream recycling pipeline accurate."
      />

      {/* New batch form */}
      <div className="radius-xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-medium">Record Segregation Batch</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Select
              id="segregation-batch-select"
              label="Segregation Queue Entry"
              value={selectedBatchId}
              options={pendingBatchOptions}
              onChange={setSelectedBatchId}
            />
            {isPendingError ? <p className="mt-1 text-xs text-[var(--status-danger)]">Failed to load pending segregation queue.</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {WASTE_CATEGORIES.map((cat) => (
              <Input
                key={cat}
                  id={`weight-${cat}`}
                  label={`${WASTE_LABELS[cat]} (kg)`}
                  type="number"
                  min={0}
                  value={weights[cat]}
                  onChange={(next) => setWeights((w) => ({ ...w, [cat]: Number(next) }))}
                />
            ))}
          </div>
          {saveSuccessMessage ? <p role="status" aria-live="polite" className="text-sm text-[var(--status-success)]">{saveSuccessMessage}</p> : null}
          {formError && <p role="alert" className="text-sm text-[var(--status-danger)]">{formError}</p>}
          <Button
            type="submit"
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Save Batch'}
          </Button>
        </form>
      </div>

      {/* Existing batches */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Segregation History</h2>
        <DataTable
          columns={historyColumns}
          rows={batches ?? []}
          state={historyTableState}
          errorMessage="Failed to load segregation history."
          emptyTitle="No segregation batches found."
          getRowKey={(batch) => batch.id}
        />
      </div>

      {selectedDetailId ? (
        <div role="dialog" aria-label="Segregation batch details" className="radius-xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Batch Details</h3>
            <Button
              type="button"
              onClick={() => setSelectedDetailId(null)}
              variant="secondary"
              size="sm"
            >
              Close
            </Button>
          </div>

          {isFetchingDetail ? <p className="text-sm text-[var(--text-muted)]">Loading details…</p> : null}
          {isDetailError ? <p className="text-sm text-[var(--status-danger)]">Failed to load batch details.</p> : null}
          {selectedDetail ? (
            <div className="grid grid-cols-1 gap-2 text-sm text-[var(--text-primary)] sm:grid-cols-2">
              <p><span className="text-[var(--text-muted)]">Batch Code:</span> {selectedDetail.batchCode}</p>
              <p><span className="text-[var(--text-muted)]">Status:</span> {selectedDetail.status}</p>
              <p><span className="text-[var(--text-muted)]">Pickup Task:</span> {selectedDetail.pickupTaskId}</p>
              <p><span className="text-[var(--text-muted)]">Pickup Code:</span> {selectedDetail.pickupCode}</p>
              <p><span className="text-[var(--text-muted)]">Site:</span> {selectedDetail.siteName}</p>
              <p><span className="text-[var(--text-muted)]">Address:</span> {selectedDetail.siteAddressText}</p>
              <p><span className="text-[var(--text-muted)]">Scheduled:</span> {formatUtcDate(selectedDetail.scheduledAtUtc)}</p>
              <p><span className="text-[var(--text-muted)]">Collected Weight:</span> {selectedDetail.collectedWeightKg} kg</p>
              <p><span className="text-[var(--text-muted)]">Plastic:</span> {selectedDetail.plasticKg} kg</p>
              <p><span className="text-[var(--text-muted)]">Organic:</span> {selectedDetail.organicKg} kg</p>
              <p><span className="text-[var(--text-muted)]">Metal:</span> {selectedDetail.metalKg} kg</p>
              <p><span className="text-[var(--text-muted)]">Paper:</span> {selectedDetail.paperKg} kg</p>
              <p><span className="text-[var(--text-muted)]">E-Waste:</span> {selectedDetail.eWasteKg} kg</p>
              <p><span className="text-[var(--text-muted)]">Recorded By:</span> {selectedDetail.recordedByUserId || '-'}</p>
              <p><span className="text-[var(--text-muted)]">Recorded At:</span> {formatUtcDate(selectedDetail.recordedAtUtc)}</p>
              <p><span className="text-[var(--text-muted)]">Recycled By:</span> {selectedDetail.recycledByUserId || '-'}</p>
              <p><span className="text-[var(--text-muted)]">Recycled At:</span> {formatUtcDate(selectedDetail.recycledAtUtc)}</p>
              <p><span className="text-[var(--text-muted)]">Created:</span> {formatUtcDate(selectedDetail.createdAtUtc)}</p>
              <p><span className="text-[var(--text-muted)]">Updated:</span> {formatUtcDate(selectedDetail.updatedAtUtc)}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
