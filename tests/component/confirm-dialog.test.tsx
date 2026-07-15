import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ConfirmDialogProvider } from '../../src/shared/ui/confirm/ConfirmDialogProvider';
import { useConfirmDialog } from '../../src/shared/ui/confirm/useConfirmDialog';

function Demo() {
  const { confirm } = useConfirmDialog();
  const [result, setResult] = useState('');

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const nextResult = await confirm({
            title: 'Delete item',
            message: 'This action cannot be undone.',
          });
          setResult(nextResult);
        }}
      >
        Trigger
      </button>
      <p aria-label="confirm-result">{result}</p>
    </>
  );
}

function AsyncDemo({
  onConfirm,
}: {
  onConfirm: () => Promise<void>;
}) {
  const { confirm } = useConfirmDialog();
  const [result, setResult] = useState('');

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const nextResult = await confirm({
            title: 'Delete item',
            message: 'This action cannot be undone.',
            onConfirm,
          });
          setResult(nextResult);
        }}
      >
        Trigger
      </button>
      <p aria-label="confirm-result">{result}</p>
    </>
  );
}

describe('ConfirmDialogProvider', () => {
  it('opens a global delete modal and resolves with cancelled', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialogProvider>
        <Demo />
      </ConfirmDialogProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Trigger' }));

    const dialog = screen.getByRole('dialog', { name: /delete item/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /delete item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('confirm-result')).toHaveTextContent('cancelled');
    });
    expect(screen.queryByRole('dialog', { name: /delete item/i })).not.toBeInTheDocument();
  });

  it('resolves with confirmed when confirm is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialogProvider>
        <Demo />
      </ConfirmDialogProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Trigger' }));
    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('confirm-result')).toHaveTextContent('confirmed');
    });
  });

  it('closes when Escape is pressed while idle', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialogProvider>
        <Demo />
      </ConfirmDialogProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Trigger' }));
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.getByLabelText('confirm-result')).toHaveTextContent('cancelled');
    });
    expect(screen.queryByRole('dialog', { name: /delete item/i })).not.toBeInTheDocument();
  });

  it('ignores Escape while async confirm is processing', async () => {
    const user = userEvent.setup();

    let resolveConfirm: (() => void) | null = null;
    const pendingConfirm = new Promise<void>((resolve) => {
      resolveConfirm = resolve;
    });

    render(
      <ConfirmDialogProvider>
        <AsyncDemo onConfirm={() => pendingConfirm} />
      </ConfirmDialogProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Trigger' }));
    await user.click(screen.getByRole('button', { name: /delete/i }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: /delete item/i })).toBeInTheDocument();
    expect(screen.getByLabelText('confirm-result')).toHaveTextContent('');

    resolveConfirm?.();

    await waitFor(() => {
      expect(screen.getByLabelText('confirm-result')).toHaveTextContent('confirmed');
    });
  });

  it('keeps modal open and shows inline error when async confirm fails', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialogProvider>
        <AsyncDemo onConfirm={async () => Promise.reject(new Error('Failed to delete item.'))} />
      </ConfirmDialogProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Trigger' }));
    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to delete item.');
    expect(screen.getByRole('dialog', { name: /delete item/i })).toBeInTheDocument();
    expect(screen.getByLabelText('confirm-result')).toHaveTextContent('');
  });
});
