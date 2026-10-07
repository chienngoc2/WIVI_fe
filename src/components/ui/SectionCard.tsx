import type { ReactNode } from 'react'
import clsx from 'clsx'

export const SectionCard = ({ title, subtitle, right, children, className, bodyClassName, padded = true }: {
  title?: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  padded?: boolean
}) => (
  <section className={clsx(
    'bg-surface rounded-panel border border-border-premium shadow-premium-sm',
    'flex flex-col min-h-0 overflow-hidden', className)}>
    {title && (
      <header className="px-4 py-3 border-b border-border-premium bg-surface-alt/40 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-pill bg-primary animate-pulse shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider truncate">{title}</h3>
            {subtitle && <p className="text-[10px] text-muted-light truncate">{subtitle}</p>}
          </div>
        </div>
        {right}
      </header>
    )}
    <div className={clsx('min-h-0', padded && 'p-4', bodyClassName)}>{children}</div>
  </section>
)
