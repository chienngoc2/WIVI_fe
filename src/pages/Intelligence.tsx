import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowClockwise,
  Bank,
  Brain,
  ChatCircleDots,
  CheckCircle,
  Gear,
  Info,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DateRangeFilter } from '../components/ui/DateRangeFilter'
import { EmptyState } from '../components/ui/EmptyState'
import { SectionCard } from '../components/ui/SectionCard'
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart'
import { useReportRange } from '../hooks/useReportRange'
import { ApiError, isAbortError } from '../lib/api/client'
import {
  formatDateTime,
  formatNumber,
  formatPercent,
} from '../lib/format'
import { getAiSettings } from '../services/adminAiSettings'
import { getAiUsageReport } from '../services/adminAiUsage'
import { getRevenueReport } from '../services/adminRevenue'
import { getSepayStats } from '../services/adminSepay'
import { chartTheme } from '../theme/chart'
import type {
  AdminAiSettings,
  AdminAiUsageReport,
  AdminRevenueReport,
  AdminSepayStats,
  AiFallbackReason,
  AiUsageProvider,
} from '../types/admin'

interface Snapshot<T> {
  key: string
  data: T | null
  error: string | null
}

const PROVIDER_NAMES: Record<AiUsageProvider, string> = {
  GroqPrimary: 'Groq (khóa chính)',
  GroqSecondary: 'Groq (khóa dự phòng)',
  Gemini: 'Google Gemini',
  RuleBased: 'Trả lời tự động (không gọi AI)',
}

const FALLBACK_REASON_NAMES: Record<AiFallbackReason, string> = {
  OutOfScope: 'Ngoài phạm vi tài chính',
  ContextUnavailable: 'Không tải được dữ liệu',
  AiDisabled: 'AI đang tắt',
  QuotaExceeded: 'Hết hạn mức / gói Free',
  ProviderError: 'Lỗi nhà cung cấp',
  InvalidOutput: 'Kết quả AI không hợp lệ',
}

const loadError = (error: unknown, fallback: string): string =>
  error instanceof ApiError && error.status === 403
    ? 'Bạn không có quyền xem dữ liệu này.'
    : fallback

