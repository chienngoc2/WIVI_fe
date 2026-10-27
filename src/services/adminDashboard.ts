import { apiRequest } from '../lib/api/client'
import type {
  AdminDashboardResponse,
  RegistrationSeriesResponse,
} from '../types/admin'

export const getAdminDashboard = (
  signal?: AbortSignal,
): Promise<AdminDashboardResponse> =>
  apiRequest<AdminDashboardResponse>('/admin/dashboard', { signal })

export interface GetRegistrationSeriesParams {
  fromDate?: string
  toDate?: string
  signal?: AbortSignal
}

export const getRegistrationSeries = (
  options: GetRegistrationSeriesParams = {},
): Promise<RegistrationSeriesResponse> => {
  const params = new URLSearchParams()
  if (options.fromDate) params.set('fromDate', options.fromDate)
  if (options.toDate) params.set('toDate', options.toDate)
  const qs = params.size ? `?${params.toString()}` : ''
  return apiRequest<RegistrationSeriesResponse>(
    `/admin/dashboard/registrations${qs}`,
    { signal: options.signal },
  )
}
