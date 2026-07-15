import type { InputHTMLAttributes } from 'react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  hint?: string;
  error?: string;
  onChange?: (next: string) => void;
};

export function Input({
  id,
  label,
  hint,
  error,
  disabled,
  className,
  onChange,
  ...props
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>
      <input
        id={inputId}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        className={[
          'w-full rounded-md border bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors',
          'placeholder:text-[var(--text-muted)]',
          error ? 'border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500' : 'border-[var(--border-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--action-brand)]',
          disabled ? 'cursor-not-allowed opacity-60' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
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
