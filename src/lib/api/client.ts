import type { ApiErrorBody, AuthSession, AuthTokens } from '../../types/admin'
import { clearSession, readSession, writeSession } from '../session'

export const SESSION_EXPIRED_EVENT = 'wivi:admin-session-expired'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly field: string | null
  readonly details: unknown

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.field = body.field
    this.details = body.details
  }
}

interface RequestOptions {
  authenticated?: boolean
  retryUnauthorized?: boolean
}

let refreshInFlight: Promise<boolean> | null = null

const apiRoot = (): string => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')
  if (!configuredBase) {
    throw new ApiError(0, {
      code: 'API_CONFIG_ERROR',
      message: 'Thiếu cấu hình VITE_API_BASE_URL. Hãy cấu hình địa chỉ API rồi tải lại trang.',
      field: null,
      details: {},
    })
  }
  return `${configuredBase}/api/v1`
}

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

const toApiError = (status: number, body: unknown): ApiError => {
  if (typeof body === 'object' && body !== null) {
    const payload = body as Partial<ApiErrorBody>
    const message = typeof payload.message === 'string'
      ? payload.message
      : 'Đã xảy ra lỗi khi gửi yêu cầu.'
    return new ApiError(status, {
      code: typeof payload.code === 'string' ? payload.code : 'REQUEST_FAILED',
      message,
      field: typeof payload.field === 'string' ? payload.field : null,
      details: payload.details ?? {},
    })
  }

  return new ApiError(status, {
    code: 'REQUEST_FAILED',
    message: typeof body === 'string' && body.length > 0
      ? body
      : 'Đã xảy ra lỗi khi gửi yêu cầu.',
    field: null,
    details: {},
  })
}

const dispatchSessionExpired = (): void => {
  clearSession()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

const performRefresh = async (): Promise<boolean> => {
  const session = readSession()
  if (!session?.refreshToken) return false

  try {
    const response = await fetch(`${apiRoot()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
    const body = await readBody(response)
    if (!response.ok || typeof body !== 'object' || body === null) return false

    const tokens = body as Partial<AuthTokens>
    if (typeof tokens.accessToken !== 'string' || typeof tokens.refreshToken !== 'string') {
      return false
    }

    const current = readSession()
    if (!current || current.refreshToken !== session.refreshToken) return false

    const updatedSession: AuthSession = {
      ...current,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
    writeSession(updatedSession)
    return true
  } catch {
    return false
  }
}

const refreshOnce = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

const send = async <T>(
  path: string,
  init: RequestInit,
  options: RequestOptions,
  hasRetried: boolean,
): Promise<T> => {
  const session = options.authenticated === false ? null : readSession()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  let response: Response
  try {
    response = await fetch(`${apiRoot()}${path}`, { ...init, headers })
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.',
      field: null,
      details: {},
    })
  }

  const body = await readBody(response)
  if (response.ok) return body as T

  const error = toApiError(response.status, body)
  if (response.status === 401 && options.authenticated !== false) {
    if (!hasRetried && options.retryUnauthorized !== false && await refreshOnce()) {
      return send<T>(path, init, options, true)
    }
    dispatchSessionExpired()
  }
  throw error
}

export const apiRequest = <T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> => send<T>(path, init, options, false)
