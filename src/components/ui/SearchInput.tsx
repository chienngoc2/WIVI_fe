import { MagnifyingGlass } from '@phosphor-icons/react'
import clsx from 'clsx'

export const SearchInput = ({ value, onChange, placeholder = 'Tìm kiếm…', className }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) => (
  <div className={clsx('relative group', className)}>
    <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light group-focus-within:text-primary transition-colors" />
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface border border-hairline rounded-control py-1.5 pl-9 pr-3 text-xs text-ink placeholder-muted-light outline-none transition-all focus:border-primary/30 focus:ring-2 focus:ring-primary-ring"
    />
  </div>
)
