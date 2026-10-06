export interface AdminIdentity {
  id: string
  fullName: string
  email: string
  role: string
}

export interface LoginResponse {
  id: string
  username: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  role: string
  isOnboardingCompleted: boolean
  isOnboarded: boolean
  accessToken: string
  refreshToken: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthSession extends AuthTokens {
  identity: AdminIdentity
}

export interface ApiErrorBody {
  code: string
  message: string
  field: string | null
  details: unknown
}
