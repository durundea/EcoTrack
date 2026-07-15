import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from '../Modal';
import { ConfirmDialogContext, type ConfirmRequest, type ConfirmResult } from './useConfirmDialog';

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<((value: ConfirmResult) => void) | null>(null);

  const api = useMemo(
    () => ({
      confirm: (next: ConfirmRequest) =>
        new Promise<ConfirmResult>((resolve) => {
          if (resolverRef.current) {
            resolverRef.current('cancelled');
          }

          resolverRef.current = resolve;
          setRequest(next);
        }),
    }),
    []
  );

  function closeWith(value: ConfirmResult) {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(value);
    setRequest(null);
  }

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current('cancelled');
        resolverRef.current = null;
      }
    };
  }, []);

  return (
    <ConfirmDialogContext.Provider value={api}>
      {children}
      <Modal
        isOpen={Boolean(request)}
        title={request?.title ?? ''}
        onClose={() => closeWith('cancelled')}
        footer={
          <>
            <button
              type="button"
              onClick={() => closeWith('cancelled')}
              className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              {request?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => closeWith('confirmed')}
              className="rounded bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {request?.confirmLabel ?? 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">{request?.message}</p>
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}
