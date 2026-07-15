import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseClassName =
  'inline-flex items-center justify-center rounded-md border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-app)] disabled:cursor-not-allowed disabled:opacity-60';

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-[var(--action-brand)] text-white hover:brightness-110',
  secondary:
    'border-[var(--border-subtle)] bg-[var(--surface-panel)] text-[var(--text-primary)] hover:bg-[var(--surface-panel-hover)]',
  danger: 'border-transparent bg-rose-600 text-white hover:bg-rose-500',
  ghost: 'border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-panel-hover)] hover:text-[var(--text-primary)]',
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2',
  icon: 'h-8 w-8 p-0',
};

export function Button({
  type = 'button',
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const classes = [baseClassName, variantClassName[variant], sizeClassName[size], className]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...props} />;
}
