import { apiRequest } from '../lib/api/client'
import type {
  AdminPaymentOrdersResponse,
  AdminPaymentOrderStatus,
  AdminRevenueReport,
} from '../types/admin'

export interface ListPaymentOrdersParams {
  page: number
  pageSize: number
  status?: AdminPaymentOrderStatus | null
  planId?: string | null
  keyword?: string | null
  fromDate?: string | null
  toDate?: string | null
  signal?: AbortSignal
}

export interface RevenueReportParams {
  fromDate?: string
  toDate?: string
  signal?: AbortSignal
}

export const listPaymentOrders = (
  options: ListPaymentOrdersParams,
): Promise<AdminPaymentOrdersResponse> => {
  const params = new URLSearchParams()
  params.set('page', String(options.page))
  params.set('pageSize', String(options.pageSize))
  if (options.status) params.set('status', options.status)
  if (options.planId) params.set('planId', options.planId)
  if (options.keyword && options.keyword.trim()) {
    params.set('keyword', options.keyword.trim())
  }
  if (options.fromDate) params.set('fromDate', options.fromDate)
  if (options.toDate) params.set('toDate', options.toDate)

  return apiRequest<AdminPaymentOrdersResponse>(
    `/admin/subscriptions/orders?${params.toString()}`,
    { signal: options.signal },
  )
}

export const getRevenueReport = (
  options: RevenueReportParams = {},
): Promise<AdminRevenueReport> => {
  const params = new URLSearchParams()
  if (options.fromDate) params.set('fromDate', options.fromDate)
  if (options.toDate) params.set('toDate', options.toDate)
  const qs = params.size ? `?${params.toString()}` : ''
  return apiRequest<AdminRevenueReport>(
    `/admin/subscriptions/revenue${qs}`,
    { signal: options.signal },
  )
}
