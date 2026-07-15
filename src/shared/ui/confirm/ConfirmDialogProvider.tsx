import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from '../Modal';
import { ConfirmDialogContext, type ConfirmRequest, type ConfirmResult } from './useConfirmDialog';

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resolverRef = useRef<((value: ConfirmResult) => void) | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const api = useMemo(
    () => ({
      confirm: (next: ConfirmRequest) =>
        new Promise<ConfirmResult>((resolve) => {
          if (resolverRef.current) {
            resolverRef.current('cancelled');
          }

          resolverRef.current = resolve;
          setIsProcessing(false);
          setErrorMessage(null);
          setRequest(next);
        }),
    }),
    []
  );

  function closeWith(value: ConfirmResult) {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setIsProcessing(false);
    setErrorMessage(null);
    resolver?.(value);
    setRequest(null);
  }

  function closeAsCancelled() {
    if (isProcessing) {
      return;
    }

    closeWith('cancelled');
  }

  async function confirmRequest() {
    if (!request || isProcessing) {
      return;
    }

    if (!request.onConfirm) {
      closeWith('confirmed');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      await request.onConfirm();
      closeWith('confirmed');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, request.confirmErrorMessage));
      setIsProcessing(false);
    }
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
        onClose={closeAsCancelled}
        initialFocusRef={cancelButtonRef}
        isDismissDisabled={isProcessing}
        footer={
          <>
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={closeAsCancelled}
              disabled={isProcessing}
              className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {request?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => {
                void confirmRequest();
              }}
              disabled={isProcessing}
              className="rounded bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? 'Processing...' : (request?.confirmLabel ?? 'Delete')}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">{request?.message}</p>
        {errorMessage ? (
          <p role="alert" className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}

function getErrorMessage(error: unknown, fallback?: string) {
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Unable to complete the action. Please try again.';
}
