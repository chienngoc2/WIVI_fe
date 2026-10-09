import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowClockwise, ArrowsLeftRight, Funnel, Users, WarningCircle } from '@phosphor-icons/react'
import { AccountStatusChart } from '../components/dashboard/AccountStatusChart'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { PanelMenu } from '../components/ui/PanelMenu'
import { SearchInput } from '../components/ui/SearchInput'
import { SectionCard } from '../components/ui/SectionCard'
import { ApiError, isAbortError } from '../lib/api/client'
import { formatDateTime, formatNumber, validCount } from '../lib/format'
import { getAdminDashboard } from '../services/adminDashboard'
import { listUsers } from '../services/adminUsers'
import type { AdminDashboardResponse, AdminUsersListResponse, AdminUserStatus } from '../types/admin'

interface Snapshot<T> { key: string; data: T | null; error: string | null }

const loadError = (error: unknown, fallback: string): string =>
  error instanceof ApiError && error.status === 403 ? 'Bạn không có quyền xem dữ liệu này.' : fallback

export const Overview = () => {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AdminUserStatus | 'all'>('all')
  const [summaryRevision, setSummaryRevision] = useState(0)
  const [usersRevision, setUsersRevision] = useState(0)
  const [dashboard, setDashboard] = useState<Snapshot<AdminDashboardResponse> | null>(null)
  const [users, setUsers] = useState<Snapshot<AdminUsersListResponse> | null>(null)
  const summaryKey = String(summaryRevision)
  const usersKey = JSON.stringify([search, status, usersRevision])
  const currentDashboard = dashboard?.key === summaryKey ? dashboard : null
  const currentUsers = users?.key === usersKey ? users : null
  const summaryLoading = currentDashboard === null
  const usersLoading = currentUsers === null

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(keyword.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    const controller = new AbortController()
    getAdminDashboard(controller.signal).then((data) => {
      if (!controller.signal.aborted) setDashboard({ key: summaryKey, data, error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && !isAbortError(error)) setDashboard({ key: summaryKey, data: null, error: loadError(error, 'Không tải được thống kê tài khoản') })
    })
    return () => controller.abort()
  }, [summaryKey])

  useEffect(() => {
    const controller = new AbortController()
    listUsers({ pageIndex: 1, pageSize: 8, status: status === 'all' ? null : status, keyword: search || null, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setUsers({ key: usersKey, data, error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && !isAbortError(error)) setUsers({ key: usersKey, data: null, error: loadError(error, 'Không tải được danh sách thành viên') })
    })
    return () => controller.abort()
  }, [search, status, usersKey])

  const refreshSummary = () => setSummaryRevision((value) => value + 1)
  const refreshUsers = () => setUsersRevision((value) => value + 1)
  const resetFilters = () => { setKeyword(''); setSearch(''); setStatus('all') }
  const openMembers = () => {
    const params = new URLSearchParams()
    if (search) params.set('keyword', search)
    if (status !== 'all') params.set('status', status)
    navigate(`/members${params.size ? `?${params}` : ''}`)
  }
  const summary = currentDashboard?.data?.summary ?? null
  const transactions = currentDashboard?.data?.recentTransactions ?? []
  const filtered = Boolean(search) || status !== 'all'
  const summaryRows = [
    { label: 'Tài khoản hoạt động', value: validCount(summary?.totalUsers) },
    { label: 'Đăng nhập trong 30 ngày', value: validCount(summary?.activeUsersLast30Days) },
    { label: 'Tài khoản bị cấm', value: validCount(summary?.bannedUsers) },
  ]

  return (
    <div data-testid="overview-workspace" className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 pb-4 text-xs lg:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">Tổng quan hệ thống WIVI</h1>
          <p className="mt-1 text-xs text-muted">Theo dõi tài khoản và hoạt động thành viên.</p>
        </div>
        <Button variant="secondary" icon={<ArrowClockwise size={14} />} disabled={summaryLoading || usersLoading}
          onClick={() => { refreshSummary(); refreshUsers() }}>Làm mới</Button>
      </div>

      <div role="search" aria-label="Tìm kiếm và lọc thành viên" className="flex flex-wrap items-end gap-3">
        <label className="w-full min-w-0 sm:w-2/5">
          <span className="mb-1.5 block font-semibold text-ink-soft">Tìm thành viên</span>
          <SearchInput value={keyword} onChange={setKeyword} placeholder="Tên, tài khoản hoặc email…" />
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="overview-status" className="flex items-center gap-1.5 font-semibold text-ink-soft"><Funnel size={13} />Trạng thái tài khoản</label>
          <select id="overview-status" value={status} onChange={(event) => setStatus(event.target.value as AdminUserStatus | 'all')}
            className="h-8 w-full rounded-control border border-hairline bg-surface px-3 text-xs text-ink outline-none focus:ring-2 focus:ring-primary-ring sm:w-48">
            <option value="all">Tất cả trạng thái</option><option value="Active">Hoạt động</option><option value="Banned">Bị cấm</option>
          </select>
        </div>
        {(keyword || status !== 'all') && <Button variant="ghost" onClick={resetFilters}>Xóa bộ lọc</Button>}
      </div>

      <SectionCard title="Phân bố trạng thái tài khoản" subtitle="Số lượng tại thời điểm cập nhật gần nhất" className="w-full min-w-0 [&_header_h3]:whitespace-normal" bodyClassName="min-w-0">
        <AccountStatusChart summary={summary} status={status} loading={summaryLoading} error={currentDashboard?.error ?? null} onRetry={refreshSummary} />
        <p className="mt-3 border-t border-hairline pt-3 text-[11px] leading-relaxed text-muted">Biểu đồ thể hiện trạng thái tài khoản hiện tại. Thống kê xu hướng theo thời gian chưa khả dụng.</p>
      </SectionCard>

      <div data-testid="overview-bottom-panels" className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:gap-6">
        <SectionCard title={filtered ? 'Kết quả tìm kiếm thành viên' : 'Thành viên mới đăng ký'}
          subtitle={currentUsers?.data ? `${formatNumber(currentUsers.data.pagination.totalCount)} thành viên${filtered ? ' phù hợp' : ' · tối đa 8 tài khoản mới nhất'}` : undefined}
          className="min-w-0 [&_header_h3]:whitespace-normal" bodyClassName="min-w-0"
          right={<PanelMenu label="Tùy chọn danh sách thành viên" actions={[
            { label: 'Xem tất cả thành viên', onSelect: openMembers },
            { label: 'Làm mới danh sách', onSelect: refreshUsers, disabled: usersLoading },
          ]} />}>
          {usersLoading ? <div role="status" className="py-12 text-center text-muted">Đang tải thành viên…</div>
            : currentUsers?.error ? <div role="alert"><EmptyState icon={<WarningCircle size={18} />} title={currentUsers.error} action={<Button variant="secondary" onClick={refreshUsers}>Thử lại danh sách</Button>} /></div>
            : <DataTable className="[&_table]:min-w-[560px]" rows={currentUsers?.data?.data ?? []} rowKey={(user) => user.id}
              columns={[
                { key: 'name', header: 'Thành viên', render: (user) => <div className="max-w-64 break-words"><p className="font-semibold text-ink">{`${user.firstName} ${user.lastName}`.trim() || user.userName}</p><p className="mt-1 text-[11px] text-muted">{user.email}</p></div> },
                { key: 'status', header: 'Trạng thái', render: (user) => <Badge tone={user.status === 'Active' ? 'success' : 'danger'}>{user.status === 'Active' ? 'Hoạt động' : 'Bị cấm'}</Badge> },
                { key: 'createdAt', header: 'Ngày đăng ký', render: (user) => <span className="whitespace-nowrap text-[11px] text-muted">{formatDateTime(user.createdAt)}</span> },
              ]}
              empty={<EmptyState colSpan={3} icon={<Users size={18} />} title={filtered ? 'Không tìm thấy thành viên phù hợp' : 'Chưa có thành viên nào'}
                description={filtered ? 'Thử từ khóa khác hoặc xóa bộ lọc.' : 'Thành viên mới sẽ xuất hiện tại đây.'}
                action={filtered ? <Button variant="secondary" onClick={resetFilters}>Xóa bộ lọc</Button> : undefined} />} />}
        </SectionCard>

        <SectionCard title="Tóm tắt tài khoản" subtitle="Toàn hệ thống" className="min-w-0 [&_header_h3]:whitespace-normal" right={<PanelMenu label="Tùy chọn tóm tắt tài khoản" actions={[
          { label: 'Làm mới thống kê', onSelect: refreshSummary, disabled: summaryLoading },
          { label: 'Quản lý thành viên', onSelect: () => navigate('/members') },
        ]} />}>
          {summaryLoading ? <div role="status" className="py-6 text-muted">Đang tải tóm tắt…</div>
            : currentDashboard?.error ? <p className="text-xs text-muted">Tóm tắt tạm thời chưa khả dụng.</p>
            : <dl className="divide-y divide-hairline">{summaryRows.map((row) => <div key={row.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 first:pt-0">
              <dt className="text-xs text-muted">{row.label}</dt><dd className={`${row.value === null ? 'text-xs text-muted' : 'font-mono text-lg font-bold text-ink'} break-words`}>{formatNumber(row.value)}</dd>
            </div>)}</dl>}
          <div className="mt-4 border-t border-hairline pt-4">
            <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-ink-soft"><ArrowsLeftRight size={14} />Giao dịch gần đây</h2>
            {summaryLoading ? <p className="text-[11px] text-muted">Đang tải…</p>
              : currentDashboard?.error || transactions.length === 0 ? <p className="text-[11px] leading-relaxed text-muted">Thông tin giao dịch gần đây chưa khả dụng.</p>
              : <ul className="space-y-3">{transactions.slice(0, 3).map((transaction) => <li key={transaction.id} className="min-w-0 break-words text-[11px]">
                <p className="font-semibold text-ink-soft">{`${transaction.user.firstName} ${transaction.user.lastName}`.trim() || transaction.user.username}</p>
                <p className="mt-1 text-muted">{transaction.type === 'Income' ? 'Thu' : transaction.type === 'Expense' ? 'Chi' : 'Giao dịch'} · {transaction.category.name} · {formatNumber(transaction.transactionsAmount)} đ</p>
                <p className="mt-1 text-muted">{formatDateTime(transaction.transactionDate)}</p>
              </li>)}</ul>}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
