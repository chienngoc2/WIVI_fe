import { Link } from 'react-router-dom'
import { SectionCard } from '../ui/SectionCard'
import { formatNumber, validCount } from '../../lib/format'
import type { AdminDashboardSummary } from '../../types/admin'

const money = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

/** Detail lines are dropped, not zero-filled, when their own number is missing. */
const detail = (value: number | null, text: (formatted: string) => string): string | null =>
  value === null ? null : text(formatNumber(value))

export const SummaryTiles = ({ summary, loading }: { summary: AdminDashboardSummary | null; loading: boolean }) => {
  const revenue = money(summary?.totalRevenue)
  const voters = validCount(summary?.totalFeedbackVoters)
  const average = typeof summary?.averageRating === 'number' && Number.isFinite(summary.averageRating)
    && summary.averageRating >= 1 && summary.averageRating <= 5 ? summary.averageRating : null
  const tiles: Array<{ label: string; value: string; note: string | null; to?: string }> = [
    {
      label: 'Tổng người dùng',
      value: formatNumber(validCount(summary?.totalAccounts)),
      note: detail(validCount(summary?.newUsersThisMonth), (count) => `${count} đăng ký trong tháng này`),
    },
    {
      label: 'Tổng giao dịch',
      value: formatNumber(validCount(summary?.totalTransactions)),
      note: detail(validCount(summary?.transactionsThisMonth), (count) => `${count} ghi nhận trong tháng này`),
    },
    {
      label: 'Tổng doanh thu',
      value: revenue === null ? formatNumber(null) : `${formatNumber(revenue)} đ`,
      note: detail(validCount(summary?.paidOrders), (count) => `${count} đơn SePay đã xác nhận`),
    },
    {
      label: 'Người đã đánh giá',
      value: formatNumber(voters),
      note: [
        detail(validCount(summary?.totalFeedbackSubmissions), (count) => `${count} lượt gửi`),
        average === null ? null : `trung bình ${formatNumber(average)}/5`,
      ].filter(Boolean).join(' · ') || null,
      to: '/feedbacks',
    },
  ]

  return (
    <div data-testid="overview-summary-tiles" aria-label="Chỉ số tổng quan" aria-busy={loading} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {tiles.map((tile) => (
        <SectionCard key={tile.label} className="min-w-0">
          <dl>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{tile.label}</dt>
            <dd className={`mt-2 break-words ${loading || tile.value === formatNumber(null) ? 'text-xs text-muted' : 'font-mono text-xl font-bold tabular-nums text-ink'}`}>
              {loading ? 'Đang tải…' : tile.value}
            </dd>
            {!loading && tile.note && <dd className="mt-1 break-words text-[11px] text-muted">{tile.note}</dd>}
            {tile.to && <dd className="mt-2 text-[11px]"><Link to={tile.to} className="font-semibold text-primary hover:underline">Xem đánh giá</Link></dd>}
          </dl>
        </SectionCard>
      ))}
    </div>
  )
}
