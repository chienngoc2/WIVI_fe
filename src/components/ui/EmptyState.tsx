import type { ReactNode } from 'react'

export const EmptyState = ({ title, description, icon, action, colSpan }: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  colSpan?: number
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
      {icon && <div className="w-10 h-10 rounded-pill bg-surface-alt border border-border-premium flex items-center justify-center text-muted-light">{icon}</div>}
      <p className="text-xs font-semibold text-ink-soft">{title}</p>
      {description && <p className="text-[11px] text-muted-light max-w-xs">{description}</p>}
      {action}
    </div>
  )
  return colSpan ? <tr><td colSpan={colSpan}>{content}</td></tr> : content
}
