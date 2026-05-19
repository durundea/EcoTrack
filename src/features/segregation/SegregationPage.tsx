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

export function SegregationPage() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading } = useQuery({
    queryKey: ['segregation', 'batches'],
    queryFn: () => api.segregation.getBatches(),
  });
  const { data: dispatches } = useQuery({
    queryKey: ['collection', 'dispatches'],
    queryFn: () => api.collection.getDispatches(),
  });

  const [weights, setWeights] = useState<Record<WasteCategory, number>>(emptyWeights());
  const [dispatchId, setDispatchId] = useState('');
  const [formError, setFormError] = useState('');
  const pendingDispatches = (dispatches ?? []).filter((entry) => entry.pendingSegregationWeightKg > 0);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.segregation.createBatch(dispatchId, weights),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['collection', 'dispatches'] });
      setWeights(emptyWeights());
      setDispatchId('');
      setFormError('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateSegregationEntry(weights);
    if (!result.valid) { setFormError(result.message); return; }
    if (!dispatchId.trim()) { setFormError('Dispatch selection is required.'); return; }
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
            <label className="mb-1 block text-sm text-slate-400">Dispatch Queue Entry</label>
            <select
              value={dispatchId}
              onChange={(e) => setDispatchId(e.target.value)}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select dispatch</option>
              {pendingDispatches.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.id} | Pickup {entry.pickupTaskId} | Pending {entry.pendingSegregationWeightKg} kg
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {WASTE_CATEGORIES.map((cat) => (
              <div key={cat}>
                <label className="mb-1 block text-xs text-slate-400">{WASTE_LABELS[cat]} (kg)</label>
                <input
                  type="number"
                  min={0}
                  value={weights[cat]}
                  onChange={(e) => setWeights((w) => ({ ...w, [cat]: Number(e.target.value) }))}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
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
        {isLoading ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/75 shadow-lg shadow-slate-950/30">
            <table className="w-full text-sm text-slate-100">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Batch ID</th>
                  <th className="px-4 py-3 text-left">Pickup Task</th>
                  <th className="px-4 py-3 text-left">Dispatch</th>
                  <th className="px-4 py-3 text-left">Input Kg</th>
                  <th className="px-4 py-3 text-left">Plastic</th>
                  <th className="px-4 py-3 text-left">Organic</th>
                  <th className="px-4 py-3 text-left">Metal</th>
                  <th className="px-4 py-3 text-left">Paper</th>
                  <th className="px-4 py-3 text-left">E-Waste</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches?.map((b) => (
                  <tr key={b.id} className="border-b border-slate-800">
                    <td className="px-4 py-3 font-mono text-slate-400">{b.id}</td>
                    <td className="px-4 py-3">{b.pickupTaskId}</td>
                    <td className="px-4 py-3">{b.dispatchId}</td>
                    <td className="px-4 py-3">{b.inputWeightKg} kg</td>
                    <td className="px-4 py-3">{b.weights.plastic} kg</td>
                    <td className="px-4 py-3">{b.weights.organic} kg</td>
                    <td className="px-4 py-3">{b.weights.metal} kg</td>
                    <td className="px-4 py-3">{b.weights.paper} kg</td>
                    <td className="px-4 py-3">{b.weights.ewaste} kg</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={b.status === 'complete' ? 'success' : 'warning'}>
                        {b.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <CrudActions />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
