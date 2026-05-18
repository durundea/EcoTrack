import { useCollectionSchedule, useUpdatePickupStatus } from './useCollection';
import type { PickupTask } from '../../shared/api/contracts';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  assigned: 'Assigned',
  collected: 'Collected',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-yellow-700 text-yellow-100',
  assigned: 'bg-blue-700 text-blue-100',
  collected: 'bg-green-700 text-green-100',
};

function TaskRow({ task }: { task: PickupTask }) {
  const { mutate, isPending } = useUpdatePickupStatus();

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/50">
      <td className="px-4 py-3 font-mono text-sm text-slate-400">{task.id}</td>
      <td className="px-4 py-3">{task.site}</td>
      <td className="px-4 py-3">{task.scheduledDate}</td>
      <td className="px-4 py-3">{task.estimatedWeightKg} kg</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        {task.status === 'scheduled' && (
          <button
            disabled={isPending}
            onClick={() => mutate({ id: task.id, status: 'assigned' })}
            className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Assign
          </button>
        )}
        {task.status === 'assigned' && (
          <button
            disabled={isPending}
            onClick={() => mutate({ id: task.id, status: 'collected' })}
            className="rounded bg-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-500 disabled:opacity-50"
          >
            Mark Collected
          </button>
        )}
      </td>
    </tr>
  );
}

export function CollectionPage() {
  const { data: tasks, isLoading, isError } = useCollectionSchedule();

  if (isLoading) return <p className="text-slate-400">Loading schedule…</p>;
  if (isError) return <p className="text-red-400">Failed to load schedule.</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Pickup Schedule</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm text-slate-100">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Site</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Est. Weight</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks?.map((task) => <TaskRow key={task.id} task={task} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
