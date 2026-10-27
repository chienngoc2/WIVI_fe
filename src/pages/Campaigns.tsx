import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowClockwise,
  Bell,
  CheckCircle,
  Megaphone,
  PaperPlaneTilt,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { SectionCard } from '../components/ui/SectionCard'
import { ApiError, isAbortError } from '../lib/api/client'
import { formatDateTime, formatNumber, formatPercent } from '../lib/format'
import {
  createBroadcast,
  getBroadcastStats,
  listBroadcasts,
} from '../services/adminBroadcasts'
import type {
  AdminBroadcast,
  AdminBroadcastStats,
  AdminBroadcastsListResponse,
  BroadcastStatus,
} from '../types/admin'

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS: readonly number[] = [20, 50, 100]

const STATUS_OPTIONS: readonly {
  value: BroadcastStatus | 'all'
  label: string
}[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Queued', label: 'Đang gửi' },
  { value: 'Sent', label: 'Đã gửi' },
  { value: 'Failed', label: 'Thất bại' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

interface Snapshot<T> {
  key: string
  data: T | null
  error: string | null
}

const statusBadge = (status: BroadcastStatus) => {
  switch (status) {
    case 'Sent':
      return <Badge tone="success">Đã gửi</Badge>
    case 'Queued':
      return <Badge tone="info">Đang gửi</Badge>
    case 'Failed':
      return <Badge tone="danger">Thất bại</Badge>
    case 'Cancelled':
      return <Badge tone="neutral">Đã hủy</Badge>
    default:
      return <Badge tone="neutral">{status}</Badge>
  }
}

export const Campaigns: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // URL state
  const rawPage = Number(searchParams.get('pageIndex'))
  const pageIndex = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1

  const rawSize = Number(searchParams.get('pageSize'))
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE

  const rawStatus = searchParams.get('status')
  const statusFilter: BroadcastStatus | null =
    rawStatus === 'Queued' ||
    rawStatus === 'Sent' ||
    rawStatus === 'Failed' ||
    rawStatus === 'Cancelled'
      ? rawStatus
      : null

  // Form State
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string
    body?: string
    general?: string
  }>({})

  // Data State
  const [version, setVersion] = useState(0)
  const [listSnapshot, setListSnapshot] =
    useState<Snapshot<AdminBroadcastsListResponse> | null>(null)
  const [statsSnapshot, setStatsSnapshot] =
    useState<Snapshot<AdminBroadcastStats> | null>(null)

  const listKey = JSON.stringify([pageIndex, pageSize, statusFilter, version])
  const statsKey = String(version)

  const currentList =
    listSnapshot?.key === listKey ? listSnapshot : null
  const currentStats =
    statsSnapshot?.key === statsKey ? statsSnapshot : null

  const listLoading = currentList === null
  const statsLoading = currentStats === null

  // 1. Fetch Stats
  useEffect(() => {
    const controller = new AbortController()

    getBroadcastStats(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setStatsSnapshot({ key: statsKey, data, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setStatsSnapshot({
            key: statsKey,
            data: null,
            error:
              err instanceof ApiError && err.status === 403
                ? 'Bạn không có quyền xem dữ liệu này.'
                : 'Không tải được thống kê chiến dịch',
          })
        }
      })

    return () => controller.abort()
  }, [statsKey])

  // 2. Fetch Broadcasts List
  useEffect(() => {
    const controller = new AbortController()

    listBroadcasts({
      pageIndex,
      pageSize,
      status: statusFilter,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setListSnapshot({ key: listKey, data, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setListSnapshot({
            key: listKey,
            data: null,
            error:
              err instanceof ApiError && err.status === 403
                ? 'Bạn không có quyền xem dữ liệu này.'
                : 'Không tải được danh sách thông báo',
          })
        }
      })

    return () => controller.abort()
  }, [pageIndex, pageSize, statusFilter, listKey])

  const refreshAll = () => {
    setVersion((v) => v + 1)
  }

  // Auto 5s second refetch timer cleanup
  const [refetchTimer, setRefetchTimer] = useState<number | null>(null)
  useEffect(() => {
    return () => {
      if (refetchTimer) window.clearTimeout(refetchTimer)
    }
  }, [refetchTimer])

  const updateUrlParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'pageIndex') next.set('pageIndex', '1')
      return next
    })
  }

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setSubmitSuccess(null)

    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()

    if (!trimmedTitle) {
      setFieldErrors({ title: 'Vui lòng nhập tiêu đề thông báo' })
      return
    }
    if (trimmedTitle.length > 200) {
      setFieldErrors({ title: 'Tiêu đề không được vượt quá 200 ký tự' })
      return
    }
    if (!trimmedBody) {
      setFieldErrors({ body: 'Vui lòng nhập nội dung thông báo' })
      return
    }
    if (trimmedBody.length > 2000) {
      setFieldErrors({ body: 'Nội dung không được vượt quá 2000 ký tự' })
      return
    }

    setConfirmModalOpen(true)
  }

  const handleConfirmSend = async () => {
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      await createBroadcast({
        title: title.trim(),
        body: body.trim(),
        targetAudience: 'All',
        scheduledAt: null,
      })

      setConfirmModalOpen(false)
      setTitle('')
      setBody('')
      setSubmitSuccess(
        'Đã đưa vào hàng đợi gửi. Trạng thái sẽ cập nhật sau vài giây.',
      )

      // Immediate refresh
      refreshAll()

      // Second refresh after 5 seconds to catch worker completion
      const timer = window.setTimeout(() => {
        refreshAll()
      }, 5000)
      setRefetchTimer(timer)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.field === 'title') {
          setFieldErrors({ title: err.message })
        } else if (err.field === 'body') {
          setFieldErrors({ body: err.message })
        } else {
          setFieldErrors({ general: err.message })
        }
      } else {
        setFieldErrors({
          general: 'Không thể gửi thông báo. Vui lòng thử lại.',
        })
      }
      setConfirmModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = currentStats?.data ?? null
  const items = currentList?.data?.items ?? []
  const pagination = currentList?.data?.pagination ?? null
  const totalItems = pagination?.totalCount ?? 0
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)

  const columns: Column<AdminBroadcast>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Tiêu đề & Nội dung',
        render: (b) => (
          <div className="flex flex-col min-w-0 max-w-xs">
            <span
              className="font-semibold text-ink truncate text-xs"
              title={b.title}
            >
              {b.title}
            </span>
            <p className="text-[11px] text-muted truncate mt-0.5" title={b.body}>
              {b.body}
            </p>
          </div>
        ),
      },
      {
        key: 'recipients',
        header: 'Người nhận',
        render: (b) => {
          if (b.status === 'Queued') {
            return (
              <span className="text-primary font-medium text-[11px] animate-pulse">
                Đang gửi…
              </span>
            )
          }
          return (
            <span className="font-mono text-ink text-xs">
              {formatNumber(b.deliveredCount)}/{formatNumber(b.targetCount)}
            </span>
          )
        },
      },
      {
        key: 'read',
        header: 'Đã đọc',
        render: (b) => {
          const count = b.readCount ?? 0
          const percent =
            b.deliveredCount > 0
              ? ` (${formatPercent(count / b.deliveredCount)})`
              : ''
          return (
            <span className="font-mono text-ink text-xs">
              {formatNumber(count)}
              <span className="text-muted text-[11px] font-sans">{percent}</span>
            </span>
          )
        },
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (b) => statusBadge(b.status),
      },
      {
        key: 'sentAt',
        header: 'Đã gửi lúc',
        render: (b) => (
          <span className="text-muted text-[11px]">
            {formatDateTime(b.sentAt)}
          </span>
        ),
      },
    ],
    [],
  )

  const fieldClass =
    'h-8 px-2.5 text-xs bg-surface border border-hairline rounded-control text-ink focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div
      data-testid="campaigns-workspace"
      className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 pb-4 text-xs lg:gap-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Megaphone size={22} className="text-primary" />
            Chiến dịch gửi tin
          </h1>
          <p className="mt-1 text-xs text-muted">
            Gửi thông báo toàn hệ thống tới các thành viên đang hoạt động.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<ArrowClockwise size={14} />}
          disabled={listLoading || statsLoading}
          onClick={refreshAll}
        >
          Làm mới
        </Button>
      </div>

      {/* 4 Real KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Tổng chiến dịch
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(stats?.totalBroadcasts)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              Số chiến dịch đã tạo
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Đã gửi thành công
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(stats?.sentBroadcasts)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              {stats && stats.failedBroadcasts > 0
                ? `${formatNumber(stats.failedBroadcasts)} chiến dịch thất bại`
                : 'Đã hoàn tất phân phối'}
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Tổng lượt nhận
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {formatNumber(stats?.totalDelivered)}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              Lượt gửi thành công tới user
            </span>
          </div>
        </SectionCard>

        <SectionCard className="p-4" padded={false}>
          <div className="p-4">
            <span className="text-xs font-semibold text-muted">
              Tỷ lệ đã đọc
            </span>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
              {stats?.readRate !== null && stats?.readRate !== undefined
                ? formatPercent(stats.readRate)
                : '—'}
            </p>
            <span className="mt-1 block text-[11px] text-muted">
              {stats ? `Tổng ${formatNumber(stats.totalRead)} lượt đã đọc` : 'Gồm cả "đọc tất cả" trên app'}
            </span>
          </div>
        </SectionCard>
      </div>

      {/* Main Split: Form (5 Cols) / History Table (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 items-start">
        {/* Left: Create Broadcast Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <SectionCard
            title="Tạo thông báo mới"
            subtitle="Soạn nội dung và phát tin tức thì"
            className="min-w-0"
          >
            <form onSubmit={handleOpenConfirm} className="flex flex-col gap-3.5">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="broadcast-title" className="font-semibold text-ink">
                    Tiêu đề thông báo
                  </label>
                  <span className="text-[11px] text-muted font-mono">
                    {title.length}/200
                  </span>
                </div>
                <input
                  id="broadcast-title"
                  type="text"
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật quy tắc tính hũ mới..."
                  className="h-8 rounded-control border border-hairline bg-surface px-3 text-xs text-ink outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary"
                  disabled={isSubmitting}
                />
                {fieldErrors.title && (
                  <span role="alert" className="text-danger text-[11px] font-medium">
                    {fieldErrors.title}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="broadcast-body" className="font-semibold text-ink">
                    Nội dung
                  </label>
                  <span className="text-[11px] text-muted font-mono">
                    {body.length}/2000
                  </span>
                </div>
                <textarea
                  id="broadcast-body"
                  rows={5}
                  maxLength={2000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Nhập nội dung chi tiết của thông báo gửi tới các thành viên..."
                  className="rounded-control border border-hairline bg-surface p-2.5 text-xs text-ink outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary resize-none"
                  disabled={isSubmitting}
                />
                {fieldErrors.body && (
                  <span role="alert" className="text-danger text-[11px] font-medium">
                    {fieldErrors.body}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-muted">
                Gửi tới tất cả thành viên đang hoạt động.
              </p>

              {fieldErrors.general && (
                <div
                  role="alert"
                  className="rounded-control border border-danger-soft-border bg-danger-soft p-2.5 text-[11px] text-danger-deep font-medium"
                >
                  {fieldErrors.general}
                </div>
              )}

              {submitSuccess && (
                <div
                  role="status"
                  className="rounded-control border border-success-soft-border bg-success-soft p-2.5 text-[11px] text-success-deep font-medium flex items-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  <span>{submitSuccess}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                icon={<PaperPlaneTilt size={14} />}
                disabled={isSubmitting || !title.trim() || !body.trim()}
                className="w-full mt-1"
              >
                Gửi thông báo
              </Button>
            </form>
          </SectionCard>

          {/* Mobile Notification Preview Card */}
          <SectionCard
            title="Xem trước trên ứng dụng"
            subtitle="Mô phỏng hiển thị trên thông báo di động"
            className="min-w-0"
          >
            <div className="rounded-control border border-border-premium bg-surface-alt/60 p-3.5 flex items-start gap-3 shadow-premium-sm">
              <div className="w-8 h-8 rounded-pill bg-primary/10 flex items-center justify-center shrink-0">
                <Bell size={16} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink text-xs truncate">
                    {title.trim() || 'Tiêu đề thông báo'}
                  </span>
                  <span className="text-[10px] text-muted-light shrink-0">
                    Vừa xong
                  </span>
                </div>
                <p className="text-[11px] text-ink-soft mt-1 whitespace-pre-wrap break-words line-clamp-3">
                  {body.trim() ||
                    'Nội dung chi tiết của thông báo sẽ hiển thị tại đây khi soạn thảo...'}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right: History Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <SectionCard
            title="Lịch sử chiến dịch"
            subtitle="Danh sách các thông báo đã phát đi"
            className="min-w-0"
            padded={false}
          >
            {/* Filter Bar */}
            <div className="p-4 border-b border-border-premium flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  aria-label="Lọc theo trạng thái"
                  className={fieldClass}
                  value={statusFilter ?? 'all'}
                  onChange={(e) =>
                    updateUrlParam(
                      'status',
                      e.target.value === 'all' ? null : e.target.value,
                    )
                  }
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {statusFilter && (
                  <Button
                    variant="ghost"
                    onClick={() => updateUrlParam('status', null)}
                  >
                    Xóa lọc
                  </Button>
                )}
              </div>
            </div>

            {/* Table Content */}
            {listLoading ? (
              <div role="status" className="p-12 text-center text-muted">
                Đang tải danh sách thông báo…
              </div>
            ) : currentList?.error ? (
              <div role="alert" className="p-8">
                <EmptyState
                  icon={<WarningCircle size={20} />}
                  title={currentList.error}
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
                  rows={items}
                  rowKey={(row) => row.id}
                  empty={
                    <EmptyState
                      colSpan={columns.length}
                      title="Không tìm thấy broadcast nào"
                      description="Chưa có chiến dịch nào hoặc không khớp bộ lọc."
                    />
                  }
                />

                <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-premium text-xs text-muted">
                  <span data-testid="campaigns-page-info">
                    Trang {pageIndex}/{totalPages} · {formatNumber(totalItems)}{' '}
                    chiến dịch
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Số bản ghi mỗi trang"
                      className={fieldClass}
                      value={pageSize}
                      onChange={(e) =>
                        updateUrlParam('pageSize', e.target.value)
                      }
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}/trang
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      disabled={pageIndex <= 1}
                      onClick={() =>
                        updateUrlParam('pageIndex', String(pageIndex - 1))
                      }
                    >
                      Trang trước
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={pageIndex >= totalPages}
                      onClick={() =>
                        updateUrlParam('pageIndex', String(pageIndex + 1))
                      }
                    >
                      Trang sau
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={confirmModalOpen}
        onClose={() => {
          if (!isSubmitting) setConfirmModalOpen(false)
        }}
        title="Xác nhận gửi thông báo"
        description="Thông báo sẽ được gửi tới tất cả thành viên đang hoạt động trên hệ thống."
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => setConfirmModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={isSubmitting}
              onClick={handleConfirmSend}
            >
              {isSubmitting ? 'Đang gửi…' : 'Xác nhận gửi'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2.5 text-xs">
          <p className="text-ink font-medium">
            Bạn có chắc chắn muốn phát thông báo sau?{' '}
            <strong className="text-danger">Thao tác này không thể thu hồi.</strong>
          </p>
          <div className="rounded-control bg-surface-alt p-3 border border-border-premium">
            <span className="block font-bold text-ink text-xs">{title}</span>
            <p className="mt-1 text-ink-soft whitespace-pre-wrap text-[11px] max-h-32 overflow-y-auto">
              {body}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
