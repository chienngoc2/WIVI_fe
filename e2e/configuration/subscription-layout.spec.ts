import { expect, test } from '@playwright/test'
import type { AdminAiSettings, AdminSubscriptionPlan } from '../../src/types/admin'
import { seedStubAdminSession } from '../fixtures/members'

const aiSettings: AdminAiSettings = {
  modelName: 'test-model',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 3000,
  isEnabled: true,
  rebalanceThresholdPercent: 75,
}

const buildPlans = (count: number): AdminSubscriptionPlan[] => Array.from({ length: count }, (_, index) => ({
  id: `test-plan-${index}`,
  name: `Gói thử nghiệm ${index + 1}`,
  code: `TEST_${index}`,
  price: 49000,
  currency: 'VND',
  billingCycle: 'monthly',
  features: ['Báo cáo nâng cao'],
  isActive: true,
}))

test.describe('Subscription layout @stub', () => {
  test.beforeEach(async ({ page }) => {
    await seedStubAdminSession(page)
    await page.route('**/api/v1/admin/ai-settings', (route) => route.fulfill({ json: aiSettings }))
  })

  test('required labels render stars and keep immutable fields disabled when editing', async ({ page }) => {
    await page.route('**/api/v1/admin/subscriptions/plans', (route) => route.fulfill({ json: buildPlans(1) }))
    await page.goto('/configuration')
    const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Gói đăng ký (Subscription Plans)', exact: true }) })
    await expect(card.getByText('Gói thử nghiệm 1', { exact: true })).toBeVisible()

    const codeLabel = card.locator('label').filter({ hasText: 'Mã gói (code)' })
    const cycleLabel = card.locator('label').filter({ hasText: 'Kỳ thanh toán' })
    for (const label of [codeLabel, cycleLabel]) {
      await expect(label.locator('span')).toHaveText('*')
      await expect(label).not.toContainText('<span')
    }

    await card.getByRole('button', { name: 'Chỉnh sửa gói', exact: true }).click()
    await expect(codeLabel).toContainText('(không đổi được)')
    await expect(cycleLabel).toContainText('(không đổi được)')
    await expect(card.getByPlaceholder('Ví dụ: plan_pro_monthly')).toBeDisabled()
    await expect(card.getByRole('combobox')).toBeDisabled()
  })

  for (const { width, height, count } of [
    { width: 1280, height: 720, count: 2 },
    { width: 1440, height: 900, count: 20 },
  ]) {
    test(`scrolls down to the form actions and back up with ${count} plans at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.route('**/api/v1/admin/subscriptions/plans', (route) => route.fulfill({ json: buildPlans(count) }))
      await page.goto('/configuration')
      const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Gói đăng ký (Subscription Plans)', exact: true }) })
      await expect(card.getByText(`${count} gói`, { exact: true })).toBeVisible()
      const scrollArea = card.locator('div.overflow-y-auto')
      await expect.poll(() => scrollArea.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
      const bounds = await scrollArea.boundingBox()
      expect(bounds).not.toBeNull()
      await page.mouse.move(bounds!.x + bounds!.width - 12, bounds!.y + bounds!.height / 2)
      await page.mouse.wheel(0, 10000)
      await expect.poll(() => scrollArea.evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThan(2)

      const submit = card.getByRole('button', { name: 'Tạo gói mới', exact: true })
      await expect(submit).toBeInViewport()
      const submitBounds = await submit.boundingBox()
      expect(submitBounds).not.toBeNull()
      expect(submitBounds!.y).toBeGreaterThanOrEqual(bounds!.y)
      expect(submitBounds!.y + submitBounds!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height)

      await page.mouse.wheel(0, -10000)
      await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBe(0)
      await expect(card.getByText('Gói thử nghiệm 1', { exact: true })).toBeInViewport()
    })
  }
})
