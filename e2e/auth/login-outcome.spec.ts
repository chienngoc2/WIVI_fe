import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { adminAccount, userAccount, type ApiLoginResult } from '../fixtures/accounts'
import { LOGIN_ENDPOINT, abortRealRequest } from '../fixtures/api-traffic'
import { readStoredSession, type StoredSession } from '../fixtures/session'
import { stubLoginResponse } from '../fixtures/auth-stub'

const loginResponseOf = (page: Page) =>
  page.waitForResponse((response) => response.url().includes('/api/v1/auth/login'))

test.describe('Suite C — Kết quả đăng nhập (dữ liệu thật)', () => {
  test('TC-AUTH-20 @real: Đăng nhập thành công với tài khoản Admin thật', async ({ page }) => {
    const account = adminAccount()
    await page.goto('/login')

    const responsePromise = loginResponseOf(page)
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    const response = await responsePromise
    expect(response.status()).toBe(200)
    const payload = (await response.json()) as ApiLoginResult

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('app-shell')).toBeVisible()
    await expect(page.getByTestId('topnav-identity-name')).toHaveText(payload.fullName)

    const stored = (await readStoredSession(page)) as StoredSession
    expect(stored.accessToken).toBe(payload.accessToken)
    expect(stored.refreshToken).toBe(payload.refreshToken)
    expect(stored.identity.role).toBe('Admin')
    expect(stored.identity.email).toBe(account.email)

    await expect(page.locator('body')).not.toContainText(payload.accessToken)
  })

  test('TC-AUTH-21 @real: Xử lý lỗi 401 khi sai mật khẩu (không lộ message backend)', async ({ page }) => {
    const account = adminAccount()
    await page.goto('/login')

    const responsePromise = loginResponseOf(page)
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill('SaiMatKhau#999')
    await page.getByTestId('login-submit').click()

    expect((await responsePromise).status()).toBe(401)

    await expect(page.getByTestId('login-error-form')).toContainText('Không đăng nhập được')
    await expect(page.getByTestId('login-error-form')).toContainText('Email hoặc mật khẩu không đúng.')
    await expect(page.locator('body')).not.toContainText('Invalid email or password')

    const stored = await readStoredSession(page)
    expect(stored).toBeNull()
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-AUTH-22 @real: Tài khoản role User không được cấp quyền', async ({ page }) => {
    const account = userAccount()
    await page.goto('/login')

    const responsePromise = loginResponseOf(page)
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    // Backend chấp nhận đăng nhập (200) nhưng role không phải Admin -> client từ chối.
    expect((await responsePromise).status()).toBe(200)

    await expect(page.getByTestId('login-error-form')).toContainText('Tài khoản này không có quyền truy cập trang quản trị.')
    const stored = await readStoredSession(page)
    expect(stored).toBeNull()
    await expect(page).toHaveURL(/\/login/)

    // Khoá D-4: login-denied (banner vào từ route guard) KHÔNG hiện
    await expect(page.getByTestId('login-denied')).not.toBeVisible()
  })

  test('TC-AUTH-25 @real: Lỗi 422 từ backend được map vào field email', async ({ page }) => {
    const account = adminAccount()
    await page.goto('/login')

    const responsePromise = loginResponseOf(page)
    await page.getByLabel('Email').fill('khong-phai-email')
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    expect((await responsePromise).status()).toBe(422)

    await expect(page.locator('#login-email-error')).toHaveText('Địa chỉ Email không đúng định dạng.')
    await expect(page.locator('#login-email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByTestId('login-error-form')).not.toBeVisible()
  })

  test('TC-AUTH-29: Lỗi kết nối mạng hiển thị thân thiện', async ({ page }) => {
    const account = adminAccount()
    await abortRealRequest(page, LOGIN_ENDPOINT)
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.')
  })

  test('TC-AUTH-33 @real: Ngoại lệ khi ghi localStorage vẫn báo lỗi thân thiện', async ({ page }) => {
    const account = adminAccount()
    await page.addInitScript(() => {
      const originalSetItem = window.localStorage.setItem
      window.localStorage.setItem = (key: string, value: string) => {
        if (key === 'wivi.admin.session') throw new Error('QuotaExceededError')
        originalSetItem.call(window.localStorage, key, value)
      }
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('Không thể lưu phiên đăng nhập trên trình duyệt này.')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('app-shell')).not.toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // @stub — các nhánh mà backend thật KHÔNG tạo được. Xem fixtures/auth-stub.ts.
  // ---------------------------------------------------------------------------

  test('TC-AUTH-23 @stub @drift: Tài khoản role admin (lowercase) bị từ chối do so sánh case-sensitive', async ({ page }) => {
    const account = adminAccount()
    // D-1 / Q-1: AuthProvider kiểm tra !== 'Admin' nên role 'admin' bị từ chối.
    await stubLoginResponse(page, {
      status: 200,
      body: {
        id: 'lower-admin-id-1',
        fullName: 'Lower Admin User',
        email: account.email,
        role: 'admin',
        accessToken: 'access-lower-1',
        refreshToken: 'refresh-lower-1',
      },
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('Tài khoản này không có quyền truy cập trang quản trị.')
    const stored = await readStoredSession(page)
    expect(stored).toBeNull()
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-AUTH-24 @stub @drift: Xử lý lỗi 403 Account Banned hiển thị nguyên message backend', async ({ page }) => {
    const account = adminAccount()
    // D-10: message backend tiếng Anh bị phơi bày trực tiếp (nhánh error instanceof Error).
    // Backend thật không có account bị ban nên phải stub.
    await stubLoginResponse(page, {
      status: 403,
      body: {
        code: 'FORBIDDEN',
        message: 'Account is banned: Vi phạm điều khoản',
        field: null,
        details: { domainCode: 'ACCOUNT_BANNED' },
      },
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('Account is banned: Vi phạm điều khoản')
    const stored = await readStoredSession(page)
    expect(stored).toBeNull()
  })

  test('TC-AUTH-26 @stub: Lỗi 422 được map vào field password', async ({ page }) => {
    const account = adminAccount()
    // Client chặn password rỗng trước khi gọi API, nên backend thật không tạo được 422 cho field password.
    await stubLoginResponse(page, {
      status: 422,
      body: { code: 'VALIDATION_FAILED', message: 'Mật khẩu quá ngắn.', field: 'password', details: {} },
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.locator('#login-password-error')).toHaveText('Mật khẩu quá ngắn.')
    await expect(page.getByTestId('login-error-form')).not.toBeVisible()
  })

  test('TC-AUTH-27 @stub: Lỗi 422 có field nhưng không map được (rơi vào form-error)', async ({ page }) => {
    const account = adminAccount()
    await stubLoginResponse(page, {
      status: 422,
      body: { code: 'VALIDATION_FAILED', message: 'Username không hợp lệ', field: 'username', details: {} },
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('Username không hợp lệ')
    await expect(page.locator('#login-email-error')).not.toBeVisible()
    await expect(page.locator('#login-password-error')).not.toBeVisible()
  })

  test('TC-AUTH-28 @stub: Lỗi 422 không có field (field: null) rơi vào form-error', async ({ page }) => {
    const account = adminAccount()
    await stubLoginResponse(page, {
      status: 422,
      body: { code: 'VALIDATION_FAILED', message: 'Lỗi validation chung', field: null, details: {} },
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('Lỗi validation chung')
  })

  test('TC-AUTH-30 @stub: Lỗi 500 không lộ stack trace', async ({ page }) => {
    const account = adminAccount()
    await stubLoginResponse(page, {
      status: 500,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: { stack: 'at Object.<anonymous>' },
      },
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('An unexpected error occurred')
    await expect(page.locator('body')).not.toContainText('stack')
    await expect(page.locator('body')).not.toContainText('at Object.')
  })

  test('TC-AUTH-31 @stub @drift: Lỗi 502 HTML parse string hiển thị nguyên HTML', async ({ page }) => {
    const account = adminAccount()
    // D-11: toApiError chuyển chuỗi HTML thành message thay vì fallback generic.
    await stubLoginResponse(page, { status: 502, body: '<html>Bad Gateway</html>' })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error-form')).toContainText('<html>Bad Gateway</html>')
  })

  test('TC-AUTH-32 @stub @drift: Thành công nhưng thiếu accessToken', async ({ page }) => {
    const account = adminAccount()
    // D-5: isAuthSession không báo lỗi ngay trên payload api mà chờ đến lần readSession sau reload.
    await stubLoginResponse(page, {
      status: 200,
      body: {
        id: 'admin-id-1',
        fullName: 'Admin User',
        email: account.email,
        role: 'Admin',
        refreshToken: 'refresh-only',
      },
    })
    await page.goto('/login')

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Mật khẩu').fill(account.password)
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('app-shell')).toBeVisible()
    const stored1 = (await readStoredSession(page)) as Record<string, unknown>
    expect(stored1.accessToken).toBeUndefined()

    await page.reload()
    await expect(page).toHaveURL(/\/login/)
    const stored2 = await readStoredSession(page)
    expect(stored2).toBeNull()
  })
})
