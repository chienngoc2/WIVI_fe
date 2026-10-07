import { test, expect } from '@playwright/test'
import { realAdminSession } from '../fixtures/accounts'
import { seedSession } from '../fixtures/session'
import { trackApiRequests } from '../fixtures/api-traffic'
import {
  buildUser,
  seedStubAdminSession,
  stubUsersList,
  usersListResponse,
} from '../fixtures/members'
import type { AdminUsersListResponse } from '../../src/types/admin'

const listGetRequests = (requests: { method: string; url: string }[]) =>
  requests.filter((request) => request.method === 'GET' && request.url.includes('/api/v1/admin/users?'))

test.describe('Suite E — Members list (Stage 2, dữ liệu thật)', () => {
  test('TC-MEM-01 @real: Mở /members gọi list với pageIndex/pageSize mặc định, không gửi filter rỗng', async ({ page }) => {
    await seedSession(page, await realAdminSession())
    const requests = trackApiRequests(page)

    const listResponse = page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('/api/v1/admin/users?'),
    )
    await page.goto('/members')

    const response = await listResponse
    expect(response.status()).toBe(200)
    const payload = (await response.json()) as AdminUsersListResponse

    const listRequest = listGetRequests(requests)[0]
    if (!listRequest) throw new Error('Không thấy request GET /api/v1/admin/users')

    const params = new URL(listRequest.url).searchParams
    expect(params.get('pageIndex')).toBe('1')
    expect(params.get('pageSize')).toBe('20')
    // "Tất cả" ⇒ bỏ hẳn param; keyword rỗng cũng không được gửi chuỗi rỗng.
    expect(params.get('status')).toBeNull()
    expect(params.get('keyword')).toBeNull()

    // Pagination hiển thị đúng số backend trả, không tự tính từ mảng hiện tại.
    await expect(page.getByTestId('members-page')).toBeVisible()
    await expect(page.getByTestId('members-page-info')).toContainText(String(payload.pagination.totalCount))
    if (payload.data.length > 0) {
      await expect(page.locator('tbody tr')).toHaveCount(payload.data.length)
    } else {
      // EmptyState cũng render bằng <tr>, nên chỉ assert số hàng khi backend thật sự có dữ liệu.
      await expect(page.getByText('Chưa có thành viên nào')).toBeVisible()
    }
  })

  test('TC-MEM-02 @real: Keyword debounce ~350ms, chỉ gọi API sau khi ngừng gõ và reset page về 1', async ({ page }) => {
    await seedSession(page, await realAdminSession())
    const requests = trackApiRequests(page)

    const initialListResponse = page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('/api/v1/admin/users?'),
    )
    await page.goto('/members?pageIndex=1')
    await initialListResponse

    const search = page.getByPlaceholder('Tìm theo username, email, họ tên…')
    const keywordRequest = page.waitForRequest(
      (request) => request.method() === 'GET' && request.url().includes('keyword=abc'),
    )
    const keywordResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).searchParams.get('keyword') === 'abc',
    )
    const typedAt = Date.now()
    await search.pressSequentially('abc', { delay: 50 })

    // Debounce: ngay sau khi gõ xong vẫn CHƯA có request nào cho keyword vừa gõ.
    // (Nếu không debounce, keystroke đầu đã bắn request ngay.)
    expect(listGetRequests(requests).some((request) => request.url.includes('keyword=abc'))).toBe(false)

    await keywordRequest
    const response = await keywordResponse
    expect(response.status()).toBe(200)
    const payload = (await response.json()) as AdminUsersListResponse
    expect(
      payload.data.every((user) =>
        `${user.userName} ${user.email} ${user.firstName} ${user.lastName}`.toLowerCase().includes('abc'),
      ),
    ).toBe(true)
    if (payload.data.length === 0) {
      await expect(page.getByText('Không tìm thấy kết quả khớp bộ lọc')).toBeVisible()
    } else {
      await expect(page.locator('tbody tr')).toHaveCount(payload.data.length)
    }

    // Request chỉ được gửi sau khi ngừng gõ ~350ms, không phải mỗi keystroke một request.
    // Chỉ assert ngưỡng dưới để không flaky khi môi trường chậm (mạng/DB thật).
    expect(Date.now() - typedAt).toBeGreaterThanOrEqual(250)

    // keyword là state trên URL, và đổi filter phải reset page.
    expect(new URL(page.url()).searchParams.get('keyword')).toBe('abc')
    expect(new URL(page.url()).searchParams.get('pageIndex')).toBeNull()
  })

  test('TC-MEM-03 @real: Lọc trạng thái chạy server-side và giữ trên URL', async ({ page }) => {
    await seedSession(page, await realAdminSession())
    const initialListResponse = page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('/api/v1/admin/users?'),
    )
    await page.goto('/members')
    await initialListResponse

    const bannedResponse = page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('status=Banned'),
    )
    await page.getByTestId('members-status-Banned').click()
    const response = await bannedResponse
    expect(response.status()).toBe(200)

    expect(new URL(response.url()).searchParams.get('status')).toBe('Banned')
    expect(new URL(response.url()).searchParams.get('pageIndex')).toBe('1')
    expect(new URL(page.url()).searchParams.get('status')).toBe('Banned')
    await expect(page.getByTestId('members-status-Banned')).toHaveAttribute('aria-pressed', 'true')

    // Đợi response xong rồi mới assert nội dung: lúc refetch, bảng vẫn giữ dữ liệu cũ + busy indicator.
    const payload = (await response.json()) as AdminUsersListResponse
    await expect(page.getByTestId('members-page-info')).toContainText(String(payload.pagination.totalCount))
    if (payload.data.length > 0) {
      await expect(page.locator('tbody tr').first().getByText('Bị cấm')).toBeVisible()
    } else {
      // Backend lọc đúng nhưng không có account nào bị cấm: phải ra empty state "rỗng do filter".
      await expect(page.getByText('Không tìm thấy kết quả khớp bộ lọc')).toBeVisible()
    }

    const allResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/v1/admin/users?') &&
        !response.url().includes('status='),
    )
    await page.getByTestId('members-status-all').click()
    expect((await allResponse).status()).toBe(200)
    expect(new URL(page.url()).searchParams.get('status')).toBeNull()
  })

  test('TC-MEM-04 @real: Pagination điều khiển bằng envelope pagination của backend', async ({ page }) => {
    await seedSession(page, await realAdminSession())

    const firstResponse = page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('/api/v1/admin/users?'),
    )
    await page.goto('/members')
    const payload = (await (await firstResponse).json()) as AdminUsersListResponse

    const previous = page.getByTestId('members-prev')
    const next = page.getByTestId('members-next')
    await expect(previous).toBeDisabled()
    await expect(page.getByTestId('members-page-info')).toContainText(
      `Trang 1/${Math.max(1, payload.pagination.totalPages)}`,
    )

    if (payload.pagination.totalPages < 2) {
      // Chỉ một trang dữ liệu: "Sau" phải bị khoá theo totalPages backend trả.
      await expect(next).toBeDisabled()
      return
    }

    const secondResponse = page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('pageIndex=2'),
    )
    await next.click()
    const pageTwo = (await (await secondResponse).json()) as AdminUsersListResponse

    expect(new URL(page.url()).searchParams.get('pageIndex')).toBe('2')
    expect(pageTwo.pagination.page).toBe(2)
    await expect(page.getByTestId('members-page-info')).toContainText(
      `Trang 2/${Math.max(1, pageTwo.pagination.totalPages)}`,
    )
    await expect(previous).toBeEnabled()
  })

  test('TC-MEM-05 @real: "Xem" gọi GET /admin/users/:id và render dữ liệu backend', async ({ page }) => {
    await seedSession(page, await realAdminSession())

    const listResponse = page.waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes('/api/v1/admin/users?'),
    )
    await page.goto('/members')
    const payload = (await (await listResponse).json()) as AdminUsersListResponse

    const first = payload.data[0]
    if (!first) throw new Error('Backend không trả account nào để kiểm tra flow detail')

    const detailRequest = page.waitForRequest(
      (request) => request.method() === 'GET' && request.url().includes(`/api/v1/admin/users/${first.id}`),
    )
    await page.locator('tbody tr').first().getByTestId('members-action-view').click()
    const request = await detailRequest
    expect(request.url()).toContain(`/api/v1/admin/users/${first.id}`)

    const detail = page.getByTestId('members-detail')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(first.id)
    await expect(detail).toContainText(first.userName)
    await expect(detail).toContainText(first.email)
    // Không hiển thị quota/subscription/Sepay vì API không trả.
    await expect(detail).not.toContainText('Sepay')
    await expect(detail).not.toContainText('Hạn ngạch')

    await page.getByRole('button', { name: 'Đóng' }).click()
    await expect(detail).not.toBeVisible()
  })
})

