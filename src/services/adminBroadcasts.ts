import { apiRequest } from '../lib/api/client'
import type {
  AdminBroadcastsListResponse,
  AdminBroadcastsRawListResponse,
  CreateBroadcastRequest,
  CreateBroadcastResponse,
} from '../types/admin'

export interface ListBroadcastsParams {
  /** Request gửi `pageIndex` và `pageSize`; response phẳng trả `page`, không có `totalPages`. */
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

  // Backend trả { items, totalCount, page, pageSize }; service tính totalPages cho UI.
  return apiRequest<AdminBroadcastsRawListResponse>(`/admin/broadcasts?${params.toString()}`, { signal }).then((response) => ({
    items: response.items,
    pagination: {
      page: response.page,
      pageSize: response.pageSize,
      totalCount: response.totalCount,
      totalPages: response.pageSize > 0 ? Math.ceil(response.totalCount / response.pageSize) : 0,
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