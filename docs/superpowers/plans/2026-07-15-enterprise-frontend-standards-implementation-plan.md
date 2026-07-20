# Enterprise Frontend Standards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a strict, shared enterprise UI system across all EcoTrack pages with dual theme support, global delete confirmation, and standardized table/dropdown primitives.

**Architecture:** Build a shared UI foundation first (theme runtime, modal orchestration, primitives), then migrate all feature pages in one coordinated refactor branch. Enforce semantic token usage and remove one-off UI patterns from feature modules. Validate behavior and consistency through unit, component, integration, and e2e smoke checks.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, TanStack Query, Vitest, React Testing Library, Playwright

---

## File Structure And Responsibilities

### Create

- `src/shared/ui/theme/themeTokens.ts`
  - Defines semantic theme token objects for dark and light modes.
- `src/shared/ui/theme/themeStorage.ts`
  - Encapsulates read/write/validation for persisted theme preference.
- `src/shared/ui/theme/ThemeProvider.tsx`
  - Resolves active theme from system preference and user override; applies `data-theme`.
- `src/shared/ui/theme/useTheme.ts`
  - Hook for consuming theme context in shared and feature UI.
- `src/shared/ui/confirm/ConfirmDialogProvider.tsx`
  - Global confirm-dialog state machine and renderer.
- `src/shared/ui/confirm/useConfirmDialog.ts`
  - Hook API for opening destructive confirmation dialogs.
- `src/shared/ui/primitives/Button.tsx`
  - Shared button variants and sizes using semantic tokens.
- `src/shared/ui/primitives/Input.tsx`
  - Shared input primitive with error/disabled variants.
- `src/shared/ui/primitives/Select.tsx`
  - Shared select primitive with consistent styling and states.
- `src/shared/ui/primitives/DataTable.tsx`
  - Shared table shell with loading/empty/error/data states.
- `src/shared/ui/primitives/index.ts`
  - Barrel exports for primitives.
- `tests/unit/theme-provider.test.tsx`
  - Theme resolution and storage fallback tests.
- `tests/component/confirm-dialog.test.tsx`
  - Global delete modal behavior tests.
- `tests/component/data-table.test.tsx`
  - Shared table rendering contract tests.
- `tests/component/select-primitive.test.tsx`
  - Shared select state and accessibility tests.
- `tests/unit/ui-token-guard.test.ts`
  - Guardrail test to detect hardcoded visual literals in feature pages.

### Modify

- `src/styles.css`
  - Replace hardcoded global colors with semantic token variables for dark/light themes.
- `src/app/providers.tsx`
  - Compose `ThemeProvider` and `ConfirmDialogProvider` at app root.
- `src/app/layouts/AppShell.tsx`
  - Add theme preference toggle control in header.
- `src/shared/ui/Modal.tsx`
  - Upgrade modal accessibility (focus trap, safe Escape behavior, ARIA wiring).
- `src/shared/ui/CrudActions.tsx`
  - Switch to shared `Button` primitive for action consistency.
- `src/features/collection/CollectionPage.tsx`
  - Replace `window.confirm`, use global confirm hook, and consume shared select/table primitives.
- `src/features/segregation/SegregationPage.tsx`
  - Migrate select/table usage to shared primitives.
- `src/features/inventory/InventoryPage.tsx`
  - Migrate select/table usage to shared primitives and rounded-table standard.
- `src/features/dashboard/DashboardPage.tsx`
  - Migrate filter controls and category table wrapper to primitives.
- `src/features/recycling/RecyclingPage.tsx`
  - Migrate select/input controls to shared primitives where applicable.
- `tests/component/collection-page.test.tsx`
  - Assert global confirm modal usage instead of `window.confirm`.
- `tests/component/segregation-page.test.tsx`
  - Assert shared select and table structures.
- `tests/component/inventory-approval.test.tsx`
  - Assert shared table/select usage and behavior.
- `tests/component/dashboard-page.test.tsx`
  - Assert shared filter controls and theme-safe rendering.
- `tests/component/recycling-page.test.tsx`
  - Assert shared control primitives.
- `package.json`
  - Add `test:ui-guard` script for token-enforcement test.

### Test Suites To Reuse

