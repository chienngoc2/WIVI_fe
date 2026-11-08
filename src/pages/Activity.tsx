import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowClockwise,
  CreditCard,
  Receipt,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { DateRangeFilter } from '../components/ui/DateRangeFilter'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchInput } from '../components/ui/SearchInput'
import { SectionCard } from '../components/ui/SectionCard'
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart'
import { useReportRange } from '../hooks/useReportRange'
import { ApiError, isAbortError } from '../lib/api/client'
import { formatDateTime, formatNumber, formatVnd } from '../lib/format'
import { listPlans } from '../services/adminPlans'
import { getRevenueReport, listPaymentOrders } from '../services/adminRevenue'
import { chartTheme } from '../theme/chart'
import type {
  AdminPaymentOrder,
  AdminPaymentOrdersResponse,
  AdminPaymentOrderStatus,
  AdminRevenueReport,
  AdminSubscriptionPlan,
} from '../types/admin'

interface Snapshot<T> {
  key: string
  data: T | null
  error: string | null
}

const positiveInteger = (value: string | null, fallback: number) => {
  const num = Number(value)
  return Number.isSafeInteger(num) && num > 0 ? num : fallback
}

const loadError = (error: unknown, fallback: string): string =>
  error instanceof ApiError && error.status === 403
    ? 'Bạn không có quyền xem dữ liệu này.'
    : fallback

const statusBadge = (status: AdminPaymentOrderStatus) => {
  switch (status) {
    case 'Paid':
      return <Badge tone="success">Đã thanh toán</Badge>
    case 'Pending':
      return <Badge tone="warning">Chờ thanh toán</Badge>
    case 'Failed':
      return <Badge tone="danger">Thất bại</Badge>
    case 'Cancelled':
      return <Badge tone="neutral">Đã hủy</Badge>
    default:
      return <Badge tone="neutral">{status}</Badge>
  }
}

