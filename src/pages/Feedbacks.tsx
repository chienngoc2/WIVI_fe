import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowClockwise, Star } from '@phosphor-icons/react'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { SectionCard } from '../components/ui/SectionCard'
import { DateRangeFilter } from '../components/ui/DateRangeFilter'
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart'
import { ApiError, isAbortError } from '../lib/api/client'
import { formatDateTime } from '../lib/format'
import { validateRange } from '../lib/dateRange'
import {
  getFeedbackSummary,
  getFeedbackTrend,
  listFeedbacks,
} from '../services/adminFeedbacks'
import { chartTheme } from '../theme/chart'
import type {
  AdminFeedback,
  AdminFeedbackListResponse,
  AdminFeedbackSummary,
  FeedbackTrendResponse,
  ReferralSource,
} from '../types/admin'

const sources: Record<ReferralSource, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  friends: 'Bạn bè giới thiệu',
  other: 'Khác',
}

const SOURCE_KEYS: ReferralSource[] = [
  'facebook',
  'tiktok',
  'instagram',
  'friends',
  'other',
]
const RATING_STARS = [1, 2, 3, 4, 5]

const positiveInteger = (value: string | null, fallback: number) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}

function formatDateVn(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

interface Snapshot<T> {
  key: string
  queryKey: string
  data?: T
  error?: string
}

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.status === 403
      ? 'Bạn không có quyền xem đánh giá người dùng.'
      : error.message
    : 'Không thể tải dữ liệu. Vui lòng thử lại.'

const columns: Column<AdminFeedback>[] = [
  {
    key: 'createdAt',
    header: 'Thời gian',
    render: (row) => formatDateTime(row.createdAt),
  },
  {
    key: 'user',
    header: 'Người gửi',
    render: (row) => (
      <div>
        <span className="block text-ink-soft">{row.email ?? '—'}</span>
        <Link
          className="text-primary text-[11px]"
          to={`/members?keyword=${encodeURIComponent(row.userName ?? row.userId)}`}
        >
          {row.userName ?? row.userId}
        </Link>
      </div>
    ),
  },
  {
    key: 'rating',
    header: 'Số sao',
    render: (row) => (
      <span className="inline-flex items-center gap-1 text-warning-deep">
        <Star weight="fill" />
        {row.rating}/5
      </span>
    ),
  },
  {
    key: 'source',
    header: 'Nguồn giới thiệu',
    render: (row) => sources[row.referralSource],
  },
  {
    key: 'comment',
    header: 'Nhận xét',
    width: '40%',
    render: (row) => (
      <p className="whitespace-pre-wrap break-words max-w-lg">
        {row.comment || '—'}
      </p>
    ),
  },
]

const Loading = () => (
  <div role="status" className="space-y-3 animate-pulse py-4">
    <span className="sr-only">Đang tải đánh giá</span>
    {[0, 1, 2].map((index) => (
      <div key={index} className="h-9 bg-surface-sunken rounded-control" />
    ))}
  </div>
)

export const Feedbacks: React.FC = () => {
  const [params, setParams] = useSearchParams()
  const [version, setVersion] = useState(0)

  const page = positiveInteger(params.get('page'), 1)
  const pageSize = Math.min(100, positiveInteger(params.get('pageSize'), 20))
  const rawRating = Number(params.get('rating'))
  const rating =
    Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
      ? rawRating
      : undefined
  const rawSource = params.get('referralSource')
  const referralSource =
    rawSource && Object.hasOwn(sources, rawSource)
      ? (rawSource as ReferralSource)
      : undefined
  const fromDate = params.get('fromDate') || undefined
  const toDate = params.get('toDate') || undefined

  const rangeError = useMemo(() => {
    const res = validateRange(fromDate, toDate, { optional: true })
    return res.ok ? null : { field: res.field, message: res.message }
  }, [fromDate, toDate])

  const listQueryKey = JSON.stringify([
    page,
    pageSize,
    rating,
    referralSource,
    fromDate,
    toDate,
  ])
  const summaryQueryKey = JSON.stringify([fromDate, toDate])
  const trendQueryKey = JSON.stringify([fromDate, toDate])

  const listKey = JSON.stringify([listQueryKey, version])
  const summaryKey = JSON.stringify([summaryQueryKey, version])
  const trendKey = JSON.stringify([trendQueryKey, version])

  const [list, setList] = useState<Snapshot<AdminFeedbackListResponse>>({
    key: '',
    queryKey: '',
  })
  const [summary, setSummary] = useState<Snapshot<AdminFeedbackSummary>>({
    key: '',
    queryKey: '',
  })
  const [trend, setTrend] = useState<Snapshot<FeedbackTrendResponse>>({
    key: '',
    queryKey: '',
  })

  // 1. Load list
  useEffect(() => {
    if (rangeError) return

    const controller = new AbortController()
    listFeedbacks({
      page,
      pageSize,
      rating,
      referralSource,
      fromDate,
      toDate,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setList({ key: listKey, queryKey: listQueryKey, data })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) {
          setList({
            key: listKey,
            queryKey: listQueryKey,
            error: errorMessage(error),
          })
        }
      })
    return () => controller.abort()
  }, [
    page,
    pageSize,
    rating,
    referralSource,
    fromDate,
    toDate,
    listKey,
    listQueryKey,
    rangeError,
  ])

  // 2. Load summary
  useEffect(() => {
    if (rangeError) return

    const controller = new AbortController()
    getFeedbackSummary({ fromDate, toDate, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSummary({ key: summaryKey, queryKey: summaryQueryKey, data })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) {
          setSummary({
            key: summaryKey,
            queryKey: summaryQueryKey,
            error: errorMessage(error),
          })
        }
      })
    return () => controller.abort()
  }, [fromDate, toDate, summaryKey, summaryQueryKey, rangeError])

  // 3. Load trend
  useEffect(() => {
    if (rangeError) return

    const controller = new AbortController()
    getFeedbackTrend({ fromDate, toDate, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setTrend({ key: trendKey, queryKey: trendQueryKey, data })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) {
          setTrend({
            key: trendKey,
            queryKey: trendQueryKey,
            error: errorMessage(error),
          })
        }
      })
    return () => controller.abort()
  }, [fromDate, toDate, trendKey, trendQueryKey, rangeError])

  const applyFilter = (name: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(name, value)
      else next.delete(name)
      next.set('page', '1')
      return next
    })

  const setPage = (nextPage: number) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('page', String(nextPage))
      return next
    })

  const currentList = list.queryKey === listQueryKey ? list : undefined
  const currentSummary = summary.queryKey === summaryQueryKey ? summary : undefined
  const currentTrend = trend.queryKey === trendQueryKey ? trend : undefined

  const refreshing =
    (currentList?.data && list.key !== listKey) ||
    (currentSummary?.data && summary.key !== summaryKey) ||
    (currentTrend?.data && trend.key !== trendKey)

  const totalPages = Math.max(
    1,
    Math.ceil((currentList?.data?.totalCount ?? 0) / pageSize),
  )
  const filtered = Boolean(rating || referralSource || fromDate || toDate)
  const fieldClass =
    'h-9 px-3 text-xs bg-surface border border-border-premium rounded-control text-ink-soft focus:outline-none focus:ring-2 focus:ring-primary-ring'
  const retry = () => setVersion((value) => value + 1)
  const errorState = (message: string) => (
    <div role="alert" className="text-danger-deep text-xs space-y-3">
      <p>{message}</p>
      <Button onClick={retry}>Thử lại</Button>
    </div>
  )

  // Zero-filled data for rating stars (1..5)
  const ratingData = useMemo(() => {
    return RATING_STARS.map((star) => {
      const found = currentSummary?.data?.ratingDistribution?.find(
        (r) => r.rating === star,
      )
      return { rating: star, label: `${star} sao`, count: found?.count ?? 0 }
    })
  }, [currentSummary?.data?.ratingDistribution])

  // Zero-filled data for referral sources (5 categories in order)
  const referralData = useMemo(() => {
    return SOURCE_KEYS.map((key) => {
      const found = currentSummary?.data?.referralSources?.find(
        (r) => r.referralSource === key,
      )
      return {
        referralSource: key,
        label: sources[key],
        count: found?.count ?? 0,
      }
    })
  }, [currentSummary?.data?.referralSources])

  return (
    <div
      data-testid="feedbacks-page"
      className="p-5 space-y-5 h-full overflow-auto scrollbar-premium"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Đánh giá người dùng</h1>
          <p className="text-xs text-muted mt-1">
            Thống kê theo phiếu mới nhất của mỗi người trong khoảng thời gian đã chọn.
          </p>
        </div>
        <Button variant="secondary" icon={<ArrowClockwise />} onClick={retry}>
          Làm mới
        </Button>
      </div>

      {refreshing && (
        <p role="status" className="text-xs text-muted">
          Đang cập nhật đánh giá…
        </p>
      )}

      <SectionCard title="Bộ lọc">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs text-muted flex flex-col gap-1">
            Số sao
            <select
              aria-label="Số sao"
              className={fieldClass}
              value={rating ?? ''}
              onChange={(event) => applyFilter('rating', event.target.value)}
            >
              <option value="">Tất cả số sao</option>
              {RATING_STARS.map((value) => (
                <option key={value} value={value}>
                  {value} sao
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Nguồn giới thiệu
            <select
              aria-label="Nguồn giới thiệu"
              className={fieldClass}
              value={referralSource ?? ''}
              onChange={(event) =>
                applyFilter('referralSource', event.target.value)
              }
            >
              <option value="">Tất cả nguồn</option>
              {Object.entries(sources).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <DateRangeFilter
            fromDate={fromDate ?? ''}
            toDate={toDate ?? ''}
            error={rangeError}
            showPresets={false}
            onChange={(newFrom, newTo) => {
              setParams((previous) => {
                const next = new URLSearchParams(previous)
                if (newFrom) next.set('fromDate', newFrom)
                else next.delete('fromDate')
                if (newTo) next.set('toDate', newTo)
                else next.delete('toDate')
                next.set('page', '1')
                return next
              })
            }}
          />

          {filtered && (
            <Button variant="ghost" onClick={() => setParams({})}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </SectionCard>

      {currentSummary?.error ? (
        errorState(currentSummary.error)
      ) : !currentSummary?.data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              [
                'Điểm trung bình',
                currentSummary.data.averageRating === null
                  ? '—'
                  : `${currentSummary.data.averageRating.toFixed(2)}/5`,
              ],
              ['Số người đánh giá', currentSummary.data.totalVoters],
              ['Tổng lượt gửi', currentSummary.data.totalSubmissions],
            ].map(([label, value]) => (
              <SectionCard key={String(label)} title={String(label)}>
                <p className="text-2xl font-bold font-mono text-ink">{value}</p>
              </SectionCard>
            ))}
          </div>

          {currentSummary.data.totalVoters === 0 ? (
            <SectionCard>
              <EmptyState title="Chưa có đánh giá trong khoảng thời gian này" />
            </SectionCard>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <SectionCard
                title="Phân bố số sao"
                subtitle="Thống kê theo phiếu mới nhất của mỗi người"
              >
                <div
                  className="h-[250px]"
                  role="img"
                  aria-label="Phân bố số sao"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingData}>
                      <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        interval={0}
                        tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={chartTheme.tooltip}
                        cursor={{ fill: chartTheme.grid }}
                        formatter={(value) => [value, 'Số người']}
                      />
                      <Bar
                        dataKey="count"
                        name="Số người"
                        fill={chartTheme.series[0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="sr-only">
                  <caption>Số liệu phân bố số sao</caption>
                  <thead>
                    <tr>
                      <th>Số sao</th>
                      <th>Số người</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratingData.map((r) => (
                      <tr key={r.rating}>
                        <td>{r.label}</td>
                        <td>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>

              <SectionCard
                title="Nguồn giới thiệu"
                subtitle="Thống kê theo phiếu mới nhất của mỗi người"
              >
                <div
                  className="h-[250px]"
                  role="img"
                  aria-label="Nguồn giới thiệu"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={referralData}>
                      <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        interval={0}
                        tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={chartTheme.tooltip}
                        cursor={{ fill: chartTheme.grid }}
                        formatter={(value) => [value, 'Số người']}
                      />
                      <Bar
                        dataKey="count"
                        name="Số người"
                        fill={chartTheme.series[0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="sr-only">
                  <caption>Số liệu nguồn giới thiệu</caption>
                  <thead>
                    <tr>
                      <th>Nguồn</th>
                      <th>Số người</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralData.map((r) => (
                      <tr key={r.referralSource}>
                        <td>{r.label}</td>
                        <td>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </div>
          )}
        </>
      )}

      {/* R4: Biểu đồ đường xu hướng đánh giá theo thời gian */}
      <SectionCard
        title="Xu hướng đánh giá theo thời gian"
        subtitle={
          currentTrend?.data
            ? `Biểu đồ thể hiện mọi lượt gửi theo thời gian (từ ${formatDateVn(currentTrend.data.fromDate)} đến ${formatDateVn(currentTrend.data.toDate)})`
            : 'Biểu đồ thể hiện mọi lượt gửi theo thời gian'
        }
      >
        {currentTrend?.error ? (
          errorState(currentTrend.error)
        ) : !currentTrend?.data ? (
          <Loading />
        ) : currentTrend.data.totalSubmissions === 0 ? (
          <EmptyState title="Không có lượt đánh giá trong khoảng thời gian này" />
        ) : (
          <TimeSeriesChart
            data={currentTrend.data.points}
            xKey="period"
            granularity={currentTrend.data.granularity}
            series={[
              {
                key: 'submissions',
                label: 'Lượt gửi',
                axis: 'left',
                format: (v) => `${v} lượt`,
              },
              {
                key: 'averageRating',
                label: 'Điểm trung bình',
                axis: 'right',
                color: chartTheme.series[3],
                format: (v) =>
                  v !== null && v !== undefined
                    ? `${Number(v).toFixed(2)}/5`
                    : '—',
              },
            ]}
            height={260}
            ariaLabel="Biểu đồ xu hướng đánh giá theo thời gian"
          />
        )}
      </SectionCard>

      <SectionCard
        title="Danh sách phiếu đánh giá"
        subtitle="Hiển thị mọi lần gửi, mới nhất trước. Bộ lọc sao/nguồn chỉ áp dụng cho danh sách."
        padded={false}
      >
        {currentList?.error ? (
          <div className="p-4">{errorState(currentList.error)}</div>
        ) : !currentList?.data ? (
          <div className="p-4">
            <Loading />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={currentList.data.items}
              rowKey={(row) => row.id}
              empty={
                <EmptyState
                  colSpan={columns.length}
                  title={
                    filtered
                      ? 'Không tìm thấy kết quả khớp bộ lọc'
                      : 'Chưa có đánh giá nào'
                  }
                  action={
                    filtered ? (
                      <Button variant="secondary" onClick={() => setParams({})}>
                        Xóa bộ lọc
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-premium text-xs text-muted">
              <span data-testid="feedbacks-page-info">
                Trang {page}/{totalPages} · {currentList.data.totalCount} phiếu
              </span>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Số phiếu mỗi trang"
                  className={fieldClass}
                  value={pageSize}
                  onChange={(event) =>
                    applyFilter('pageSize', event.target.value)
                  }
                >
                  {[
                    ...new Set([20, 50, 100, pageSize]),
                  ]
                    .sort((a, b) => a - b)
                    .map((value) => (
                      <option key={value} value={value}>
                        {value}/trang
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
