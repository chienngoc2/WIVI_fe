import { apiRequest } from '../lib/api/client'
import type {
  AdminUser,
  AdminUsersListResponse,
  AdminUserStatus,
  UpdateUserStatusResponse,
} from '../types/admin'

export interface ListUsersParams {
  /** Backend nhận `pageIndex` (không phải `page`) và tự clamp `page >= 1`. */
  pageIndex: number
  pageSize: number
  /** `null` = tất cả trạng thái; bỏ hẳn param thay vì gửi chuỗi rỗng. */
  status: AdminUserStatus | null
  /** `null`/rỗng = không lọc; bỏ hẳn param thay vì gửi `keyword=''`. */
  keyword: string | null
  signal?: AbortSignal
}

export const listUsers = ({
  pageIndex,
  pageSize,
  status,
  keyword,
  signal,
}: ListUsersParams): Promise<AdminUsersListResponse> => {
  const params = new URLSearchParams()
  params.set('pageIndex', String(pageIndex))
  params.set('pageSize', String(pageSize))
  if (status) params.set('status', status)
  if (keyword) params.set('keyword', keyword)

  return apiRequest<AdminUsersListResponse>(`/admin/users?${params.toString()}`, { signal })
}

export const getUserDetail = (userId: string, signal?: AbortSignal): Promise<AdminUser> =>
  apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(userId)}`, { signal })

/**
 * Cập nhật trạng thái tài khoản bằng status ĐÍCH tường minh.
 *
 * Mapping UI ↔ backend (chốt của Stage 2):
 * - Nút **"Cấm tài khoản"** trên UI ⇒ `PATCH { status: 'Banned', statusReason? }`.
 *   Backend gọi `Account.ban()`; user bị chặn login.
 * - Nút **"Bỏ cấm tài khoản"** ⇒ `PATCH { status: 'Active' }` ⇒ `Account.unban()`.
 *
 * Đây KHÔNG phải API xoá user: backend không có `DELETE /admin/users/:id`, không có
 * soft-delete và không có trạng thái `Inactive`/`Disabled`. Caller phải refetch list/detail
 * sau khi thành công vì response ban và unban khác shape nhau.
 *
 * `statusReason` chỉ gửi khi cấm; unban để backend tự xoá reason (`unban()` set `null`).
 */
export const updateUserStatus = (
  userId: string,
  status: AdminUserStatus,
  statusReason?: string,
): Promise<UpdateUserStatusResponse> => {
  const body: { status: AdminUserStatus; statusReason?: string } = { status }
  if (status === 'Banned' && statusReason) body.statusReason = statusReason

  return apiRequest<UpdateUserStatusResponse>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}
