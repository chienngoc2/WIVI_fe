import type { Page } from '@playwright/test'
import type { AuthSession } from '../../src/types/admin'

const SESSION_KEY = 'wivi.admin.session'

/**
 * Seed session vào localStorage TRƯỚC khi app render.
 * Phải dùng `addInitScript` (không phải `evaluate` sau `goto`) vì `AuthProvider`
 * đọc session đồng bộ trong `useState` initializer.
 *
 * Session nên là session THẬT lấy từ `realAdminSession()` / `realUserSession()`
 * (fixtures/accounts.ts) — token giả chỉ dùng cho test cố tình kiểm tra session hỏng.
 */
export async function seedRawSession(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    (opts: { key: string; value: string }) => {
      window.localStorage.setItem(opts.key, opts.value)
    },
    { key: SESSION_KEY, value: raw },
  )
}

export async function seedSession(page: Page, session: unknown): Promise<void> {
  await seedRawSession(page, JSON.stringify(session))
}

export async function readStoredSession(page: Page): Promise<unknown | null> {
  const stored = await page.evaluate((key: string) => window.localStorage.getItem(key), SESSION_KEY)
  if (stored === null) return null
  try {
    return JSON.parse(stored)
  } catch {
    return stored
  }
}

export async function clearStoredSession(page: Page): Promise<void> {
  await page.evaluate((key: string) => window.localStorage.removeItem(key), SESSION_KEY)
}

/** Kiểu session đã lưu, dùng để assert payload thật trong localStorage. */
export type StoredSession = AuthSession
