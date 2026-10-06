import type { Page } from '@playwright/test'

export interface StubResponse {
  status: number
  body: unknown
}

/**
 * Stub response — CHỈ dùng cho các nhánh mà backend thật không thể tạo ra:
 * 403 account bị ban, 500 kèm stack, 502 HTML từ gateway, 200 nhưng thiếu accessToken,
 * role 'admin' chữ thường, và 422 map field password / field không tồn tại / field null.
 *
 * Mọi test dùng hàm này phải gắn tag `@stub` để tách khỏi suite chạy bằng dữ liệu thật.
 * Test nào backend thật tạo được (401, 422 field email, 403 do sai role...) thì phải đi qua backend thật.
 */
export const stubLoginResponse = async (page: Page, response: StubResponse): Promise<void> => {
  const isHtml = typeof response.body === 'string' && response.body.startsWith('<')

  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: response.status,
      contentType: isHtml ? 'text/html' : 'application/json',
      body: typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
    }),
  )
}
