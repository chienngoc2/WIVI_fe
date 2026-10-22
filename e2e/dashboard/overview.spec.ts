import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { buildUser, seedStubAdminSession, usersListResponse } from '../fixtures/members'

const summary = {
  totalUsers: 8, activeUsersLast30Days: 7, bannedUsers: 2,
  totalAccounts: 9, newUsersThisMonth: 3, totalTransactions: 5421, transactionsThisMonth: 610,
  totalRevenue: 980000, revenueCurrency: 'VND', paidOrders: 20,
  totalFeedbackVoters: 35, totalFeedbackSubmissions: 41, averageRating: 4.2,
  // Still without a data source: must never be rendered, whatever the value.
  totalJars: 777, activeGoals: 777, pendingImportJobs: 777,
}
const dashboard = { summary, recentUsers: [], recentTransactions: [] }
const active = buildUser({ id: 'active-user', firstName: 'Nguyễn', lastName: 'An', email: 'an@example.com', userName: 'nguyenan' })
const banned = buildUser({ id: 'banned-user', firstName: 'Trần', lastName: 'Bình', email: 'binh@example.com', status: 'Banned' })

const seedDashboard = async (page: Page, body: unknown = dashboard) => {
  await seedStubAdminSession(page)
  await page.route('**/api/v1/admin/dashboard', (route) => route.fulfill({ json: body }))
}

const panels = (page: Page) => page.getByTestId('overview-bottom-panels').locator(':scope > section')
const chartData = (page: Page) => page.getByRole('table', { name: 'Số liệu biểu đồ trạng thái tài khoản' })

