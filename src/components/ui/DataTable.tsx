import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  width?: string
  render: (row: T) => ReactNode
}

export function DataTable<T>({ columns, rows, rowKey, empty, className }: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, i: number) => string
  empty?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex-1 overflow-auto scrollbar-premium ${className ?? ''}`}>
      <table className="w-full min-w-[900px] text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border-premium bg-surface-alt/80 backdrop-blur text-[10px] uppercase font-bold text-muted-light tracking-wider">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }}
                  className={`py-2.5 px-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline text-xs text-body">
          {rows.length === 0
            ? (empty ?? <EmptyState title="Không có dữ liệu." colSpan={columns.length} />)
            : rows.map((row, i) => (
                <tr key={rowKey(row, i)} className="hover:bg-surface-alt/50 transition-colors group">
                  {columns.map((c) => (
                    <td key={c.key} className={`py-3 px-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
