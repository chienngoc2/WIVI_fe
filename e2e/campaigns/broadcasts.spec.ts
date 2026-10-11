import { expect, test } from '@playwright/test'
import { seedStubAdminSession } from '../fixtures/members'
import type { AdminBroadcast, AdminBroadcastsRawListResponse } from '../../src/types/admin'

const broadcast: AdminBroadcast = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Nhắc cập nhật ngân sách tháng',
  body: 'Hãy kiểm tra ngân sách của bạn trong WIVI.',
  targetAudience: 'All',
  status: 'Sent',
  scheduledAt: null,
  sentAt: '2026-10-05T02:00:00.000Z',
  targetCount: 1,
  deliveredCount: 1,
}

test.beforeEach(async ({ page }) => {
  await seedStubAdminSession(page)
})

test('renders broadcasts and pagination from the flat API response @stub', async ({ page }) => {
  const response: AdminBroadcastsRawListResponse = {
    items: [broadcast], totalCount: 1, page: 1, pageSize: 20,
  }
  const queries: URLSearchParams[] = []
  await page.route('**/api/v1/admin/broadcasts*', route => {
    queries.push(new URL(route.request().url()).searchParams)
    return route.fulfill({ json: response })
  })

  await page.goto('/campaigns')

  await expect(page.getByRole('row', { name: new RegExp(broadcast.title) })).toBeVisible()
  await expect(page.getByTestId('campaigns-page-info')).toContainText('Trang 1/1')
  await expect(page.getByText('1 bản ghi', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(queries.at(-1)?.get('pageIndex')).toBe('1')
  expect(queries.at(-1)?.get('pageSize')).toBe('20')
  expect(queries.at(-1)?.has('page')).toBe(false)
})

test('renders an empty flat response without errors or NaN @stub', async ({ page }) => {
  const response: AdminBroadcastsRawListResponse = {
    items: [], totalCount: 0, page: 1, pageSize: 20,
  }
  await page.route('**/api/v1/admin/broadcasts*', route => route.fulfill({ json: response }))

  await page.goto('/campaigns')

  await expect(page.getByText('Không tìm thấy broadcast nào', { exact: true })).toBeVisible()
  await expect(page.getByTestId('campaigns-empty-retry')).toBeVisible()
  await expect(page.getByTestId('campaigns-page-info')).toContainText('0 / 0 · Trang 1/1')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('NaN')
})

test('shows the API error and allows retry after a 500 response @stub', async ({ page }) => {
  const message = 'Không tải được danh sách chiến dịch. Vui lòng thử lại.'
  let failed = true
  await page.route('**/api/v1/admin/broadcasts*', route => route.fulfill(failed
    ? { status: 500, json: { code: 'INTERNAL_ERROR', message, field: null, details: {} } }
    : { json: { items: [broadcast], totalCount: 1, page: 1, pageSize: 20 } }))

  await page.goto('/campaigns')

  const error = page.getByTestId('campaigns-list-error')
  await expect(error).toContainText(message)
  await expect(error.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible()
  failed = false
  await error.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.getByRole('row', { name: new RegExp(broadcast.title) })).toBeVisible()
  await expect(page.getByTestId('campaigns-page-info')).toContainText('Trang 1/1')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
