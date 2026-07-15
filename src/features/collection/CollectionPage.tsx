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
import { useConfirmDialog } from '../../shared/ui/confirm/useConfirmDialog';
import { DataTable, Select } from '../../shared/ui/primitives';
import { getCurrentRole } from '../auth/sessionStore';
import { PickupHistoryTooltip } from './PickupHistoryTooltip';
import { upsertById } from '../../shared/services/queryListCache';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  assigned: 'Assigned',
  collected: 'Collected',
  sent_to_aggregation: 'Sent to Aggregation Round',
  sent_to_aggregation_round: 'Sent to Aggregation Round',
  senttoaggregation: 'Sent to Aggregation Round',
  senttoaggregationround: 'Sent to Aggregation Round',
  cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'neutral' | 'danger'> = {
  scheduled: 'warning',
  assigned: 'info',
  collected: 'success',
  sent_to_aggregation: 'info',
  sent_to_aggregation_round: 'info',
  senttoaggregation: 'info',
  senttoaggregationround: 'info',
  cancelled: 'neutral',
};

const PICKUP_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'collected', label: 'Collected' },
  { value: 'sent_to_aggregation_round', label: 'Sent to Aggregation Round' },
];

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

type TaskActionsProps = {
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
  assignedCollectorDisplayName: '',
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
}: TaskActionsProps) {
  const { mutate, isPending } = useUpdatePickupStatus();
  const isLocked = task.status === 'collected' || task.status.toLowerCase() === 'cancelled';

  return (
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
      {!isLocked ? (
        <CrudActions onEdit={() => onEdit(task)} onDelete={() => onDelete(task)} />
      ) : (
        <span className="text-xs text-slate-500">{task.status === 'collected' ? 'Locked after collection' : 'Locked'}</span>
      )}
    </div>
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
  const { confirm } = useConfirmDialog();

  const role = useMemo(() => getCurrentRole(), []);
  const isAdmin = role === 'admin';

  const [editingTask, setEditingTask] = useState<PickupTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formState, setFormState] = useState<PickupFormState>(defaultFormState);
  const [dispatchInputs, setDispatchInputs] = useState<Record<string, string>>({});
  const [latestCreatedTask, setLatestCreatedTask] = useState<PickupTask | null>(null);

  const displayedTasks = useMemo(
    () => (latestCreatedTask ? upsertById(tasks, latestCreatedTask) : tasks ?? []),
    [latestCreatedTask, tasks]
  );

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
      assignedCollectorDisplayName: task.assignedCollectorDisplayName ?? '',
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

    createTask(payload, {
      onSuccess: (created) => {
        setLatestCreatedTask(created);
        closeModal();
      },
    });
  }

  function handleEdit(task: PickupTask) {
    if (task.status === 'collected') return;
    openEditModal(task);
  }

  async function handleDelete(task: PickupTask) {
    await confirm({
      title: 'Delete pickup task',
      message: `Delete pickup task ${task.id}?`,
      onConfirm: () => {
        deleteTask(task.id);
      },
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
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

  const tableColumns = [
    {
      key: 'dateTime',
      header: 'Date & Time (Local)',
      render: (task: PickupTask) => <span className="font-mono text-sm text-slate-400">{formatTaskDateTimeLocal(task)}</span>,
    },
    {
      key: 'site',
      header: 'Site',
      render: (task: PickupTask) => task.site,
    },
    {
      key: 'pickupCode',
      header: 'Pickup Code',
      render: (task: PickupTask) => task.pickupCode || '-',
    },
    {
      key: 'estimatedWeight',
      header: 'Est. Weight',
      render: (task: PickupTask) => (task.estimatedWeightKg != null ? `${task.estimatedWeightKg} kg` : '-'),
    },
    {
      key: 'collectedWeight',
      header: 'Collected Weight',
      render: (task: PickupTask) => (task.collectedWeightKg != null ? `${task.collectedWeightKg} kg` : '-'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (task: PickupTask) => (
        <StatusBadge variant={STATUS_VARIANT[task.status.toLowerCase()] ?? 'neutral'}>
          {STATUS_LABELS[task.status.toLowerCase()] ?? task.status}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (task: PickupTask) => (
        <TaskRow
          task={task}
          dispatchAvailableKg={getAvailableDispatchKg(task)}
          dispatchValue={dispatchInputs[task.id] ?? ''}
          onDispatchValueChange={(taskId, value) =>
            setDispatchInputs((prev) => ({ ...prev, [taskId]: value }))
          }
          onDispatch={handleDispatch}
          onEdit={handleEdit}
          onDelete={(selectedTask) => {
            void handleDelete(selectedTask);
          }}
        />
      ),
    },
  ];

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
      <DataTable
        columns={tableColumns}
        rows={displayedTasks}
        state={displayedTasks.length > 0 ? 'ready' : 'empty'}
        emptyTitle="No pickup tasks found."
        getRowKey={(task) => task.id}
      />

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
              <Select
                label="Status"
                value={formState.status}
                options={PICKUP_STATUS_OPTIONS}
                onChange={(value) => onFormFieldChange('status', value as PickupTask['status'])}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Assigned Collector (optional)</label>
              <input
                type="text"
                value={formState.assignedCollectorDisplayName || formState.assignedCollectorId || ''}
                onChange={(e) => {
                  onFormFieldChange('assignedCollectorDisplayName', e.target.value);
                  if (e.target.value !== formState.assignedCollectorDisplayName) {
                    onFormFieldChange('assignedCollectorId', e.target.value);
                  }
                }}
                placeholder="Collector Name or ID"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
