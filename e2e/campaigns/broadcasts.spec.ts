import { expect, test } from '@playwright/test'
import { seedStubAdminSession } from '../fixtures/members'
import type {
  AdminBroadcast,
  AdminBroadcastStats,
  AdminBroadcastsRawListResponse,
} from '../../src/types/admin'

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
  readCount: 1,
}

const stats: AdminBroadcastStats = {
  totalBroadcasts: 5,
  queuedBroadcasts: 0,
  sentBroadcasts: 4,
  failedBroadcasts: 1,
  totalDelivered: 120,
  totalRead: 30,
  readRate: 0.25,
}

test.describe('Campaigns / Chiến dịch gửi tin @stub', () => {
  test.beforeEach(async ({ page }) => {
    await seedStubAdminSession(page)
    await page.route('**/api/v1/admin/broadcasts/stats', (route) =>
      route.fulfill({ json: stats }),
    )
  })

  test('renders broadcasts, KPI stats and pagination from API response @stub', async ({
    page,
  }) => {
    const response: AdminBroadcastsRawListResponse = {
      items: [broadcast],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    }
    const queries: URLSearchParams[] = []
    await page.route('**/api/v1/admin/broadcasts*', (route) => {
      queries.push(new URL(route.request().url()).searchParams)
      return route.fulfill({ json: response })
    })

    await page.goto('/campaigns')

    await expect(
      page.getByRole('row', { name: new RegExp(broadcast.title) }),
    ).toBeVisible()
    await expect(page.getByTestId('campaigns-page-info')).toContainText(
      'Trang 1/1 · 1 chiến dịch',
    )
    await expect(page.getByText('Tổng chiến dịch')).toBeVisible()
    await expect(page.getByText('5').first()).toBeVisible()
    await expect(page.getByText('25%')).toBeVisible()
    expect(queries.at(-1)?.get('pageIndex')).toBe('1')
    expect(queries.at(-1)?.get('pageSize')).toBe('20')
  })

  test('filtering by status sends status=Sent in query @stub', async ({
    page,
  }) => {
    const response: AdminBroadcastsRawListResponse = {
      items: [broadcast],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    }
    const queries: URLSearchParams[] = []
    await page.route('**/api/v1/admin/broadcasts*', (route) => {
      queries.push(new URL(route.request().url()).searchParams)
      return route.fulfill({ json: response })
    })

    await page.goto('/campaigns')

    await page.getByLabel('Lọc theo trạng thái').selectOption('Sent')

    await expect.poll(() => queries.at(-1)?.get('status')).toBe('Sent')
  })

  test('requires confirmation modal before sending broadcast @stub', async ({
    page,
  }) => {
    const response: AdminBroadcastsRawListResponse = {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    }
    let postBody: unknown = null
    await page.route('**/api/v1/admin/broadcasts*', (route) => {
      if (route.request().method() === 'POST') {
        postBody = route.request().postDataJSON()
        return route.fulfill({
          status: 201,
          json: {
            id: 'new-id',
            title: 'Tiêu đề thông báo',
            body: 'Nội dung thông báo',
            status: 'Queued',
          },
        })
      }
      return route.fulfill({ json: response })
    })

    await page.goto('/campaigns')

    await page.getByLabel('Tiêu đề thông báo').fill('Cập nhật hệ thống')
    await page.getByLabel('Nội dung').fill('Bảo trì máy chủ trong 15 phút.')

    // Click submit opens modal
    await page.getByRole('button', { name: 'Gửi thông báo' }).click()
    await expect(page.getByRole('heading', { name: 'Xác nhận gửi thông báo' })).toBeVisible()

    // Confirm in modal
    await page.getByRole('button', { name: 'Xác nhận gửi' }).click()

    await expect(
      page.getByText('Đã đưa vào hàng đợi gửi. Trạng thái sẽ cập nhật sau vài giây.'),
    ).toBeVisible()

    expect(postBody).toMatchObject({
      title: 'Cập nhật hệ thống',
      body: 'Bảo trì máy chủ trong 15 phút.',
      targetAudience: 'All',
      scheduledAt: null,
    })
  })

  test('displays 422 error from server on invalid title @stub', async ({
    page,
  }) => {
    await page.route('**/api/v1/admin/broadcasts*', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 422,
          json: {
            code: 'VALIDATION_FAILED',
            message: 'Tiêu đề không hợp lệ',
            field: 'title',
          },
        })
      }
      return route.fulfill({ json: { items: [], totalCount: 0, page: 1, pageSize: 20 } })
    })

    await page.goto('/campaigns')

    await page.getByLabel('Tiêu đề thông báo').fill('Test Title')
    await page.getByLabel('Nội dung').fill('Test Body')

    await page.getByRole('button', { name: 'Gửi thông báo' }).click()
    await page.getByRole('button', { name: 'Xác nhận gửi' }).click()

    await expect(page.getByRole('alert')).toContainText('Tiêu đề không hợp lệ')
  })

  test('shows the API error and allows retry after a 500 response @stub', async ({
    page,
  }) => {
    const message = 'Không tải được danh sách thông báo'
    let failed = true
    await page.route('**/api/v1/admin/broadcasts*', (route) =>
      route.fulfill(
        failed
          ? {
              status: 500,
              json: { code: 'INTERNAL_ERROR', message },
            }
          : {
              json: {
                items: [broadcast],
                totalCount: 1,
                page: 1,
                pageSize: 20,
              },
            },
      ),
    )

    await page.goto('/campaigns')

    const error = page.getByRole('alert')
    await expect(error).toContainText(message)
    failed = false
    await error.getByRole('button', { name: 'Thử lại', exact: true }).click()
    await expect(
      page.getByRole('row', { name: new RegExp(broadcast.title) }),
    ).toBeVisible()
  })
})
