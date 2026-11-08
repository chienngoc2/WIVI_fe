import { apiRequest } from '../lib/api/client'
import type { AdminSepayStats } from '../types/admin'

export interface SepayStatsParams {
  fromDate?: string
  toDate?: string
  signal?: AbortSignal
}

export const getSepayStats = (
  options: SepayStatsParams = {},
): Promise<AdminSepayStats> => {
  const params = new URLSearchParams()
  if (options.fromDate) params.set('fromDate', options.fromDate)
  if (options.toDate) params.set('toDate', options.toDate)
  const qs = params.size ? `?${params.toString()}` : ''
  return apiRequest<AdminSepayStats>(`/admin/sepay/stats${qs}`, {
    signal: options.signal,
  })
}
