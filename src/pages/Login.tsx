import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api/client'
import { useAuth } from '../hooks/useAuth'

interface LoginRouteState {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
  denied?: boolean
}

export const Login = () => {
  const { session, notice, login, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state as LoginRouteState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const destination = routeState?.from?.pathname
    ? `${routeState.from.pathname}${routeState.from.search ?? ''}${routeState.from.hash ?? ''}`
    : '/'

  if (session?.identity.role === 'Admin') return <Navigate to={destination} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const nextFieldErrors: { email?: string; password?: string } = {}
    if (!email.trim()) nextFieldErrors.email = 'Vui lòng nhập email.'
    if (!password) nextFieldErrors.password = 'Vui lòng nhập mật khẩu.'
    setFieldErrors(nextFieldErrors)
    setFormError(null)
    if (Object.keys(nextFieldErrors).length > 0) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('Email hoặc mật khẩu không đúng.')
      } else if (error instanceof ApiError && error.status === 422 && error.field) {
        if (error.field.toLowerCase().includes('email')) {
          setFieldErrors({ email: error.message })
        } else if (error.field.toLowerCase().includes('password')) {
          setFieldErrors({ password: error.message })
        } else {
          setFormError(error.message)
        }
      } else if (error instanceof Error) {
        setFormError(error.message)
      } else {
        setFormError('Hệ thống đang lỗi, vui lòng thử lại.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main data-testid="login-page" className="flex min-h-screen flex-col items-center justify-center gap-7 bg-canvas px-4 py-10">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-ink">WIVI</span>
          <span className="rounded-chip bg-primary-soft px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">ADMIN</span>
        </div>
        <p className="text-xs font-medium tracking-wider text-muted">CỔNG QUẢN TRỊ HỆ THỐNG</p>
      </div>

      <section className="w-full max-w-[420px] rounded-panel border border-hairline bg-white p-6 shadow-premium-lg sm:p-7">
        <h1 className="text-xl font-bold text-ink">Đăng nhập quản trị</h1>
        <p className="mt-2 text-sm text-muted">Đăng nhập bằng tài khoản quản trị WIVI của bạn.</p>

        {notice && (
          <div role="status" data-testid="login-notice" className="mt-5 rounded-control border border-warning-soft-border bg-warning-soft px-3 py-2.5 text-sm text-ink-soft">
            {notice}
          </div>
        )}

        {routeState?.denied && session && (
          <div role="alert" data-testid="login-denied" className="mt-5 rounded-control border border-danger-soft-border bg-danger-soft px-3 py-2.5 text-sm text-danger-deep">
            Tài khoản này không có quyền truy cập trang quản trị.
            <button type="button" data-testid="login-denied-logout" onClick={() => void logout()} className="ml-2 font-semibold text-primary underline">
              Thoát tài khoản
            </button>
          </div>
        )}

        {formError && (
          <div role="alert" data-testid="login-error-form" className="mt-5 rounded-control border border-danger-soft-border bg-danger-soft px-3 py-2.5 text-sm text-danger-deep">
            <p className="font-semibold">Không đăng nhập được</p>
            <p className="mt-1">{formError}</p>
          </div>
        )}

        <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-semibold text-ink-soft">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              className="w-full rounded-control border border-hairline bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              placeholder="ten@wivi.vn"
            />
            {fieldErrors.email && <p id="login-email-error" className="mt-1.5 text-xs text-danger-deep">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-xs font-semibold text-ink-soft">Mật khẩu</label>
            <div className="flex items-center rounded-control border border-hairline bg-white pr-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                className="min-w-0 flex-1 rounded-control bg-transparent px-3 py-3 text-sm text-ink outline-none"
                placeholder="Nhập mật khẩu"
              />
              <button type="button" data-testid="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} className="text-xs font-semibold text-primary">
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            {fieldErrors.password && <p id="login-password-error" className="mt-1.5 text-xs text-danger-deep">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={submitting}
            className="rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang xác thực…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-5 text-xs leading-relaxed text-muted">Chỉ tài khoản có quyền Admin mới được truy cập.</p>
      </section>

      <p className="text-xs text-muted-light">WIVI · Quản trị hệ thống</p>
    </main>
  )
}
