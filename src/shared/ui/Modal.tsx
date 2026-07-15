import { type ReactNode, useEffect, useId, useRef } from 'react';

type Props = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

function getFocusableElements(container: HTMLElement) {
  const selectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(',')));
}

export function Modal({ isOpen, title, onClose, children, footer }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialogElement = dialogRef.current;
    if (!dialogElement) return undefined;

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const initialFocusTarget = closeButtonRef.current ?? getFocusableElements(dialogElement)[0] ?? dialogElement;
    initialFocusTarget.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(dialogElement);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    dialogElement.addEventListener('keydown', onKeyDown);

    return () => {
      dialogElement.removeEventListener('keydown', onKeyDown);

      if (previousActiveElement) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div>{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
