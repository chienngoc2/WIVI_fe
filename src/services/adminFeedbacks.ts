import { apiRequest } from '../lib/api/client'
import type { AdminFeedbackListResponse, AdminFeedbackSummary, ReferralSource } from '../types/admin'

export interface FeedbackRangeParams { fromDate?: string; toDate?: string; signal?: AbortSignal }
export interface ListFeedbacksParams extends FeedbackRangeParams {
  page: number
  pageSize: number
  rating?: number
  referralSource?: ReferralSource
}
const rangeParams = ({ fromDate, toDate }: FeedbackRangeParams) => {
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  return params
}
export const listFeedbacks = (options: ListFeedbacksParams): Promise<AdminFeedbackListResponse> => {
  const params = rangeParams(options)
  params.set('page', String(options.page))
  params.set('pageSize', String(options.pageSize))
  if (options.rating !== undefined) params.set('rating', String(options.rating))
  if (options.referralSource) params.set('referralSource', options.referralSource)
  return apiRequest(`/admin/feedbacks?${params.toString()}`, { signal: options.signal })
}
export const getFeedbackSummary = (options: FeedbackRangeParams = {}): Promise<AdminFeedbackSummary> => {
  const params = rangeParams(options)
  return apiRequest(`/admin/feedbacks/summary${params.size ? `?${params.toString()}` : ''}`, { signal: options.signal })
}
