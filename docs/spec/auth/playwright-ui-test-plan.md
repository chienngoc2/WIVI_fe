# Stage 1 — Playwright UI test plan (Admin Auth)

Bản test plan này biến các `AC-xx` trong [`stage-1-auth-spec.md`](./stage-1-auth-spec.md) §6 thành
test case Playwright **thao tác trên giao diện**. Mục tiêu: một người viết test chỉ cần đọc file này
là viết được `e2e/auth/*.spec.ts` mà không phải đọc lại `src/`.

**Trạng thái hiện tại: chưa có dòng code test nào.** Repo không có Playwright, không `data-testid`,
không script `test` (`package.json:6-11`). §8 liệt kê các khoảng trống `G-x` phải lấp trước.

> **Cập nhật 2026-10-07 — suite đã chuyển sang DỮ LIỆU THẬT.**
> `P-2`, `P-3`, `P-5` và mọi mô tả `installAuthBackend` / `@live` bên dưới là **lịch sử**, không còn đúng với runtime.
> Hiện trạng:
> - **Không còn mock network cho luồng chính.** Test đi thẳng vào backend thật, dùng account seed trong
>   `.env.test` (`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`, `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`) và `E2E_API_BASE_URL`.
> - Fixture: `e2e/fixtures/accounts.ts` (account thật + `apiLogin` + `toSession`), `e2e/fixtures/api-traffic.ts`
>   (đếm request thật, làm trễ response thật, abort request), `e2e/fixtures/auth-stub.ts` (chỉ cho nhánh backend
>   không tạo được), `e2e/fixtures/session.ts` (seed/đọc localStorage).
> - Tag: `@real` = cần backend thật; `@stub` = response giả cho nhánh bất khả thi (403 banned, 500 kèm stack,
>   502 HTML, 200 thiếu `accessToken`, role `admin` chữ thường, 422 field password / không map được / null);
>   `@drift` giữ nguyên ý nghĩa.
> - `live.spec.ts` **đã xoá**: `TC-AUTH-70..72` nay được phủ bởi `TC-AUTH-20/21/22` chạy thẳng trên backend thật.
> - Script: `test:e2e` (tất cả), `test:e2e:real` (`@real`), `test:e2e:offline` (bỏ `@real` — CI dùng cái này),
>   `test:e2e:stub`, `test:e2e:ui`, `test:e2e:no-api-base`.
> - CI (`ci.yml`, `playwright.yml`) chạy `pnpm run test:e2e:offline` vì runner không có backend.
> - Account thật đang dùng: role `Admin` và role `User` (giá trị nằm trong `.env.test`, không commit).

---

## 1. Quyết định thiết kế và ràng buộc

| ID | Quyết định | Lý do | Cần owner duyệt |
| --- | --- | --- | --- |
| `P-1` | Dùng `@playwright/test` (Chromium) làm runner duy nhất | Repo chưa có runner nào; đây là E2E UI thật, không phải unit test | `Q-4` |
| `P-2` | Mặc định **mock network** bằng `page.route`, không cần backend/DB — **ĐÃ THAY ĐỔI 2026-10-07**: nay mặc định chạy backend thật, xem cập nhật ở đầu file | Test hermetic, chạy được ở CI; `admin_api.md:5` xác nhận login chưa từng được xác thực với backend chạy thật | `Q-5` |
| `P-3` | Thêm suite `@live` opt-in cho backend thật, `test.skip()` khi thiếu env — **ĐÃ THAY ĐỔI 2026-10-07**: `live.spec.ts` đã xoá, mọi case `@real` đi thẳng backend thật | Có đường kiểm chứng contract thật mà không chặn CI | `Q-5` |
| `P-4` | Trỏ `VITE_API_BASE_URL` về **chính origin của dev server** trong suite mock | Mọi call thành **same-origin** ⇒ không cần preflight/CORS header trong `route.fulfill`; `page.route` chặn trước khi tới Vite | — |
| `P-5` | Đăng ký **catch-all** `**/api/v1/**` trả `501` cho request không được mock | Nếu thiếu, request rơi vào Vite SPA fallback → trả `index.html` 200 → client parse ra string và test sẽ "pass" giả | — |
| `P-6` | Dùng `data-testid` (`testIdAttribute` mặc định của Playwright) cho vùng không có ngữ nghĩa ổn định; ưu tiên `getByLabel`/`getByRole` ở nơi đã có | `src/` hiện **0** `data-testid`; `Login` đã có `label htmlFor` nên `getByLabel` dùng được ngay | — |
| `P-7` | Seed session bằng `page.addInitScript` (ghi `localStorage` trước khi script app chạy) | `AuthProvider` đọc session **đồng bộ** trong `useState` initializer (`AuthProvider.tsx:13`) nên phải có mặt trước lần render đầu | — |
| `P-8` | Không dùng `page.route` cho `/user/me` hay bất kỳ endpoint ngoài `/auth/*` | Stage 1 không gọi endpoint nào khác; catch-all `P-5` sẽ bắt và fail rõ ràng | — |
| `P-9` | Chỉ chạy suite shell trên viewport desktop | `AppLayout` không responsive (`D-8`); `/login` chạy thêm viewport mobile | — |

