import { expect, test } from '@playwright/test'
import { apiBaseUrl, realAdminSession, realUserSession } from '../fixtures/accounts'
import { seedStubAdminSession } from '../fixtures/members'
import { readStoredSession, seedSession } from '../fixtures/session'
import type { AdminProfile } from '../../src/types/admin'

const profile: AdminProfile = {
  id: 'stub-admin-id', userName: 'admin', firstName: 'Văn A', lastName: 'Nguyễn', fullName: 'Văn A Nguyễn',
  email: 'admin@example.com', phone: null, avatarUrl: null, role: 'Admin', status: 'Active',
  createdAt: '2026-05-25T08:30:00.000Z', lastLoginAt: '2026-10-09T17:30:00.000Z',
}

test('shows skeleton, read-only fields and Vietnam dates @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/admin/me', async route => { await gate; await route.fulfill({ json: profile }).catch(() => {}) })
  await page.goto('/profile')
  await expect(page.getByTestId('profile-loading')).toBeVisible()
  release()
  const content = page.getByTestId('profile-page')
  await expect(content.getByText(profile.email, { exact: true })).toBeVisible()
  await expect(content.getByText(profile.fullName, { exact: true })).toBeVisible()
  await expect(content.locator('dd').filter({ hasText: /15:30.*25\/05\/2026/ })).toBeVisible()
  await expect(content.locator('dd').filter({ hasText: /00:30.*10\/10\/2026/ })).toBeVisible()
  await expect(content.locator('input, textarea')).toHaveCount(0)
})

test('nullable and blank fields show a dash @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  await page.route('**/api/v1/admin/me', route => route.fulfill({ json: { ...profile, lastName: '   ', lastLoginAt: null } }))
  await page.goto('/profile')
  await expect(page.getByTestId('profile-page').locator('dd').filter({ hasText: /^—$/ })).toHaveCount(3)
  await expect(page.getByRole('img', { name: 'Ảnh đại diện' })).toHaveCount(0)
})

for (const failure of ['network', 'server'] as const) {
  test(`retries ${failure} failures @stub`, async ({ page }) => {
    await seedStubAdminSession(page)
    let fail = true
    await page.route('**/api/v1/admin/me', route => fail
      ? failure === 'network' ? route.abort('failed') : route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR', message: 'Không thể tải hồ sơ', field: null, details: {} } })
      : route.fulfill({ json: profile }))
    await page.goto('/profile')
    await expect(page.getByRole('alert')).toBeVisible()
    fail = false
    await page.getByRole('button', { name: 'Thử lại' }).click()
    await expect(page.getByTestId('profile-page').getByText(profile.email)).toBeVisible()
  })
}

test('403 keeps session until logout; pending logout cannot send twice @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  await page.route('**/api/v1/admin/me', route => route.fulfill({ status: 403, json: { code: 'FORBIDDEN', message: 'Denied', field: null, details: {} } }))
  let logoutCount = 0
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/auth/logout', async route => { logoutCount++; await gate; await route.fulfill({ status: 500, json: { message: 'Unavailable' } }) })
  await page.goto('/profile')
  await expect(page.getByRole('alert')).toContainText('Tài khoản không còn quyền quản trị')
  expect(await readStoredSession(page)).not.toBeNull()
  await page.getByRole('alert').getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đang đăng xuất…' })).toBeDisabled()
  await expect.poll(() => logoutCount).toBe(1)
  release()
  await expect(page).toHaveURL(/\/login$/)
  expect(await readStoredSession(page)).toBeNull()
})

test('a stalled profile request times out, ignores its late result and can be retried @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  await page.clock.install()
  let stalled = true
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/admin/me', async route => {
    if (stalled) await gate
    await route.fulfill({ json: profile }).catch(() => {})
  })
  await page.goto('/profile')
  await expect(page.getByTestId('profile-loading')).toBeVisible()
  await page.clock.runFor(15_001)
  await expect(page.getByRole('alert')).toContainText('Máy chủ phản hồi quá lâu')
  stalled = false
  release()
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await expect(page.getByTestId('profile-page').getByText(profile.email)).toBeVisible()
})

