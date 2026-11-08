import { test, expect } from '@playwright/test'
import { realAdminSession } from '../fixtures/accounts'
import { readStoredSession, seedSession } from '../fixtures/session'

test.describe('Suite D — Hết hạn phiên (dữ liệu thật)', () => {
  test('TC-AUTH-40 @real: Xử lý sự kiện hết hạn phiên wivi:admin-session-expired', async ({ page }) => {
    await seedSession(page, await realAdminSession())
    await page.goto('/members')

    await expect(page.getByTestId('app-shell')).toBeVisible()

    // Mô phỏng dispatchSessionExpired(): xoá localStorage và phát custom event
    await page.evaluate(() => {
      window.localStorage.removeItem('wivi.admin.session')
      window.dispatchEvent(new Event('wivi:admin-session-expired'))
    })

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('login-notice')).toHaveText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    await expect(page.getByTestId('app-shell')).not.toBeVisible()

    const stored = await readStoredSession(page)
    expect(stored).toBeNull()
  })
})
