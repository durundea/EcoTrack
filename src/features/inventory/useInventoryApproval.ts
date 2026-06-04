import { useMutation } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function usePendingSalesForApproval() {
  return {
    data: [],
    isLoading: false,
    isUnavailable: true,
  } as const;
}

export function useApproveSale() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.sales.approveSale(id),
  });
}
