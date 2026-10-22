import { createContext } from 'react'
import type { AuthSession } from '../types/admin'

export interface AuthContextValue {
  session: AuthSession | null
  notice: string | null
  login: (email: string, password: string) => Promise<AuthSession>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
