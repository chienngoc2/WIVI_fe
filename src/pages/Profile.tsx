import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { SectionCard } from '../components/ui/SectionCard'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import { ApiError, isAbortError } from '../lib/api/client'
import { formatDateTime } from '../lib/format'
import { getAdminProfile } from '../services/adminProfile'
import type { AdminProfile } from '../types/admin'

interface Snapshot { version: number; data?: AdminProfile; error?: string; forbidden?: boolean }

export const Profile = () => {
  const { logout } = useAuth()
  const [version, setVersion] = useState(0)
  const [snapshot, setSnapshot] = useState<Snapshot>({ version: -1 })
  const [pending, setPending] = useState(false)
  const loggingOut = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setSnapshot({ version, error: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.' })
      controller.abort()
    }, 15_000)
    getAdminProfile(controller.signal)
      .then(data => { if (!controller.signal.aborted) setSnapshot({ version, data }) })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        const forbidden = error instanceof ApiError && error.status === 403
        setSnapshot({ version, forbidden, error: forbidden ? 'Tài khoản không còn quyền quản trị' : error instanceof ApiError ? error.message : 'Không thể tải hồ sơ. Vui lòng thử lại.' })
      })
      .finally(() => window.clearTimeout(timeout))
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [version])

  const handleLogout = async () => {
    if (loggingOut.current) return
    loggingOut.current = true
    setPending(true)
    try { await logout() } finally { loggingOut.current = false; setPending(false) }
  }
  const loading = snapshot.version !== version
  const profile = snapshot.data
  const fields = profile ? [
    ['Họ và tên', profile.fullName], ['Họ', profile.lastName], ['Tên', profile.firstName],
    ['Tên đăng nhập', profile.userName], ['Email', profile.email], ['Số điện thoại', profile.phone],
    ['Vai trò', <Badge tone="primary">Quản trị viên</Badge>], ['Trạng thái', <Badge tone="success">Hoạt động</Badge>],
    ['Ngày tạo', formatDateTime(profile.createdAt)], ['Lần đăng nhập gần nhất', formatDateTime(profile.lastLoginAt)],
  ] as const : []

  return <div data-testid="profile-page" className="h-full overflow-auto p-6 scrollbar-premium">
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-xl font-bold font-display text-ink tracking-tight">Hồ sơ của tôi</h1><p className="mt-1 text-[11px] font-medium text-muted">Thông tin tài khoản quản trị của bạn.</p></div>
      <SectionCard title="Thông tin tài khoản">
        {loading ? <div role="status" data-testid="profile-loading" className="animate-pulse grid grid-cols-1 gap-6 sm:grid-cols-2"><span className="sr-only">Đang tải hồ sơ</span>{Array.from({ length: 10 }, (_, index) => <div key={index} className="space-y-2"><div className="h-3 w-24 rounded-chip bg-surface-sunken" /><div className="h-5 rounded-chip bg-surface-sunken" /></div>)}</div>
          : snapshot.error ? <div role="alert" className="space-y-3 text-xs text-danger-deep"><p>{snapshot.error}</p>{snapshot.forbidden
            ? <Button disabled={pending} onClick={() => void handleLogout()}>{pending ? 'Đang đăng xuất…' : 'Đăng xuất'}</Button>
            : <Button onClick={() => setVersion(value => value + 1)}>Thử lại</Button>}</div>
          : profile && <>
            {profile.avatarUrl && <img src={profile.avatarUrl} alt="Ảnh đại diện" className="mb-6 h-16 w-16 rounded-pill object-cover" />}
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wider text-muted-light">{label}</dt><dd className="mt-1 break-words text-xs text-ink-soft">{typeof value === 'string' ? value.trim() || '—' : value || '—'}</dd></div>)}</dl>
          </>}
      </SectionCard>
    </div>
  </div>
}
