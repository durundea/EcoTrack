import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { nextStage, isTerminalStage, STAGE_LABELS } from './recyclingRules';
import { WASTE_LABELS } from '../../shared/domain/waste';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';

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
      <PageHeader
        title="Recycling Pipeline"
        subtitle="Advance batches through conversion stages with traceable history."
      />

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
