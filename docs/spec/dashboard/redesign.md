# Dashboard: chart-first workspace

## Implemented layout and behavior

- `src/pages/Overview.tsx`: toolbar → full-width account-status bar chart → 70/30 information panels at `lg`; panels stack below 1024px.
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
| Six other summary counters | Constant placeholder zeros | Omitted, regardless of their value, until a supported contract exists |
| `recentUsers`, `recentTransactions` | Constant empty arrays | Users replaced with the existing users-list query; empty transactions remain unavailable |

`GET /api/v1/admin/users?pageIndex=1&pageSize=8&status?&keyword?` already supports these filters. `AccountRepositoryImpl.findAll` orders by `createdAt DESC`. The panel shows at most eight matching accounts; its total comes from `pagination.totalCount`. The account API includes administrator accounts too; no role filter is inferred.

Counts must be finite non-negative integers. A measured `0` stays `0`; absent, null or invalid counts are unavailable. No synthetic data, percentages, growth rates or historical buckets are derived from snapshot counters.

## Missing dependencies / drift

Backend docs `docs/services/admin/dashboard.md` describe recent-record projections that runtime does not implement. Runtime has no time-series data and no date-range query parameters. Do not add a date picker, trend chart, fabricated zero transactions, or treat placeholder arrays as evidence that no transactions exist.

Historical analytics require a separately agreed admin endpoint/contract defining the metric, date range, UTC/timezone boundaries, bucket interval, completeness/availability and counts or financial amounts per bucket. Recent transactions and remaining aggregate counters likewise need actual queries and explicit availability semantics. No backend API changes are included in this UI task.

## Verification

`e2e/dashboard/overview.spec.ts` uses intercepted responses only (`@stub` test tag never appears in the product). Checks chart values/tooltip, request filters, menus, navigation, loading, independent errors and retries, unavailable versus zero, empty/reset, and layout at 1440/820/390px. Screenshot artifacts are generated into ignored Playwright output for visual review.

Run `npm run lint`, `npm run build`, and `npm run test:e2e -- e2e/dashboard/overview.spec.ts --project=chromium-desktop --workers=2 --reporter=list`.

Verified locally: lint/build pass (existing bundle-size warning remains); all nine dashboard tests pass. The wider offline desktop run across dashboard, configuration, auth and feedback passes 33/34 tests. The existing `TC-AUTH-32 @stub @drift` fails when it assumes a malformed token payload stays in localStorage; the API client's `readSession()` already removes that payload. Re-running this test with `Overview.tsx` from HEAD reproduces the same failure. Auth behavior and this unrelated test were not changed.
