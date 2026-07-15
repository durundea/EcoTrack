import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable } from '../../src/shared/ui/primitives/DataTable';

type WasteRow = {
  site: string;
  weightKg: number;
};

const columns = [
  {
    key: 'site',
    header: 'Site',
    render: (row: WasteRow) => row.site,
  },
  {
    key: 'weightKg',
    header: 'Weight (kg)',
    render: (row: WasteRow) => row.weightKg,
    className: 'text-right',
  },
];

const rows: WasteRow[] = [
  { site: 'Ward 1', weightKg: 120 },
  { site: 'Ward 2', weightKg: 95 },
];

describe('DataTable', () => {
  it('renders loading state with standard shell styling', () => {
    const { container } = render(<DataTable columns={columns} rows={[]} state="loading" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const shell = container.firstElementChild;
    expect(shell).toHaveClass('rounded-lg', 'border', 'border-[var(--border-subtle)]');
  });

  it('renders empty state message with standard shell styling', () => {
    const { container } = render(<DataTable columns={columns} rows={[]} state="empty" emptyTitle="No collection records" />);

    expect(screen.getByText('No collection records')).toBeInTheDocument();
    const shell = container.firstElementChild;
    expect(shell).toHaveClass('rounded-lg', 'border', 'border-[var(--border-subtle)]');
  });

  it('renders error state message with standard shell styling', () => {
    const { container } = render(
      <DataTable columns={columns} rows={[]} state="error" errorMessage="Failed to load records" />
    );

    expect(screen.getByText('Failed to load records')).toBeInTheDocument();
    const shell = container.firstElementChild;
    expect(shell).toHaveClass('rounded-lg', 'border', 'border-[var(--border-subtle)]');
  });

  it('renders table headers and rows in ready state', () => {
    const { container } = render(<DataTable columns={columns} rows={rows} state="ready" />);

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Site' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Weight (kg)' })).toBeInTheDocument();
    expect(within(table).getByText('Ward 1')).toBeInTheDocument();
    expect(within(table).getByText('95')).toBeInTheDocument();

    const shell = container.firstElementChild;
    expect(shell).toHaveClass('rounded-lg', 'border', 'border-[var(--border-subtle)]');
  });
});