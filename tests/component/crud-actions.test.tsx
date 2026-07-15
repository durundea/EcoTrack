import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CrudActions } from '../../src/shared/ui/CrudActions';

describe('CrudActions', () => {
  it('shows No actions when callbacks are absent', () => {
    render(<CrudActions />);

    expect(screen.getByText('No actions')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders accessible edit/delete buttons and invokes callbacks once per click', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<CrudActions onEdit={onEdit} onDelete={onDelete} />);

    const editButton = screen.getByRole('button', { name: 'Edit' });
    const deleteButton = screen.getByRole('button', { name: 'Delete' });

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
