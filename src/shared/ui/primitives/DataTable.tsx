import type { ReactNode } from 'react';

type TableState = 'loading' | 'ready' | 'empty' | 'error';

type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  state: TableState;
  emptyTitle?: string;
  errorMessage?: string;
  getRowKey?: (row: T, index: number) => string;
};

const shellClassName = 'rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-panel)]';

export function DataTable<T>({
  columns,
  rows,
  state,
  emptyTitle = 'No records found',
  errorMessage = 'Unable to load records.',
  getRowKey,
}: DataTableProps<T>) {
  if (state === 'loading') {
    return <div className={`${shellClassName} p-4 text-sm text-[var(--text-muted)]`}>Loading...</div>;
  }

  if (state === 'error') {
    return <div className={`${shellClassName} p-4 text-sm text-[var(--text-primary)]`}>{errorMessage}</div>;
  }

  if (state === 'empty') {
    return <div className={`${shellClassName} p-4 text-sm text-[var(--text-muted)]`}>{emptyTitle}</div>;
  }

  return (
    <div className={`${shellClassName} overflow-hidden`}>
      <table className="w-full text-sm text-[var(--text-primary)]">
        <thead className="bg-[var(--surface-panel-hover)] text-[var(--text-muted)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row, index) : String(index)} className="border-t border-[var(--border-subtle)]">
              {columns.map((column) => (
                <td key={column.key} className={['px-4 py-3', column.className ?? ''].filter(Boolean).join(' ')}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}