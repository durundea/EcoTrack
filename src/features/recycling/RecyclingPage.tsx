import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { nextStage, isTerminalStage, STAGE_LABELS, STAGE_COLORS } from './recyclingRules';

export function RecyclingPage() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading } = useQuery({
    queryKey: ['recycling', 'batches'],
    queryFn: () => api.recycling.getBatches(),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Parameters<typeof api.recycling.advanceStage>[1] }) =>
      api.recycling.advanceStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recycling', 'batches'] }),
  });

  if (isLoading) return <p className="text-slate-400">Loading recycling pipeline…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Recycling Pipeline</h1>

      <div className="space-y-4">
        {batches?.map((batch) => (
          <div key={batch.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm text-slate-400">{batch.id}</span>
                <p className="mt-1 font-medium">
                  {batch.inputCategory.charAt(0).toUpperCase() + batch.inputCategory.slice(1)} →{' '}
                  {batch.outputProduct}
                </p>
                <p className="text-sm text-slate-400">
                  Input: {batch.inputWeightKg} kg | Output: {batch.outputQuantity} units
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STAGE_COLORS[batch.stage]}`}>
                {STAGE_LABELS[batch.stage]}
              </span>
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
                onClick={() => mutate({ id: batch.id, stage: nextStage(batch.stage) })}
                className="mt-4 rounded bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Advance to {STAGE_LABELS[nextStage(batch.stage)]}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
