import { apiRequest } from '../lib/api/client'
import type { AdminDashboardResponse } from '../types/admin'

export const getAdminDashboard = (signal?: AbortSignal): Promise<AdminDashboardResponse> =>
  apiRequest<AdminDashboardResponse>('/admin/dashboard', { signal })