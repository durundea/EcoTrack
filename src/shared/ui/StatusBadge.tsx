import type { ReactNode } from 'react';

type Variant = 'success' | 'info' | 'warning' | 'neutral' | 'danger';

const VARIANT_CLASS: Record<Variant, string> = {
  success: 'bg-emerald-900/60 text-emerald-200 ring-1 ring-emerald-700/60',
  info: 'bg-sky-900/60 text-sky-200 ring-1 ring-sky-700/60',
  warning: 'bg-amber-900/60 text-amber-200 ring-1 ring-amber-700/60',
  neutral: 'bg-slate-800 text-slate-300 ring-1 ring-slate-700',
  danger: 'bg-rose-900/60 text-rose-200 ring-1 ring-rose-700/60',
};

type Props = {
  children: ReactNode;
  variant: Variant;
};

export function StatusBadge({ children, variant }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${VARIANT_CLASS[variant]}`}>
      {children}
    </span>
  );
}
