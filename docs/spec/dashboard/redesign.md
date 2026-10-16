# Dashboard: chart-first workspace

## Implemented layout and behavior

- `src/pages/Overview.tsx`: four summary tiles → toolbar → full-width account-status bar chart → 70/30 information panels at `lg`; panels stack below 1024px.
- `src/components/dashboard/SummaryTiles.tsx` (2026-10-13): system-wide totals for users (`totalAccounts`), transactions, SePay-confirmed revenue and feedback voters, using `SectionCard`: one column below `sm`, two from `sm`, four from `lg`. A `null`/missing number renders "Chưa có dữ liệu"; a measured `0` renders `0`. Revenue accepts decimals. The feedback tile links to `/feedbacks`.
- Search occupies 40% of the toolbar from `sm`, filters the member list by name, username or email, and debounces for 350ms. Status filters both the chart and member list; the contextual summary stays explicitly system-wide.
- `src/components/dashboard/AccountStatusChart.tsx`: Recharts bar chart, labelled axes, legend, tooltip and screen-reader table. Loading, error/retry, zero-count empty and missing-count unavailable states are distinct.
- Reuse: `SectionCard`, `SearchInput`, `DataTable`, `Badge`, `Button`, `EmptyState`, `chartTheme`, `getAdminDashboard`, `listUsers` and shared formatters. No extra dependency or API client.
- `src/components/ui/PanelMenu.tsx`: implemented actions only; refresh each panel, open Members with current filters, or open Members without filters. Keyboard navigation, Escape and outside-click dismissal.
- Layout/shell changes in `AppLayout`, `Sidebar`, `TopNav` are scoped to `/`: retain desktop navigation and identity, use a compact accessible icon sidebar on mobile, and omit the decorative command search, fixed AI accuracy, node/build counters and unverified health indicators from Overview.
- Existing dashboard response transactions still render when supplied; an empty list is marked unavailable because the current handler does not query transactions.
- Local state only: keyword/debounced keyword, status, refresh revisions and request snapshots. Abort and query keys prevent old responses from replacing a newer filter result. Summary and member failures are independent. Raw service diagnostics are not displayed.

## Data sources verified

`GET /api/v1/admin/dashboard` → `AdminDashboardController` → backend `GetAdminDashboardHandler` → identity `AccountRepository`:

| Field | Runtime meaning | Presentation |
| --- | --- | --- |
| `summary.totalUsers` | Account count with status `Active`, not all accounts | Active bar and summary row |
| `summary.bannedUsers` | Account count with status `Banned` | Banned bar and summary row |
| `summary.activeUsersLast30Days` | Active accounts that logged in in the last 30 days | Separate summary row; never added to status totals |
| `summary.totalAccounts`, `newUsersThisMonth` | Accounts with the `User` role, Active and Banned; registrations since the Vietnamese month start | "Tổng người dùng" tile |
| `summary.totalTransactions`, `transactionsThisMonth` | Non-deleted transactions of all users; recorded since the month start | "Tổng giao dịch" tile |
| `summary.totalRevenue`, `paidOrders` | `Paid` orders confirmed by SePay, VND; `null` until the backend migration `1792000700000` has run | "Tổng doanh thu" tile |
| `summary.totalFeedbackVoters`, `totalFeedbackSubmissions`, `averageRating` | Same numbers as `/admin/feedbacks/summary` without filters | "Người đã đánh giá" tile |
| `summary.totalJars`, `activeGoals`, `pendingImportJobs` | Always `null`, no data source yet | Omitted, regardless of their value |
| `recentUsers`, `recentTransactions` | Constant empty arrays | Users replaced with the existing users-list query; empty transactions remain unavailable |

`GET /api/v1/admin/users?pageIndex=1&pageSize=8&status?&keyword?` already supports these filters. `AccountRepositoryImpl.findAll` orders by `createdAt DESC`. The panel shows at most eight matching accounts; its total comes from `pagination.totalCount`. The account API includes administrator accounts too; no role filter is inferred.

Counts must be finite non-negative integers. A measured `0` stays `0`; absent, null or invalid counts are unavailable. No synthetic data, percentages, growth rates or historical buckets are derived from snapshot counters.

## Missing dependencies / drift

Backend docs `docs/services/admin/dashboard.md` describe recent-record projections that runtime does not implement. Runtime has no time-series data and no date-range query parameters. Do not add a date picker, trend chart, fabricated zero transactions, or treat placeholder arrays as evidence that no transactions exist.

Historical analytics require a separately agreed admin endpoint/contract defining the metric, date range, UTC/timezone boundaries, bucket interval, completeness/availability and counts or financial amounts per bucket. Recent transactions and remaining aggregate counters likewise need actual queries and explicit availability semantics. The metrics extension is documented in the backend's `docs/API V2.md` and `docs/plan/admin-overview-metrics-implementation.md`.

## Verification

`e2e/dashboard/overview.spec.ts` uses intercepted responses only (`@stub` test tag never appears in the product). Checks chart values/tooltip, request filters, menus, navigation, loading, independent errors and retries, unavailable versus zero, empty/reset, and layout at 1440/820/390px. Screenshot artifacts are generated into ignored Playwright output for visual review.

Run `npm run lint`, `npm run build`, and `npm run test:e2e -- e2e/dashboard/overview.spec.ts --project=chromium-desktop --workers=2 --reporter=list`.

Verified 2026-10-13 after completing the tiles: lint/build pass, all fourteen dashboard tests pass on `chromium-desktop` (stubbed API). Coverage includes all four totals, the feedback link, unavailable versus measured zero, fractional revenue, missing metrics in an older response, and 1/2/4-column responsive layout. Backend AppModule, real HTTP and SQL were separately checked on temporary PostgreSQL; see the backend implementation report. The deployment database was not checked.

Earlier run: lint/build pass (existing bundle-size warning remains); all nine dashboard tests pass. The wider offline desktop run across dashboard, configuration, auth and feedback passes 33/34 tests. The existing `TC-AUTH-32 @stub @drift` fails when it assumes a malformed token payload stays in localStorage; the API client's `readSession()` already removes that payload. Re-running this test with `Overview.tsx` from HEAD reproduces the same failure. Auth behavior and this unrelated test were not changed.
