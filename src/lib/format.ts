/**
 * Formatter dùng chung. Page/component không được tự gọi `toLocaleString`/`Intl`.
 * (DESIGN_SYSTEM.md §8.4 — hiện chỉ thêm phần Stage 2 thực sự dùng tới.)
 */

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

/** Missing measurements stay distinct from a measured zero. */
export const formatNumber = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : 'Chưa có dữ liệu'

export const validCount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null

/**
 * Backend trả ISO-8601 UTC; hiển thị theo `Asia/Ho_Chi_Minh`.
 * `null`/`undefined`/chuỗi không parse được ⇒ `—` (không render `null`/`Invalid Date`).
 */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return dateTimeFormatter.format(parsed)
}

/**
 * Format tiền VND: `"1.250.000 đ"`, null/undefined/NaN ⇒ `"Chưa có dữ liệu"`.
 */
export const formatVnd = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Chưa có dữ liệu'
  }
  return `${numberFormatter.format(Math.round(value))} đ`
}

/**
 * Format tỷ lệ: `0.25` ⇒ `"25%"`, null/undefined ⇒ `"0%"`.
 */
export const formatPercent = (ratio: number | null | undefined): string => {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return '0%'
  }
  const pct = Math.round(ratio * 10000) / 100
  return `${numberFormatter.format(pct)}%`
}

/**
 * Format period: 'YYYY-MM-DD' ⇒ 'DD/MM', 'YYYY-MM' ⇒ 'MM/YYYY'.
 */
export const formatPeriod = (period: string, granularity?: 'day' | 'month'): string => {
  if (!period) return ''
  if (granularity === 'month' || period.length === 7) {
    const [y, m] = period.split('-')
    return `${m}/${y}`
  }
  const [, m, d] = period.split('-')
  return `${d}/${m}`
}