test.describe('Overview redesign @stub', () => {
  test('chart comes first, reflects account counts and exposes a readable tooltip', async ({ page }) => {
    await seedDashboard(page)
    await page.route('**/api/v1/admin/users?*', (route) => route.fulfill({ json: usersListResponse([active, banned]) }))
    await page.goto('/')
    await expect(page.getByText('an@example.com')).toBeVisible()
    await expect(chartData(page).getByRole('row')).toHaveCount(3)
    await expect(chartData(page).getByRole('row', { name: 'Hoạt động 8', exact: true })).toHaveCount(1)
    await expect(chartData(page).getByRole('row', { name: 'Bị cấm 2', exact: true })).toHaveCount(1)
    await expect(page.locator('main')).not.toContainText(/backend|stub|time-series|777/i)
    await expect(page.getByTestId('app-shell')).not.toContainText(/98\.4|100,240/)
    const chart = page.getByRole('figure', { name: 'Biểu đồ số tài khoản theo trạng thái' })
    const toolbar = await page.getByRole('search').boundingBox()
    const chartBounds = await chart.boundingBox()
    const bottom = await panels(page).first().boundingBox()
    expect(chartBounds!.y).toBeGreaterThan(toolbar!.y + toolbar!.height)
    expect(bottom!.y).toBeGreaterThan(chartBounds!.y + chartBounds!.height)
    const bar = chart.locator('.recharts-bar-rectangle').first()
    await bar.hover()
    await expect(chart.locator('.recharts-tooltip-wrapper')).toContainText('8')
    await expect(chart.locator('.recharts-tooltip-wrapper')).toContainText('Số tài khoản')
  })

  test('summary tiles show the four system totals above the toolbar and link to feedback', async ({ page }) => {
    await seedDashboard(page)
    await page.route('**/api/v1/admin/users?*', (route) => route.fulfill({ json: usersListResponse([active]) }))
    await page.goto('/')
    const tiles = page.getByTestId('overview-summary-tiles').locator(':scope > section')
    await expect(tiles).toHaveCount(4)
    await expect(tiles.nth(0)).toContainText('Tổng người dùng')
    await expect(tiles.nth(0)).toContainText('9')
    await expect(tiles.nth(0)).toContainText('3 đăng ký trong tháng này')
    await expect(tiles.nth(1)).toContainText('Tổng giao dịch')
    await expect(tiles.nth(1)).toContainText('5.421')
    await expect(tiles.nth(2)).toContainText('Tổng doanh thu')
    await expect(tiles.nth(2)).toContainText('980.000 đ')
    await expect(tiles.nth(2)).toContainText('20 đơn SePay đã xác nhận')
    await expect(tiles.nth(3)).toContainText('Người đã đánh giá')
    await expect(tiles.nth(3)).toContainText('35')
    await expect(tiles.nth(3)).toContainText('41 lượt gửi · trung bình 4,2/5')
    const tilesBox = await page.getByTestId('overview-summary-tiles').boundingBox()
    const toolbar = await page.getByRole('search').boundingBox()
    expect(toolbar!.y).toBeGreaterThan(tilesBox!.y + tilesBox!.height)
    await tiles.nth(3).getByRole('link', { name: 'Xem đánh giá' }).click()
    await expect(page).toHaveURL(/\/feedbacks$/)
  })

  test('unavailable revenue is not shown as zero; a measured zero stays zero', async ({ page }) => {
    await seedDashboard(page, { ...dashboard, summary: { ...summary, totalRevenue: null, paidOrders: null, totalTransactions: 0, transactionsThisMonth: 0 } })
    await page.route('**/api/v1/admin/users?*', (route) => route.fulfill({ json: usersListResponse([active]) }))
    await page.goto('/')
    const tiles = page.getByTestId('overview-summary-tiles').locator(':scope > section')
    await expect(tiles.nth(2).locator('dd')).toHaveText(['Chưa có dữ liệu'])
    await expect(tiles.nth(1).locator('dd').first()).toHaveText('0')
  })

  for (const [revenue, formatted] of [[0, '0 đ'], [98000.5, '98.000,5 đ']] as const) {
    test(`revenue ${revenue} remains a valid monetary measurement`, async ({ page }) => {
      await seedDashboard(page, { ...dashboard, summary: { ...summary, totalRevenue: revenue } })
      await page.route('**/api/v1/admin/users?*', (route) => route.fulfill({ json: usersListResponse([]) }))
      await page.goto('/')
      const revenueTile = page.getByTestId('overview-summary-tiles').locator(':scope > section').nth(2)
      await expect(revenueTile.locator('dd').first()).toHaveText(formatted)
    })
  }

  test('missing new metrics stay unavailable and do not fall back to legacy account counts', async ({ page }) => {
    await seedDashboard(page, { ...dashboard, summary: {
      totalUsers: 8, bannedUsers: 2, activeUsersLast30Days: 7,
      newUsersThisMonth: 3, transactionsThisMonth: 610,
    } })
    await page.route('**/api/v1/admin/users?*', (route) => route.fulfill({ json: usersListResponse([]) }))
    await page.goto('/')
    const tiles = page.getByTestId('overview-summary-tiles').locator(':scope > section')
    for (const tile of await tiles.all()) {
      await expect(tile.locator('dd').first()).toHaveText('Chưa có dữ liệu')
    }
    await expect(tiles.nth(3)).not.toContainText('trung bình')
  })

  test('search and status filter request real criteria; member navigation retains them', async ({ page }) => {
    await seedDashboard(page)
    const queries: URLSearchParams[] = []
    await page.route('**/api/v1/admin/users?*', (route) => {
      const query = new URL(route.request().url()).searchParams
      queries.push(query)
      return route.fulfill({ json: usersListResponse(query.get('status') === 'Banned' ? [banned] : [active, banned]) })
    })
    await page.goto('/')
    await expect(page.getByText('an@example.com')).toBeVisible()
    expect(queries.at(-1)?.get('pageSize')).toBe('8')
    await page.getByLabel('Tìm thành viên', { exact: true }).fill('Bình')
    await expect.poll(() => queries.at(-1)?.get('keyword')).toBe('Bình')
    await page.getByLabel('Trạng thái tài khoản', { exact: true }).selectOption('Banned')
    await expect.poll(() => queries.at(-1)?.get('status')).toBe('Banned')
    await expect(page.getByText('an@example.com')).toHaveCount(0)
    await expect(chartData(page).getByRole('row')).toHaveCount(2)
    await page.getByRole('button', { name: 'Tùy chọn danh sách thành viên' }).click()
    await page.getByRole('menuitem', { name: 'Xem tất cả thành viên' }).click()
    await expect(page).toHaveURL(/\/members\?/)
    const params = new URL(page.url()).searchParams
    expect(params.get('keyword')).toBe('Bình')
    expect(params.get('status')).toBe('Banned')
  })

  test('both menus refresh their own panels and support keyboard dismissal', async ({ page }) => {
    await seedStubAdminSession(page)
    let summaryCalls = 0
    let usersCalls = 0
    await page.route('**/api/v1/admin/dashboard', (route) => { summaryCalls++; return route.fulfill({ json: dashboard }) })
    await page.route('**/api/v1/admin/users?*', (route) => { usersCalls++; return route.fulfill({ json: usersListResponse([active]) }) })
    await page.goto('/')
    await expect(page.getByText('an@example.com')).toBeVisible()
    await expect(chartData(page)).toHaveCount(1)
    const summaryTrigger = page.getByRole('button', { name: 'Tùy chọn tóm tắt tài khoản' })
    await summaryTrigger.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Làm mới thống kê' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(summaryTrigger).toBeFocused()
    await expect(page.getByRole('menu')).toHaveCount(0)
    const initialSummaryCalls = summaryCalls
    await summaryTrigger.click()
    await page.getByRole('menuitem', { name: 'Làm mới thống kê' }).click()
    await expect.poll(() => summaryCalls).toBeGreaterThan(initialSummaryCalls)
    const initialUsersCalls = usersCalls
    await page.getByRole('button', { name: 'Tùy chọn danh sách thành viên' }).click()
    await page.getByRole('menuitem', { name: 'Làm mới danh sách' }).click()
    await expect.poll(() => usersCalls).toBeGreaterThan(initialUsersCalls)
  })

  test('loading and service errors remain distinct; retries recover without exposing diagnostics', async ({ page }) => {
    await seedStubAdminSession(page)
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    let failed = true
    await page.route('**/api/v1/admin/dashboard', async (route) => {
      await pending
      return route.fulfill(failed ? { status: 500, json: { message: 'Internal backend SQL diagnostics' } } : { json: dashboard })
    })
    await page.route('**/api/v1/admin/users?*', (route) => route.fulfill(failed ? { status: 500, json: { message: 'Internal backend SQL diagnostics' } } : { json: usersListResponse([active]) }))
    await page.goto('/')
    await expect(page.getByRole('status').filter({ hasText: 'Đang tải thống kê' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Không tải được danh sách' })).toBeVisible()
    release()
    await expect(page.getByRole('alert').filter({ hasText: 'Không tải được thống kê' })).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/Internal|SQL|backend/)
    failed = false
    await page.getByRole('button', { name: 'Thử lại thống kê' }).click()
    await page.getByRole('button', { name: 'Thử lại danh sách' }).click()
    await expect(chartData(page)).toHaveCount(1)
    await expect(page.getByText('an@example.com')).toBeVisible()
  })

  test('zero counts and an empty member list are valid empty states', async ({ page }) => {
    await seedDashboard(page, { ...dashboard, summary: { ...summary, totalUsers: 0, bannedUsers: 0, activeUsersLast30Days: 0 } })
    await page.route('**/api/v1/admin/users?*', (route) => route.fulfill({ json: usersListResponse([]) }))
    await page.goto('/')
    await expect(page.getByText('Chưa có tài khoản trong nhóm này')).toBeVisible()
    await expect(page.getByText('Chưa có thành viên nào', { exact: true })).toBeVisible()
    await expect(panels(page).last().locator('dd')).toHaveText(['0', '0', '0'])
    await expect(page.getByText('Thông tin giao dịch gần đây chưa khả dụng.')).toBeVisible()
  })

  test('missing counts stay unavailable and a filtered empty list offers reset', async ({ page }) => {
    await seedDashboard(page, { ...dashboard, summary: { ...summary, totalUsers: null } })
    await page.route('**/api/v1/admin/users?*', (route) => {
      const keyword = new URL(route.request().url()).searchParams.get('keyword')
      return route.fulfill({ json: usersListResponse(keyword ? [] : [active]) })
    })
    await page.goto('/')
    await expect(page.getByText('Thống kê tài khoản chưa khả dụng', { exact: true })).toBeVisible()
    await expect(panels(page).last().locator('dd').first()).toHaveText('Chưa có dữ liệu')
    await page.getByLabel('Tìm thành viên', { exact: true }).fill('unknown')
    await expect(page.getByText('Không tìm thấy thành viên phù hợp')).toBeVisible()
    await panels(page).first().getByRole('button', { name: 'Xóa bộ lọc' }).click()
    await expect(page.getByText('an@example.com')).toBeVisible()
    await expect(page.getByLabel('Tìm thành viên', { exact: true })).toHaveValue('')
  })

  for (const width of [1440, 820, 390]) {
    test(`layout stays readable without page overflow at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 })
      await seedDashboard(page)
      await page.route('**/api/v1/admin/users?*', (route) => route.fulfill({ json: usersListResponse([active, banned]) }))
      await page.goto('/')
      await expect(page.getByText('an@example.com')).toBeVisible()
      await expect(page.getByRole('figure')).toBeVisible()
      const tiles = page.getByTestId('overview-summary-tiles').locator(':scope > section')
      const firstTile = await tiles.nth(0).boundingBox()
      const secondTile = await tiles.nth(1).boundingBox()
      if (width < 640) expect(secondTile!.y).toBeGreaterThan(firstTile!.y + firstTile!.height)
      else expect(Math.abs(firstTile!.y - secondTile!.y)).toBeLessThan(2)
      const left = await panels(page).first().boundingBox()
      const right = await panels(page).last().boundingBox()
      if (width >= 1024) {
        expect(Math.abs(left!.y - right!.y)).toBeLessThan(2)
        expect(left!.width / right!.width).toBeCloseTo(7 / 3, 1)
      } else {
        expect(right!.y).toBeGreaterThan(left!.y + left!.height)
      }
      const chart = await page.getByRole('figure').boundingBox()
      expect(chart!.width).toBeGreaterThan(width < 768 ? 240 : 450)
      expect(chart!.x + chart!.width).toBeLessThanOrEqual(width)
      expect(await page.locator('main').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true })
    })
  }
})
