import { apiRequest } from '../lib/api/client'
import type { AdminAiUsageReport } from '../types/admin'

export interface AiUsageReportParams {
  fromDate?: string
  toDate?: string
  signal?: AbortSignal
}

export const getAiUsageReport = (
  options: AiUsageReportParams = {},
): Promise<AdminAiUsageReport> => {
  const params = new URLSearchParams()
  if (options.fromDate) params.set('fromDate', options.fromDate)
  if (options.toDate) params.set('toDate', options.toDate)
  const qs = params.size ? `?${params.toString()}` : ''
  return apiRequest<AdminAiUsageReport>(`/admin/ai/usage${qs}`, {
    signal: options.signal,
  })
}
