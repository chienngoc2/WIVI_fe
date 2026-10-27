export const DEFAULT_RANGE_DAYS = 30
export const MAX_RANGE_DAYS = 366
export const DAY_GRANULARITY_MAX_DAYS = 92
export const REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh'

export const vietnamToday = (now: Date = new Date()): string => {
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return vnTime.toISOString().slice(0, 10)
}

export const addDays = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export const daysInclusive = (from: string, to: string): number => {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  const ms1 = Date.UTC(y1, m1 - 1, d1)
  const ms2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((ms2 - ms1) / 86400000) + 1
}

export const presetRange = (
  days: number,
  now: Date = new Date(),
): { fromDate: string; toDate: string } => {
  const toDate = vietnamToday(now)
  const fromDate = addDays(toDate, -(days - 1))
  return { fromDate, toDate }
}

const isValidDateOnly = (val: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false
  const [y, m, d] = val.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

export interface RangeValidationResultOk {
  ok: true
}

export interface RangeValidationResultError {
  ok: false
  field: 'fromDate' | 'toDate'
  message: string
}

export type RangeValidationResult =
  | RangeValidationResultOk
  | RangeValidationResultError

export const validateRange = (
  from?: string | null,
  to?: string | null,
  opts: { optional?: boolean } = {},
  now: Date = new Date(),
): RangeValidationResult => {
  const hasFrom = Boolean(from && from.trim())
  const hasTo = Boolean(to && to.trim())

  if (!hasFrom && !hasTo) {
    if (opts.optional) {
      return { ok: true }
    }
  }

  if (hasFrom && !hasTo) {
    return {
      ok: false,
      field: 'toDate',
      message: 'Vui lòng chọn đủ Từ ngày và Đến ngày.',
    }
  }

  if (!hasFrom && hasTo) {
    return {
      ok: false,
      field: 'fromDate',
      message: 'Vui lòng chọn đủ Từ ngày và Đến ngày.',
    }
  }

  const fromDate = from!.trim()
  const toDate = to!.trim()

  if (!isValidDateOnly(fromDate)) {
    return {
      ok: false,
      field: 'fromDate',
      message: 'Ngày không hợp lệ.',
    }
  }

  if (!isValidDateOnly(toDate)) {
    return {
      ok: false,
      field: 'toDate',
      message: 'Ngày không hợp lệ.',
    }
  }

  if (fromDate > toDate) {
    return {
      ok: false,
      field: 'fromDate',
      message: 'Từ ngày phải trước hoặc bằng Đến ngày.',
    }
  }

  const today = vietnamToday(now)
  if (toDate > today) {
    return {
      ok: false,
      field: 'toDate',
      message: 'Đến ngày không được sau hôm nay.',
    }
  }

  const days = daysInclusive(fromDate, toDate)
  if (days > MAX_RANGE_DAYS) {
    return {
      ok: false,
      field: 'fromDate',
      message: 'Khoảng thời gian tối đa 366 ngày.',
    }
  }

  return { ok: true }
}
