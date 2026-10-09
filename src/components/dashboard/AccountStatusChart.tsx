import { ChartBar, WarningCircle } from '@phosphor-icons/react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { formatNumber, validCount } from '../../lib/format'
import { chartTheme } from '../../theme/chart'
import type { AdminDashboardSummary, AdminUserStatus } from '../../types/admin'

export const AccountStatusChart = ({ summary, status, loading, error, onRetry }: {
  summary: AdminDashboardSummary | null
  status: AdminUserStatus | 'all'
  loading: boolean
  error: string | null
  onRetry: () => void
}) => {
  const data = [
    { status: 'Active', label: 'Hoạt động', count: validCount(summary?.totalUsers) },
    { status: 'Banned', label: 'Bị cấm', count: validCount(summary?.bannedUsers) },
  ].filter((row) => status === 'all' || row.status === status)

  if (loading) return <div role="status" className="flex h-60 items-center justify-center text-sm text-muted animate-pulse">Đang tải thống kê tài khoản…</div>
  if (error) return (
    <div role="alert">
      <EmptyState icon={<WarningCircle size={20} />} title={error} description="Vui lòng thử lại để cập nhật số liệu."
        action={<Button variant="secondary" onClick={onRetry}>Thử lại thống kê</Button>} />
    </div>
  )
  if (data.some((row) => row.count === null)) return (
    <EmptyState icon={<ChartBar size={20} />} title="Thống kê tài khoản chưa khả dụng" description="Số liệu sẽ hiển thị khi có thông tin thống kê đầy đủ." />
  )
  if (data.every((row) => row.count === 0)) return (
    <EmptyState icon={<ChartBar size={20} />} title="Chưa có tài khoản trong nhóm này" description="Chọn trạng thái khác để xem thống kê tài khoản." />
  )

  return (
    <>
      <div className="h-72 w-full min-w-0 sm:h-80" role="figure" aria-label="Biểu đồ số tài khoản theo trạng thái">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 16, right: 12, left: 8, bottom: 20 }} barSize={64}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.axisTick, fontSize: 12 }} tickLine={false} axisLine={false}
              label={{ value: 'Trạng thái tài khoản', position: 'insideBottom', offset: -12, fill: chartTheme.axisTick, fontSize: 11 }} />
            <YAxis allowDecimals={false} width={58} tick={{ fill: chartTheme.axisTick, fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={formatNumber} label={{ value: 'Số tài khoản', angle: -90, position: 'insideLeft', fill: chartTheme.axisTick, fontSize: 11 }} />
            <Tooltip contentStyle={chartTheme.tooltip} cursor={{ fill: chartTheme.grid }} formatter={(value) => [formatNumber(typeof value === 'number' ? value : null), 'Số tài khoản']} />
            <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" name="Số tài khoản" fill={chartTheme.series[0]} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Số liệu biểu đồ trạng thái tài khoản</caption>
        <thead><tr><th>Trạng thái</th><th>Số tài khoản</th></tr></thead>
        <tbody>{data.map((row) => <tr key={row.status}><td>{row.label}</td><td>{formatNumber(row.count)}</td></tr>)}</tbody>
      </table>
    </>
  )
}