export const Activity: React.FC = () => {
  const [params, setParams] = useSearchParams()
  const { fromDate, toDate, error: rangeError, setRange } = useReportRange({
    mode: 'required',
  })

  const [version, setVersion] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')

  const page = positiveInteger(params.get('page'), 1)
  const pageSize = Math.min(100, positiveInteger(params.get('pageSize'), 20))
  const statusParam = (params.get('status') as AdminPaymentOrderStatus) || null
  const planIdParam = params.get('planId') || null

  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([])

  const [revenueSnapshot, setRevenueSnapshot] =
    useState<Snapshot<AdminRevenueReport> | null>(null)
  const [ordersSnapshot, setOrdersSnapshot] =
    useState<Snapshot<AdminPaymentOrdersResponse> | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(keyword.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [keyword])

  // Load plans for filter dropdown
  useEffect(() => {
    const controller = new AbortController()
    listPlans(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setPlans(Array.isArray(data) ? data : [])
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const revenueKey = JSON.stringify([fromDate, toDate, version])
  const ordersKey = JSON.stringify([
    page,
    pageSize,
    statusParam,
    planIdParam,
    search,
    fromDate,
    toDate,
    version,
  ])

  const currentRevenue =
    revenueSnapshot?.key === revenueKey ? revenueSnapshot : null
  const currentOrders =
    ordersSnapshot?.key === ordersKey ? ordersSnapshot : null

  const revenueLoading = currentRevenue === null && !rangeError
  const ordersLoading = currentOrders === null && !rangeError

  // Fetch Revenue Report
  useEffect(() => {
    if (rangeError) return

    const controller = new AbortController()
    getRevenueReport({ fromDate, toDate, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setRevenueSnapshot({ key: revenueKey, data: res, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setRevenueSnapshot({
            key: revenueKey,
            data: null,
            error: loadError(err, 'Không tải được báo cáo doanh thu'),
          })
        }
      })

    return () => controller.abort()
  }, [fromDate, toDate, rangeError, revenueKey])

  // Fetch Orders List
  useEffect(() => {
    if (rangeError) return

    const controller = new AbortController()
    listPaymentOrders({
      page,
      pageSize,
      status: statusParam,
      planId: planIdParam,
      keyword: search || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) {
          setOrdersSnapshot({ key: ordersKey, data: res, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setOrdersSnapshot({
            key: ordersKey,
            data: null,
            error: loadError(err, 'Không tải được danh sách đơn hàng'),
          })
        }
      })

    return () => controller.abort()
  }, [
    page,
    pageSize,
    statusParam,
    planIdParam,
    search,
    fromDate,
    toDate,
    rangeError,
    ordersKey,
  ])

  const refreshAll = () => setVersion((v) => v + 1)

  const updateParam = (key: string, value: string | null) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.set('page', '1')
      return next
    })
  }

  const setPage = (nextPage: number) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(nextPage))
      return next
    })
  }

  const revenueReport = currentRevenue?.data ?? null
  const ordersResponse = currentOrders?.data ?? null
  const orders = ordersResponse?.items ?? []
  const totalOrders = ordersResponse?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize))

  const columns: Column<AdminPaymentOrder>[] = useMemo(
    () => [
      {
        key: 'orderCode',
        header: 'Mã đơn',
        render: (row) => (
          <span className="font-mono font-semibold text-ink">
            {row.orderCode}
          </span>
        ),
      },
      {
        key: 'user',
        header: 'Thành viên',
        render: (row) => (
          <div>
            <span className="block font-medium text-ink">
              {row.userName ?? row.userId}
            </span>
            {row.email && (
              <span className="block text-[11px] text-muted">{row.email}</span>
            )}
          </div>
        ),
      },
      {
        key: 'plan',
        header: 'Gói',
        render: (row) => (
          <span>{row.planName ?? row.planId ?? '—'}</span>
        ),
      },
      {
        key: 'amount',
        header: 'Số tiền',
        render: (row) => (
          <span className="font-mono font-bold text-ink">
            {formatVnd(row.amount)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (row) => statusBadge(row.status),
      },
      {
        key: 'source',
        header: 'Xác nhận',
        render: (row) =>
          row.confirmationSource === 'SePay' ? (
            <span className="font-semibold text-primary">SePay</span>
          ) : row.confirmationSource === 'Manual' ? (
            <span className="text-muted">Thủ công</span>
          ) : (
            <span className="text-muted-light">—</span>
          ),
      },
      {
        key: 'createdAt',
        header: 'Tạo lúc',
        render: (row) => (
          <span className="text-muted">{formatDateTime(row.createdAt)}</span>
        ),
      },
      {
        key: 'paidAt',
        header: 'Thanh toán lúc',
        render: (row) => (
          <span className="text-muted">{formatDateTime(row.paidAt)}</span>
        ),
      },
    ],
    [],
  )

  const fieldClass =
    'h-8 px-2.5 text-xs bg-surface border border-hairline rounded-control text-ink focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div
      data-testid="activity-page"
      className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 pb-4 text-xs lg:gap-6"
    >
      {/* 1. Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            Sổ cái mua gói
          </h1>
          <p className="mt-1 text-xs text-muted">
            Lịch sử thanh toán gói cước qua SePay và doanh thu đã xác nhận.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            error={rangeError}
            onChange={setRange}
          />
          <Button
            variant="secondary"
            icon={<ArrowClockwise size={14} />}
            disabled={revenueLoading || ordersLoading}
            onClick={refreshAll}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* 2. 4 KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Doanh thu đã xác nhận
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatVnd(revenueReport?.totalRevenue)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              Doanh thu SePay đã đối soát
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Đơn đã thanh toán
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {revenueReport?.paidOrders !== null &&
              revenueReport?.paidOrders !== undefined
                ? formatNumber(revenueReport.paidOrders)
                : '—'}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              {revenueReport && (revenueReport.manualPaidOrders ?? 0) > 0
                ? `+ ${formatNumber(revenueReport.manualPaidOrders)} đơn xác nhận thủ công`
                : 'Xác nhận tự động qua SePay'}
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Đơn chờ thanh toán
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(revenueReport?.pendingOrders)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              Đang chờ giao dịch SePay
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Đang dùng gói trả phí
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(revenueReport?.activePaidSubscriptions)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              Tại thời điểm hiện tại
            </span>
          </div>
        </SectionCard>
      </div>

      {/* 3. Row 2: Revenue Trend Area Chart + Revenue By Plan */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
        <SectionCard
          title="Tốc độ tăng trưởng doanh thu"
          subtitle="Doanh thu và số lượng đơn thanh toán theo thời gian"
          className="min-w-0"
        >
          {revenueLoading ? (
            <div
              role="status"
              className="flex h-64 items-center justify-center text-muted animate-pulse"
            >
              Đang tải tăng trưởng doanh thu…
            </div>
          ) : currentRevenue?.error ? (
            <div role="alert">
              <EmptyState
                icon={<WarningCircle size={20} />}
                title={currentRevenue.error}
                action={
                  <Button variant="secondary" onClick={refreshAll}>
                    Thử lại
                  </Button>
                }
              />
            </div>
          ) : (revenueReport?.points?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<CreditCard size={20} />}
              title="Chưa có dữ liệu doanh thu"
              description="Chưa có giao dịch thanh toán nào được xác nhận trong khoảng thời gian này."
            />
          ) : (
            <TimeSeriesChart
              data={revenueReport!.points}
              xKey="period"
              granularity={revenueReport!.granularity}
              variant="area"
              series={[
                {
                  key: 'revenue',
                  label: 'Doanh thu (đ)',
                  axis: 'left',
                  format: (v) => formatVnd(v),
                },
                {
                  key: 'paidOrders',
                  label: 'Số đơn',
                  axis: 'right',
                  color: chartTheme.series[1],
                  format: (v) => `${formatNumber(v)} đơn`,
                },
              ]}
              height={280}
              ariaLabel="Biểu đồ tốc độ tăng trưởng doanh thu"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Doanh thu theo gói"
          subtitle="Tỷ trọng doanh thu theo từng gói đăng ký"
          className="min-w-0"
        >
          {revenueLoading ? (
            <div
              role="status"
              className="flex h-64 items-center justify-center text-muted animate-pulse"
            >
              Đang tải cơ cấu gói…
            </div>
          ) : (revenueReport?.byPlan?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Receipt size={20} />}
              title="Chưa có doanh thu theo gói"
              description="Không có đơn mua gói nào hoàn tất trong khoảng này."
            />
          ) : (
            <div className="flex flex-col gap-3 py-1">
              {revenueReport!.byPlan.map((plan, index) => {
                const total = revenueReport!.totalRevenue || 1
                const percent = Math.min(
                  100,
                  Math.round((plan.revenue / total) * 100),
                )
                const color =
                  chartTheme.series[index % chartTheme.series.length]

                return (
                  <div key={plan.planId} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink truncate max-w-[150px]">
                        {plan.planName || plan.planId}
                      </span>
                      <span className="font-mono text-ink-soft">
                        {formatVnd(plan.revenue)}{' '}
                        <span className="text-[11px] text-muted">
                          ({formatNumber(plan.paidOrders)} đơn)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-pill bg-surface-alt overflow-hidden">
                      <div
                        className="h-full rounded-pill transition-all duration-300"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* 4. Row 3: Payment Orders Table */}
      <SectionCard
        title="Lịch sử mua gói"
        subtitle="Lọc theo ngày tạo đơn và trạng thái giao dịch"
        className="min-w-0"
        padded={false}
      >
        {/* Table Filters */}
        <div className="p-4 border-b border-border-premium flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-64">
            <SearchInput
              value={keyword}
              onChange={setKeyword}
              placeholder="Mã đơn hoặc mã giao dịch SePay…"
            />
          </div>

          <select
            aria-label="Lọc theo trạng thái"
            className={fieldClass}
            value={statusParam ?? ''}
            onChange={(e) => updateParam('status', e.target.value || null)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Paid">Đã thanh toán</option>
            <option value="Pending">Chờ thanh toán</option>
            <option value="Failed">Thất bại</option>
            <option value="Cancelled">Đã hủy</option>
          </select>

          <select
            aria-label="Lọc theo gói"
            className={fieldClass}
            value={planIdParam ?? ''}
            onChange={(e) => updateParam('planId', e.target.value || null)}
          >
            <option value="">Tất cả gói</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {(statusParam || planIdParam || keyword) && (
            <Button
              variant="ghost"
              onClick={() => {
                setKeyword('')
                setSearch('')
                setParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('status')
                  next.delete('planId')
                  next.set('page', '1')
                  return next
                })
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Orders Table Body */}
        {ordersLoading ? (
          <div role="status" className="p-12 text-center text-muted">
            Đang tải danh sách đơn hàng…
          </div>
        ) : currentOrders?.error ? (
          <div role="alert" className="p-8">
            <EmptyState
              icon={<WarningCircle size={20} />}
              title={currentOrders.error}
              action={
                <Button variant="secondary" onClick={refreshAll}>
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={orders}
              rowKey={(row) => row.id}
              empty={
                <EmptyState
                  colSpan={columns.length}
                  title="Không tìm thấy đơn mua gói nào"
                  description="Hãy thử chọn khoảng thời gian hoặc bộ lọc khác."
                />
              }
            />

            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-premium text-xs text-muted">
              <span data-testid="orders-page-info">
                Trang {page}/{totalPages} · {formatNumber(totalOrders)} đơn hàng
              </span>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Số đơn mỗi trang"
                  className={fieldClass}
                  value={pageSize}
                  onChange={(e) => updateParam('pageSize', e.target.value)}
                >
                  {[20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}/trang
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Trang trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  )
}
