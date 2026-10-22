import { apiRequest } from '../lib/api/client'
import type { AuthSession, LoginResponse } from '../types/admin'

export const login = async (email: string, password: string): Promise<AuthSession> => {
  const response = await apiRequest<LoginResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    { authenticated: false, retryUnauthorized: false },
  )

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    identity: {
      id: response.id,
      fullName: response.fullName,
      email: response.email,
      role: response.role,
    },
  }
}

export const logout = (): Promise<{ message: string }> =>
  apiRequest('/auth/logout', { method: 'POST' }, { retryUnauthorized: false })
