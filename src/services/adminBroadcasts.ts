import { apiRequest } from '../lib/api/client'
import type {
  AdminBroadcast,
  AdminBroadcastsListResponse,
  BroadcastsPagination,
  CreateBroadcastRequest,
  CreateBroadcastResponse,
} from '../types/admin'

export interface ListBroadcastsParams {
  /** Backend nhận `pageIndex` và `pageSize`; shape response là phẳng (page, pageSize, totalCount, totalPages) */
  pageIndex: number
  pageSize: number
  /** `null` = tất cả trạng thái; bỏ hẳn param thay vì gửi chuỗi rỗng */
  status: BroadcastStatus | null
  signal?: AbortSignal
}

type BroadcastStatus = 'Queued' | 'Sent' | 'Failed' | 'Cancelled'

export const listBroadcasts = ({
  pageIndex,
  pageSize,
  status,
  signal,
}: ListBroadcastsParams): Promise<AdminBroadcastsListResponse> => {
  const params = new URLSearchParams()
  params.set('pageIndex', String(pageIndex))
  params.set('pageSize', String(pageSize))
  if (status) params.set('status', status)

  // Backend trả về envelope phẳng: { items, pagination: { page, pageSize, totalCount, totalPages } }
  // Cần map page -> pageIndex cho internal use
  return apiRequest<{
    items: AdminBroadcast[]
    pagination: BroadcastsPagination
  }>(`/admin/broadcasts?${params.toString()}`, { signal }).then((response) => ({
    items: response.items,
    pagination: {
      page: response.pagination.page,
      pageSize: response.pagination.pageSize,
      totalCount: response.pagination.totalCount,
      totalPages: response.pagination.totalPages,
    },
  }))
}

export const createBroadcast = (
  payload: CreateBroadcastRequest,
): Promise<CreateBroadcastResponse> =>
  apiRequest<CreateBroadcastResponse>(
    '/admin/broadcasts',
    { method: 'POST', body: JSON.stringify(payload) },
    { retryUnauthorized: false },
  )