import { useMemo } from 'react'
import clsx from 'clsx'
import {
  addDays,
  presetRange,
  vietnamToday,
} from '../../lib/dateRange'

export interface DateRangeFilterProps {
  fromDate: string
  toDate: string
  error?: { field: 'fromDate' | 'toDate'; message: string } | null
  onChange: (from: string, to: string) => void
  onReset?: () => void
  showPresets?: boolean
  className?: string
}

const PRESETS = [
  { label: '7 ngày', days: 7 },
  { label: '30 ngày', days: 30 },
  { label: '90 ngày', days: 90 },
  { label: '12 tháng', days: 365 },
]

export const DateRangeFilter = ({
  fromDate,
  toDate,
  error,
  onChange,
  showPresets = true,
  className,
}: DateRangeFilterProps) => {
  const todayVn = useMemo(() => vietnamToday(), [])

  const minFromDate = useMemo(() => {
    return toDate ? addDays(toDate, -365) : undefined
  }, [toDate])

  const activePreset = useMemo(() => {
    for (const p of PRESETS) {
      const target = presetRange(p.days)
      if (target.fromDate === fromDate && target.toDate === toDate) {
        return p.days
      }
    }
    return null
  }, [fromDate, toDate])

  const handlePreset = (days: number) => {
    const range = presetRange(days)
    onChange(range.fromDate, range.toDate)
  }

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {showPresets && (
          <div className="flex flex-wrap items-center gap-1">
            {PRESETS.map((p) => {
              const isActive = activePreset === p.days
              return (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => handlePreset(p.days)}
                  className={clsx(
                    'rounded-chip px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-on-accent shadow-premium-sm'
                      : 'bg-surface-alt text-muted hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Từ ngày"
            value={fromDate}
            max={toDate || todayVn}
            min={minFromDate}
            onChange={(e) => onChange(e.target.value, toDate)}
            className={clsx(
              'h-7 rounded-control border bg-surface px-2 py-0.5 text-xs text-ink transition-colors',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              error?.field === 'fromDate'
                ? 'border-danger'
                : 'border-border-premium',
            )}
          />
          <span className="text-muted text-[11px] font-medium">—</span>
          <input
            type="date"
            aria-label="Đến ngày"
            value={toDate}
            max={todayVn}
            onChange={(e) => onChange(fromDate, e.target.value)}
            className={clsx(
              'h-7 rounded-control border bg-surface px-2 py-0.5 text-xs text-ink transition-colors',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              error?.field === 'toDate'
                ? 'border-danger'
                : 'border-border-premium',
            )}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="text-danger text-[11px] font-medium">
          {error.message}
        </div>
      )}
    </div>
  )
}
