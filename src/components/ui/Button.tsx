import type { ComponentPropsWithRef, ReactNode } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary hover:bg-primary-hover text-on-accent shadow-premium-sm',
  secondary: 'bg-surface text-ink-soft border border-hairline hover:bg-surface-alt',
  ghost: 'bg-transparent text-muted hover:bg-surface-alt hover:text-ink',
  danger: 'bg-danger hover:bg-danger-deep text-on-accent shadow-premium-sm',
}

const SIZES = {
  sm: 'h-7 px-2.5 text-[11px] rounded-control',
  md: 'h-9 px-3.5 text-xs rounded-control',
}

export const Button = ({ variant = 'primary', size = 'sm', icon, className, children, ...rest }:
  ComponentPropsWithRef<'button'> & { variant?: Variant; size?: keyof typeof SIZES; icon?: ReactNode }) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-200',
      'outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
      'active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...rest}
  >
    {icon}
    {children}
  </button>
)
