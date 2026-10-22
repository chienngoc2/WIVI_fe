import type { Page, Request } from '@playwright/test'

export interface RecordedRequest {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

export const LOGIN_ENDPOINT = '**/api/v1/auth/login'
export const LOGOUT_ENDPOINT = '**/api/v1/auth/logout'

/**
 * Ghi lại request thật đi tới backend.
 * Thay cho việc đếm request ở lớp mock cũ: request vẫn tới server thật, chỉ được quan sát.
 */
export const trackApiRequests = (page: Page): RecordedRequest[] => {
  const requests: RecordedRequest[] = []

  page.on('request', (request: Request) => {
    if (!request.url().includes('/api/v1/')) return

    const postData = request.postData()
    let body: unknown
    if (postData) {
      try {
        body = JSON.parse(postData) as unknown
      } catch {
        body = postData
      }
    }

    requests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body,
    })
  })

  return requests
}

export const loginRequests = (requests: RecordedRequest[]): RecordedRequest[] =>
  requests.filter((request) => request.url.includes('/api/v1/auth/login'))

export const logoutRequests = (requests: RecordedRequest[]): RecordedRequest[] =>
  requests.filter((request) => request.url.includes('/api/v1/auth/logout'))

/**
 * Làm trễ response thật để quan sát trạng thái pending của UI.
 * Request vẫn đi tới backend thật — chỉ chậm hơn, không thay thế dữ liệu.
 */
export const delayRealResponse = async (
  page: Page,
  urlPattern: string,
  ms: number,
): Promise<void> => {
  await page.route(urlPattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
    await route.continue()
  })
}

/** Ngắt kết nối tới endpoint thật để kiểm tra nhánh lỗi mạng của client. */
export const abortRealRequest = async (page: Page, urlPattern: string): Promise<void> => {
  await page.route(urlPattern, (route) => route.abort('failed'))
}
