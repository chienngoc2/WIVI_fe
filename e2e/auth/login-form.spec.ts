import { test, expect } from '@playwright/test'
import { adminAccount } from '../fixtures/accounts'
import { LOGIN_ENDPOINT, delayRealResponse, loginRequests, trackApiRequests } from '../fixtures/api-traffic'

test.describe('Suite B — Hành vi form đăng nhập (dữ liệu thật)', () => {
  test('TC-AUTH-10: Chặn submit form rỗng, hiển thị lỗi validate client', async ({ page }) => {
    const requests = trackApiRequests(page)
    await page.goto('/login')

    await page.getByTestId('login-submit').click()

    await expect(page.locator('#login-email-error')).toHaveText('Vui lòng nhập email.')
    await expect(page.locator('#login-password-error')).toHaveText('Vui lòng nhập mật khẩu.')
    await expect(page.locator('#login-email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#login-password')).toHaveAttribute('aria-invalid', 'true')

    expect(loginRequests(requests)).toHaveLength(0)
  })

  test('TC-AUTH-11: Validate chặn khi thiếu mật khẩu', async ({ page }) => {
    const account = adminAccount()
    const requests = trackApiRequests(page)
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByTestId('login-submit').click()

    await expect(page.locator('#login-password-error')).toHaveText('Vui lòng nhập mật khẩu.')
    await expect(page.locator('#login-email-error')).not.toBeVisible()

    expect(loginRequests(requests)).toHaveLength(0)
  })

  test('TC-AUTH-12: Nút đổi hiện/ẩn mật khẩu', async ({ page }) => {
    await page.goto('/login')

    const passwordInput = page.locator('#login-password')
    const toggleButton = page.getByTestId('login-password-toggle')

    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(toggleButton).toHaveText('Hiện')

    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(toggleButton).toHaveText('Ẩn')

    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(toggleButton).toHaveText('Hiện')
  })

  test('TC-AUTH-13 @real: Chống double-submit khi đang chờ response', async ({ page }) => {
    const account = adminAccount()
    const requests = trackApiRequests(page)
    // Response vẫn từ backend thật, chỉ bị làm trễ để quan sát trạng thái pending.
    await delayRealResponse(page, LOGIN_ENDPOINT, 800)
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)

    const submitButton = page.getByTestId('login-submit')
    await submitButton.click()

    await expect(submitButton).toBeDisabled()
    await expect(submitButton).toHaveText('Đang xác thực…')

    await submitButton.click({ force: true }).catch(() => {})
    await submitButton.click({ force: true }).catch(() => {})

    await expect(page.getByTestId('app-shell')).toBeVisible()

    expect(loginRequests(requests)).toHaveLength(1)
  })
})
