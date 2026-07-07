import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { validateSegregationEntry } from './validation';
import type { WasteCategory } from '../../shared/api/contracts';
import { WASTE_CATEGORIES, WASTE_LABELS } from '../../shared/domain/waste';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { CrudActions } from '../../shared/ui/CrudActions';

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
      <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-6 shadow-lg shadow-slate-950/30">
        <h2 className="mb-4 text-lg font-medium">Record Segregation Batch</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="segregation-batch-select" className="mb-1 block text-sm text-slate-400">Segregation Queue Entry</label>
            <select
              id="segregation-batch-select"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select pending batch</option>
              {(pendingBatches ?? []).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.batchCode} | {entry.pickupCode} | {entry.status}{entry.recordedAtUtc ? ` | Recorded ${formatUtcDate(entry.recordedAtUtc)}` : ''}
                </option>
              ))}
            </select>
            {isPendingError ? <p className="mt-1 text-xs text-red-400">Failed to load pending segregation queue.</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {WASTE_CATEGORIES.map((cat) => (
              <div key={cat}>
                <label htmlFor={`weight-${cat}`} className="mb-1 block text-xs text-slate-400">{WASTE_LABELS[cat]} (kg)</label>
                <input
                  id={`weight-${cat}`}
                  type="number"
                  min={0}
                  value={weights[cat]}
                  onChange={(e) => setWeights((w) => ({ ...w, [cat]: Number(e.target.value) }))}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
          {saveSuccessMessage ? <p className="text-sm text-emerald-400">{saveSuccessMessage}</p> : null}
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save Batch'}
          </button>
        </form>
      </div>

      {/* Existing batches */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Segregation History</h2>
        {isHistoryError ? <p className="mb-3 text-sm text-red-400">Failed to load segregation history.</p> : null}
        {isLoading ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/75 shadow-lg shadow-slate-950/30">
            <table className="w-full text-sm text-slate-100">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Batch Code</th>
                  <th className="px-4 py-3 text-left">Pickup Task</th>
                  <th className="px-4 py-3 text-left">Pickup Code</th>
                  <th className="px-4 py-3 text-left">Recorded At</th>
                  <th className="px-4 py-3 text-left">Recycled At</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches?.map((b) => (
                  <tr key={b.id} className="border-b border-slate-800">
                    <td className="px-4 py-3 font-mono text-slate-300">{b.batchCode}</td>
                    <td className="px-4 py-3">{b.pickupTaskId}</td>
                    <td className="px-4 py-3">{b.pickupCode}</td>
                    <td className="px-4 py-3">{formatUtcDate(b.recordedAtUtc)}</td>
                    <td className="px-4 py-3">{formatUtcDate(b.recycledAtUtc)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={statusVariant(b.status)}>
                        {b.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <CrudActions
                        onEdit={() => setSelectedDetailId(b.id)}
                        editLabel="View"
                        onDelete={b.status.toLowerCase().includes('recycled') ? undefined : () => markRecycled(b.id)}
                        deleteLabel={isMarkingRecycled ? 'Sending...' : 'Send to Recycling'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedDetailId ? (
        <div role="dialog" aria-label="Segregation batch details" className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-lg shadow-slate-950/30">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Batch Details</h3>
            <button
              type="button"
              onClick={() => setSelectedDetailId(null)}
              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          {isFetchingDetail ? <p className="text-sm text-slate-400">Loading details…</p> : null}
          {isDetailError ? <p className="text-sm text-red-400">Failed to load batch details.</p> : null}
          {selectedDetail ? (
            <div className="grid grid-cols-1 gap-2 text-sm text-slate-200 sm:grid-cols-2">
              <p><span className="text-slate-400">Batch Code:</span> {selectedDetail.batchCode}</p>
              <p><span className="text-slate-400">Status:</span> {selectedDetail.status}</p>
              <p><span className="text-slate-400">Pickup Task:</span> {selectedDetail.pickupTaskId}</p>
              <p><span className="text-slate-400">Pickup Code:</span> {selectedDetail.pickupCode}</p>
              <p><span className="text-slate-400">Site:</span> {selectedDetail.siteName}</p>
              <p><span className="text-slate-400">Address:</span> {selectedDetail.siteAddressText}</p>
              <p><span className="text-slate-400">Scheduled:</span> {formatUtcDate(selectedDetail.scheduledAtUtc)}</p>
              <p><span className="text-slate-400">Collected Weight:</span> {selectedDetail.collectedWeightKg} kg</p>
              <p><span className="text-slate-400">Plastic:</span> {selectedDetail.plasticKg} kg</p>
              <p><span className="text-slate-400">Organic:</span> {selectedDetail.organicKg} kg</p>
              <p><span className="text-slate-400">Metal:</span> {selectedDetail.metalKg} kg</p>
              <p><span className="text-slate-400">Paper:</span> {selectedDetail.paperKg} kg</p>
              <p><span className="text-slate-400">E-Waste:</span> {selectedDetail.eWasteKg} kg</p>
              <p><span className="text-slate-400">Recorded By:</span> {selectedDetail.recordedByUserId || '-'}</p>
              <p><span className="text-slate-400">Recorded At:</span> {formatUtcDate(selectedDetail.recordedAtUtc)}</p>
              <p><span className="text-slate-400">Recycled By:</span> {selectedDetail.recycledByUserId || '-'}</p>
              <p><span className="text-slate-400">Recycled At:</span> {formatUtcDate(selectedDetail.recycledAtUtc)}</p>
              <p><span className="text-slate-400">Created:</span> {formatUtcDate(selectedDetail.createdAtUtc)}</p>
              <p><span className="text-slate-400">Updated:</span> {formatUtcDate(selectedDetail.updatedAtUtc)}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
