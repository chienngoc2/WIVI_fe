import type { Page, Route } from '@playwright/test'
import type { AdminUser, AdminUsersListResponse, AuthSession, ListPagination } from '../../src/types/admin'
import { seedSession } from './session'

/**
 * Endpoint pattern (glob Playwright: `*` KHÔNG vượt qua `/`).
 * Nhờ vậy 3 pattern tách bạch list / detail / status.
 */
export const USERS_LIST_ENDPOINT = '**/api/v1/admin/users*'
export const USER_DETAIL_ENDPOINT = '**/api/v1/admin/users/*'
export const USER_STATUS_ENDPOINT = '**/api/v1/admin/users/*/status'

export interface StubReply {
  status: number
  body: unknown
}

/**
 * Session Admin giả, KHÔNG đi qua backend.
 *
 * CHỈ dùng cho test `@stub` — tức các nhánh mà backend thật không tạo được theo yêu cầu:
 * list rỗng, list lỗi 500 rồi retry thành công, PATCH bị giữ pending, PATCH trả 500 stale.
 * Suite `@real` vẫn dùng session thật lấy từ `fixtures/accounts.ts`.
 */
export const stubAdminSession = (): AuthSession => ({
  accessToken: 'stub-access-token',
  refreshToken: 'stub-refresh-token',
  identity: {
    id: 'stub-admin-id',
    fullName: 'Stub Admin',
    email: 'stub.admin@wivi.vn',
    role: 'Admin',
  },
})

export const seedStubAdminSession = async (page: Page): Promise<void> => {
  await seedSession(page, stubAdminSession())
}

/** Account đúng shape `AdminUser` để test FE, không phải dữ liệu thật. */
export const buildUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: '11111111-1111-4111-8111-111111111111',
  userName: 'nguyenvana',
  firstName: 'Nguyễn Văn',
  lastName: 'A',
  email: 'nva@wivi.vn',
  phone: null,
  avatarUrl: null,
  preferredCurrency: 'VND',
  isOnboardingCompleted: true,
  status: 'Active',
  statusReason: null,
  createdAt: '2026-06-18T05:10:00.000Z',
  lastLoginAt: '2026-06-18T05:10:00.000Z',
  ...overrides,
})

/** Envelope thật của `GET /admin/users`: `{data, pagination}` với request param `pageIndex`. */
export const usersListResponse = (
  users: AdminUser[],
  pagination: Partial<ListPagination> = {},
): AdminUsersListResponse => {
  const pageSize = pagination.pageSize ?? 20
  const totalCount = pagination.totalCount ?? users.length
  return {
    data: users,
    pagination: {
      page: pagination.page ?? 1,
      pageSize,
      totalCount,
      totalPages: pagination.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)),
    },
  }
}

const fulfillJson = async (route: Route, reply: StubReply): Promise<void> => {
  await route.fulfill({
    status: reply.status,
    contentType: 'application/json',
    body: JSON.stringify(reply.body),
  })
}

/**
 * Stub `GET /admin/users`: trả lần lượt các reply trong `replies`, lần gọi vượt số phần tử
 * thì dùng reply cuối. Dùng để kiểm tra nhánh lỗi → retry thành công (2 lần gọi khác nhau).
 */
export const stubUsersList = async (page: Page, replies: StubReply[]): Promise<void> => {
  let callIndex = 0
  await page.route(USERS_LIST_ENDPOINT, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    const reply = replies[Math.min(callIndex, replies.length - 1)]
    callIndex += 1
    await fulfillJson(route, reply)
  })
}

/** Stub `GET /admin/users/:id`. */
export const stubUserDetail = async (page: Page, reply: StubReply): Promise<void> => {
  await page.route(USER_DETAIL_ENDPOINT, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await fulfillJson(route, reply)
  })
}

/**
 * Stub `PATCH /admin/users/:id/status` với độ trễ `delayMs` để quan sát trạng thái pending.
 */
export const stubUserStatus = async (page: Page, reply: StubReply, delayMs = 0): Promise<void> => {
  await page.route(USER_STATUS_ENDPOINT, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.continue()
      return
    }
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    await fulfillJson(route, reply)
  })
}

/** Đổi status trực tiếp qua backend thật, dùng để dọn dẹp (unban) sau test. */
export const setUserStatusDirectly = async (
  apiBaseUrl: string,
  accessToken: string,
  userId: string,
  status: 'Active' | 'Banned',
  statusReason?: string,
): Promise<number> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(statusReason ? { status, statusReason } : { status }),
  })
  return response.status
}