---

## 2. Bố cục file dự kiến

```text
WIVI_fe/
├── playwright.config.ts                    # cấu hình runner + webServer + projects
├── e2e/
│   ├── fixtures/
│   │   ├── accounts.ts                     # account seed (.env.test) + apiLogin thật + toSession
│   │   ├── api-traffic.ts                  # track request thật / delay response / abort
│   │   ├── auth-stub.ts                    # stub cho nhánh backend không tạo được (@stub)
│   │   └── session.ts                      # seedSession / readStoredSession / clearStoredSession
│   └── auth/
│       ├── guard.spec.ts                   # TC-AUTH-01 … 09
│       ├── login-form.spec.ts              # TC-AUTH-10 … 13
│       ├── login-outcome.spec.ts           # TC-AUTH-20 … 33
│       ├── session-expiry.spec.ts          # TC-AUTH-40
│       └── logout.spec.ts                  # TC-AUTH-50 … 52
└── playwright.config.no-api-base.ts        # TC-AUTH-60 (P2) — dev server không có VITE_API_BASE_URL
```

Quy ước: **không** import từ `src/` trong test (trừ `import type` cho DTO nếu cần) — test phải quan
sát giao diện, không gọi hàm nội bộ.

---

## 3. Cấu hình

### 3.1 `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'chromium-mobile',
      testMatch: /auth\/login-(form|outcome)\.spec\.ts/,   // chỉ /login responsive được (D-8)
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_API_BASE_URL: BASE_URL },   // P-4 + G-3
  },
})
```

**Bắt buộc set `env.VITE_API_BASE_URL`** vì `.env` bị `.gitignore` (`.gitignore` dòng `.env`) ⇒ CI
không có file này ⇒ nếu thiếu, client throw `API_CONFIG_ERROR` (`client.ts:31-38`) và mọi test login
fail.

### 3.2 Script `package.json`

```jsonc
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:real": "playwright test --grep @real",
    "test:e2e:offline": "playwright test --grep-invert @real",
    "test:e2e:stub": "playwright test --grep @stub",
    "test:e2e:no-api-base": "playwright test -c playwright.config.no-api-base.ts --grep @config"
  }
}
```

`devDependencies` thêm: `@playwright/test`. Cài browser: `pnpm exec playwright install chromium`
(tùy chọn `--with-deps` trên Linux/CI).

### 3.3 Các file cấu hình phải sửa kèm

| File | Sửa gì | Vì sao |
| --- | --- | --- |
| `.gitignore` | thêm `test-results/`, `playwright-report/`, `blob-report/`, `.playwright/` | artifact của runner |
| `eslint.config.js:11` | thêm các thư mục trên vào `globalIgnores` | `pnpm lint` = `eslint .` sẽ quét cả report |
| `tsconfig.node.json:23` | `"include": ["vite.config.ts", "playwright.config.ts", "e2e"]` | `tsc -b` hiện **không** typecheck `e2e/`; không thêm thì test không được check |
| `.github/workflows/ci.yml` | thêm job `e2e` sau `build-and-lint` (§9) | để spec có hiệu lực thực sự |

`no-undef` đã bị tắt cho file TS bởi `tseslint.configs.recommended`, nên `process.env` trong config
không lỗi dù `globals.browser` đang áp cho `**/*.{ts,tsx}`. Vẫn phải chạy `pnpm lint` để xác nhận
(G-5).

---

## 4. Test harness

### 4.1 Mock backend — `e2e/fixtures/auth-backend.ts` (LỊCH SỬ — file đã xoá 2026-10-07)

Hợp đồng mock **phải khớp** §3.1 của spec (`stage-1-auth-spec.md`):

| Route mock | Điều kiện | Trả về |
| --- | --- | --- |
| `POST /api/v1/auth/login` | tài khoản hợp lệ, `role: 'Admin'` | `200` `{id, username, firstName, lastName, fullName, email, role:'Admin', isOnboardingCompleted, isOnboarded, accessToken:'access-1', refreshToken:'refresh-1'}` |
| | tài khoản hợp lệ, `role: 'User'` | `200` cùng shape, `role:'User'` |
| | tài khoản `role: 'admin'` (lowercase, mô phỏng `/auth/google`) | `200` cùng shape, `role:'admin'` |
| | tài khoản bị ban | `403` `{code:'FORBIDDEN', message:'Account is banned: Vi phạm điều khoản', field:null, details:{domainCode:'ACCOUNT_BANNED'}}` |
| | sai mật khẩu | `401` `{code:'UNAUTHORIZED', message:'Invalid email or password', field:null, details:{domainCode:'INVALID_CREDENTIALS'}}` |
| | email sai định dạng | `422` `{code:'VALIDATION_FAILED', message:'Địa chỉ Email không đúng định dạng.', field:'email', details:{}}` |
| `POST /api/v1/auth/refresh` | mặc định | `200` `{accessToken:'access-2', refreshToken:'refresh-2'}` |
| | cấu hình `refreshFails: true` | `401` `{code:'UNAUTHORIZED', message:'Refresh Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', field:null, details:{}}` |
| `POST /api/v1/auth/logout` | mặc định | `200` `{message:'Logged out successfully'}` |
| | `logoutStatus: 401` | `401` `{code:'UNAUTHORIZED', message:'Unauthorized', field:null, details:{}}` |
| `**/api/v1/**` (catch-all, `P-5`) | mọi request còn lại | `501` `{code:'E2E_UNMOCKED', message:'E2E: chưa mock <method> <url>', field:null, details:{}}` |

API của fixture:

```ts
interface AuthBackendOptions {
  latencyMs?: number
  loginResponse?: { status: number; body: unknown }   // ép cứng một kết quả cho TC lỗi biên
  refreshFails?: boolean
  logoutStatus?: number
}

interface RecordedRequest {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

// LỊCH SỬ (đã xoá): installAuthBackend() giả toàn bộ /api/v1/** bằng page.route.
// Hiện tại tách thành:
declare function trackApiRequests(page: Page): RecordedRequest[]                    // api-traffic.ts
declare function delayRealResponse(page: Page, urlPattern: string, ms: number): Promise<void>
declare function abortRealRequest(page: Page, urlPattern: string): Promise<void>
declare function stubLoginResponse(page: Page, response: { status: number; body: unknown }): Promise<void>  // auth-stub.ts
```

`RecordedRequest` (từ `trackApiRequests()`) cho phép assert **số lần gọi** (`TC-AUTH-10`, `TC-AUTH-13`,
`TC-AUTH-50`) và **header Authorization** (`TC-AUTH-52`) — request vẫn đi tới backend thật, chỉ được quan sát.

Tài khoản dùng trong test: **account thật** lấy từ `.env.test` (`adminAccount()`, `userAccount()` trong
`e2e/fixtures/accounts.ts`). Bảng account giả `admin@wivi.vn` / `user@wivi.vn` / `lower-admin@wivi.vn` /
`banned@wivi.vn` bên dưới (lịch sử) chỉ còn dùng ở các case `@stub`, nơi response được giả và email điền vào
form không quan trọng.

| Email | Mật khẩu | `role` | Ghi chú |
| --- | --- | --- | --- |
| `admin@wivi.vn` | `Admin#1234` | `Admin` | đường thành công |
| `user@wivi.vn` | `User#1234` | `User` | đường bị từ chối (`TC-AUTH-22`) |
| `lower-admin@wivi.vn` | `Admin#1234` | `admin` | drift `D-1` (`TC-AUTH-23`) |
| `banned@wivi.vn` | `Admin#1234` | `Admin` + bị ban | `TC-AUTH-24` |

### 4.2 Session helper — `e2e/fixtures/session.ts`

```ts
const SESSION_KEY = 'wivi.admin.session'   // khớp src/lib/session.ts:3

declare function seedSession(page: Page, session: unknown): Promise<void>   // addInitScript
declare function seedRawSession(page: Page, raw: string): Promise<void>     // cho TC-AUTH-06
declare function readStoredSession(page: Page): Promise<unknown | null>
declare function clearStoredSession(page: Page): Promise<void>

declare function apiLogin(account: TestAccount): Promise<ApiLoginResult>    // accounts.ts — login thật qua HTTP
declare function realAdminSession(): Promise<AuthSession>                   // session thật, role 'Admin'
declare function realUserSession(): Promise<AuthSession>                    // session thật, role 'User'
```

`seedSession` phải dùng `page.addInitScript` (**không** `page.evaluate` sau `goto`) vì lý do `P-7`.

### 4.3 Bất biến dùng chung

| Bất biến | Cách assert |
| --- | --- |
| Không lộ token/secret ra DOM | `expect(page.locator('body')).not.toContainText(<accessToken>)` — nhúng vào `TC-AUTH-20`, `TC-AUTH-30` |
| Không lộ stack trace | `expect(page.locator('body')).not.toContainText('at Object.')` — `TC-AUTH-30` |
| Không có request khi validate client chặn | đếm request thật qua `trackApiRequests()` = 0 |

---

## 5. Hợp đồng selector

`src/` hiện **0** `data-testid`. Các hook đã có sẵn dùng được ngay: `getByLabel('Email')` và
`getByLabel('Mật khẩu')` (đã có `label htmlFor`), `getByRole('link', { name })` cho nav.

**Phải thêm** (chỉ thêm attribute, **không** đổi markup/hành vi — `G-1`):

| Vùng | File | Selector | Vì sao cần |
| --- | --- | --- | --- |
| Khung `/login` | `src/pages/Login.tsx:70` | `data-testid="login-page"` | phân biệt trang login với phần còn lại |
| Nút đổi hiện/ẩn | `src/pages/Login.tsx:136` | `data-testid="login-password-toggle"` | text đổi `Hiện`/`Ẩn` theo state → không ổn định |
| Nút submit | `src/pages/Login.tsx:143` | `data-testid="login-submit"` | assert `disabled` + text `Đang xác thực…` |
| Khối lỗi form | `src/pages/Login.tsx:98` | `data-testid="login-error-form"` | **bắt buộc**: khối này và banner `denied` **cùng** `role="alert"` nên `getByRole('alert')` sẽ strict-mode violation |
| Banner từ chối | `src/pages/Login.tsx:90` | `data-testid="login-denied"` | như trên |
| Nút thoát trong banner | `src/pages/Login.tsx:92` | `data-testid="login-denied-logout"` | đường logout duy nhất (`D-2`) |
| Khối notice hết hạn | `src/pages/Login.tsx:84` | `data-testid="login-notice"` | `role="status"` là đủ nhưng test id rõ ràng hơn |
| Shell | `src/components/AppLayout.tsx:6` | `data-testid="app-shell"` | assert đã vào portal |
| Tên identity | `src/components/TopNav.tsx:50` | `data-testid="topnav-identity-name"` | không có hook ngữ nghĩa ổn định |
| Initials | `src/components/TopNav.tsx:53` | `data-testid="topnav-identity-initials"` | idem |
| Trang 404 | `src/pages/NotFound.tsx:4` | `data-testid="page-not-found"` | phân biệt 404 với các page khác |

Đã có sẵn, **không** cần thêm: `#login-email`, `#login-password`, `#login-email-error`,
`#login-password-error` (`src/pages/Login.tsx:109,126,119,140`).

---

## 6. Catalogue test case

Quy ước: mọi case mặc định dùng `baseURL` + backend thật; case cần session thì lấy **session thật** bằng
`realAdminSession()` / `realUserSession()` (không còn `adminSession()` / `nonAdminSession()`).
Cột **Given** bên dưới còn ghi tên helper cũ (`adminSession()`, `installAuthBackend`, mock `200`…) — đó là
mô tả lịch sử; runtime hiện tại xem cập nhật ở đầu file và §6.7. Tag `@drift` = case **khoá hành vi hiện tại**
đang lệch rule/tài liệu, phải có comment trỏ `D-x`. Tag `@real` = cần backend thật; `@stub` = response giả.

### 6.1 Suite A — Route guard & bootstrap session · `guard.spec.ts`

| ID | Given | When | Then |
| --- | --- | --- | --- |
| `TC-AUTH-01` | không có session | `goto /` | URL `/login`; `login-page` hiện; `app-shell` không hiện; link nav `Tổng quan` không hiện |
| `TC-AUTH-02` | không có session | `goto` lần lượt `/`, `/members`, `/activity`, `/intelligence`, `/campaigns`, `/configuration`, `/khong-ton-tai` (parametrize) | mỗi lần: URL `/login`, `app-shell` không hiện |
| `TC-AUTH-03` | không có session | `goto /members?pageIndex=2&keyword=an` → login `admin@wivi.vn` | URL sau login **đúng** `/members?pageIndex=2&keyword=an` |
| `TC-AUTH-04` | seed `adminSession()` (`access-1`) | `goto /members` | `app-shell` hiện; `topnav-identity-name` = `fullName` seed; `localStorage` vẫn giữ `access-1`; **không** lần nào chuyển tới `/login` |
| `TC-AUTH-05` | seed `nonAdminSession()` (role `User`) | `goto /members` | URL `/login`; `login-denied` hiện với **đúng** copy `Tài khoản này không có quyền truy cập trang quản trị.`; `login-denied-logout` hiện |
| `TC-AUTH-06` | `seedRawSession('{ khong-phai-json')` | `goto /members` | URL `/login`; key `wivi.admin.session` **đã bị xoá**; `app-shell` không hiện |
| `TC-AUTH-07` | seed JSON hợp lệ nhưng thiếu `refreshToken` | `goto /members` | URL `/login`; key đã bị xoá |
| `TC-AUTH-08` | seed `adminSession()` | `goto /khong-ton-tai` | `page-not-found` hiện **bên trong** `app-shell` (nav `Tổng quan` vẫn hiện) |
| `TC-AUTH-09` | seed `adminSession()` | `goto /login` | bị đẩy về `/`; `login-page` không hiện; `app-shell` hiện |

**Ghi chú `TC-AUTH-04` — "không nháy `/login`":** đăng ký recorder trước khi `goto`, rồi assert
không có URL nào chứa `/login`:

```ts
const visited: string[] = []
page.on('framenavigated', (f) => { if (f === page.mainFrame()) visited.push(f.url()) })
await seedSession(page, adminSession())
await page.goto('/members')
await expect(page.getByTestId('app-shell')).toBeVisible()
expect(visited.filter((u) => u.includes('/login'))).toEqual([])
```

Nếu `framenavigated` không bắt được điều hướng `history.replaceState` của React Router trong phiên
bản Playwright đang dùng, thay bằng: assert `page.url()` kết thúc `/members` **ngay tại thời điểm**
`app-shell` xuất hiện lần đầu, và ghi chú lý do trong test.

### 6.2 Suite B — Hành vi form (không cần mock) · `login-form.spec.ts`

| ID | Given | When | Then |
| --- | --- | --- | --- |
| `TC-AUTH-10` | ở `/login`, form rỗng | click `login-submit` | `#login-email-error` = `Vui lòng nhập email.`; `#login-password-error` = `Vui lòng nhập mật khẩu.`; cả hai input `aria-invalid="true"`; **0** request tới `/api/v1/auth/login` |
| `TC-AUTH-11` | email hợp lệ, mật khẩu rỗng | click submit | chỉ `#login-password-error` hiện; `#login-email-error` không hiện; 0 request |
| `TC-AUTH-12` | ở `/login` | click `login-password-toggle` | lần 1: `#login-password` `type=text`, nút text `Ẩn`; lần 2: `type=password`, nút text `Hiện` |
| `TC-AUTH-13` | `latencyMs: 800`, thông tin hợp lệ | click `login-submit` rồi click thêm 2 lần | trong lúc chờ: nút text `Đang xác thực…` **và** `disabled`; sau khi xong: tổng số request `/auth/login` = **1** |

### 6.3 Suite C — Kết quả đăng nhập · `login-outcome.spec.ts`

| ID | Given (mock) | When | Then |
| --- | --- | --- | --- |
| `TC-AUTH-20` | login `admin@wivi.vn` → `200 role:'Admin'` | submit | URL `/`; `app-shell` hiện; `topnav-identity-name` = `fullName` mock; `localStorage['wivi.admin.session']` có `accessToken`, `refreshToken`, `identity.{id,fullName,email,role:'Admin'}`; body **không** chứa `access-1` |
| `TC-AUTH-21` | login → `401` message tiếng Anh | submit | `login-error-form` chứa `Không đăng nhập được` **và** `Email hoặc mật khẩu không đúng.`; body **không** chứa `Invalid email or password`; không có key session; URL vẫn `/login` |
| `TC-AUTH-22` | login `user@wivi.vn` → `200 role:'User'` | submit | `login-error-form` chứa `Tài khoản này không có quyền truy cập trang quản trị.`; **không** có key session; URL `/login`; `login-denied` **không** hiện (khoá `D-4`) |
| `TC-AUTH-23` | login `lower-admin@wivi.vn` → `200 role:'admin'` | submit | `@drift` — hành vi hiện tại: giống `TC-AUTH-22` (bị từ chối). Comment trỏ `D-1`/`Q-1`; khi `Q-1` chốt case-insensitive thì **đảo** kỳ vọng sang vào được `/` và bỏ tag `@drift` |
| `TC-AUTH-24` | login `banned@wivi.vn` → `403 FORBIDDEN` | submit | `@drift` — hành vi hiện tại: `login-error-form` hiển thị **nguyên message backend tiếng Anh** `Account is banned: …` (nhánh `error instanceof Error`, `Login.tsx:59-60`); không có session; comment trỏ `D-10` |
| `TC-AUTH-25` | login → `422 field:'email'` | submit | `#login-email-error` = message backend; `#login-email` `aria-invalid="true"`; `login-error-form` **không** hiện |
| `TC-AUTH-26` | login → `422 field:'password'` | submit | `#login-password-error` = message backend; `login-error-form` không hiện |
| `TC-AUTH-27` | login → `422 field:'username'` | submit | lỗi rơi vào `login-error-form`; không field nào có lỗi |
| `TC-AUTH-28` | login → `422 field:null` | submit | `login-error-form` hiển thị message backend |
| `TC-AUTH-29` | `route.abort('failed')` cho `/auth/login` | submit | `login-error-form` = `Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.` |
| `TC-AUTH-30` | login → `500 {code:'INTERNAL_ERROR', message:'An unexpected error occurred', details:{stack:'…at Object.<anonymous>…'}}` | submit | `login-error-form` hiển thị message; body **không** chứa `stack`, `at Object.` |
| `TC-AUTH-31` | login → `502` `content-type: text/html`, body `<html>Bad Gateway</html>` | submit | `@drift` — hành vi hiện tại: `login-error-form` hiển thị **nguyên chuỗi HTML** (nhánh `toApiError` string, `client.ts:67-74`). Comment trỏ `D-11`; sau khi sửa thì kỳ vọng đổi thành câu generic |
| `TC-AUTH-32` | login → `200` **thiếu** `accessToken` (chỉ có `refreshToken` + identity) | submit, rồi `reload` | `@drift` (`D-5`) — hiện tại: lần 1 vào được `/` (`app-shell` hiện) nhưng key session **thiếu** `accessToken`; sau `reload` URL `/login` và key bị xoá |
| `TC-AUTH-33` | `addInitScript` override `Storage.prototype.setItem` để throw `QuotaExceededError`; login `200 Admin` | submit | `login-error-form` = `Không thể lưu phiên đăng nhập trên trình duyệt này.`; URL vẫn `/login`; `app-shell` không hiện |

### 6.4 Suite D — Hết hạn phiên · `session-expiry.spec.ts`

| ID | Given | When | Then |
| --- | --- | --- | --- |
| `TC-AUTH-40` | seed `adminSession()`, ở `/members`, `app-shell` hiện | `page.evaluate`: xoá key session **và** `window.dispatchEvent(new Event('wivi:admin-session-expired'))` | URL `/login`; `login-notice` hiển thị `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.`; key session vắng mặt; `app-shell` không hiện |

**Trung thực về coverage:** `TC-AUTH-40` **mô phỏng** đúng hai việc mà `dispatchSessionExpired()`
làm (`clearSession()` + phát event — `client.ts:77-80`), vì ở Stage 1 **không** có request xác thực
nào để kích hoạt đường 401 thật (`D-3`). Test này kiểm phần **UI phản ứng** với sự kiện hết hạn, không
kiểm cơ chế refresh. Khi Stage 2 nối endpoint list đầu tiên, bổ sung:

| ID dành chỗ | Nội dung |
| --- | --- |
| `TC-AUTH-41` | access token hết hạn → request list trả 401 → client gọi `/auth/refresh` **đúng 1 lần** → retry request **đúng 1 lần** → UI render dữ liệu, session giữ nguyên identity |
| `TC-AUTH-42` | 3 request đồng thời cùng nhận 401 → `/auth/refresh` chỉ được gọi **1 lần** (single-flight) |
| `TC-AUTH-43` | refresh trả 401 → session bị xoá → về `/login` + `login-notice` |

### 6.5 Suite E — Đăng xuất · `logout.spec.ts`

| ID | Given | When | Then |
| --- | --- | --- | --- |
| `TC-AUTH-50` | seed `nonAdminSession()`, vào `/members` → `/login` có `login-denied`; mock logout `200` | click `login-denied-logout` | key session vắng mặt; `login-denied` không hiện; form login hiện; URL `/login`; có **đúng 1** request `POST /api/v1/auth/logout` |
| `TC-AUTH-51` | như `TC-AUTH-50` nhưng mock logout `401` | click `login-denied-logout` | key session **vẫn** bị xoá (`AC-14`). **Không** assert `login-notice` — `handleExpired` và khối `finally` của `AuthProvider.logout` cùng set state; thứ tự hiển thị không được code bảo đảm |
| `TC-AUTH-52` | seed `nonAdminSession({ accessToken: 'access-user-1' })` | click `login-denied-logout` | request `POST /auth/logout` có header `authorization: Bearer access-user-1` (`AC-06`) |

### 6.6 Suite F — Cấu hình thiếu base URL · `config.spec.ts` (P2, tag `@config`)

| ID | Given | When | Then |
| --- | --- | --- | --- |
| `TC-AUTH-60` | dev server chạy với `VITE_API_BASE_URL=''` (`playwright.config.no-api-base.ts`) | ở `/login`, điền form hợp lệ, submit | `login-error-form` = `Thiếu cấu hình VITE_API_BASE_URL. Hãy cấu hình địa chỉ API rồi tải lại trang.`; URL `/login` |

Suite này **không** chạy trong `test:e2e` mặc định vì cần một dev server khác cấu hình.

### 6.7 Chế độ dữ liệu thật — tag `@real` và `@stub`

Env cần (không commit giá trị; `playwright.config.ts` tự nạp `.env.test`):

| Biến | Ý nghĩa |
| --- | --- |
| `E2E_LIVE_BASE_URL` | origin của dev server (ví dụ `http://127.0.0.1:4173`) — hiện **chưa** code nào đọc, config hard-code `4173` |
| `E2E_API_BASE_URL` | backend thật (ví dụ `http://127.0.0.1:3000`) — set qua `webServer.env.VITE_API_BASE_URL` và dùng cho `apiLogin()` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | tài khoản role `Admin` thật trên DB |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | tài khoản role `User` thật trên DB |

Phân loại case:

| Nhóm | Điều kiện | Ví dụ |
| --- | --- | --- |
| `@real` | Cần backend thật; assert cả **status code thật** lấy qua `page.waitForResponse` | `TC-AUTH-20` (200 + token thật), `TC-AUTH-21` (401), `TC-AUTH-22` (200 nhưng role `User`), `TC-AUTH-25` (422 field `email`), `TC-AUTH-50` (logout 200), `TC-AUTH-51` (logout 401 thật với token hỏng) |
| Không tag | Không chạm backend: guard phía client, validate form, session hỏng trong localStorage, lỗi mạng (`abort`) | `TC-AUTH-01/02/06/10/11/12/29` |
| `@stub` | Backend thật **không thể** tạo response này ⇒ phải giả, có comment lý do trong test | `TC-AUTH-23` (role `admin`), `24` (403 banned), `26/27/28` (422 field password/không map/null), `30` (500 + stack), `31` (502 HTML), `32` (200 thiếu `accessToken`) |

Session dùng trong test là **session thật** lấy bằng `apiLogin()` (`e2e/fixtures/accounts.ts`). Chỉ `TC-AUTH-06`
(cố tình nhét JSON hỏng) và `TC-AUTH-51` (cố tình làm hỏng `accessToken` để backend trả 401) mới dùng token không hợp lệ,
và cả hai đều ghi rõ lý do trong test.

Chạy: `pnpm run test:e2e:real`, hoặc `pnpm run test:e2e:ui` để quan sát trong UI mode.
CI **không** chạy `@real` (không có backend) — xem §9.

---

## 7. Phạm vi chưa phủ (và lý do)

| Không phủ | Lý do | Xử lý |
| --- | --- | --- |
| Refresh-on-401, single-flight, retry một lần | `D-3` — Stage 1 không có request xác thực nào từ UI | Chừa `TC-AUTH-41..43`, làm ở Stage 2 |
| Đăng xuất từ shell portal | `D-2` — không có nút nào trong `AppLayout`/`Sidebar`/`TopNav` | Chờ `Q-2`, sau đó thêm `TC-AUTH-53` |
| Responsive shell (`768–1023`, `<768`) | `D-8` — `AppLayout` không có nhánh drawer | Chỉ test `/login` trên mobile (`project chromium-mobile`) |
| `AC-09` (token chỉ qua `session.ts`) | Là bất biến của mã nguồn, không phải hành vi UI | Kiểm bằng grep trong CI: `localStorage` trong `src/` chỉ được khớp `src/lib/session.ts` |
| Bảo vệ JWT phía backend (`JwtAuthGuard`, `RolesGuard`) | Ngoài repo FE | Backend E2E hiện có (`WVI/Personal_Finance_App`); ghi nhận, không nhân bản ở đây |
| `role` type là `string` thay vì union | Ảnh hưởng type-safety, không ảnh hưởng UI | Ghi vào `D-1`; sửa khi chốt `Q-1` |

---

## 8. Khoảng trống phải lấp trước (`G-x`) và thứ tự thực hiện

| ID | Khoảng trống | Việc cần làm |
| --- | --- | --- |
| `G-1` | `src/` không có `data-testid` | Thêm đúng 11 attribute ở §5. **PR riêng**, chỉ thêm attribute, không đổi hành vi; verify `pnpm lint` + 2 lệnh `tsc --noEmit` |
| `G-2` | Không có Playwright | `Q-4` → thêm `@playwright/test` (devDependency) + `playwright.config.ts` + script |
| `G-3` | `.env` bị gitignore ⇒ CI thiếu `VITE_API_BASE_URL` | Set `webServer.env.VITE_API_BASE_URL` tường minh (§3.1) |
| `G-4` | `tsc -b` không bao `e2e/` | Sửa `tsconfig.node.json` include (§3.3) |
| `G-5` | `eslint .` sẽ quét artifact + file e2e | Thêm `globalIgnores`; chạy `pnpm lint` để xác nhận rule `react-refresh` không báo trên file fixture |
| `G-6` | Môi trường sandbox | `pnpm exec playwright install chromium` cần mạng; `AGENTS.md` §14 Step 5 ghi `pnpm build` có thể EPERM trong sandbox ⇒ chạy E2E ngoài sandbox hoặc ở CI, và **ghi rõ giới hạn** thay vì coi là fail code |
| `G-7` | Không có nút logout trong shell | Chấp nhận đường banner `denied` cho tới khi `Q-2` được chốt |
| `G-8` | Đường 401 thật chưa phủ được | Chốt `D-3`, chuyển sang Stage 2 |

Thứ tự thực hiện đề xuất:

1. Chốt `Q-1` … `Q-6` (`stage-1-auth-spec.md` §8). Không chốt `Q-1`/`Q-3` thì `TC-AUTH-23`/`TC-AUTH-24`
   chỉ là test khoá hành vi tạm.
2. `G-1` — thêm selector contract (PR riêng, không đổi hành vi).
3. `G-2` … `G-5` — hạ tầng runner.
4. Viết `e2e/fixtures/{auth-backend,session}.ts` (kèm catch-all `501` theo `P-5`).
5. Viết Suite A → B → C → E → D theo §6 (thứ tự này vì A/B/C cho tín hiệu nhanh nhất).
6. `G-6` — chạy `pnpm test:e2e` ngoài sandbox, lưu trace/report.
7. Thêm job CI (§9) và suite `@live` cho môi trường có backend test.

---

## 9. Kế hoạch CI

Thêm một job **sau** `build-and-lint` trong `.github/workflows/ci.yml`, không đụng hai bước hiện có:

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: build-and-lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm run test:e2e:offline    # bỏ @real: không cần backend/DB
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Lưu ý: job này **không** chạy `@real` và **không** cần PostgreSQL. Suite dữ liệu thật chạy ở máy dev
(`pnpm run test:e2e:real` hoặc `pnpm run test:e2e:ui`) vì cần backend + account seed.

---

## 10. Definition of done — khi biến spec này thành test thật

- [ ] 11 `data-testid` ở §5 đã có trong `src/`, không thay đổi markup/hành vi nào khác.
- [ ] `pnpm lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.node.json --noEmit`
      vẫn pass như baseline (`AGENTS.md` §0).
- [ ] Chạy được `pnpm run test:e2e:offline` mà **không** cần backend, không cần DB, không cần mạng.
- [ ] Mọi `TC-AUTH-xx` trong §6.1–§6.5 pass, **trừ** các case gắn `@drift` — các case này pass theo
      hành vi hiện tại và mỗi case có comment trỏ đúng `D-x`.
- [ ] `pnpm run test:e2e:real` pass khi backend + account seed trong `.env.test` đang sẵn sàng.
- [ ] Trace/screenshot/video được bật khi fail và đã thêm vào `.gitignore`.
- [ ] Case `@stub` chỉ dùng cho nhánh backend không tạo được, và mỗi case ghi rõ lý do trong test.
- [ ] Cập nhật `admin_api.md`: ghi rõ Stage 1 đã được kiểm bằng UI ở mức nào, và `AC-07` còn treo
      (`D-3`).

---

## 11. Quan sát & debug bằng UI mode

Số lượng test hiện tại: **49** (chromium-desktop 31 + chromium-mobile 18) = `@real` 22 + offline 27.

### 11.1 UI mode khác CLI ở đâu (chỗ hay gây nhầm)

| Điểm | CLI (`playwright test`) | UI mode (`playwright test --ui`) |
| --- | --- | --- |
| Vòng đời | Chạy xong là thoát | Server sống lâu, chạy test theo yêu cầu |
| Kích hoạt | Chạy ngay khi gọi lệnh | **Chỉ chạy khi bấm ▶** (hoặc bật Watch). Mở UI rồi click vào test chỉ hiện tab **Source** — chưa chạy thì chưa có trace |
| Trace | Theo `playwright.config.ts` (`on-first-retry`) | UI **luôn ép** `{ mode: 'on', sources: false, live: true }` (`playwright@1.63.0/lib/runner/index.js:6821`) ⇒ mọi test đều có trace |
| `retries` / `repeatEach` | Theo config (`CI ? 1 : 0`) | Ép `retries: 0`, `repeatEach: 1` |
| Output dir | Xoá `test-results/` ở đầu mỗi run | `preserveOutputDir: true` ⇒ artifact **tích luỹ**, không xoá |
| Phạm vi | Mặc định cả 2 project | Chỉ chạy tập con đang chọn (project/file/test) |

### 11.2 Pane snapshot hiện `about:blank` là bình thường

Khung browser giả trong pane snapshot render `addressBar = url || 'about:blank'`
(`playwright-core/lib/vite/traceViewer/assets/defaultSettingsView-*.js`). Vì vậy `about:blank` xuất hiện khi:

- action đang chọn **chưa có page** — `newPage`, `before goto` — đúng thiết kế, **không** phải mất snapshot;
- test **chưa được chạy** trong session UI đó ⇒ chưa có trace nào để hiện.

Đã kiểm chứng: tái hiện đúng trace config của UI mode rồi chạy `TC-AUTH-03` ⇒ trace có **15 `frame-snapshot`**
chứa HTML thật, URL lần lượt `about:blank` → `/members?pageIndex=2&keyword=an` → `/login` (13 lần).
Kết luận: UI mode **có** ghi DOM snapshot; `about:blank` chỉ là action đầu.

### 11.3 Cách xem UI thay đổi theo từng action

1. `pnpm run test:e2e:ui`, gõ `@real` vào ô filter (hoặc để trống để chạy cả 49).
2. Bấm **▶** trên test cần xem — ví dụ `TC-AUTH-03 @real` (đi qua 2 màn: `/login` → `/members`).
3. Click test đã xanh → ở cột **Actions** dùng phím ↑/↓:
   `newPage` (about:blank) → `goto url=/login` (**form đăng nhập hiện ra**) → `fill Email` / `fill Mật khẩu`
   → `click [data-testid="login-submit"]` (**chuyển sang trang Members**).

### 11.4 Xem lại trace ngoài UI mode

```bash
# UI mode giữ artifact, nên mở lại trace của lần chạy trước:
pnpm exec playwright show-trace "test-results/<tên-test>/trace.zip"

# Hoặc tạo trace bằng CLI rồi mở (xem trước khi vào UI mode):
pnpm exec playwright test --project=chromium-desktop --grep "TC-AUTH-03" --trace on
pnpm exec playwright show-trace --port 9323 <đường-dẫn-trace.zip>
```

`show-trace` mở sẵn ở action có snapshot; UI mode phải Run trước rồi tự chọn action — **cùng một pane, cùng dữ liệu**.
Lưu ý `show-trace` chỉ nhận **1** tham số trace.
