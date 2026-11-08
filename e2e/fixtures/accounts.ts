import type { AuthSession } from '../../src/types/admin'

export interface TestAccount {
  email: string
  password: string
}

export interface ApiLoginResult {
  id: string
  fullName: string
  email: string
  role: string
  accessToken: string
  refreshToken: string
}

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Thiếu ${name}. Suite này chạy bằng dữ liệu thật: cần account seed trong .env.test và backend đang chạy.`,
    )
  }
  return value
}

export const adminAccount = (): TestAccount => ({
  email: requireEnv('E2E_ADMIN_EMAIL'),
  password: requireEnv('E2E_ADMIN_PASSWORD'),
})

export const userAccount = (): TestAccount => ({
  email: requireEnv('E2E_USER_EMAIL'),
  password: requireEnv('E2E_USER_PASSWORD'),
})

export const apiBaseUrl = (): string =>
  process.env.E2E_API_BASE_URL?.trim() || 'http://127.0.0.1:3000'

/**
 * Login thật qua HTTP ở phía Node để lấy session thật (token thật từ backend),
 * dùng cho các test cần session sẵn trong localStorage mà không đi qua form đăng nhập.
 */
export const apiLogin = async (account: TestAccount): Promise<ApiLoginResult> => {
  const response = await fetch(`${apiBaseUrl()}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(account),
  })

  const payload = (await response.json().catch(() => null)) as Partial<ApiLoginResult> | null
  if (!response.ok || !payload) {
    throw new Error(
      `Login thật thất bại (HTTP ${response.status}) cho ${account.email}. Backend đã bật ở ${apiBaseUrl()} chưa?`,
    )
  }

  const { id, fullName, email, role, accessToken, refreshToken } = payload
  if (!id || !fullName || !email || !role || !accessToken || !refreshToken) {
    throw new Error(`Response /auth/login thiếu field bắt buộc: ${JSON.stringify(payload)}`)
  }

  return { id, fullName, email, role, accessToken, refreshToken }
}

/** Đổi response login thật thành đúng shape session mà app lưu trong localStorage. */
export const toSession = (login: ApiLoginResult): AuthSession => ({
  accessToken: login.accessToken,
  refreshToken: login.refreshToken,
  identity: {
    id: login.id,
    fullName: login.fullName,
    email: login.email,
    role: login.role,
  },
})

export const realAdminSession = async (): Promise<AuthSession> =>
  toSession(await apiLogin(adminAccount()))

export const realUserSession = async (): Promise<AuthSession> =>
  toSession(await apiLogin(userAccount()))