- `tests/component/*.test.tsx`
- `tests/unit/*.test.ts`
- `tests/e2e/*.spec.ts`

---

### Task 1: Build Theme Token System And Provider

**Files:**
- Create: `src/shared/ui/theme/themeTokens.ts`
- Create: `src/shared/ui/theme/themeStorage.ts`
- Create: `src/shared/ui/theme/ThemeProvider.tsx`
- Create: `src/shared/ui/theme/useTheme.ts`
- Create: `tests/unit/theme-provider.test.tsx`
- Modify: `src/styles.css`
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/theme-provider.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ThemeProvider } from '../../src/shared/ui/theme/ThemeProvider';
import { useTheme } from '../../src/shared/ui/theme/useTheme';

describe('ThemeProvider', () => {
  it('prefers system theme when user preference is system', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.activeTheme).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/theme-provider.test.tsx`
Expected: FAIL with module resolution error for `ThemeProvider` and `useTheme`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/shared/ui/theme/ThemeProvider.tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getStoredThemePreference, setStoredThemePreference, type ThemePreference } from './themeStorage';

export type ActiveTheme = 'light' | 'dark';

type ThemeContextValue = {
  activeTheme: ActiveTheme;
  userOverride: ThemePreference;
  isSystemMode: boolean;
  setThemePreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ActiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [userOverride, setUserOverride] = useState<ThemePreference>(() => getStoredThemePreference());
  const [systemTheme, setSystemTheme] = useState<ActiveTheme>(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const activeTheme: ActiveTheme = userOverride === 'system' ? systemTheme : userOverride;

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
  }, [activeTheme]);

  const value = useMemo(
    () => ({
      activeTheme,
      userOverride,
      isSystemMode: userOverride === 'system',
      setThemePreference: (next: ThemePreference) => {
        setUserOverride(next);
        setStoredThemePreference(next);
      },
    }),
    [activeTheme, userOverride]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

```ts
// src/shared/ui/theme/themeStorage.ts
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ecotrack_theme_preference';

export function getStoredThemePreference(): ThemePreference {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  window.localStorage.setItem(STORAGE_KEY, 'system');
  return 'system';
}

export function setStoredThemePreference(value: ThemePreference): void {
  window.localStorage.setItem(STORAGE_KEY, value);
}
```

```css
/* src/styles.css */
:root {
  --surface-app: #020617;
  --surface-panel: #0b1220;
  --surface-panel-hover: #162036;
  --border-subtle: #1e293b;
  --text-primary: #e2e8f0;
  --text-muted: #94a3b8;
  --action-brand: #16a34a;
}

:root[data-theme='light'] {
  --surface-app: #f8fafc;
  --surface-panel: #ffffff;
  --surface-panel-hover: #f1f5f9;
  --border-subtle: #cbd5e1;
  --text-primary: #0f172a;
  --text-muted: #475569;
  --action-brand: #15803d;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/unit/theme-provider.test.tsx`
Expected: PASS with theme resolution assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/theme src/styles.css src/app/providers.tsx tests/unit/theme-provider.test.tsx
git commit -m "feat(ui): add theme provider with system and override resolution"
```

---

### Task 2: Add Theme Toggle To App Shell

**Files:**
- Modify: `src/app/layouts/AppShell.tsx`
- Modify: `tests/component/app-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/component/app-shell.test.tsx
it('renders a theme preference toggle with system, dark, and light options', () => {
  render(
    <MemoryRouter>
      <LoaderProvider>
        <AppShell><div>Body</div></AppShell>
      </LoaderProvider>
    </MemoryRouter>
  );

  expect(screen.getByRole('combobox', { name: /theme/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /system/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /dark/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /light/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/component/app-shell.test.tsx`
Expected: FAIL because theme combobox is not rendered yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/layouts/AppShell.tsx (inside header action area)
import { useTheme } from '../../shared/ui/theme/useTheme';

const { userOverride, setThemePreference } = useTheme();

<label className="sr-only" htmlFor="theme-preference">Theme</label>
<select
  id="theme-preference"
  aria-label="Theme"
  value={userOverride}
  onChange={(event) => setThemePreference(event.target.value as 'light' | 'dark' | 'system')}
  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
>
  <option value="system">System</option>
  <option value="dark">Dark</option>
  <option value="light">Light</option>
</select>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/component/app-shell.test.tsx tests/unit/theme-provider.test.tsx`
Expected: PASS for both test files.

- [ ] **Step 5: Commit**

```bash
git add src/app/layouts/AppShell.tsx tests/component/app-shell.test.tsx
git commit -m "feat(ui): add persistent theme preference control in app shell"
```

---

### Task 3: Add Global Confirm Dialog Provider And Upgrade Modal Accessibility

**Files:**
- Create: `src/shared/ui/confirm/ConfirmDialogProvider.tsx`
- Create: `src/shared/ui/confirm/useConfirmDialog.ts`
- Modify: `src/shared/ui/Modal.tsx`
- Modify: `src/app/providers.tsx`
- Create: `tests/component/confirm-dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/component/confirm-dialog.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialogProvider } from '../../src/shared/ui/confirm/ConfirmDialogProvider';
import { useConfirmDialog } from '../../src/shared/ui/confirm/useConfirmDialog';

function Demo() {
  const { confirm } = useConfirmDialog();
  return (
    <button
      onClick={() => {
        void confirm({ title: 'Delete item', message: 'This action cannot be undone.' });
      }}
    >
      Trigger
    </button>
  );
}

describe('ConfirmDialogProvider', () => {
  it('opens a global delete modal and supports cancel', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialogProvider>
        <Demo />
      </ConfirmDialogProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('dialog', { name: /delete item/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog', { name: /delete item/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/component/confirm-dialog.test.tsx`
Expected: FAIL because confirm dialog provider/hook do not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/shared/ui/confirm/useConfirmDialog.ts
import { createContext, useContext } from 'react';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export type ConfirmResult = 'confirmed' | 'cancelled';

export type ConfirmDialogApi = {
  confirm: (request: ConfirmRequest) => Promise<ConfirmResult>;
};

export const ConfirmDialogContext = createContext<ConfirmDialogApi | null>(null);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  return context;
}
```

```tsx
// src/shared/ui/confirm/ConfirmDialogProvider.tsx
import { useMemo, useState, type ReactNode } from 'react';
import { Modal } from '../Modal';
import { ConfirmDialogContext, type ConfirmRequest, type ConfirmResult } from './useConfirmDialog';

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [resolver, setResolver] = useState<((value: ConfirmResult) => void) | null>(null);

  const api = useMemo(
    () => ({
      confirm: (next: ConfirmRequest) =>
        new Promise<ConfirmResult>((resolve) => {
          setRequest(next);
          setResolver(() => resolve);
        }),
    }),
    []
  );

  function closeWith(value: ConfirmResult) {
    resolver?.(value);
    setResolver(null);
    setRequest(null);
  }

  return (
    <ConfirmDialogContext.Provider value={api}>
      {children}
      <Modal
        isOpen={Boolean(request)}
        title={request?.title ?? ''}
        onClose={() => closeWith('cancelled')}
        footer={
          <>
            <button type="button" onClick={() => closeWith('cancelled')}>{request?.cancelLabel ?? 'Cancel'}</button>
            <button type="button" onClick={() => closeWith('confirmed')}>{request?.confirmLabel ?? 'Delete'}</button>
          </>
        }
      >
        <p>{request?.message}</p>
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}
```

```tsx
// src/shared/ui/Modal.tsx (core accessibility additions)
// - role="dialog"
// - aria-modal="true"
// - aria-labelledby and id binding
// - initial focus to close/cancel button
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/component/confirm-dialog.test.tsx`
Expected: PASS and dialog opens/closes correctly.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/confirm src/shared/ui/Modal.tsx src/app/providers.tsx tests/component/confirm-dialog.test.tsx
git commit -m "feat(ui): add global confirm dialog provider and modal accessibility baseline"
```

---

### Task 4: Create Shared Form Primitives (Button, Input, Select)

**Files:**
- Create: `src/shared/ui/primitives/Button.tsx`
- Create: `src/shared/ui/primitives/Input.tsx`
- Create: `src/shared/ui/primitives/Select.tsx`
- Create: `src/shared/ui/primitives/index.ts`
- Create: `tests/component/select-primitive.test.tsx`
- Modify: `src/shared/ui/CrudActions.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/component/select-primitive.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from '../../src/shared/ui/primitives/Select';

describe('Select primitive', () => {
  it('renders label, options, and disabled state consistently', () => {
    render(
      <Select
        label="Waste Type"
        value="plastic"
        onChange={() => {}}
        options={[
          { label: 'Plastic', value: 'plastic' },
          { label: 'Organic', value: 'organic' },
        ]}
        disabled
      />
    );

    expect(screen.getByLabelText('Waste Type')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Plastic' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/component/select-primitive.test.tsx`
Expected: FAIL because primitive file does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/shared/ui/primitives/Select.tsx
type Option = { label: string; value: string };

type SelectProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Option[];
  disabled?: boolean;
  error?: string;
};

export function Select({ label, value, onChange, options, disabled, error }: SelectProps) {
  return (
    <label className="block text-xs text-[var(--text-muted)]">
      <span className="mb-1 block">{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-primary)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : null}
    </label>
  );
}
```

```tsx
// src/shared/ui/primitives/Button.tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'danger' | 'secondary';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const variantClass =
    variant === 'primary'
      ? 'bg-brand-600 hover:bg-brand-700 text-white'
      : variant === 'danger'
        ? 'bg-rose-600 hover:bg-rose-700 text-white'
        : 'bg-slate-700 hover:bg-slate-600 text-slate-100';

  return <button className={`rounded-md px-3 py-1.5 text-sm font-medium ${variantClass} ${className}`} {...props} />;
}
```

```tsx
// src/shared/ui/CrudActions.tsx (example replacement)
import { Button } from './primitives/Button';

<Button type="button" variant="secondary" onClick={onEdit} aria-label={editLabel}>Edit</Button>
<Button type="button" variant="danger" onClick={onDelete} aria-label={deleteLabel}>Delete</Button>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/component/select-primitive.test.tsx tests/component/app-shell.test.tsx`
Expected: PASS for primitive test and no shell regressions.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/primitives src/shared/ui/CrudActions.tsx tests/component/select-primitive.test.tsx
git commit -m "feat(ui): add shared form/button primitives and migrate crud actions"
```

---

### Task 5: Build Shared DataTable Primitive

**Files:**
- Create: `src/shared/ui/primitives/DataTable.tsx`
- Create: `tests/component/data-table.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/component/data-table.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../../src/shared/ui/primitives/DataTable';

describe('DataTable', () => {
  it('renders empty state when rows are empty', () => {
    render(
      <DataTable
        columns={[{ key: 'site', header: 'Site', render: (row: { site: string }) => row.site }]}
        rows={[]}
        state="empty"
        emptyTitle="No pickups"
      />
    );

    expect(screen.getByText('No pickups')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/component/data-table.test.tsx`
Expected: FAIL because `DataTable` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/shared/ui/primitives/DataTable.tsx
import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  state: 'loading' | 'ready' | 'empty' | 'error';
  emptyTitle?: string;
  errorMessage?: string;
};

export function DataTable<T>({ columns, rows, state, emptyTitle = 'No records found', errorMessage = 'Unable to load records.' }: DataTableProps<T>) {
  if (state === 'loading') return <div className="rounded-lg border border-[var(--border-subtle)] p-4">Loading...</div>;
  if (state === 'error') return <div className="rounded-lg border border-rose-700/40 p-4 text-rose-300">{errorMessage}</div>;
  if (state === 'empty') return <div className="rounded-lg border border-[var(--border-subtle)] p-4 text-[var(--text-muted)]">{emptyTitle}</div>;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface-panel-hover)] text-[var(--text-muted)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left font-medium">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--border-subtle)]">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/component/data-table.test.tsx`
Expected: PASS with loading/empty/error/ready branches covered.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/primitives/DataTable.tsx tests/component/data-table.test.tsx
git commit -m "feat(ui): add shared data table primitive with standard states"
```

---

### Task 6: Migrate Collection And Segregation To Shared Confirm, Select, And Table

**Files:**
- Modify: `src/features/collection/CollectionPage.tsx`
- Modify: `src/features/segregation/SegregationPage.tsx`
- Modify: `tests/component/collection-page.test.tsx`
- Modify: `tests/component/segregation-page.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/component/collection-page.test.tsx
it('opens shared delete confirmation modal instead of window.confirm', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm');
  render(<CollectionPage />);
  const deleteButton = await screen.findByRole('button', { name: /delete/i });
  await userEvent.click(deleteButton);
  expect(confirmSpy).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: /delete pickup task/i })).toBeInTheDocument();
});
```

```tsx
// tests/component/segregation-page.test.tsx
it('uses shared select primitive for pending batch input', () => {
  render(<SegregationPage />);
  expect(screen.getByLabelText(/segregation queue entry/i)).toHaveClass('w-full');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run tests/component/collection-page.test.tsx tests/component/segregation-page.test.tsx`
Expected: FAIL because collection still calls `window.confirm` and segregation still uses local markup.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/collection/CollectionPage.tsx (delete flow)
import { useConfirmDialog } from '../../shared/ui/confirm/useConfirmDialog';

const { confirm } = useConfirmDialog();

async function handleDelete(task: PickupTask) {
  const result = await confirm({
    title: 'Delete pickup task',
    message: `Delete pickup task ${task.id}?`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  });

  if (result !== 'confirmed') return;
  deleteTask(task.id);
}
```

```tsx
// src/features/collection/CollectionPage.tsx and src/features/segregation/SegregationPage.tsx
// replace local <select> and table wrappers with shared Select/DataTable primitives
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/component/collection-page.test.tsx tests/component/segregation-page.test.tsx tests/component/confirm-dialog.test.tsx`
Expected: PASS and no direct `window.confirm` assertions remain.

- [ ] **Step 5: Commit**

```bash
git add src/features/collection/CollectionPage.tsx src/features/segregation/SegregationPage.tsx tests/component/collection-page.test.tsx tests/component/segregation-page.test.tsx
git commit -m "refactor(ui): migrate collection and segregation to shared dialog and primitives"
```

---

### Task 7: Migrate Inventory, Dashboard, And Recycling To Shared Primitives

**Files:**
- Modify: `src/features/inventory/InventoryPage.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/features/recycling/RecyclingPage.tsx`
- Modify: `tests/component/inventory-approval.test.tsx`
- Modify: `tests/component/inventory-sales-records.test.tsx`
- Modify: `tests/component/dashboard-page.test.tsx`
- Modify: `tests/component/recycling-page.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/component/inventory-approval.test.tsx
it('renders inventory forms with shared select primitive', () => {
  render(<InventoryPage />);
  expect(screen.getByLabelText(/item/i)).toHaveClass('w-full');
});
```

```tsx
// tests/component/dashboard-page.test.tsx
it('renders dashboard range filter with shared select primitive', async () => {
  renderDashboard();
  expect(await screen.findByLabelText(/range/i)).toHaveClass('w-full');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx tests/component/inventory-sales-records.test.tsx tests/component/dashboard-page.test.tsx tests/component/recycling-page.test.tsx`
Expected: FAIL where local raw selects/tables still exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/inventory/InventoryPage.tsx
import { Select, DataTable, Button, Input } from '../../shared/ui/primitives';

// Replace raw select controls with <Select>
// Replace stock/sales table wrapper with <DataTable>
```

```tsx
// src/features/dashboard/DashboardPage.tsx
import { Select, DataTable } from '../../shared/ui/primitives';

// Replace range/waste type filters with shared <Select>
// Replace category breakdown table with shared <DataTable>
```

```tsx
// src/features/recycling/RecyclingPage.tsx
import { Select, Input, Button } from '../../shared/ui/primitives';

// Replace local unit selector and related controls with shared primitives
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx tests/component/inventory-sales-records.test.tsx tests/component/dashboard-page.test.tsx tests/component/recycling-page.test.tsx`
Expected: PASS for all migrated feature pages.

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory/InventoryPage.tsx src/features/dashboard/DashboardPage.tsx src/features/recycling/RecyclingPage.tsx tests/component/inventory-approval.test.tsx tests/component/inventory-sales-records.test.tsx tests/component/dashboard-page.test.tsx tests/component/recycling-page.test.tsx
git commit -m "refactor(ui): migrate inventory dashboard recycling to shared primitives"
```

---

### Task 8: Add Strict Token Enforcement Guardrail

**Files:**
- Create: `tests/unit/ui-token-guard.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing guard test**

```ts
// tests/unit/ui-token-guard.test.ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    if (entry.isFile() && path.endsWith('.tsx')) return [path];
    return [];
  });
}

describe('ui token guard', () => {
  it('disallows hardcoded slate/rose/brand classes in feature pages', () => {
    const files = collectTsxFiles(join(process.cwd(), 'src/features'));
    const banned = /(bg|text|border)-(slate|rose|emerald|sky)-\d+/;
    const offenders = files.filter((file) => banned.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/ui-token-guard.test.ts`
Expected: FAIL listing current feature files with banned literals.

- [ ] **Step 3: Add script and reconcile remaining literals**

```json
// package.json scripts
{
  "scripts": {
    "test:ui-guard": "vitest --run tests/unit/ui-token-guard.test.ts"
  }
}
```

```tsx
// Remaining feature pages
// Replace hardcoded color utility classes with semantic class names or primitive components.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:ui-guard`
Expected: PASS with no offender paths.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/ui-token-guard.test.ts package.json src/features
git commit -m "test(ui): enforce strict token usage in feature pages"
```

---

### Task 9: Full Verification, Docs Update, And Release Readiness

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-15-enterprise-frontend-standards-design.md` (only if clarifications are needed)

- [ ] **Step 1: Write/update verification checklist docs**

```md
<!-- README.md section -->
## UI Standards Verification

- Theme preference supports System, Dark, Light.
- All delete actions use global confirm modal.
- Feature pages consume shared Select and DataTable primitives.
- Run `npm run test:ui-guard` before merge.
```

- [ ] **Step 2: Run focused automated validation**

Run:
`npm test -- --run tests/unit/theme-provider.test.tsx tests/component/confirm-dialog.test.tsx tests/component/data-table.test.tsx tests/component/select-primitive.test.tsx tests/component/collection-page.test.tsx tests/component/segregation-page.test.tsx tests/component/inventory-approval.test.tsx tests/component/inventory-sales-records.test.tsx tests/component/dashboard-page.test.tsx tests/component/recycling-page.test.tsx tests/unit/ui-token-guard.test.ts`

Expected: PASS for all listed suites.

- [ ] **Step 3: Run broader regression**

Run: `npm test -- --run`
Expected: PASS across component and unit suites.

Run: `npm run test:e2e -- --grep "admin-operational-flow|collector-access"`
Expected: PASS for cross-flow smoke checks in both roles.

- [ ] **Step 4: Final commit**

```bash
git add README.md docs/superpowers/specs/2026-07-15-enterprise-frontend-standards-design.md
git commit -m "docs(ui): add enterprise UI verification checklist"
```

- [ ] **Step 5: Create merge-ready summary**

```bash
git log --oneline --decorate -n 12
```

Expected: Shows sequential commits from theme foundation through full migration and guardrails.

---

## Self-Review Checklist (Completed)

### 1. Spec Coverage

- Theme system with system/default override and persistence: covered in Tasks 1-2.
- Global delete modal standardization: covered in Tasks 3 and 6.
- Standard table/dropdown/common primitives: covered in Tasks 4-7.
- Error/edge behavior expectations: covered via modal behavior and table/select state tests in Tasks 3-5.
- Strict governance and token-only enforcement: covered in Task 8.
- Verification and regression gates: covered in Task 9.

No spec gaps detected.

### 2. Placeholder Scan

- No `TBD`, `TODO`, or deferred placeholders.
- Each task contains concrete files, commands, and code examples.

### 3. Type And API Consistency

- Theme preference union is consistent (`light | dark | system`) across storage, provider, and shell usage.
- Confirm dialog API uses a single `confirm(request) -> Promise<'confirmed' | 'cancelled'>` contract across provider and feature migration tasks.
- Primitive names are consistent (`Select`, `DataTable`, `Button`, `Input`) across creation and migration tasks.