test('401 refreshes and retries the profile using the new token @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  let refreshCount = 0
  await page.route('**/api/v1/auth/refresh', route => {
    refreshCount++
    return route.fulfill({ json: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
  })
  await page.route('**/api/v1/admin/me', route => route.request().headers().authorization === 'Bearer new-access'
    ? route.fulfill({ json: profile }) : route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED', message: 'Expired' } }))
  await page.goto('/profile')
  await expect(page.getByTestId('profile-page').getByText(profile.email)).toBeVisible()
  expect(refreshCount).toBe(1)
})

test('account menu supports keyboard, outside close and profile navigation @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  await page.route('**/api/v1/admin/me', route => route.fulfill({ json: profile }))
  await page.goto('/activity')
  const trigger = page.getByTestId('topnav-account-menu')
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('topnav-profile-link')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('topnav-logout')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.getByTestId('topnav-profile-link')).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByTestId('topnav-logout')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()
  await expect(page.getByTestId('topnav-identity-name')).toHaveText('Stub Admin')
  await expect(page.getByTestId('topnav-identity-initials')).toHaveText('SA')
  await page.getByRole('main').click({ position: { x: 10, y: 10 } })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()
  await page.getByTestId('topnav-profile-link').click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByTestId('profile-page').getByText(profile.email)).toBeVisible()
})

test('shell logout locks while pending, clears session on network failure and prevents Back @stub', async ({ page }) => {
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: {
    id: profile.id, fullName: profile.fullName, email: profile.email, role: 'Admin',
    accessToken: 'stub-access-token', refreshToken: 'stub-refresh-token',
  } }))
  await page.route('**/api/v1/admin/me', route => route.fulfill({ json: profile }))
  let count = 0
  let authorization: string | undefined
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/auth/logout', async route => {
    count++
    authorization = route.request().headers().authorization
    await gate
    await route.abort('failed')
  })
  await page.goto('/activity')
  await page.getByLabel('Email', { exact: true }).fill(profile.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill('stub-password')
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('app-shell')).toBeVisible()
  await page.getByTestId('topnav-account-menu').click()
  await page.getByTestId('topnav-profile-link').click()
  await expect(page.getByTestId('profile-page')).toBeVisible()
  await page.getByTestId('topnav-account-menu').click()
  await page.getByTestId('topnav-logout').click()
  await expect(page.getByTestId('topnav-logout')).toBeDisabled()
  await expect.poll(() => count).toBe(1)
  expect(authorization).toBe('Bearer stub-access-token')
  release()
  await expect(page).toHaveURL(/\/login$/)
  expect(await readStoredSession(page)).toBeNull()
  await page.goBack()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId('app-shell')).toHaveCount(0)
  expect(count).toBe(1)
})

test('profile response matches the current Admin identity and public shape @real', async ({ page, request }) => {
  const session = await realAdminSession()
  const response = await request.get(`${apiBaseUrl()}/api/v1/admin/me`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
  expect(response.status()).toBe(200)
  const body = await response.json() as AdminProfile
  expect(Object.keys(body).sort()).toEqual(Object.keys(profile).sort())
  expect(body.id).toBe(session.identity.id)
  expect(body.email.toLowerCase()).toBe(process.env.E2E_ADMIN_EMAIL?.toLowerCase())
  expect(body.role).toBe('Admin')
  expect(body.status).toBe('Active')
  expect(body.createdAt).toBe(new Date(body.createdAt).toISOString())
  if (body.lastLoginAt !== null) expect(body.lastLoginAt).toBe(new Date(body.lastLoginAt).toISOString())
  for (const key of ['userName', 'firstName', 'lastName', 'fullName', 'email'] as const) expect(typeof body[key]).toBe('string')
  for (const key of ['phone', 'avatarUrl', 'lastLoginAt'] as const) expect(body[key] === null || typeof body[key] === 'string').toBe(true)
  await seedSession(page, session)
  await page.goto('/profile')
  await expect(page.getByTestId('profile-page').getByText(body.email, { exact: true })).toBeVisible()
})

test('User cannot enter the profile route @real', async ({ page }) => {
  await seedSession(page, await realUserSession())
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId('app-shell')).toHaveCount(0)
})
