import { test, expect } from '@playwright/test'
import { adminAccount, apiBaseUrl, apiLogin, toSession, userAccount } from '../fixtures/accounts'
import { seedSession } from '../fixtures/session'
import {
  buildUser,
  seedStubAdminSession,
  setUserStatusDirectly,
  stubUserDetail,
  stubUserStatus,
  stubUsersList,
  usersListResponse,
} from '../fixtures/members'
import type { AdminUsersListResponse } from '../../src/types/admin'

/** Tìm id account thật theo email để dựng precondition / dọn dẹp. */
const findUserIdByEmail = async (accessToken: string, email: string): Promise<string> => {
  const response = await fetch(
    `${apiBaseUrl()}/api/v1/admin/users?pageIndex=1&pageSize=100&keyword=${encodeURIComponent(email)}`,
    { headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` } },
  )
  if (!response.ok) throw new Error(`Không đọc được danh sách user thật (HTTP ${response.status})`)

  const payload = (await response.json()) as AdminUsersListResponse
  const found = payload.data.find((item) => item.email.toLowerCase() === email.toLowerCase())
  if (!found) throw new Error(`Không tìm thấy account seed ${email} trong backend`)
  return found.id
}

test.describe('Suite G — Members actions (Stage 2)', () => {
  test('TC-MEM-06 @real: Cấm rồi bỏ cấm gửi status đích tường minh và refetch list', async ({ page }) => {
    const account = adminAccount()
    const target = userAccount()
    const login = await apiLogin(account)
    await seedSession(page, toSession(login))

    const targetId = await findUserIdByEmail(login.accessToken, target.email)
    // Precondition: account seed phải đang Active (test phải chạy lại được sau lần fail trước).
    await setUserStatusDirectly(apiBaseUrl(), login.accessToken, targetId, 'Active')

    const reason = 'E2E: vi phạm điều khoản (sẽ được bỏ cấm ở cuối test)'
    try {
      await page.goto(`/members?keyword=${encodeURIComponent(target.email)}`)
      const row = page.locator('tbody tr', { hasText: target.email })
      await expect(row).toBeVisible()
      await expect(row.getByText('Hoạt động')).toBeVisible()

      /* ------------------------------ Cấm ------------------------------ */
      await row.getByTestId('members-action-ban').click()
      const confirm = page.getByTestId('members-confirm')
      await expect(confirm).toBeVisible()
      await expect(confirm).toContainText(target.email)

      await page.getByTestId('members-confirm-reason').fill(reason)

      const banRequest = page.waitForRequest(
        (request) => request.method() === 'PATCH' && request.url().includes('/status'),
      )
      // Refetch list phải xảy ra SAU mutation, nên đăng ký chờ trước khi click.
      const refetched = page.waitForRequest(
        (request) => request.method() === 'GET' && request.url().includes('/api/v1/admin/users?'),
      )
      await page.getByTestId('members-confirm-submit').click()

      const banPayload = (await (await banRequest).postDataJSON()) as Record<string, unknown>
      expect(banPayload).toEqual({ status: 'Banned', statusReason: reason })

      // GET refetch: không patch row bằng response mutation (shape ban/unban khác nhau).
      await refetched

      await expect(confirm).not.toBeVisible()
      await expect(row.getByText('Bị cấm')).toBeVisible()
      await expect(page.getByTestId('members-notice')).toContainText('Đã cấm tài khoản')

      /* ---------------------------- Bỏ cấm ---------------------------- */
      const unbanRequest = page.waitForRequest(
        (request) => request.method() === 'PATCH' && request.url().includes('/status'),
      )
      await row.getByTestId('members-action-unban').click()
      // Tiêu đề dialog nằm ở header của Modal, không nằm trong `members-confirm` (body).
      await expect(page.getByRole('heading', { name: 'Unban tài khoản' })).toBeVisible()
      await expect(page.getByTestId('members-confirm')).toContainText('sẽ chuyển về trạng thái')
      // Dialog bỏ cấm không có ô lý do.
      await expect(page.getByTestId('members-confirm-reason')).not.toBeVisible()

      await page.getByTestId('members-confirm-submit').click()
      const unbanPayload = (await (await unbanRequest).postDataJSON()) as Record<string, unknown>
      expect(unbanPayload).toEqual({ status: 'Active' })

      await expect(row.getByText('Hoạt động')).toBeVisible()
      await expect(page.getByTestId('members-notice')).toContainText('Đã bỏ cấm tài khoản')
    } finally {
      // Luôn trả account seed về Active, kể cả khi assert giữa chừng fail.
      await setUserStatusDirectly(apiBaseUrl(), login.accessToken, targetId, 'Active')
    }
  })

  test('TC-MEM-07 @stub: PATCH đang pending thì nút submit và ô lý do bị disable', async ({ page }) => {
    await seedStubAdminSession(page)
    const user = buildUser()
    await stubUsersList(page, [{ status: 200, body: usersListResponse([user]) }])
    await stubUserStatus(
      page,
      { status: 200, body: { id: user.id, status: 'Banned', statusReason: 'E2E pending' } },
      1500,
    )

    await page.goto('/members')
    const row = page.locator('tbody tr').first()
    await expect(row).toBeVisible()
    await row.getByTestId('members-action-ban').click()

    const submit = page.getByTestId('members-confirm-submit')
    await expect(submit).toBeEnabled()

    const refetched = page.waitForRequest(
      (request) => request.method() === 'GET' && request.url().includes('/api/v1/admin/users?'),
    )
    await submit.click()

    // Pending: control mutation bị khoá, dialog vẫn mở.
    await expect(submit).toBeDisabled()
    await expect(submit).toHaveText('Đang xử lý…')
    await expect(page.getByTestId('members-confirm-reason')).toBeDisabled()
    await expect(page.getByTestId('members-confirm')).toBeVisible()

    await refetched
    await expect(page.getByTestId('members-confirm')).not.toBeVisible()
    await expect(page.getByTestId('members-notice')).toContainText('Đã cấm tài khoản')
  })

  test('TC-MEM-08 @stub: PATCH 500 (bản ghi đã cũ) ⇒ đóng dialog, cảnh báo và refetch', async ({ page }) => {
    await seedStubAdminSession(page)
    const user = buildUser()
    await stubUsersList(page, [{ status: 200, body: usersListResponse([user]) }])
    await stubUserStatus(page, {
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: 'Account not found', field: null, details: {} },
    })

    await page.goto('/members')
    await page.locator('tbody tr').first().getByTestId('members-action-ban').click()

    const refetched = page.waitForRequest(
      (request) => request.method() === 'GET' && request.url().includes('/api/v1/admin/users?'),
    )
    await page.getByTestId('members-confirm-submit').click()
    await refetched

    await expect(page.getByTestId('members-confirm')).not.toBeVisible()
    await expect(page.getByTestId('members-notice')).toContainText('có thể đã bị thay đổi ở nơi khác')
    // Không hiển thị lỗi 500 thô từ backend cho operator.
    await expect(page.getByTestId('members-mutation-error')).not.toBeVisible()
  })

  test('TC-MEM-09 @stub: Detail lỗi hiện error state trong modal và "Thử lại" gọi lại API', async ({ page }) => {
    await seedStubAdminSession(page)
    const user = buildUser()
    await stubUsersList(page, [{ status: 200, body: usersListResponse([user]) }])
    await stubUserDetail(page, {
      status: 404,
      body: { code: 'NOT_FOUND', message: 'User not found', field: null, details: {} },
    })

    await page.goto('/members')
    await page.locator('tbody tr').first().getByTestId('members-action-view').click()

    const detail = page.getByTestId('members-detail')
    await expect(detail).toContainText('User not found')

    const retried = page.waitForRequest(
      (request) => request.method() === 'GET' && request.url().includes(`/api/v1/admin/users/${user.id}`),
    )
    await detail.getByRole('button', { name: 'Thử lại' }).click()
    await retried
  })
})
