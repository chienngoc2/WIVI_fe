import { apiRequest } from '../lib/api/client'
import type { AdminProfile } from '../types/admin'

export const getAdminProfile = (signal?: AbortSignal): Promise<AdminProfile> =>
  apiRequest<AdminProfile>('/admin/me', { signal })
