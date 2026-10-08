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

/* -------------------------------------------------------------------------- */
/* Stage 3 — Broadcast thủ công (`/api/v1/admin/broadcasts`)                 */
/* -------------------------------------------------------------------------- */

/** Trạng thái broadcast theo backend enum (`BroadcastStatus`): Queued | Sent | Failed | Cancelled */
export type BroadcastStatus = 'Queued' | 'Sent' | 'Failed' | 'Cancelled'

/** Broadcast item trong list response */
export interface AdminBroadcast {
  id: string
  title: string
  body: string
  targetAudience: string
  status: BroadcastStatus
  scheduledAt: string | null
  sentAt: string | null
  targetCount: number
  deliveredCount: number
}

/** Envelope phân trang của `/admin/broadcasts`: shape phẳng (khác với `/admin/users`) */
export interface BroadcastsPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface AdminBroadcastsListResponse {
  items: AdminBroadcast[]
  pagination: BroadcastsPagination
}

/** Request body cho tạo broadcast mới */
export interface CreateBroadcastRequest {
  title: string
  body: string
  targetAudience: string
  scheduledAt?: string | null
}

/** Response của `POST /api/v1/admin/broadcasts` */
export interface CreateBroadcastResponse {
  id: string
  title: string
  body: string
  targetAudience: string
  status: BroadcastStatus
  scheduledAt: string | null
  sentAt: string | null
  targetCount: number
  deliveredCount: number
}

/* -------------------------------------------------------------------------- */
/* Stage 4 — Cấu hình AI (`/api/v1/admin/ai-settings`)                       */
/* -------------------------------------------------------------------------- */

export interface AdminAiSettings {
  modelName: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  isEnabled: boolean
  rebalanceThresholdPercent: number
  // apiKeyMasked chỉ có trong GET khi backend hỗ trợ; hiện không dùng
}

export interface UpdateAiSettingsRequest {
  modelName?: string | null
  systemPrompt?: string | null
  temperature?: number | null
  maxTokens?: number | null
  isEnabled?: boolean | null
  // rebalanceThresholdPercent không được PATCH theo contract hiện tại
}

/* -------------------------------------------------------------------------- */
/* Stage 5 — Subscription plans (`/api/v1/admin/subscriptions/plans`)        */
/* -------------------------------------------------------------------------- */

export type BillingCycle = 'monthly' | 'yearly' | 'lifetime'

export interface AdminSubscriptionPlan {
  id: string
  name: string
  code: string
  price: number
  currency: string
  billingCycle: BillingCycle
  features: string[]
  isActive: boolean
  isPopular?: boolean
  description?: string | null
}

/** GET `/admin/subscriptions/plans` trả mảng raw (không có envelope phân trang) */
export type AdminPlansListResponse = AdminSubscriptionPlan[]

export interface CreatePlanRequest {
  code: string
  name: string
  description?: string | null
  price: number
  billingCycle: BillingCycle
  features?: string[] | null
  isPopular?: boolean | null
}

export interface UpdatePlanRequest {
  name?: string | null
  description?: string | null
  price?: number | null
  features?: string[] | null
  isActive?: boolean | null
  isPopular?: boolean | null
  // code và billingCycle không được phép đổi
}

/* -------------------------------------------------------------------------- */
/* Stage 6 — Dashboard (`/api/v1/admin/dashboard`)                            */
/* -------------------------------------------------------------------------- */

export interface AdminDashboardSummary {
  totalUsers: number
  newUsersThisMonth: number
  activeUsersLast30Days: number
  bannedUsers: number
  totalTransactions: number
  transactionsThisMonth: number
  totalJars: number
  activeGoals: number
  pendingImportJobs: number
}

export interface AdminDashboardRecentUser {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  status: string
  isOnboardingCompleted: boolean
  lastLoginAt: string | null
}

export interface AdminDashboardRecentTransaction {
  id: string
  type: string
  transactionsAmount: number
  note: string | null
  transactionDate: string
  user: {
    id: string
    username: string
    firstName: string
    lastName: string
  }
  financialAccount: {
    id: string
    name: string
    accountType: string
  }
  category: {
    id: string
    name: string
  }
}

export interface AdminDashboardResponse {
  summary: AdminDashboardSummary
  recentUsers: AdminDashboardRecentUser[]
  recentTransactions: AdminDashboardRecentTransaction[]
}
