import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function usePendingSalesForApproval() {
  return useQuery({
    queryKey: ['inventory', 'sales', 'pending'],
    queryFn: () => api.inventory.getSalesByStatus('pending_approval'),
  });
}

export function useApproveSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actorUserId }: { id: string; actorUserId: string }) =>
      api.inventory.approveSale(id, { actorRole: 'admin', actorUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales', 'pending'] });
    },
  });
}
