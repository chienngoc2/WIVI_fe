import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, SESSION_EXPIRED_EVENT } from '../lib/api/client'
import { clearSession, readSession, writeSession } from '../lib/session'
import { login as loginRequest, logout as logoutRequest } from '../services/auth'
import type { AuthSession } from '../types/admin'
import { AuthContext } from './auth-context'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const handleExpired = () => {
      setSession(null)
      setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await loginRequest(email, password)
    if (nextSession.identity.role !== 'Admin') {
      throw new ApiError(403, {
        code: 'FORBIDDEN',
        message: 'Tài khoản này không có quyền truy cập trang quản trị.',
        field: null,
        details: {},
      })
    }

    writeSession(nextSession)
    setSession(nextSession)
    setNotice(null)
    return nextSession
  }, [])

  const logout = useCallback(async () => {
    try {
      if (readSession()) await logoutRequest()
    } catch {
      // Always clear the local session, even when the API is unavailable.
    } finally {
      clearSession()
      setSession(null)
      setNotice(null)
    }
  }, [])

  const value = useMemo(
    () => ({ session, notice, login, logout }),
    [session, notice, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
