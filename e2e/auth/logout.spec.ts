import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { adminAccount, realUserSession } from '../fixtures/accounts'
import { logoutRequests, trackApiRequests } from '../fixtures/api-traffic'
import { readStoredSession, seedSession } from '../fixtures/session'

const logoutResponseOf = (page: Page) =>
  page.waitForResponse((response) => response.url().includes('/api/v1/auth/logout'))

test.describe('Suite E — Đăng xuất (dữ liệu thật)', () => {
  test('TC-AUTH-53 @real: Admin đăng xuất từ shell, Back vẫn bị guard chặn', async ({ page }) => {
    const requests = trackApiRequests(page)
    const account = adminAccount()
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(account.email)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(account.password)
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('app-shell')).toBeVisible()
    await page.getByRole('link', { name: 'Nhật ký giao dịch' }).click()
    await page.getByTestId('topnav-account-menu').click()
    const responsePromise = logoutResponseOf(page)
    await page.getByTestId('topnav-logout').click()
    expect((await responsePromise).status()).toBe(200)
    await expect(page).toHaveURL(/\/login$/)
    expect(await readStoredSession(page)).toBeNull()
    expect(logoutRequests(requests)).toHaveLength(1)
    expect(logoutRequests(requests)[0].headers.authorization).toMatch(/^Bearer .+/)
    await page.goBack()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('app-shell')).toHaveCount(0)
  })
  test('TC-AUTH-50 @real: Đăng xuất từ banner từ chối truy cập (200 OK)', async ({ page }) => {
    const requests = trackApiRequests(page)
    await seedSession(page, await realUserSession())
    await page.goto('/members')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('login-denied')).toBeVisible()

    const responsePromise = logoutResponseOf(page)
    await page.getByTestId('login-denied-logout').click()

    // Token thật + backend thật -> logout trả 200.
    expect((await responsePromise).status()).toBe(200)

    const stored = await readStoredSession(page)
    expect(stored).toBeNull()

    await expect(page.getByTestId('login-denied')).not.toBeVisible()
    await expect(page.getByTestId('login-submit')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)

    expect(logoutRequests(requests)).toHaveLength(1)
  })

  test('TC-AUTH-51 @real: Đăng xuất thất bại phía API (401 thật) vẫn luôn xoá session local', async ({ page }) => {
    const requests = trackApiRequests(page)
    const session = await realUserSession()
    // Token bị làm hỏng -> backend thật trả 401, client vẫn phải xoá session local.
    await seedSession(page, { ...session, accessToken: 'token-khong-hop-le' })
    await page.goto('/members')

    await expect(page.getByTestId('login-denied')).toBeVisible()

    const responsePromise = logoutResponseOf(page)
    await page.getByTestId('login-denied-logout').click()

    expect((await responsePromise).status()).toBe(401)

    const stored = await readStoredSession(page)
    expect(stored).toBeNull()

    await expect(page.getByTestId('login-denied')).not.toBeVisible()
    expect(logoutRequests(requests)).toHaveLength(1)
  })

  test('TC-AUTH-52 @real: Request logout tự động đính kèm Authorization header', async ({ page }) => {
    const requests = trackApiRequests(page)
    const session = await realUserSession()
    await seedSession(page, session)
    await page.goto('/members')

    await expect(page.getByTestId('login-denied-logout')).toBeVisible()

    const responsePromise = logoutResponseOf(page)
    await page.getByTestId('login-denied-logout').click()
    await responsePromise

    const logoutRequest = logoutRequests(requests)[0]
    expect(logoutRequest).toBeDefined()
    expect(logoutRequest.headers['authorization']).toBe(`Bearer ${session.accessToken}`)
  })
})
