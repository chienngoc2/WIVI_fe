import { test, expect } from '@playwright/test'

test.describe('Suite F — Cấu hình thiếu base URL', () => {
  test('TC-AUTH-60: @config Báo lỗi fail-fast khi không có VITE_API_BASE_URL', async ({ page }) => {
    // Chạy trong runner của playwright.config.no-api-base.ts với tag @config.
    // Không mock gì: client phải fail-fast trước khi kịp gọi backend.
    await page.goto('/login')

    await page.getByLabel('Email').fill('admin@wivi.vn')
    await page.getByLabel('Mật khẩu').fill('Admin#1234')
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('Thiếu cấu hình VITE_API_BASE_URL. Hãy cấu hình địa chỉ API rồi tải lại trang.')
    await expect(page).toHaveURL(/\/login/)
  })
})
