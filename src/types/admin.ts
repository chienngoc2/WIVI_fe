export interface AdminIdentity {
  id: string
  fullName: string
  email: string
  role: string
}

export interface LoginResponse {
  id: string
  username: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  role: string
  isOnboardingCompleted: boolean
  isOnboarded: boolean
  accessToken: string
  refreshToken: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthSession extends AuthTokens {
  identity: AdminIdentity
}

export interface ApiErrorBody {
  code: string
  message: string
  field: string | null
  details: unknown
}

/* -------------------------------------------------------------------------- */
/* Stage 2 — quản lý thành viên (`/api/v1/admin/users`)                        */
/* -------------------------------------------------------------------------- */

/** Backend enum tiếng Anh (`AccountStatus`): `Active` | `Banned`. Label hiển thị tiếng Việt ở page. */
export type AdminUserStatus = 'Active' | 'Banned'

/**
 * Một account trong `GET /api/v1/admin/users` và `GET /api/v1/admin/users/:id`.
 *
 * Drift đã verify với runtime (`get-users.handler.ts`, `get-user-detail.handler.ts`):
 * - Field là `userName` (list/detail). Ban/unban response lại dùng `username`.
 * - Handler map `createdAt: account.createdAt?.toISOString()` nên key này có thể VẮNG
 *   trong JSON (optional chaining trả `undefined`); khai báo `| null` để page render `—`.
 * - Backend hiện KHÔNG trả `role`, và không trả gói/quota Sepay cho từng user.
 */
export interface AdminUser {
  id: string
  userName: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  preferredCurrency: string
  isOnboardingCompleted: boolean
  status: AdminUserStatus
  statusReason: string | null
  createdAt: string | null
  lastLoginAt: string | null
}

/** Envelope phân trang của `/admin/users`: lồng `pagination`, request dùng `pageIndex`. */
export interface ListPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface AdminUsersListResponse {
  data: AdminUser[]
  pagination: ListPagination
}

/**
 * Response của `PATCH /api/v1/admin/users/:id/status`.
 * Ban trả `{id,username,firstName,lastName,email,phone,status,statusReason}`,
 * unban trả `{id,username,status,statusReason}` — KHÁC shape nhau, nên page
 * không được patch row/list từ response này mà phải refetch.
 */
export interface UpdateUserStatusResponse {
  id: string
  status: AdminUserStatus
  statusReason: string | null
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string | null
}
