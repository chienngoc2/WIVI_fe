import { expect, test } from '@playwright/test'
import { seedStubAdminSession, stubAdminSession } from '../fixtures/members'
import { seedSession, readStoredSession } from '../fixtures/session'
import { realAdminSession, realUserSession } from '../fixtures/accounts'
import type { AdminFeedback, AdminFeedbackSummary } from '../../src/types/admin'

const feedback: AdminFeedback = { id: 'f1', userId: 'u1', userName: 'alice', email: 'alice@example.com', rating: 5, referralSource: 'facebook', comment: 'Ứng dụng tiện lợi', createdAt: '2026-10-05T02:00:00.000Z' }
const summary: AdminFeedbackSummary = { totalSubmissions: 5, totalVoters: 4, averageRating: 3.75, ratingDistribution: [1, 2, 3, 4, 5].map(rating => ({ rating, count: rating === 5 ? 2 : 0 })), referralSources: ['facebook', 'tiktok', 'instagram', 'friends', 'other'].map(referralSource => ({ referralSource: referralSource as AdminFeedback['referralSource'], count: referralSource === 'facebook' ? 1 : 0 })) }

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/admin/feedbacks/summary*', route => route.fulfill({ json: summary }))
})
test('filters and pagination use the flat API contract @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  const queries: URLSearchParams[] = []
  await page.route('**/api/v1/admin/feedbacks?*', route => {
    const params = new URL(route.request().url()).searchParams
    queries.push(params)
    return route.fulfill({ json: { items: [feedback], totalCount: 25, page: Number(params.get('page')), pageSize: 20 } })
  })
  await page.goto('/feedbacks')
  await expect(page.getByText('Ứng dụng tiện lợi')).toBeVisible()
  await expect(page.getByText('3.75/5')).toBeVisible()
  await expect(page.getByRole('cell', { name: /09:00.*05\/10\/2026/ })).toBeVisible()
  expect(queries.at(-1)?.get('referralSource')).toBeNull()
  await page.getByRole('button', { name: 'Trang sau' }).click()
  await expect(page.getByTestId('feedbacks-page-info')).toContainText('Trang 2/2')
  await page.getByLabel('Số sao', { exact: true }).selectOption('5')
  await expect(page.getByTestId('feedbacks-page-info')).toContainText('Trang 1/2')
  expect(queries.at(-1)?.get('rating')).toBe('5')
  await page.getByRole('combobox', { name: 'Nguồn giới thiệu', exact: true }).selectOption('friends')
  await expect.poll(() => queries.at(-1)?.get('referralSource')).toBe('friends')
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
  await expect.poll(() => queries.at(-1)?.get('rating')).toBeNull()
  expect(queries.at(-1)?.get('referralSource')).toBeNull()
})
test('errors can be retried; empty filtered lists offer reset @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  let failed = true
  await page.route('**/api/v1/admin/feedbacks?*', route => route.fulfill(failed ? { status: 500, json: { code: 'INTERNAL_ERROR', message: 'Không tải được phiếu', field: null, details: {} } } : { json: { items: [], totalCount: 0, page: 1, pageSize: 20 } }))
  await page.goto('/feedbacks?rating=1')
  await expect(page.getByRole('alert')).toContainText('Không tải được phiếu')
  failed = false
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await expect(page.getByText('Không tìm thấy kết quả khớp bộ lọc')).toBeVisible()
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).first().click()
  await expect(page.getByText('Chưa có đánh giá nào', { exact: true })).toBeVisible()
})
test('null average, missing profiles and unsafe comments render as text @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  await page.route('**/api/v1/admin/feedbacks/summary*', route => route.fulfill({ json: { ...summary, totalSubmissions: 0, totalVoters: 0, averageRating: null } }))
  await page.route('**/api/v1/admin/feedbacks?*', route => route.fulfill({ json: { items: [{ ...feedback, userName: null, email: null, comment: '<script>window.feedbackXss=true</script>' }], totalCount: 1, page: 1, pageSize: 20 } }))
  await page.goto('/feedbacks')
  await expect(page.getByText('Chưa có đánh giá trong khoảng thời gian này')).toBeVisible()
  await expect(page.getByText('<script>window.feedbackXss=true</script>')).toBeVisible()
  await expect(page.getByRole('link', { name: 'u1', exact: true })).toBeVisible()
  expect(await page.evaluate(() => Object.hasOwn(window, 'feedbackXss'))).toBe(false)
})
test('403 keeps the session and page @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  await page.route('**/api/v1/admin/feedbacks?*', route => route.fulfill({ status: 403, json: { code: 'FORBIDDEN', message: 'Denied', field: null, details: {} } }))
  await page.goto('/feedbacks')
  await expect(page.getByRole('alert')).toContainText('Bạn không có quyền')
  expect(await readStoredSession(page)).not.toBeNull()
  await expect(page).toHaveURL(/\/feedbacks$/)
})
test('changing filters ignores a delayed response and resets pagination @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  await page.route('**/api/v1/admin/feedbacks?*', async route => {
    const rating = new URL(route.request().url()).searchParams.get('rating')
    if (rating === '1') await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({ json: { items: [{ ...feedback, comment: rating === '1' ? 'Phiếu cũ' : 'Phiếu hiện tại' }], totalCount: 1, page: 1, pageSize: 20 } }).catch(() => {})
  })
  await page.goto('/feedbacks')
  await expect(page.getByText('Phiếu hiện tại')).toBeVisible()
  const delayed = page.waitForRequest(request => new URL(request.url()).searchParams.get('rating') === '1')
  await page.getByRole('combobox', { name: 'Số sao', exact: true }).selectOption('1')
  await delayed
  await page.getByRole('combobox', { name: 'Số sao', exact: true }).selectOption('5')
  await expect(page.getByText('Phiếu hiện tại')).toBeVisible()
  await expect(page.getByText('Phiếu cũ')).toHaveCount(0)
  await expect(page).toHaveURL(/rating=5/)
})
test('refresh keeps existing content until the new request finishes @stub', async ({ page }) => {
  await seedStubAdminSession(page)
  let hold = false
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/admin/feedbacks?*', async route => {
    if (hold) await gate
    await route.fulfill({ json: { items: [{ ...feedback, comment: hold ? 'Bản mới' : 'Bản hiện tại' }], totalCount: 1, page: 1, pageSize: 20 } })
  })
  await page.goto('/feedbacks')
  await expect(page.getByText('Bản hiện tại')).toBeVisible()
  hold = true
  await page.getByRole('button', { name: 'Làm mới' }).click()
  await expect(page.getByText('Đang cập nhật đánh giá…')).toBeVisible()
  await expect(page.getByText('Bản hiện tại')).toBeVisible()
  release()
  await expect(page.getByText('Bản mới')).toBeVisible()
})
test('unauthenticated and non-admin route access redirect @stub', async ({ page }) => {
  await page.goto('/feedbacks')
  await expect(page).toHaveURL(/\/login$/)
  const session = stubAdminSession()
  await seedSession(page, { ...session, identity: { ...session.identity, role: 'User' } })
  await page.goto('/feedbacks')
  await expect(page).toHaveURL(/\/login$/)
})
test('real Admin reads list and summary @real', async ({ page }) => {
  await page.unroute('**/api/v1/admin/feedbacks/summary*')
  await seedSession(page, await realAdminSession())
  const listResponse = page.waitForResponse(response => response.url().includes('/api/v1/admin/feedbacks?'))
  const summaryResponse = page.waitForResponse(response => response.url().includes('/api/v1/admin/feedbacks/summary'))
  await page.goto('/feedbacks')
  const list = await listResponse
  expect(list.status()).toBe(200)
  expect(await list.json()).toMatchObject({ page: 1, pageSize: 20 })
  const aggregate = await summaryResponse
  expect(aggregate.status()).toBe(200)
  const payload = await aggregate.json() as AdminFeedbackSummary
  expect(payload.ratingDistribution).toHaveLength(5)
  expect(payload.referralSources).toHaveLength(5)
  await expect(page.getByTestId('feedbacks-page-info')).toBeVisible()
})
test('real User cannot enter feedbacks @real', async ({ page }) => {
  await seedSession(page, await realUserSession())
  await page.goto('/feedbacks')
  await expect(page).toHaveURL(/\/login$/)
})