test.describe('Suite F — Members list: empty / error / retry (@stub)', () => {
  test('TC-MEM-10 @stub: Rỗng tự nhiên hiển thị empty state không có nút xoá filter', async ({ page }) => {
    await seedStubAdminSession(page)
    await stubUsersList(page, [{ status: 200, body: usersListResponse([], { totalCount: 0, totalPages: 1 }) }])

    await page.goto('/members')

    await expect(page.getByText('Chưa có thành viên nào')).toBeVisible()
    await expect(page.getByTestId('members-empty-clear')).not.toBeVisible()
    await expect(page.getByTestId('members-error')).not.toBeVisible()
  })

  test('TC-MEM-11 @stub: Rỗng do filter có empty state riêng và nút xoá bộ lọc', async ({ page }) => {
    await seedStubAdminSession(page)
    await stubUsersList(page, [{ status: 200, body: usersListResponse([], { totalCount: 0, totalPages: 1 }) }])

    await page.goto('/members?keyword=khong-co-ai&status=Banned')

    await expect(page.getByText('Không tìm thấy kết quả khớp bộ lọc')).toBeVisible()
    const clear = page.getByTestId('members-empty-clear')
    await expect(clear).toBeVisible()

    const clearedRequest = page.waitForRequest(
      (request) =>
        request.method() === 'GET' &&
        request.url().includes('/api/v1/admin/users?') &&
        !request.url().includes('keyword='),
    )
    await clear.click()
    await clearedRequest

    expect(new URL(page.url()).searchParams.get('keyword')).toBeNull()
    expect(new URL(page.url()).searchParams.get('status')).toBeNull()
  })

  test('TC-MEM-12 @stub: Lỗi tải list hiện error state, "Thử lại" tải lại thành công', async ({ page }) => {
    await seedStubAdminSession(page)
    await stubUsersList(page, [
      { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ tạm thời', field: null, details: {} } },
      { status: 200, body: usersListResponse([buildUser()]) },
    ])

    await page.goto('/members')

    const errorState = page.getByTestId('members-error')
    await expect(errorState).toBeVisible()
    await expect(errorState).toContainText('Lỗi máy chủ tạm thời')

    await page.getByTestId('members-retry').click()

    await expect(page.getByTestId('members-error')).not.toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('tbody tr').first()).toContainText('nva@wivi.vn')
  })
})
