import { test, expect } from '@playwright/test'
import { adminAccount, realAdminSession, realUserSession } from '../fixtures/accounts'
import { readStoredSession, seedRawSession, seedSession, type StoredSession } from '../fixtures/session'

test.describe('Suite A — Route guard & bootstrap session (dữ liệu thật)', () => {
  test('TC-AUTH-01: Khách bị đẩy về /login khi vào trang chủ', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('login-page')).toBeVisible()
    await expect(page.getByTestId('app-shell')).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Tổng quan' })).not.toBeVisible()
  })

  test('TC-AUTH-02: Khách bị đẩy về /login khi vào các route admin', async ({ page }) => {
    const routes = [
      '/',
      '/members',
      '/activity',
      '/intelligence',
      '/campaigns',
      '/configuration',
      '/khong-ton-tai',
    ]
    for (const route of routes) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByTestId('app-shell')).not.toBeVisible()
    }
  })

  test('TC-AUTH-03 @real: Redirect về đúng destination sau khi login thành công', async ({ page }) => {
    const account = adminAccount()
    const destination = '/members?pageIndex=2&keyword=an'

    await page.goto(destination)
    await expect(page).toHaveURL(/\/login/)

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page).toHaveURL(destination)
  })

  test('TC-AUTH-04 @real: Session sống qua reload, shell hiển thị identity', async ({ page }) => {
    const session = await realAdminSession()
    const visited: string[] = []
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) visited.push(frame.url())
    })

    await seedSession(page, session)
    await page.goto('/members')

    await expect(page.getByTestId('app-shell')).toBeVisible()
    await expect(page.getByTestId('topnav-identity-name')).toHaveText(session.identity.fullName)

    const stored = (await readStoredSession(page)) as StoredSession
    expect(stored.accessToken).toBe(session.accessToken)

    const loginVisits = visited.filter((url) => url.includes('/login'))
    expect(loginVisits).toHaveLength(0)
  })

  test('TC-AUTH-05 @real: Session role khác Admin bị đẩy về /login và báo lỗi denied', async ({ page }) => {
    const session = await realUserSession()
    expect(session.identity.role).not.toBe('Admin')

    await seedSession(page, session)
    await page.goto('/members')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('login-denied')).toContainText('Tài khoản này không có quyền truy cập trang quản trị.')
    await expect(page.getByTestId('login-denied-logout')).toBeVisible()
  })

  test('TC-AUTH-06: Session hỏng JSON bị xoá', async ({ page }) => {
    await seedRawSession(page, '{ khong-phai-json')
    await page.goto('/members')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('app-shell')).not.toBeVisible()

    const stored = await readStoredSession(page)
    expect(stored).toBeNull()
  })

  test('TC-AUTH-07 @real: Session thiếu refreshToken bị xoá', async ({ page }) => {
    const session = await realAdminSession()
    // Session thật nhưng bị khuyết refreshToken: JSON.stringify sẽ bỏ field undefined.
    await seedSession(page, { ...session, refreshToken: undefined })
    await page.goto('/members')

    await expect(page).toHaveURL(/\/login/)
    const stored = await readStoredSession(page)
    expect(stored).toBeNull()
  })

  test('TC-AUTH-08 @real: Trang không tồn tại (404) nằm trong shell khi có session', async ({ page }) => {
    await seedSession(page, await realAdminSession())
    await page.goto('/khong-ton-tai')

    await expect(page.getByTestId('page-not-found')).toBeVisible()
    await expect(page.getByTestId('app-shell')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tổng quan', exact: true })).toBeVisible()
  })

  test('TC-AUTH-09 @real: Đã có session Admin thì bị đẩy khỏi /login về /', async ({ page }) => {
    await seedSession(page, await realAdminSession())
    await page.goto('/login')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('login-page')).not.toBeVisible()
    await expect(page.getByTestId('app-shell')).toBeVisible()
  })
})
