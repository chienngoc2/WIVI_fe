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
