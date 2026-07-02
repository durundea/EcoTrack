import { useMemo, useState } from 'react';
import {
  useCollectionSchedule,
  useCreatePickupTask,
  useDeletePickupTask,
  useDispatchToSegregation,
  useSegregationDispatches,
  useUpdatePickupStatus,
  useUpdatePickupTask,
} from './useCollection';
import type { PickupTask } from '../../shared/api/contracts';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { CrudActions } from '../../shared/ui/CrudActions';
import { Modal } from '../../shared/ui/Modal';
import { getCurrentRole } from '../auth/sessionStore';
import { PickupHistoryTooltip } from './PickupHistoryTooltip';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  assigned: 'Assigned',
  collected: 'Collected',
};

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success'> = {
  scheduled: 'warning',
  assigned: 'info',
  collected: 'success',
};

function formatTaskDateTimeLocal(task: PickupTask): string {
  const source = task.scheduledAtUtc ?? (task.scheduledDate ? `${task.scheduledDate}T00:00:00Z` : '');
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return task.scheduledDate || '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

type TaskRowProps = {
  task: PickupTask;
  dispatchAvailableKg: number;
  dispatchValue: string;
  onDispatchValueChange: (taskId: string, value: string) => void;
  onDispatch: (taskId: string) => void;
  onEdit: (task: PickupTask) => void;
  onDelete: (task: PickupTask) => void;
};

type PickupFormState = Omit<PickupTask, 'id'>;

const defaultFormState: PickupFormState = {
  site: '',
  status: 'scheduled',
  assignedCollectorId: '',
  scheduledDate: new Date().toISOString().slice(0, 10),
  estimatedWeightKg: 0,
};

function TaskRow({
  task,
  dispatchAvailableKg,
  dispatchValue,
  onDispatchValueChange,
  onDispatch,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const { mutate, isPending } = useUpdatePickupStatus();

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/50">
      <td className="px-4 py-3 font-mono text-sm text-slate-400">{formatTaskDateTimeLocal(task)}</td>
      <td className="px-4 py-3">{task.site}</td>
      <td className="px-4 py-3">{task.pickupCode || '-'}</td>
      <td className="px-4 py-3">{task.estimatedWeightKg} kg</td>
      <td className="px-4 py-3">
        <StatusBadge variant={STATUS_VARIANT[task.status]}>
          {STATUS_LABELS[task.status]}
        </StatusBadge>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {task.status === 'scheduled' && (
            <button
              disabled={isPending || !(task.assignedCollectorId ?? '').trim()}
              onClick={() =>
                mutate({
                  id: task.id,
                  status: 'assigned',
                  assignedCollectorUserId: task.assignedCollectorId,
                  note: task.notes || 'Assigned from collection page',
                })
              }
              className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              title={task.assignedCollectorId ? 'Assign pickup' : 'Set Assigned Collector ID in edit first'}
            >
              Assign
            </button>
          )}
          {task.status === 'assigned' && (
            <button
              disabled={isPending}
              onClick={() =>
                mutate({
                  id: task.id,
                  status: 'collected',
                  collectedWeightKg: task.estimatedWeightKg,
                })
              }
              className="rounded bg-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-500 disabled:opacity-50"
            >
              Mark Collected
            </button>
          )}
          {task.status === 'collected' && (
            <>
              <input
                type="number"
                min={1}
                max={dispatchAvailableKg}
                value={dispatchValue}
                onChange={(event) => onDispatchValueChange(task.id, event.target.value)}
                placeholder="kg"
                className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
              />
              <button
                type="button"
                disabled={isPending || dispatchAvailableKg <= 0}
                onClick={() => onDispatch(task.id)}
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Send to Segregation
              </button>
              <span className="text-xs text-slate-500">Available: {dispatchAvailableKg} kg</span>
            </>
          )}
          <PickupHistoryTooltip pickupId={task.id} />
          {task.status !== 'collected' ? (
            <CrudActions onEdit={() => onEdit(task)} onDelete={() => onDelete(task)} />
          ) : (
            <span className="text-xs text-slate-500">Locked after collection</span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function CollectionPage() {
  const { data: tasks, isLoading, isError } = useCollectionSchedule();
  const { data: dispatches } = useSegregationDispatches();
  const { mutate: createTask, isPending: creatingTask } = useCreatePickupTask();
  const { mutate: updateTask, isPending: updatingTask } = useUpdatePickupTask();
  const { mutate: updatePickupStatus, isPending: updatingStatus } = useUpdatePickupStatus();
  const { mutate: deleteTask } = useDeletePickupTask();
  const { mutate: dispatchToSegregation } = useDispatchToSegregation();

  const role = useMemo(() => getCurrentRole(), []);
  const isAdmin = role === 'admin';

  const [editingTask, setEditingTask] = useState<PickupTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formState, setFormState] = useState<PickupFormState>(defaultFormState);
  const [dispatchInputs, setDispatchInputs] = useState<Record<string, string>>({});

  const isSubmitting = creatingTask || updatingTask || updatingStatus;

  function onFormFieldChange<K extends keyof PickupFormState>(key: K, value: PickupFormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function openCreateModal() {
    setEditingTask(null);
    setFormState(defaultFormState);
    setIsCreateModalOpen(true);
  }

  function openEditModal(task: PickupTask) {
    setEditingTask(task);
    setFormState({
      site: task.site,
      status: task.status,
      assignedCollectorId: task.assignedCollectorId ?? '',
      scheduledDate: task.scheduledDate,
      estimatedWeightKg: task.estimatedWeightKg,
    });
    setIsCreateModalOpen(true);
  }

  function closeModal() {
    setIsCreateModalOpen(false);
  }

  function handleSaveTask() {
    if (!formState.site.trim()) return;
    if (formState.estimatedWeightKg < 0) return;

    const payload: PickupFormState = {
      ...formState,
      assignedCollectorId: formState.assignedCollectorId?.trim() || undefined,
    };

    if (editingTask) {
      // If assigning a collector to an existing task, use the assignment endpoint
      const newCollectorId = payload.assignedCollectorId?.trim();
      const prevCollectorId = editingTask.assignedCollectorId?.trim();
      
      if (newCollectorId && newCollectorId !== prevCollectorId) {
        // Use the assignment endpoint instead of generic update
        updatePickupStatus(
          {
            id: editingTask.id,
            status: formState.status,
            assignedCollectorUserId: newCollectorId,
          },
          { onSuccess: closeModal }
        );
        return;
      }

      updateTask(
        {
          id: editingTask.id,
          payload,
        },
        { onSuccess: closeModal }
      );
      return;
    }

    createTask(payload, { onSuccess: closeModal });
  }

  function handleEdit(task: PickupTask) {
    if (task.status === 'collected') return;
    openEditModal(task);
  }

  function handleDelete(task: PickupTask) {
    if (!window.confirm(`Delete pickup task ${task.id}?`)) return;
    deleteTask(task.id);
  }

  function getAvailableDispatchKg(task: PickupTask) {
    const dispatched = (dispatches ?? [])
      .filter((entry) => entry.pickupTaskId === task.id)
      .reduce((sum, entry) => sum + entry.dispatchedWeightKg, 0);
    return Math.max(task.estimatedWeightKg - dispatched, 0);
  }

  function handleDispatch(taskId: string) {
    const weight = Number(dispatchInputs[taskId] ?? 0);
    dispatchToSegregation(
      { pickupTaskId: taskId, dispatchedWeightKg: weight },
      {
        onSuccess: () => {
          setDispatchInputs((prev) => ({ ...prev, [taskId]: '' }));
        },
      }
    );
  }

  if (isLoading) return <p className="text-slate-400">Loading schedule…</p>;
  if (isError) return <p className="text-red-400">Failed to load schedule.</p>;

  return (
    <div>
      <PageHeader
        title="Pickup Schedule"
        subtitle="Assign collectors and progress pickup tasks with minimal clicks."
        actions={
          isAdmin ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Schedule New Pickup
            </button>
          ) : undefined
        }
      />
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/75 shadow-lg shadow-slate-950/30">
        <table className="w-full text-sm text-slate-100">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Date &amp; Time (Local)</th>
              <th className="px-4 py-3 text-left">Site</th>
              <th className="px-4 py-3 text-left">Pickup Code</th>
              <th className="px-4 py-3 text-left">Est. Weight</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tasks ?? []).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                dispatchAvailableKg={getAvailableDispatchKg(task)}
                dispatchValue={dispatchInputs[task.id] ?? ''}
                onDispatchValueChange={(taskId, value) =>
                  setDispatchInputs((prev) => ({ ...prev, [taskId]: value }))
                }
                onDispatch={handleDispatch}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        title={editingTask ? `Edit Pickup ${editingTask.id}` : 'Schedule New Pickup'}
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTask}
              disabled={isSubmitting}
              className="rounded bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Site</label>
            <input
              type="text"
              value={formState.site}
              onChange={(e) => onFormFieldChange('site', e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Scheduled Date</label>
              <input
                type="date"
                value={formState.scheduledDate}
                onChange={(e) => onFormFieldChange('scheduledDate', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Estimated Weight (kg)</label>
              <input
                type="number"
                min={0}
                value={formState.estimatedWeightKg}
                disabled={editingTask?.status === 'collected'}
                onChange={(e) => onFormFieldChange('estimatedWeightKg', Number(e.target.value))}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Status</label>
              <select
                value={formState.status}
                onChange={(e) => onFormFieldChange('status', e.target.value as PickupTask['status'])}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="scheduled">Scheduled</option>
                <option value="assigned">Assigned</option>
                <option value="collected">Collected</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Assigned Collector ID (optional)</label>
              <input
                type="text"
                value={formState.assignedCollectorId ?? ''}
                onChange={(e) => onFormFieldChange('assignedCollectorId', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
