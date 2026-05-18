import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { validateSegregationEntry } from './validation';
import type { WasteCategory } from '../../shared/api/contracts';

const CATEGORIES: WasteCategory[] = ['plastic', 'organic', 'metal', 'paper', 'ewaste'];
const CATEGORY_LABELS: Record<WasteCategory, string> = {
  plastic: 'Plastic',
  organic: 'Organic',
  metal: 'Metal',
  paper: 'Paper',
  ewaste: 'E-Waste',
};

const emptyWeights = (): Record<WasteCategory, number> => ({
  plastic: 0, organic: 0, metal: 0, paper: 0, ewaste: 0,
});

export function SegregationPage() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading } = useQuery({
    queryKey: ['segregation', 'batches'],
    queryFn: () => api.segregation.getBatches(),
  });

  const [weights, setWeights] = useState<Record<WasteCategory, number>>(emptyWeights());
  const [pickupTaskId, setPickupTaskId] = useState('');
  const [formError, setFormError] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.segregation.createBatch(pickupTaskId, weights),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
      setWeights(emptyWeights());
      setPickupTaskId('');
      setFormError('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateSegregationEntry(weights);
    if (!result.valid) { setFormError(result.message); return; }
    if (!pickupTaskId.trim()) { setFormError('Pickup task ID is required.'); return; }
    setFormError('');
    mutate();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Waste Segregation</h1>

      {/* New batch form */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-medium">Record Segregation Batch</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Pickup Task ID</label>
            <input
              type="text"
              value={pickupTaskId}
              onChange={(e) => setPickupTaskId(e.target.value)}
              placeholder="P-1003"
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <label className="mb-1 block text-xs text-slate-400">{CATEGORY_LABELS[cat]} (kg)</label>
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
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm text-slate-100">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Batch ID</th>
                  <th className="px-4 py-3 text-left">Pickup Task</th>
                  <th className="px-4 py-3 text-left">Plastic</th>
                  <th className="px-4 py-3 text-left">Organic</th>
                  <th className="px-4 py-3 text-left">Metal</th>
                  <th className="px-4 py-3 text-left">Paper</th>
                  <th className="px-4 py-3 text-left">E-Waste</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches?.map((b) => (
                  <tr key={b.id} className="border-b border-slate-800">
                    <td className="px-4 py-3 font-mono text-slate-400">{b.id}</td>
                    <td className="px-4 py-3">{b.pickupTaskId}</td>
                    <td className="px-4 py-3">{b.weights.plastic} kg</td>
                    <td className="px-4 py-3">{b.weights.organic} kg</td>
                    <td className="px-4 py-3">{b.weights.metal} kg</td>
                    <td className="px-4 py-3">{b.weights.paper} kg</td>
                    <td className="px-4 py-3">{b.weights.ewaste} kg</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.status === 'complete' ? 'bg-green-700 text-green-100' : 'bg-yellow-700 text-yellow-100'}`}>
                        {b.status}
                      </span>
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
