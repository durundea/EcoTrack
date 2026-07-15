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
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();

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
});
