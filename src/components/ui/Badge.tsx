import type { ReactNode } from 'react'
import clsx from 'clsx'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'vip'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-alt text-muted border-hairline',
  primary: 'bg-primary-soft text-primary border-primary-soft-border',
  success: 'bg-success-soft text-success-deep border-success-soft-border',
  warning: 'bg-warning-soft text-warning-deep border-warning-soft-border',
  danger: 'bg-danger-soft text-danger-deep border-danger-soft-border',
  info: 'bg-info-soft text-primary border-primary-soft-border-strong',
  vip: 'bg-vip-soft text-vip border-warning-soft-border',
}

export const Badge = ({ tone = 'neutral', dot, children, className }: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-chip border',
      'text-[9px] font-bold uppercase tracking-wider whitespace-nowrap',
      TONES[tone],
      className,
    )}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-pill bg-current" />}
    {children}
  </span>
)
