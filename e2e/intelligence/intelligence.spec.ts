import { expect, test } from '@playwright/test'
import { seedStubAdminSession } from '../fixtures/members'
import type {
  AdminAiSettings,
  AdminAiUsageReport,
  AdminRevenueReport,
  AdminSepayStats,
} from '../../src/types/admin'

const aiUsageReport: AdminAiUsageReport = {
  fromDate: '2026-09-24',
  toDate: '2026-10-23',
  granularity: 'day',
  timezone: 'Asia/Ho_Chi_Minh',
  trackingStartedAt: '2026-10-10T02:00:00.000Z',
  totals: {
    requests: 40,
    successRequests: 31,
    fallbackRequests: 9,
    totalTokens: 52000,
    uniqueUsers: 7,
  },
  byProvider: [
    { provider: 'GroqPrimary', requests: 25, totalTokens: 41000 },
    { provider: 'GroqSecondary', requests: 0, totalTokens: 0 },
    { provider: 'Gemini', requests: 6, totalTokens: 11000 },
    { provider: 'RuleBased', requests: 9, totalTokens: 0 },
  ],
  fallbackReasons: [
    { reason: 'OutOfScope', count: 2 },
    { reason: 'ContextUnavailable', count: 1 },
    { reason: 'AiDisabled', count: 0 },
    { reason: 'QuotaExceeded', count: 5 },
    { reason: 'ProviderError', count: 1 },
    { reason: 'InvalidOutput', count: 0 },
  ],
  points: [
    {
      period: '2026-10-20',
      requests: 12,
      totalTokens: 15000,
      fallbackRequests: 2,
    },
  ],
  topUsers: [
    {
      userId: 'user-1',
      userName: 'Nguyễn Văn An',
      email: 'an@example.com',
      requests: 10,
      totalTokens: 14000,
    },
  ],
  today: {
    date: '2026-10-23',
    totalTokens: 15000,
    systemDailyLimit: 100000,
  },
}

const sepayStats: AdminSepayStats = {
  fromDate: '2026-09-24',
  toDate: '2026-10-23',
  granularity: 'day',
  timezone: 'Asia/Ho_Chi_Minh',
  bankWebhooks: {
    total: 120,
    byStatus: [
      { status: 'Processed', count: 100 },
      { status: 'Pending', count: 2 },
      { status: 'Failed', count: 3 },
      { status: 'Ignored', count: 15 },
    ],
    points: [{ period: '2026-10-20', received: 10, failed: 1 }],
  },
  linkedBankAccounts: 6,
  lastWebhookAt: '2026-10-23T03:15:00.000Z',
}

const aiSettings: AdminAiSettings = {
  modelName: 'qwen/qwen3.8-27b',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 2500,
  isEnabled: true,
  rebalanceThresholdPercent: 75,
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
  byPlan: [],
  points: [],
}

test.describe('Intelligence / Vận hành AI & SePay @stub', () => {
  test.beforeEach(async ({ page }) => {
    await seedStubAdminSession(page)
    await page.route('**/api/v1/admin/ai-settings', (route) =>
      route.fulfill({ json: aiSettings }),
    )
    await page.route('**/api/v1/admin/subscriptions/revenue*', (route) =>
      route.fulfill({ json: revenueReport }),
    )
  })

  test('renders AI metrics, tracking notice banner, and SePay webhook card', async ({
    page,
  }) => {
    await page.route('**/api/v1/admin/ai/usage*', (route) =>
      route.fulfill({ json: aiUsageReport }),
    )
    await page.route('**/api/v1/admin/sepay/stats*', (route) =>
      route.fulfill({ json: sepayStats }),
    )

    await page.goto('/intelligence')

    await expect(page.getByRole('heading', { name: 'Vận hành AI & SePay' })).toBeVisible()
    await expect(page.getByText('Số liệu AI được ghi nhận từ')).toBeVisible()
    await expect(page.getByText('52.000')).toBeVisible()
    await expect(page.getByText('Nguyễn Văn An')).toBeVisible()
    await expect(page.getByText('Groq (khóa chính)')).toBeVisible()
    await expect(page.getByText('Tổng webhook: 120')).toBeVisible()
    await expect(page.getByText('6 tài khoản liên kết')).toBeVisible()
  })

  test('isolated failure in AI API does not blank SePay section', async ({
    page,
  }) => {
    await page.route('**/api/v1/admin/ai/usage*', (route) =>
      route.fulfill({
        status: 500,
        json: { code: 'INTERNAL_ERROR', message: 'AI error' },
      }),
    )
    await page.route('**/api/v1/admin/sepay/stats*', (route) =>
      route.fulfill({ json: sepayStats }),
    )

    await page.goto('/intelligence')

    // AI card shows error
    await expect(page.getByText('Không tải được báo cáo AI')).toBeVisible()
    // SePay section is still visible and rendered!
    await expect(page.getByText('Tổng webhook: 120')).toBeVisible()
    await expect(page.getByText('6 tài khoản liên kết')).toBeVisible()
  })
})
