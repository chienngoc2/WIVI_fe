import { useEffect, useId, useRef, useState } from 'react'
import { DotsThree } from '@phosphor-icons/react'
import { Button } from './Button'

export const PanelMenu = ({ label, actions }: {
  label: string
  actions: Array<{ label: string; onSelect: () => void; disabled?: boolean }>
}) => {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  return (
    <div ref={root} className="relative shrink-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
      if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
        items[next]?.focus()
      }
    }}>
      <Button ref={trigger} variant="ghost" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)} onKeyDown={(event) => {
          if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault()
            setOpen(true)
          }
        }}>
        <DotsThree size={20} weight="bold" />
      </Button>
      {open && (
        <div id={menuId} role="menu" aria-label={label} className="absolute right-0 top-full z-20 mt-1 w-48 rounded-control border border-hairline bg-surface p-1 shadow-premium">
          {actions.map((action) => (
            <button key={action.label} type="button" role="menuitem" disabled={action.disabled} tabIndex={-1}
              className="w-full rounded-chip px-3 py-2 text-left text-xs text-ink-soft hover:bg-surface-alt focus:bg-surface-alt focus:outline-none disabled:opacity-50"
              onClick={() => {
                setOpen(false)
                trigger.current?.focus()
                action.onSelect()
              }}>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
