import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_RANGE_DAYS,
  presetRange,
  type RangeValidationResult,
  validateRange,
} from '../lib/dateRange'

export interface UseReportRangeOptions {
  mode?: 'required' | 'optional'
  defaultDays?: number
}

export interface UseReportRangeResult {
  fromDate: string
  toDate: string
  error: { field: 'fromDate' | 'toDate'; message: string } | null
  setRange: (from: string, to: string) => void
  reset: () => void
}

export function useReportRange(
  options: UseReportRangeOptions = {},
): UseReportRangeResult {
  const mode = options.mode ?? 'required'
  const defaultDays = options.defaultDays ?? DEFAULT_RANGE_DAYS

  const [searchParams, setSearchParams] = useSearchParams()

  const defaultValues = useMemo(() => {
    if (mode === 'required') {
      return presetRange(defaultDays)
    }
    return { fromDate: '', toDate: '' }
  }, [mode, defaultDays])

  const paramFrom = searchParams.get('fromDate')
  const paramTo = searchParams.get('toDate')

  const fromDate = paramFrom !== null ? paramFrom : defaultValues.fromDate
  const toDate = paramTo !== null ? paramTo : defaultValues.toDate

  const error = useMemo(() => {
    const res: RangeValidationResult = validateRange(fromDate, toDate, {
      optional: mode === 'optional',
    })
    return res.ok ? null : { field: res.field, message: res.message }
  }, [fromDate, toDate, mode])

  const setRange = useCallback(
    (newFrom: string, newTo: string) => {
      const next = new URLSearchParams(searchParams)
      if (newFrom) {
        next.set('fromDate', newFrom)
      } else {
        next.delete('fromDate')
      }
      if (newTo) {
        next.set('toDate', newTo)
      } else {
        next.delete('toDate')
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const reset = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('fromDate')
    next.delete('toDate')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  return {
    fromDate,
    toDate,
    error,
    setRange,
    reset,
  }
}
