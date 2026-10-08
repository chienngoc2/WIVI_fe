import { apiRequest } from '../lib/api/client'
import type {
  AdminPlansListResponse,
  AdminSubscriptionPlan,
  CreatePlanRequest,
  UpdatePlanRequest,
} from '../types/admin'

export const listPlans = (signal?: AbortSignal): Promise<AdminPlansListResponse> =>
  apiRequest<AdminPlansListResponse>('/admin/subscriptions/plans', { signal })

export const createPlan = (payload: CreatePlanRequest): Promise<AdminSubscriptionPlan> =>
  apiRequest<AdminSubscriptionPlan>(
    '/admin/subscriptions/plans',
    { method: 'POST', body: JSON.stringify(payload) },
    { retryUnauthorized: false },
  )

export const updatePlan = (
  planId: string,
  payload: UpdatePlanRequest,
): Promise<AdminSubscriptionPlan> =>
  apiRequest<AdminSubscriptionPlan>(
    `/admin/subscriptions/plans/${encodeURIComponent(planId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    { retryUnauthorized: false },
  )