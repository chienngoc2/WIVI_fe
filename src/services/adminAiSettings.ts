import { apiRequest } from '../lib/api/client'
import type { AdminAiSettings, UpdateAiSettingsRequest } from '../types/admin'

export const getAiSettings = (signal?: AbortSignal): Promise<AdminAiSettings> =>
  apiRequest<AdminAiSettings>('/admin/ai-settings', { signal })

export const updateAiSettings = (
  payload: UpdateAiSettingsRequest,
): Promise<{ modelName: string; isEnabled: boolean }> =>
  apiRequest<{ modelName: string; isEnabled: boolean }>(
    '/admin/ai-settings',
    { method: 'PATCH', body: JSON.stringify(payload) },
    { retryUnauthorized: false },
  )