import type { ReactNode } from 'react'
import { X } from '@phosphor-icons/react'

export const Modal = ({ open, onClose, title, description, children, footer, width = 'max-w-md' }: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className={`w-full ${width} bg-surface rounded-card border border-hairline shadow-premium-lg overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border-premium">
          <div>
            <h3 className="text-sm font-bold text-ink">{title}</h3>
            {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-control text-muted-light hover:bg-surface-alt hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && <div className="px-5 py-3 border-t border-border-premium bg-surface-alt/40 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
