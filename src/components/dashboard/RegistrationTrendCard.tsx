import { useEffect, useState } from 'react'
import { ChartLine, WarningCircle } from '@phosphor-icons/react'
import { SectionCard } from '../ui/SectionCard'
import { DateRangeFilter } from '../ui/DateRangeFilter'
import { TimeSeriesChart } from '../charts/TimeSeriesChart'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { useReportRange } from '../../hooks/useReportRange'
import { getRegistrationSeries } from '../../services/adminDashboard'
import { formatNumber } from '../../lib/format'
import { ApiError, isAbortError } from '../../lib/api/client'
import type { RegistrationSeriesResponse } from '../../types/admin'

function formatDateVn(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

interface Snapshot<T> {
  key: string
  data: T | null
  error: string | null
}

export const RegistrationTrendCard = () => {
  const { fromDate, toDate, error: rangeError, setRange } = useReportRange({
    mode: 'required',
  })

  const [revision, setRevision] = useState(0)
  const [snapshot, setSnapshot] =
    useState<Snapshot<RegistrationSeriesResponse> | null>(null)

  const currentKey = JSON.stringify([fromDate, toDate, revision])
  const currentSnapshot = snapshot?.key === currentKey ? snapshot : null
  const loading = currentSnapshot === null && !rangeError
  const data = currentSnapshot?.data ?? null
  const error = currentSnapshot?.error ?? null

  useEffect(() => {
    if (rangeError) {
      return
    }

    const controller = new AbortController()

    getRegistrationSeries({ fromDate, toDate, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setSnapshot({ key: currentKey, data: res, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          const message =
            err instanceof ApiError && err.status === 403
              ? 'Bạn không có quyền xem dữ liệu này.'
              : 'Không tải được chuỗi đăng ký người dùng'
          setSnapshot({ key: currentKey, data: null, error: message })
        }
      })

    return () => controller.abort()
  }, [fromDate, toDate, rangeError, currentKey])

  const handleRetry = () => setRevision((v) => v + 1)

  return (
    <SectionCard
      title="Người dùng đăng ký theo thời gian"
      subtitle="Thống kê số tài khoản đăng ký mới"
      className="w-full min-w-0 [&_header_h3]:whitespace-normal"
      bodyClassName="min-w-0"
      right={
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          error={rangeError}
          onChange={setRange}
        />
      }
    >
      {loading ? (
        <div
          role="status"
          className="flex h-60 items-center justify-center text-sm text-muted animate-pulse"
        >
          Đang tải thống kê đăng ký…
        </div>
      ) : error ? (
        <div role="alert">
          <EmptyState
            icon={<WarningCircle size={20} />}
            title={error}
            description="Vui lòng thử lại để cập nhật số liệu."
            action={
              <Button variant="secondary" onClick={handleRetry}>
                Thử lại
              </Button>
            }
          />
        </div>
      ) : data?.totalRegistrations === 0 ? (
        <EmptyState
          icon={<ChartLine size={20} />}
          title="Không có người dùng đăng ký trong khoảng này"
          description="Chọn khoảng thời gian khác để xem thống kê đăng ký."
        />
      ) : data ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-soft">
            <strong className="font-semibold text-ink font-mono tabular-nums">
              {formatNumber(data.totalRegistrations)}
            </strong>{' '}
            người đăng ký từ {formatDateVn(data.fromDate)} đến{' '}
            {formatDateVn(data.toDate)}
          </p>

          <TimeSeriesChart
            data={data.points}
            xKey="period"
            granularity={data.granularity}
            series={[
              {
                key: 'registrations',
                label: 'Người đăng ký',
                format: (v) => formatNumber(v),
              },
            ]}
            height={280}
            ariaLabel="Biểu đồ người dùng đăng ký theo thời gian"
          />

          {data.granularity === 'month' && (
            <p className="mt-1 text-[11px] text-muted">
              * Tháng đầu và cuối có thể không trọn tháng.
            </p>
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}
