import type { SelectHTMLAttributes } from 'react';

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  onChange: (next: string) => void;
};

export function Select({
  id,
  label,
  value,
  options,
  hint,
  error,
  disabled,
  className,
  onChange,
  ...props
}: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>
      <select
        id={selectId}
        aria-label={label}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={[
          'w-full rounded-md border bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors',
          error ? 'border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500' : 'border-[var(--border-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--action-brand)]',
          disabled ? 'cursor-not-allowed opacity-60' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={hintId} className="text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
