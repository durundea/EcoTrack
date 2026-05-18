import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import type { PickupStatus } from '../../shared/api/contracts';

export function useCollectionSchedule() {
  return useQuery({
    queryKey: ['collection', 'schedule'],
    queryFn: () => api.collection.getSchedule(),
  });
}

export function useUpdatePickupStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PickupStatus }) =>
      api.collection.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', 'schedule'] });
    },
  });
}
