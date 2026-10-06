import type { AdminIdentity, AuthSession } from '../types/admin'

const SESSION_KEY = 'wivi.admin.session'

const isIdentity = (value: unknown): value is AdminIdentity => {
  if (typeof value !== 'object' || value === null) return false
  const identity = value as Record<string, unknown>
  return (
    typeof identity.id === 'string' &&
    typeof identity.fullName === 'string' &&
    typeof identity.email === 'string' &&
    typeof identity.role === 'string'
  )
}

const isAuthSession = (value: unknown): value is AuthSession => {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Record<string, unknown>
  return (
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    isIdentity(session.identity)
  )
}

export const readSession = (): AuthSession | null => {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const parsed: unknown = JSON.parse(stored)
    if (isAuthSession(parsed)) return parsed

    window.localStorage.removeItem(SESSION_KEY)
    return null
  } catch {
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      // ignore
    }
    return null
  }
}

export const writeSession = (session: AuthSession): void => {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    throw new Error('Không thể lưu phiên đăng nhập trên trình duyệt này.')
  }
}

export const clearSession = (): void => {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Local session state is still cleared by AuthContext.
  }
}
