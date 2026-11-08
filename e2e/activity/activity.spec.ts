import { expect, test } from '@playwright/test'
import { seedStubAdminSession } from '../fixtures/members'
import type {
  AdminPaymentOrder,
  AdminPaymentOrdersResponse,
  AdminRevenueReport,
} from '../../src/types/admin'

const order: AdminPaymentOrder = {
  id: 'ord-1',
  orderCode: 'WIVI001',
  userId: 'user-1',
  userName: 'Nguyễn Văn A',
  email: 'a@example.com',
  planId: 'plan_pro_monthly',
  planName: 'Gói Pro tháng',
  billingCycle: 'monthly',
  amount: 29000,
  currency: 'VND',
  status: 'Paid',
  confirmationSource: 'SePay',
  sepayTransactionId: '123456',
  paymentMethod: 'VietQR',
  createdAt: '2026-10-20T03:00:00.000Z',
  paidAt: '2026-10-20T03:02:10.000Z',
}

const revenueReport: AdminRevenueReport = {
  fromDate: '2026-09-24',
  toDate: '2026-10-23',
  granularity: 'day',
  timezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
  totalRevenue: 290000,
  paidOrders: 10,
  manualPaidOrders: 1,
  pendingOrders: 3,
  activePaidSubscriptions: 8,
  byPlan: [
    {
      planId: 'plan_pro_monthly',
      planName: 'Gói Pro tháng',
      paidOrders: 10,
      revenue: 290000,
    },
  ],
  points: [
    { period: '2026-10-20', revenue: 29000, paidOrders: 1 },
  ],
}

const ordersResponse: AdminPaymentOrdersResponse = {
  items: [order],
  totalCount: 1,
  page: 1,
  pageSize: 20,
}

test.describe('Activity / Sổ cái mua gói @stub', () => {
  test.beforeEach(async ({ page }) => {
    await seedStubAdminSession(page)
    await page.route('**/api/v1/admin/subscriptions/plans', (route) =>
      route.fulfill({
        json: [
          {
            id: 'plan_pro_monthly',
            name: 'Gói Pro tháng',
            code: 'PRO_MONTHLY',
            price: 29000,
            currency: 'VND',
            billingCycle: 'monthly',
            features: [],
            tokenLimit: 10000,
            isActive: true,
          },
        ],
      }),
    )
  })

  test('renders KPI tiles, area chart, and payment orders table', async ({
    page,
  }) => {
    await page.route('**/api/v1/admin/subscriptions/revenue*', (route) =>
      route.fulfill({ json: revenueReport }),
    )
    await page.route('**/api/v1/admin/subscriptions/orders*', (route) =>
      route.fulfill({ json: ordersResponse }),
    )

    await page.goto('/activity')

    await expect(page.getByRole('heading', { name: 'Sổ cái mua gói' })).toBeVisible()
    await expect(page.getByText('290.000 đ').first()).toBeVisible()
    await expect(page.getByText('WIVI001')).toBeVisible()
    await expect(page.getByText('Nguyễn Văn A')).toBeVisible()
    await expect(page.getByText('Đã thanh toán').first()).toBeVisible()
    await expect(page.getByText('SePay').first()).toBeVisible()
  })

  test('filtering by status sends status param in request', async ({ page }) => {
    await page.route('**/api/v1/admin/subscriptions/revenue*', (route) =>
      route.fulfill({ json: revenueReport }),
    )

    const orderQueries: URLSearchParams[] = []
    await page.route('**/api/v1/admin/subscriptions/orders*', (route) => {
      const q = new URL(route.request().url()).searchParams
      orderQueries.push(q)
      return route.fulfill({ json: ordersResponse })
    })

    await page.goto('/activity')

    await page
      .getByLabel('Lọc theo trạng thái')
      .selectOption('Pending')

    await expect
      .poll(() => orderQueries.at(-1)?.get('status'))
      .toBe('Pending')
  })

  test('shows empty state when no orders match', async ({ page }) => {
    await page.route('**/api/v1/admin/subscriptions/revenue*', (route) =>
      route.fulfill({
        json: {
          ...revenueReport,
          totalRevenue: 0,
          paidOrders: 0,
          points: [],
          byPlan: [],
        },
      }),
    )
    await page.route('**/api/v1/admin/subscriptions/orders*', (route) =>
      route.fulfill({
        json: { items: [], totalCount: 0, page: 1, pageSize: 20 },
      }),
    )

    await page.goto('/activity')

    await expect(
      page.getByText('Không tìm thấy đơn mua gói nào'),
    ).toBeVisible()
  })

  test('displays forbidden alert on 403', async ({ page }) => {
    await page.route('**/api/v1/admin/subscriptions/revenue*', (route) =>
      route.fulfill({
        status: 403,
        json: { code: 'FORBIDDEN', message: 'Forbidden' },
      }),
    )
    await page.route('**/api/v1/admin/subscriptions/orders*', (route) =>
      route.fulfill({
        status: 403,
        json: { code: 'FORBIDDEN', message: 'Forbidden' },
      }),
    )

    await page.goto('/activity')

    await expect(
      page.getByText('Bạn không có quyền xem dữ liệu này.').first(),
    ).toBeVisible()
  })
})
