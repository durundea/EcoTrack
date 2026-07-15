import { createContext, useContext } from 'react';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  confirmErrorMessage?: string;
};

export type ConfirmResult = 'confirmed' | 'cancelled';

export type ConfirmDialogApi = {
  confirm: (request: ConfirmRequest) => Promise<ConfirmResult>;
};

export const ConfirmDialogContext = createContext<ConfirmDialogApi | null>(null);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }

  return context;
}