export const Intelligence: React.FC = () => {
  const { fromDate, toDate, error: rangeError, setRange } = useReportRange({
    mode: 'required',
  })

  const [version, setVersion] = useState(0)

  const [aiUsageSnapshot, setAiUsageSnapshot] =
    useState<Snapshot<AdminAiUsageReport> | null>(null)
  const [sepaySnapshot, setSepaySnapshot] =
    useState<Snapshot<AdminSepayStats> | null>(null)
  const [revenueSnapshot, setRevenueSnapshot] =
    useState<Snapshot<AdminRevenueReport> | null>(null)
  const [settingsSnapshot, setSettingsSnapshot] =
    useState<Snapshot<AdminAiSettings> | null>(null)

  const currentKey = JSON.stringify([fromDate, toDate, version])

  const currentAiUsage =
    aiUsageSnapshot?.key === currentKey ? aiUsageSnapshot : null
  const currentSepay =
    sepaySnapshot?.key === currentKey ? sepaySnapshot : null
  const currentRevenue =
    revenueSnapshot?.key === currentKey ? revenueSnapshot : null
  const currentSettings =
    settingsSnapshot?.key === String(version) ? settingsSnapshot : null

  const aiLoading = currentAiUsage === null && !rangeError
  const sepayLoading = currentSepay === null && !rangeError
  const settingsLoading = currentSettings === null

  // 1. Fetch AI usage report
  useEffect(() => {
    if (rangeError) return
    const controller = new AbortController()

    getAiUsageReport({ fromDate, toDate, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setAiUsageSnapshot({ key: currentKey, data: res, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setAiUsageSnapshot({
            key: currentKey,
            data: null,
            error: loadError(err, 'Không tải được báo cáo AI'),
          })
        }
      })

    return () => controller.abort()
  }, [fromDate, toDate, rangeError, currentKey])

  // 2. Fetch SePay stats
  useEffect(() => {
    if (rangeError) return
    const controller = new AbortController()

    getSepayStats({ fromDate, toDate, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setSepaySnapshot({ key: currentKey, data: res, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setSepaySnapshot({
            key: currentKey,
            data: null,
            error: loadError(err, 'Không tải được số liệu SePay'),
          })
        }
      })

    return () => controller.abort()
  }, [fromDate, toDate, rangeError, currentKey])

  // 3. Fetch Revenue Report (for SePay confirmed paid orders)
  useEffect(() => {
    if (rangeError) return
    const controller = new AbortController()

    getRevenueReport({ fromDate, toDate, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setRevenueSnapshot({ key: currentKey, data: res, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setRevenueSnapshot({
            key: currentKey,
            data: null,
            error: loadError(err, 'Không tải được đơn SePay'),
          })
        }
      })

    return () => controller.abort()
  }, [fromDate, toDate, rangeError, currentKey])

  // 4. Fetch AI Settings
  useEffect(() => {
    const controller = new AbortController()

    getAiSettings(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setSettingsSnapshot({
            key: String(version),
            data: res,
            error: null,
          })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setSettingsSnapshot({
            key: String(version),
            data: null,
            error: loadError(err, 'Không tải được cấu hình AI'),
          })
        }
      })

    return () => controller.abort()
  }, [version])

  const refreshAll = () => setVersion((v) => v + 1)

  const aiReport = currentAiUsage?.data ?? null
  const sepayStats = currentSepay?.data ?? null
  const revenueReport = currentRevenue?.data ?? null
  const aiSettings = currentSettings?.data ?? null

  const showTrackingNotice =
    aiReport &&
    (!aiReport.trackingStartedAt ||
      aiReport.trackingStartedAt.slice(0, 10) > fromDate)

  return (
    <div
      data-testid="intelligence-page"
      className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 pb-4 text-xs lg:gap-6"
    >
      {/* 1. Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Brain size={22} className="text-primary" />
            Vận hành AI & SePay
          </h1>
          <p className="mt-1 text-xs text-muted">
            Giám sát lưu lượng AI, tỷ lệ dự phòng và trạng thái webhook ngân hàng SePay.
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
            disabled={aiLoading || sepayLoading}
            onClick={refreshAll}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* 2. Tracking Notice Banner */}
      {showTrackingNotice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-control border border-primary/20 bg-primary-soft p-3 text-xs text-primary font-medium"
        >
          <Info size={16} className="shrink-0" />
          <span>
            {aiReport?.trackingStartedAt
              ? `Số liệu AI được ghi nhận từ ${formatDateTime(aiReport.trackingStartedAt)}. Trước thời điểm này chưa có dữ liệu.`
              : 'Số liệu AI bắt đầu được ghi nhận khi có lượt tương tác đầu tiên. Trước thời điểm này chưa có dữ liệu.'}
          </span>
        </div>
      )}

      {/* 3. AI 4 KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Lượt chat AI
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(aiReport?.totals?.requests)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              {aiReport?.totals
                ? `${formatNumber(aiReport.totals.successRequests)} thành công`
                : 'Tổng lượt yêu cầu'}
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Token đã dùng
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(aiReport?.totals?.totalTokens)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              {aiReport
                ? `Hôm nay: ${formatNumber(aiReport.today.totalTokens)}${
                    aiReport.today.systemDailyLimit !== null
                      ? ` / ${formatNumber(aiReport.today.systemDailyLimit)} giới hạn`
                      : ''
                  }`
                : 'Theo dõi token hệ thống'}
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Tỷ lệ trả lời dự phòng
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {aiReport?.totals && aiReport.totals.requests > 0
                ? formatPercent(
                    aiReport.totals.fallbackRequests /
                      aiReport.totals.requests,
                  )
                : '—'}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              {aiReport?.totals
                ? `${formatNumber(aiReport.totals.fallbackRequests)} lượt dự phòng`
                : 'Không gọi AI trực tiếp'}
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Người dùng AI
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(aiReport?.totals?.uniqueUsers)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              Thành viên sử dụng trong kỳ
            </span>
          </div>
        </SectionCard>
      </div>

      {/* 4. Row 2: AI Traffic Chart + Provider Breakdown */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
        <SectionCard
          title="Lưu lượng AI theo thời gian"
          subtitle="Số lượt chat và lượng token tiêu thụ"
          className="min-w-0"
        >
          {aiLoading ? (
            <div
              role="status"
              className="flex h-64 items-center justify-center text-muted animate-pulse"
            >
              Đang tải lưu lượng AI…
            </div>
          ) : currentAiUsage?.error ? (
            <div role="alert">
              <EmptyState
                icon={<WarningCircle size={20} />}
                title={currentAiUsage.error}
                action={
                  <Button variant="secondary" onClick={refreshAll}>
                    Thử lại
                  </Button>
                }
              />
            </div>
          ) : (aiReport?.points?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<ChatCircleDots size={20} />}
              title="Chưa có dữ liệu lưu lượng AI"
              description="Chưa có lượt tương tác AI nào trong khoảng thời gian này."
            />
          ) : (
            <TimeSeriesChart
              data={aiReport!.points}
              xKey="period"
              granularity={aiReport!.granularity}
              series={[
                {
                  key: 'requests',
                  label: 'Lượt chat',
                  axis: 'left',
                  format: (v) => `${formatNumber(v)} lượt`,
                },
                {
                  key: 'totalTokens',
                  label: 'Số tokens',
                  axis: 'right',
                  color: chartTheme.series[1],
                  format: (v) => formatNumber(v),
                },
              ]}
              height={280}
              ariaLabel="Biểu đồ lưu lượng AI theo thời gian"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Phân bổ theo nhà cung cấp"
          subtitle="Tỷ lệ phân phối request tới AI provider"
          className="min-w-0"
        >
          {aiLoading ? (
            <div
              role="status"
              className="flex h-64 items-center justify-center text-muted animate-pulse"
            >
              Đang tải nhà cung cấp…
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-1">
              {(aiReport?.byProvider ?? []).map((p, index) => {
                const totalReq = aiReport?.totals?.requests || 1
                const percent = Math.min(
                  100,
                  Math.round((p.requests / totalReq) * 100),
                )
                const color =
                  chartTheme.series[index % chartTheme.series.length]

                return (
                  <div key={p.provider} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink truncate max-w-[170px]">
                        {PROVIDER_NAMES[p.provider] || p.provider}
                      </span>
                      <span className="font-mono text-ink-soft">
                        {formatNumber(p.requests)} lượt{' '}
                        <span className="text-[11px] text-muted">
                          ({formatNumber(p.totalTokens)} tk)
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

      {/* 5. Row 3: Fallback Reasons + Top Users + AI Settings */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-3 lg:gap-6">
        <SectionCard
          title="Lý do trả lời dự phòng"
          subtitle="Nguyên nhân hệ thống chuyển sang rule-based"
          className="min-w-0"
        >
          {aiLoading ? (
            <div
              role="status"
              className="flex h-48 items-center justify-center text-muted animate-pulse"
            >
              Đang tải lý do dự phòng…
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-hairline">
              {(aiReport?.fallbackReasons ?? []).map((r) => (
                <div
                  key={r.reason}
                  className="flex items-center justify-between py-2 text-xs"
                >
                  <span className="text-ink-soft truncate max-w-[180px]">
                    {FALLBACK_REASON_NAMES[r.reason] || r.reason}
                  </span>
                  <span className="font-mono font-bold text-ink">
                    {formatNumber(r.count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Người dùng AI nhiều nhất"
          subtitle="Top 5 thành viên tiêu thụ token cao nhất"
          className="min-w-0"
        >
          {aiLoading ? (
            <div
              role="status"
              className="flex h-48 items-center justify-center text-muted animate-pulse"
            >
              Đang tải top thành viên…
            </div>
          ) : (aiReport?.topUsers?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<ChatCircleDots size={20} />}
              title="Chưa có dữ liệu người dùng"
            />
          ) : (
            <div className="flex flex-col divide-y divide-hairline">
              {aiReport!.topUsers.map((user, idx) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between py-2 text-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-muted w-4">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block font-semibold text-ink truncate max-w-[130px]">
                        {user.userName || user.userId}
                      </span>
                      {user.email && (
                        <span className="block text-[10px] text-muted truncate max-w-[130px]">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono font-bold text-ink">
                      {formatNumber(user.totalTokens)} tk
                    </span>
                    <span className="text-[10px] text-muted">
                      {formatNumber(user.requests)} lượt
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Cấu hình AI hiện tại"
          subtitle="Thông số mô hình đang hoạt động"
          className="min-w-0"
        >
          {settingsLoading ? (
            <div
              role="status"
              className="flex h-48 items-center justify-center text-muted animate-pulse"
            >
              Đang tải cấu hình AI…
            </div>
          ) : currentSettings?.error ? (
            <div role="alert">
              <EmptyState
                icon={<WarningCircle size={20} />}
                title={currentSettings.error}
              />
            </div>
          ) : aiSettings ? (
            <div className="flex flex-col gap-3 py-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Trạng thái</span>
                {aiSettings.isEnabled ? (
                  <Badge tone="success">Đang bật</Badge>
                ) : (
                  <Badge tone="danger">Đang tắt</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Mô hình</span>
                <span className="font-mono font-semibold text-ink truncate max-w-[140px]">
                  {aiSettings.modelName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Ngưỡng tái cân đối</span>
                <span className="font-mono font-semibold text-ink">
                  {aiSettings.rebalanceThresholdPercent}%
                </span>
              </div>

              <Link
                to="/configuration"
                className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <Gear size={14} />
                Chỉnh sửa cấu hình →
              </Link>
            </div>
          ) : null}
        </SectionCard>
      </div>

      {/* 6. SePay Webhook Card */}
      <SectionCard
        title="Webhook ngân hàng SePay"
        subtitle="Theo dõi luồng sự kiện thanh toán từ SePay Bank Hub"
        className="min-w-0"
      >
        {sepayLoading ? (
          <div
            role="status"
            className="flex h-56 items-center justify-center text-muted animate-pulse"
          >
            Đang tải dữ liệu SePay…
          </div>
        ) : currentSepay?.error ? (
          <div role="alert">
            <EmptyState
              icon={<WarningCircle size={20} />}
              title={currentSepay.error}
              action={
                <Button variant="secondary" onClick={refreshAll}>
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* SePay Status Chips & Metrics Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink text-xs">
                  Tổng webhook: {formatNumber(sepayStats?.bankWebhooks?.total)}
                </span>
                {(sepayStats?.bankWebhooks?.byStatus ?? []).map((s) => {
                  let tone: 'success' | 'warning' | 'danger' | 'neutral' =
                    'neutral'
                  let label: string = s.status
                  if (s.status === 'Processed') {
                    tone = 'success'
                    label = 'Đã xử lý'
                  } else if (s.status === 'Pending') {
                    tone = 'warning'
                    label = 'Đang chờ'
                  } else if (s.status === 'Failed') {
                    tone = 'danger'
                    label = 'Lỗi'
                  } else if (s.status === 'Ignored') {
                    tone = 'neutral'
                    label = 'Bỏ qua'
                  }

                  return (
                    <Badge key={s.status} tone={tone}>
                      {label}: {formatNumber(s.count)}
                    </Badge>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-ink-soft">
                  <Bank size={15} className="text-primary" />
                  <span>
                    <strong>
                      {formatNumber(sepayStats?.linkedBankAccounts)}
                    </strong>{' '}
                    tài khoản liên kết
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-ink-soft">
                  <CheckCircle size={15} className="text-success" />
                  <span>
                    <strong>
                      {revenueReport?.paidOrders !== null &&
                      revenueReport?.paidOrders !== undefined
                        ? formatNumber(revenueReport.paidOrders)
                        : '—'}
                    </strong>{' '}
                    đơn gói xác nhận
                  </span>
                </div>
                <span className="text-muted text-[11px]">
                  Webhook gần nhất:{' '}
                  {formatDateTime(sepayStats?.lastWebhookAt)}
                </span>
              </div>
            </div>

            {/* SePay Webhook Timeseries Chart */}
            {(sepayStats?.bankWebhooks?.points?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Bank size={20} />}
                title="Chưa có webhook ngân hàng trong khoảng này"
              />
            ) : (
              <TimeSeriesChart
                data={sepayStats!.bankWebhooks.points}
                xKey="period"
                granularity={sepayStats!.granularity}
                series={[
                  {
                    key: 'received',
                    label: 'Webhook nhận',
                    axis: 'left',
                    format: (v) => `${formatNumber(v)}`,
                  },
                  {
                    key: 'failed',
                    label: 'Lỗi',
                    axis: 'right',
                    color: chartTheme.series[4],
                    format: (v) => `${formatNumber(v)}`,
                  },
                ]}
                height={220}
                ariaLabel="Biểu đồ sự kiện webhook ngân hàng SePay"
              />
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
