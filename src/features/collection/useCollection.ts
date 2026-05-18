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
    queryFn: () => api.collection.getSchedule(),
  });
}

export function useUpdatePickupStatus() {
  const invalidate = useScheduleInvalidator();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PickupStatus }) =>
      api.collection.updateStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useCreatePickupTask() {
  const invalidate = useScheduleInvalidator();
  return useMutation({
    mutationFn: (input: Omit<PickupTask, 'id'>) => api.collection.createTask(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePickupTask() {
  const invalidate = useScheduleInvalidator();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<PickupTask, 'id'>> }) =>
      api.collection.updateTask(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeletePickupTask() {
  const invalidate = useScheduleInvalidator();
  return useMutation({
    mutationFn: (id: string) => api.collection.deleteTask(id),
    onSuccess: invalidate,
  });
}
