import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import type { PickupStatus, PickupTask } from '../../shared/api/contracts';

function useScheduleInvalidator() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['collection', 'schedule'] });
}

export function useCollectionSchedule() {
  return useQuery({
    queryKey: ['collection', 'schedule'],
    queryFn: async () => (await api.collection.getSchedule()).items,
  });
}

export function usePickupAssignmentHistory(pickupId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['collection', 'history', pickupId],
    queryFn: () => api.collection.getAssignmentHistory(pickupId),
    enabled,
  });
}

export function useSegregationDispatches() {
  return useQuery({
    queryKey: ['collection', 'dispatches'],
    queryFn: () => api.collection.getDispatches(),
  });
}

export function useUpdatePickupStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      assignedCollectorUserId,
      note,
      collectedWeightKg,
    }: {
      id: string;
      status: PickupStatus;
      assignedCollectorUserId?: string;
      note?: string;
      collectedWeightKg?: number;
    }) => api.collection.updateStatus(id, status, { assignedCollectorUserId, note, collectedWeightKg }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['collection', 'history', variables.id] });
    },
  });
}

export function useCreatePickupTask() {
  const invalidate = useScheduleInvalidator();
  return useMutation({
    mutationFn: (input: Omit<PickupTask, 'id'>) =>
      api.collection.createTask({
        siteName: input.site,
        siteAddressText: input.site,
        scheduledAtUtc: new Date(`${input.scheduledDate}T00:00:00.000Z`).toISOString(),
        estimatedWeightKg: input.estimatedWeightKg,
        notes: input.notes ?? '',
      }),
    onSuccess: invalidate,
  });
}

export function useUpdatePickupTask() {
  const invalidate = useScheduleInvalidator();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<PickupTask, 'id'>> }) =>
      api.collection.updateTask(id, {
        siteName: payload.site ?? payload.siteName ?? '',
        siteAddressText: payload.siteAddressText ?? payload.site ?? '',
        scheduledAtUtc: new Date(`${payload.scheduledDate ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`).toISOString(),
        estimatedWeightKg: payload.estimatedWeightKg ?? 0,
        notes: payload.notes ?? '',
      }),
    onSuccess: invalidate,
  });
}

export function useDeletePickupTask() {
  const invalidate = useScheduleInvalidator();
  return useMutation({
    mutationFn: (id: string) => api.collection.deleteTask(id, { reason: 'Cancelled from collection page' }),
    onSuccess: invalidate,
  });
}

export function useDispatchToSegregation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pickupTaskId }: { pickupTaskId: string; dispatchedWeightKg: number }) =>
      api.collection.dispatchToSegregation(pickupTaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['collection', 'dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['segregation', 'batches'] });
    },
  });
}
