import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaretDown, SignOut, UserCircle } from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'

export const AccountMenu = () => {
  const { session, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const loggingOut = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const displayName = session?.identity.fullName || session?.identity.email || 'Quản trị viên'
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('')

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  const handleLogout = async () => {
    if (loggingOut.current) return
    loggingOut.current = true
    trigger.current?.focus()
    setPending(true)
    try { await logout() } finally { loggingOut.current = false; setPending(false) }
  }
  const itemClass = 'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-xs font-semibold text-ink-soft hover:bg-surface-alt focus:bg-surface-alt focus:outline-none disabled:opacity-50'

  return <div ref={root} className="relative min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
    if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const items = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
      const index = items.indexOf(document.activeElement as HTMLElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next]?.focus()
    }
  }}>
    <button ref={trigger} type="button" data-testid="topnav-account-menu" aria-label="Menu tài khoản" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      className="flex min-w-0 items-center gap-2.5 rounded-control p-1 outline-none hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-primary-ring"
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true) }
      }}>
      <span className="min-w-0 text-right">
        <span data-testid="topnav-identity-name" className="block max-w-40 truncate text-xs font-semibold text-ink leading-tight">{displayName}</span>
        <span className="block text-[10px] text-muted-light font-mono">Quản trị viên</span>
      </span>
      <span data-testid="topnav-identity-initials" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-primary/20 bg-primary/10 text-xs font-bold text-primary">{initials || 'AD'}</span>
      <CaretDown size={12} className="shrink-0 text-muted" />
    </button>
    {open && <div id={menuId} role="menu" aria-label="Menu tài khoản" className="absolute right-0 top-full z-20 mt-1 w-56 rounded-control border border-hairline bg-surface p-1 shadow-premium">
      <Link role="menuitem" tabIndex={-1} data-testid="topnav-profile-link" to="/profile" className={itemClass} onClick={() => { setOpen(false); trigger.current?.focus() }}><UserCircle size={18} />Hồ sơ của tôi</Link>
      <button type="button" role="menuitem" tabIndex={-1} data-testid="topnav-logout" className={itemClass} disabled={pending} onClick={() => void handleLogout()}><SignOut size={18} />{pending ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
    </div>}
  </div>
}
