# Stage 1 — API client và đăng nhập Admin · Đặc tả

Phạm vi: **lát cắt auth** của admin portal — API client dùng chung, session, đăng nhập Admin,
route guard, đăng xuất, hết hạn phiên. Đây là bản đặc tả **hành vi quan sát được trên giao diện**;
mọi phát biểu đều neo vào `file:line` của code đang chạy.

Nguồn kế hoạch: [`../../plan/admin_api.md`](../../plan/admin_api.md) §"Stage 1 — API client và đăng nhập Admin"
và [`../../../ADMIN_INTEGRATION_PLAN.md`](../../../ADMIN_INTEGRATION_PLAN.md) §9 Flow 1–3.

---

## 1. Mục tiêu và phạm vi

### 1.1 Trong phạm vi

| # | Hạng mục | File sở hữu |
| --- | --- | --- |
| S1 | HTTP client dùng chung: base URL, Bearer, chuẩn hoá lỗi, refresh-on-401 | `src/lib/api/client.ts` |
| S2 | Session: đọc/ghi/xoá token + identity qua **một** cửa duy nhất | `src/lib/session.ts` |
| S3 | Service auth: `login`, `logout` | `src/services/auth.ts` |
| S4 | DTO auth | `src/types/admin.ts` |
| S5 | Auth context + hook: session, notice, login, logout | `src/context/AuthProvider.tsx`, `src/context/auth-context.ts`, `src/hooks/useAuth.ts` |
| S6 | Màn đăng nhập + 404 | `src/pages/Login.tsx`, `src/pages/NotFound.tsx` |
| S7 | Route guard chỉ cho `Admin` + shell đọc identity từ session | `src/App.tsx`, `src/components/AppLayout.tsx` |

### 1.2 Ngoài phạm vi (không đặc tả ở đây)

- Mọi endpoint `/api/v1/admin/**` (Stage 2 trở đi) — **trừ** việc chúng là điều kiện để phủ
  đường refresh-on-401 (xem `D-3`).
- Responsive sidebar thành drawer (`<768px`) — `AGENTS.md` §3.4 mô tả nhưng chưa có code (xem `D-8`).
- Nút đăng xuất trong shell — chưa có code (xem `D-2`, `Q-2`).
- Thay `alert()`/`confirm()` bằng `Toast`/`ConfirmDialog` — không có `alert()` nào trong lát cắt auth.
- Bật `strict` cho `tsconfig` con — xem [`../../typescript-strict.md`](../../typescript-strict.md).

---

## 2. Actor và quyền

| Actor | Vào được | Không vào được | Cơ chế |
| --- | --- | --- | --- |
| Khách (chưa có session) | `/login` | 6 route admin + `*` | `RequireAdmin` → `Navigate /login` (`src/App.tsx:17-19`) |
| Session role `Admin` | `/login` (bị đẩy về `/`), 6 route admin, `*` → 404 | — | `src/App.tsx:21-25`; `src/pages/Login.tsx:27` |
| Session role khác `Admin` | `/login` + banner từ chối | 6 route admin, `*` | `src/App.tsx:21-23` |

> **Lưu ý quan trọng:** guard và context so sánh role **chính xác** `!== 'Admin'`
> (`src/App.tsx:21`, `src/context/AuthProvider.tsx:27`), **không** case-insensitive như
> `AGENTS.md` §4.4 và `ADMIN_INTEGRATION_PLAN.md` §6.2 #7 yêu cầu. Xem `D-1` và `Q-1`.

---

## 3. Hợp đồng đã verify

### 3.1 Backend

| # | Method + path | Auth | Request | Response 2xx | Lỗi |
| --- | --- | --- | --- | --- | --- |
| B1 | `POST /api/v1/auth/login` | `@Public()` | `{email, password}` | **200** `{id, username, firstName, lastName, fullName, email, role, isOnboardingCompleted, isOnboarded, accessToken, refreshToken}` | **401** `{code:'UNAUTHORIZED', message:'Invalid email or password', field:null, details:{domainCode:'INVALID_CREDENTIALS'}}` · **403** `ACCOUNT_BANNED` → `{code:'FORBIDDEN', message:'Account is banned: <reason>', details:{domainCode:'ACCOUNT_BANNED'}}` · **422** `{code:'VALIDATION_FAILED', message:'Địa chỉ Email không đúng định dạng.', field:'email'}` |
| B2 | `POST /api/v1/auth/refresh` | `@Public()` | `{refreshToken}` | **200** `{accessToken, refreshToken}` — **chỉ token, không có identity** | **401** `{code:'UNAUTHORIZED', message:'Refresh Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'}` |
| B3 | `POST /api/v1/auth/logout` | **cần JWT** (không `@Public()`, có `@ApiBearerAuth`) | — | **200** `{message:'Logged out successfully'}` — server **không** thu hồi token | **401** khi thiếu/hết hạn token |

Bằng chứng:

| Sự kiện | File:line |
| --- | --- |
| `login` khai báo `@Public()`, `@HttpCode(200)` | `../../../../WVI/Personal_Finance_App/src/modules/identity/interface/http/identity.controller.ts:155-171` |
| `role` trả về là `account.roleCode` **nguyên bản** (PascalCase cho endpoint này) | `.../application/commands/login.handler.ts:74` |
| `refresh` khai báo `@Public()`, chỉ trả 2 token | `.../interface/http/identity.controller.ts:287-344` |
| `logout` **không** `@Public()` và có `@ApiBearerAuth` | `.../interface/http/identity.controller.ts:346-353` |
| Validate login: `IsEmail` + `IsNotEmpty` | `.../interface/http/dto/login.dto.ts:4-19` |
| `field` trong lỗi 422 = **tên property DTO** (`email` / `password`) | `../../../../WVI/Personal_Finance_App/src/shared/interface/pipes/validation.pipe.ts:41-56` |
| `INVALID_CREDENTIALS` → **401** | `.../src/shared/interface/filters/global-exception.filter.ts:75-77` |
| `ACCOUNT_BANNED` → **403** | `.../global-exception.filter.ts:78-80` |
| 422 → code `VALIDATION_FAILED` | `.../global-exception.filter.ts:105-106` |
| CORS `origin: true` (reflect origin) + `credentials: true` → FE khác cổng vẫn gọi được | `../../../../WVI/Personal_Finance_App/src/main.ts:10-14` |

**Hệ quả contract bắt buộc nhớ:**

- `role` của `B1` là **PascalCase** (`'Admin'`/`'User'`), nhưng `POST /auth/google`
  (`identity.controller.ts:279`) trả **lowercase**. Đây là nguồn của `D-1`.
- `B1` là **nguồn identity duy nhất**. `B2` không trả identity ⇒ FE phải cache identity trong
  session và **không** được dựng lại từ `/user/me` (route đó là policy `User`).
- Backend **không** thu hồi refresh token khi logout ⇒ xoá local session là biện pháp duy nhất.

### 3.2 Frontend

| # | Hành vi | Bằng chứng |
| --- | --- | --- |
| F1 | Base URL = `import.meta.env.VITE_API_BASE_URL` (cắt `/` cuối) + `/api/v1`; thiếu biến ⇒ throw `ApiError(0,'API_CONFIG_ERROR')` với message tiếng Việt, **fail fast** | `src/lib/api/client.ts:29-40` |
| F2 | Gắn `Authorization: Bearer <accessToken>` khi có session và `authenticated !== false` | `src/lib/api/client.ts:130-138` |
| F3 | `login` gọi `B1` với `{authenticated:false, retryUnauthorized:false}` ⇒ 401 khi login **không** kích hoạt refresh, **không** phát sự kiện hết hạn | `src/services/auth.ts:5-9`; `src/lib/api/client.ts:157` |
| F4 | `logout` gọi `B3`, cũng `retryUnauthorized:false` | `src/services/auth.ts:23-24` |
| F5 | 401 (có xác thực, cho phép retry) ⇒ refresh **single-flight** một lần → ghi **cả hai** token mới → retry request **đúng một lần** | `src/lib/api/client.ts:115-122`, `:82-113`, `:157-162` |
| F6 | Refresh thất bại ⇒ `clearSession()` + phát `window` event `wivi:admin-session-expired` | `src/lib/api/client.ts:77-80` |
| F7 | `AuthProvider` nghe `F6` ⇒ `session=null` + notice `'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'` | `src/context/AuthProvider.tsx:16-23` |
| F8 | `login()` ở context **kiểm role trước khi ghi session**; role ≠ `Admin` ⇒ throw `ApiError(403, FORBIDDEN)` và **không** ghi gì | `src/context/AuthProvider.tsx:25-40` |
| F9 | `logout()` gọi API nếu có session, **nuốt mọi lỗi**, `finally` luôn `clearSession()` + `setSession(null)` | `src/context/AuthProvider.tsx:42-52` |
| F10 | Session khởi tạo **đồng bộ** từ `readSession()` trong `useState` initializer ⇒ reload không nháy `/login` | `src/context/AuthProvider.tsx:13` |
| F11 | Session hỏng/sai shape ⇒ **xoá key** và trả `null` | `src/lib/session.ts:16-39` |
| F12 | `writeSession` lỗi (localStorage bị chặn/quota) ⇒ throw `Error('Không thể lưu phiên đăng nhập trên trình duyệt này.')` | `src/lib/session.ts:41-47` |
| F13 | Guard: không session ⇒ `Navigate /login` kèm `state.from = location`; session sai role ⇒ `Navigate /login` kèm `state.denied = true` | `src/App.tsx:13-26` |
| F14 | `Login` dựng `destination` = `from.pathname + from.search + from.hash`, mặc định `/` | `src/pages/Login.tsx:29-31` |
| F15 | `Login` khi đã có session `Admin` ⇒ `Navigate /` | `src/pages/Login.tsx:27` |
| F16 | 404 (`*`) nằm **trong** guard + shell ⇒ khách vào path lạ bị đẩy về `/login`, Admin thấy trang 404 trong shell | `src/App.tsx:41`; `src/pages/NotFound.tsx` |
| F17 | Shell đọc identity từ session: tên hiển thị = `fullName \|\| email \|\| 'Quản trị viên'`, initials suy từ tên | `src/components/TopNav.tsx:6-13`, `:50-55` |

---

## 4. Máy trạng thái

### 4.1 Vòng đời phiên

```
[Khách] ──mở route admin──► [Khách] URL=/login, state.from=<route>
[Khách] ──submit login──► [Submitting] ──200 role=Admin──► [Admin] URL=<from|/>
                                       ├─200 role≠Admin──► [Khách] form error "không có quyền"
                                       ├─401──────────────► [Khách] form error "Email hoặc mật khẩu không đúng."
                                       ├─422─────────────► [Khách] field error
                                       └─network/5xx─────► [Khách] form error
[Admin] ──reload──► [Admin] (session đọc đồng bộ, không nháy /login)
[Admin] ──nhận 401 & refresh OK──► [Admin] (token mới, identity giữ nguyên)
[Admin] ──nhận 401 & refresh FAIL──► [Khách] URL=/login + notice hết hạn
[Admin/non-Admin] ──logout──► [Khách] URL=/login (local luôn bị xoá)
```

### 4.2 Trạng thái UI của màn đăng nhập

| Trạng thái | Điều kiện | Biểu hiện quan sát được |
| --- | --- | --- |
| `idle` | mặc định | nút `Đăng nhập`, không lỗi |
| `submitting` | đã submit, đang chờ | nút `Đang xác thực…` + `disabled` (`src/pages/Login.tsx:143-149`) |
| `field-error` | validate client thất bại, hoặc 422 map được field | `#login-email-error` / `#login-password-error`, input có `aria-invalid="true"` |
| `form-error` | 401, 403, 422 không map field, lỗi mạng/5xx, lỗi `writeSession` | khối `role="alert"` với tiêu đề `Không đăng nhập được` + message (`src/pages/Login.tsx:98-103`) |
| `denied` | session có sẵn nhưng role ≠ `Admin`, vào từ guard | khối `role="alert"` `Tài khoản này không có quyền truy cập trang quản trị.` + nút `Thoát tài khoản` (`src/pages/Login.tsx:89-96`) |
| `notice` | `F6`/`F7` vừa xảy ra | khối `role="status"` `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.` (`src/pages/Login.tsx:83-87`) |

Bảng map lỗi → thông điệp (nguồn: `src/pages/Login.tsx:48-66`):

| Đầu vào | Điều kiện | Hiển thị |
| --- | --- | --- |
| `ApiError.status === 401` | — | `form-error`: `Email hoặc mật khẩu không đúng.` — **cố ý không dùng message backend** (backend trả tiếng Anh `Invalid email or password`) |
| `ApiError.status === 422` **và** `field` chứa `email` | — | `field-error` email = `error.message` của backend |
| `ApiError.status === 422` **và** `field` chứa `password` | — | `field-error` password = `error.message` của backend |
| `ApiError.status === 422` **và** field khác/rỗng | — | `form-error` = `error.message` |
| `ApiError` khác (403, 5xx, `NETWORK_ERROR`, `API_CONFIG_ERROR`) | `error instanceof Error` | `form-error` = `error.message` |
| Giá trị throw không phải `Error` | — | `form-error` = `Hệ thống đang lỗi, vui lòng thử lại.` |

---

## 5. Đặc tả UI theo màn

### 5.1 `/login` — `src/pages/Login.tsx`

| Hạng mục | Đặc tả | Neo |
| --- | --- | --- |
| Bố cục | `main` căn giữa, thương hiệu `WIVI` + chip `ADMIN`, tiêu đề `CỔNG QUẢN TRỊ HỆ THỐNG`; card `max-w-[420px]`, tiêu đề `Đăng nhập quản trị` | `:70-81` |
| Field email | `input#login-email`, `type=email`, `autoComplete=username`, placeholder `ten@wivi.vn`, label `Email` | `:107-118` |
| Field mật khẩu | `input#login-password`, `autoComplete=current-password`, label `Mật khẩu`, nút đổi `Hiện`/`Ẩn` **bên trong khung** | `:123-139` |
| Validate client | email rỗng → `Vui lòng nhập email.`; password rỗng → `Vui lòng nhập mật khẩu.`; `noValidate` trên form nên **không** có bubble của trình duyệt | `:37-42`, `:105` |
| Chống double submit | `if (submitting) return` **và** nút `disabled` | `:35`, `:145` |
| Điều hướng sau login | tới `destination` (`F14`) bằng `replace: true` | `:47` |
| Thông báo phụ | cuối card: `Chỉ tài khoản có quyền Admin mới được truy cập.` | `:152` |

### 5.2 Shell — `src/components/AppLayout.tsx`, `TopNav.tsx`

| Hạng mục | Đặc tả | Neo |
| --- | --- | --- |
| Shell | `Sidebar` (240px) + cột phải gồm `TopNav` (56px) + `main` (padding 24px, scroll) | `AppLayout.tsx:5-15` |
| Identity | tên = `fullName` → `email` → `'Quản trị viên'`; initials = 2 chữ đầu của tên | `TopNav.tsx:7-13`, `:50-55` |
| Mục nav | 6 mục cố định; `NavLink` tới `/`, `/members`, `/activity`, `/intelligence`, `/campaigns`, `/configuration` | `Sidebar.tsx:7-14` |
| **Không có** nút đăng xuất | chỉ có ở banner `denied` của `/login` | grep `logout` trong `src/components/` = 0 |

### 5.3 404 — `src/pages/NotFound.tsx`

Hiển thị `404`, `Không tìm thấy trang`, link `Về tổng quan` → `/`. Render **bên trong** `AppLayout`
nên vẫn có sidebar/topnav (`src/App.tsx:41`).

---

## 6. Acceptance criteria

Nguồn: `admin_api.md` Stage 1 (AC gốc) + `AGENTS.md` §14 checklist verify. Cột **Kiểm bằng** cho biết
cơ chế kiểm chứng — Playwright UI, kiểm tra tĩnh, hoặc không kiểm được ở Stage 1.

| ID | Tiêu chí | Nguồn | Kiểm bằng |
| --- | --- | --- | --- |
| `AC-01` | Khách không vào được bất kỳ route admin nào; bị đưa về `/login` | plan AC1 | Playwright `TC-AUTH-01`, `TC-AUTH-02` |
| `AC-02` | User role ≠ `Admin` không vào được route admin | plan AC1 | Playwright `TC-AUTH-05`, `TC-AUTH-22` |
| `AC-03` | Role được so sánh **chính xác** với `Admin` theo quyết định Stage 0 | plan AC1 | Playwright `TC-AUTH-23` (khoá hành vi hiện tại) |
| `AC-04` | Sau login, người dùng quay lại đúng route đã bị chặn (gồm cả query string) | `F14`, AGENTS.md §4.4 | Playwright `TC-AUTH-03`, `TC-AUTH-20` |
| `AC-05` | Session sống qua reload, không nháy về `/login` | `F10` | Playwright `TC-AUTH-04` |
| `AC-06` | API client tự gắn Bearer access token cho request xác thực | plan AC2, `F2` | Playwright `TC-AUTH-52` (bắt header qua `page.route`) |
| `AC-07` | 401 thử refresh một lần, retry tối đa một lần | plan AC3, `F5` | **Không kiểm được bằng UI ở Stage 1** — xem `D-3`; deferred sang Stage 2 |
| `AC-08` | Refresh thất bại ⇒ xoá session + thông báo hết hạn + về `/login` | plan AC3, `F6`/`F7` | Playwright `TC-AUTH-40` (mô phỏng sự kiện hết hạn do client phát) |
| `AC-09` | Token chỉ được đọc/ghi/xoá qua `src/lib/session.ts` | plan AC4 | Kiểm tra tĩnh: grep `localStorage` trong `src/` chỉ khớp `src/lib/session.ts` |
| `AC-10` | Lỗi đăng nhập hiển thị **tiếng Việt**, không lộ message tiếng Anh của backend cho 401 | `src/pages/Login.tsx:49-50` | Playwright `TC-AUTH-21` |
| `AC-11` | Validate client chặn submit rỗng, không phát request | `:37-42` | Playwright `TC-AUTH-10`, `TC-AUTH-11` |
| `AC-12` | 422 map lỗi về **đúng field** của form | `:51-58`, AGENTS.md §5.3 | Playwright `TC-AUTH-25`, `TC-AUTH-26`, `TC-AUTH-27`, `TC-AUTH-28` |
| `AC-13` | Chặn double-submit ở tầng pending flag | AGENTS.md §4.6 | Playwright `TC-AUTH-13` |
| `AC-14` | Logout **luôn** xoá session local, kể cả khi API lỗi | plan AC3, `F9` | Playwright `TC-AUTH-50`, `TC-AUTH-51` |
| `AC-15` | Session hỏng/sai shape bị xoá và coi như khách | `F11` | Playwright `TC-AUTH-06`, `TC-AUTH-07` |
| `AC-16` | Shell hiển thị identity lấy từ session, không hard-code | `F17`, AGENTS.md §4.3 | Playwright `TC-AUTH-04`, `TC-AUTH-20` |
| `AC-17` | Path không tồn tại ⇒ trang 404 trong shell (Admin) / về `/login` (khách) | `F16` | Playwright `TC-AUTH-02`, `TC-AUTH-08` |
| `AC-18` | `VITE_API_BASE_URL` thiếu ⇒ fail fast với thông báo rõ, không fallback im lặng | `F1`, AGENTS.md §5.1 | Playwright `TC-AUTH-60` (suite cấu hình riêng, P2) |
| `AC-19` | Không hiển thị token/secret/stack trong UI | AGENTS.md §5.3 | Playwright: assertion phủ định trong `TC-AUTH-20`, `TC-AUTH-30` |
| `AC-20` | Lỗi mạng hiển thị thông báo thân thiện, không phải lỗi thô | `client.ts:143-151` | Playwright `TC-AUTH-29`, `TC-AUTH-31` |

---

## 7. Sổ drift và khuyết điểm

> Đây là phần **quan trọng nhất** của tài liệu: các phát hiện khi đối chiếu code với kế hoạch/rule.
> Không mục nào được sửa trong tài liệu này — chỉ ghi nhận để owner quyết.

### `D-1` — Role gate là so sánh chính xác, không case-insensitive

- **Code:** `src/App.tsx:21` (`session.identity.role !== 'Admin'`) và `src/context/AuthProvider.tsx:27`
  (cùng biểu thức).
- **Tài liệu nói ngược lại:** `AGENTS.md` §4.4 — "`role.toLowerCase() === 'admin'` — **so sánh
  case-insensitive** vì `/auth/login` trả `'Admin'|'User'` còn `/auth/google` trả `'admin'|'user'`";
  `ADMIN_INTEGRATION_PLAN.md` §6.2 #7 cũng vậy.
- **Hệ quả:** tài khoản Admin đi qua `/auth/google` (role lowercase) **không** vào được portal; bị
  báo "Tài khoản này không có quyền truy cập trang quản trị".
- **Trạng thái:** code thắng cho hành vi hiện tại; cần owner chốt (`Q-1`). Test `TC-AUTH-23` khoá
  hành vi hiện tại và sẽ **fail to** khi ai đó sửa thành case-insensitive — đó là mục đích.

### `D-2` — Không có affordance đăng xuất trong shell

- `logout` chỉ tới được từ nút `Thoát tài khoản` trong banner `denied` ở `/login`
  (`src/pages/Login.tsx:89-96`). `AppLayout`, `Sidebar`, `TopNav` **không** có nút nào
  (grep `logout` trong `src/components/` = 0).
- Kế hoạch Stage 1 task 5 chủ động hoãn vì `.pen` không xác nhận vị trí (`admin_api.md:141`).
- **Hệ quả cho test:** `AC-14` chỉ kiểm được qua luồng banner `denied`; không thể kiểm "đăng xuất từ
  portal". Xem `Q-2`.

### `D-3` — Đường refresh-on-401 **không quan sát được từ UI** ở Stage 1

- Ở Stage 1 **không page nào gọi endpoint có xác thực** — 6 page còn dùng mock cục bộ.
- Request xác thực duy nhất trong lát cắt auth là `B3 logout`, và nó cố ý truyền
  `retryUnauthorized: false` (`src/services/auth.ts:24`) ⇒ **không bao giờ** đi vào nhánh refresh.
- ⇒ `AC-07` và cơ chế single-flight (`client.ts:115-122`) không thể phủ bằng test UI ở Stage 1.
  Test plan chuyển coverage này sang Stage 2, khi endpoint list đầu tiên được nối.
- **Đề xuất:** giữ `AC-07` ở trạng thái "chưa kiểm", **không** đánh dấu Stage 1 đã verified, và
  giành chỗ `TC-AUTH-4x` cho Stage 2.

### `D-4` — Banner `denied` gần như là dead path

- `AuthProvider.login` kiểm role **trước** `writeSession` (`AuthProvider.tsx:27-36`) ⇒ **không bao
  giờ** tồn tại session role ≠ `Admin` do đường login tạo ra.
- Guard chỉ đặt `state.denied` khi `session` **đã có sẵn** (`App.tsx:21-23`) ⇒ điều kiện duy nhất để
  thấy banner là `localStorage` đã chứa session non-Admin (từ build cũ hoặc seed thủ công).
- **Hệ quả UX:** khi login bằng tài khoản `User`, người dùng thấy **form error** dưới nút đăng nhập
  (tiêu đề `Không đăng nhập được`), **không** thấy banner "không có quyền" riêng.
- Cần owner chốt UX nào là đúng (`Q-3`). Test plan phủ **cả hai** đường để khoá hành vi hiện tại.

### `D-5` — `services/auth.ts` không validate response 200 trước khi dựng session

- `src/services/auth.ts:11-20` gán thẳng `response.accessToken` / `response.refreshToken` mà không
  kiểm kiểu.
- Nếu backend trả **200 nhưng thiếu token**: session trong bộ nhớ có `accessToken: undefined`
  → `JSON.stringify` bỏ field `undefined` → key lưu thiếu `accessToken` → lần đọc sau
  `isAuthSession` false (`session.ts:16-24`) ⇒ **mất phiên sau reload**; nhưng trong phiên hiện tại
  guard vẫn cho vào portal vì `identity.role` hợp lệ ⇒ portal "vào được" nhưng mọi call sẽ 401.
- So sánh: nhánh refresh **có** validate (`client.ts:95-98`) — đây là chỗ không đối xứng.
- **Đề xuất:** validate `typeof === 'string'` trong `login()` và throw `ApiError` rõ ràng.

### `D-6` — Client chưa có timeout / abort

- `src/lib/api/client.ts` không có `AbortSignal`/timeout nào, trong khi `AGENTS.md` §5.4 yêu cầu
  "Request treo phải có timeout để cuối cùng thành error, không spinner vô hạn" và "Abort request
  khi filter đổi hoặc unmount".
- Với lát cắt auth: nút submit sẽ kẹt ở `Đang xác thực…` vô hạn nếu server không trả lời.
- **Đề xuất:** thêm timeout vào `send()`; hoặc mở rộng phạm vi Stage 2.

### `D-7` — Shell còn affordance và "số liệu" tĩnh trình bày như thật

Ngoài scope Stage 1 nhưng phải ghi nhận vì `AGENTS.md` §13.30 cấm trình bày mock như API thật:

| Vị trí | Nội dung | Vấn đề |
| --- | --- | --- |
| `TopNav.tsx:20-28` | ô `Gõ lệnh tìm kiếm nhanh...` | không có handler |
| `TopNav.tsx:35-38` | `Hệ thống AI // 98.4% Acc` | số liệu bịa, hiển thị như số đo thật |
| `TopNav.tsx:40-43` | chuông + chấm đỏ | không có handler, không có nguồn dữ liệu |
| `TopNav.tsx:51` | subtitle `Quản trị viên` | hard-code (phần này chấp nhận được vì là nhãn vai trò) |
| `Sidebar.tsx:68-76` | `Hệ thống Live`, `v2.4.1-build // 100,240 nút hoạt động` | số liệu bịa |
| `Sidebar.tsx:34` | `NavLink to="/"` **thiếu `end`** | match mọi path con → mục `Tổng quan` luôn active |
| `Sidebar.tsx` | không có role gate | hiện được bù bằng route guard — chấp nhận được, nhưng nên ghi rõ |

### `D-8` — Shell không responsive

`AppLayout.tsx:6-13` dùng sidebar `w-60` cố định, không có nhánh drawer cho `<768px`, trong khi
`AGENTS.md` §3.4 đặc tả 3 breakpoint (`≥1024`, `768–1023`, `<768`). ⇒ Test UI phần shell chỉ chạy
được trên viewport desktop; màn `/login` test được cả 3 vì card đã `max-w-[420px]` + `px-4`.

### `D-9` — Tài liệu trong repo đã lệch code sau Stage 1

| Tài liệu | Nói gì | Thực tế |
| --- | --- | --- |
| [`../../struct/struct.md`](../../struct/struct.md) §1 | `src/` có 12 file, 2 component, 6 page, không có `lib/`/`services/`/`hooks/`/`types/`/`context/` | **22 file nguồn** (không tính `assets/`); đã có `lib/`, `lib/api/`, `services/`, `hooks/`, `types/`, `context/`, `AppLayout.tsx`, `Login.tsx`, `NotFound.tsx` |
| `struct.md` §1 | `App.tsx` 35 dòng | 49 dòng |
| `struct.md:20` | `.env` bị `0 file` đọc | `src/lib/api/client.ts:30` đọc `VITE_API_BASE_URL` |
| `struct.md:153` | "không có `.env.example`" | `.env.example` tồn tại (1 dòng, `VITE_API_BASE_URL=http://127.0.0.1:3000`) |
| `struct.md` §2 | 7 thư mục "❌ chưa có", gồm `src/lib/`, `src/services/`, `src/hooks/`, `src/types/`, `src/context/` | 5/7 đã có (kiểm bằng `Test-Path`); **`src/theme/` và `src/components/ui/` vẫn chưa tồn tại** — phần này của `struct.md` còn đúng |
| [`../../README.md`](../../README.md) | index chỉ có `struct/`, `graph.md`, `typescript-strict.md` | thiếu `plan/` và `spec/` — **đã bổ sung cả hai** trong lần cập nhật này |

**Đề xuất:** cập nhật `struct/struct.md` trong một task riêng (không gộp vào task spec này để giữ
diff tối thiểu).

### `D-10` — Message backend tiếng Anh lọt ra UI ở nhánh 403 (tài khoản bị ban)

- `Login.tsx:59-60` chỉ đặc biệt hoá **401** và **422**; mọi `ApiError` khác rơi vào
  `error instanceof Error` ⇒ hiển thị **nguyên `error.message`** của backend.
- Với tài khoản bị ban, backend trả `message: 'Account is banned: <reason>'`
  (`account-banned.error.ts:5`) ⇒ người dùng Việt nhìn thấy câu tiếng Anh.
- **Hệ quả:** `AC-10` (lỗi đăng nhập hiển thị tiếng Việt) chỉ đúng cho đường 401. Cần map riêng cho
  403 `ACCOUNT_BANNED` (đọc `details.domainCode`) hoặc bổ sung thông điệp tiếng Việt ở backend.
- Test khoá hành vi hiện tại: `TC-AUTH-24` (tag `@drift`).

### `D-11` — Body lỗi không phải JSON bị hiển thị nguyên văn

- `client.ts:67-74`: khi body không phải object, `message` được gán bằng **chính chuỗi body**.
- `AGENTS.md` §5.3 yêu cầu: "Body lỗi không phải JSON (proxy/gateway) **không được throw** →
  degrade thành lỗi generic kèm status". Code hiện **không throw** (đúng một nửa) nhưng lại hiển thị
  nguyên HTML/text của gateway cho người dùng ⇒ vừa xấu vừa lộ chi tiết hạ tầng.
- Test khoá hành vi hiện tại: `TC-AUTH-31` (tag `@drift`). Sau khi sửa, kỳ vọng đổi thành câu
  generic `Đã xảy ra lỗi khi gửi yêu cầu.`

---

## 8. Câu hỏi cần owner quyết

| ID | Câu hỏi | Ảnh hưởng nếu chưa quyết | Đề xuất |
| --- | --- | --- | --- |
| `Q-1` | Role gate dùng so sánh chính xác `'Admin'` (hiện tại) hay case-insensitive như `AGENTS.md` §4.4? | `TC-AUTH-23` khoá hành vi hiện tại; tài khoản role lowercase bị chặn | Case-insensitive, sửa **cả** `App.tsx:21` và `AuthProvider.tsx:27` cùng lúc để không lệch nhau |
| `Q-2` | Có thêm nút đăng xuất vào shell không, và ở đâu? | `AC-14` chỉ kiểm được qua banner `denied`; người dùng không có cách đăng xuất bình thường | Bổ sung nút vào `TopNav` cạnh identity; cần `.pen`/design xác nhận vị trí trước |
| `Q-3` | Khi login bằng tài khoản không phải Admin: giữ **form error** (hiện tại) hay dựng **banner `denied`** cho cả đường login? | `D-4`: banner gần như dead code; UX không nhất quán giữa 2 đường vào | Giữ form error (đơn giản, đúng ngữ cảnh form) và **bỏ** nhánh `denied`, hoặc dùng banner cho cả hai |
| `Q-4` | Có được thêm `@playwright/test` (devDependency) + Playwright job trong CI không? `AGENTS.md` §13.5 cấm thêm library, nhưng repo hiện **không có runner nào** | Không có cách tự động kiểm chứng Stage 1 và các stage sau | Cho phép, giới hạn ở `devDependencies` + một job riêng, không đụng `dependencies` runtime |
| `Q-5` | Test UI mặc định dùng mock network (`page.route`) hay bắt buộc backend thật? | Quyết định toàn bộ thiết kế test plan | Mock làm mặc định (hermetic, chạy được ở CI không cần DB) + một suite `@live` opt-in cho backend thật |
| `Q-6` | Có sửa `D-5` (validate token ở `services/auth.ts`) trong Stage 1 không, hay để sang task hardening? | Nếu bỏ qua, một response 200 dị dạng sẽ tạo phiên "nửa sống" | Sửa ngay — 4 dòng, rủi ro thấp, và test plan đã có `TC-AUTH-32` |

---

## 9. Traceability — `AC` ↔ `TC`

| AC | Test case | Loại |
| --- | --- | --- |
| `AC-01` | `TC-AUTH-01`, `TC-AUTH-02` | UI (mock, không cần đăng nhập) |
| `AC-02` | `TC-AUTH-05`, `TC-AUTH-22` | UI (seed session / mock login) |
| `AC-03` | `TC-AUTH-23` | UI (mock, có tag `@drift`) |
| `AC-04` | `TC-AUTH-03`, `TC-AUTH-20` | UI |
| `AC-05` | `TC-AUTH-04` | UI (reload) |
| `AC-06` | `TC-AUTH-52` | UI (assert header qua `page.route`) |
| `AC-07` | — | **Chưa phủ** (`D-3`) → Stage 2 |
| `AC-08` | `TC-AUTH-40` | UI (mô phỏng event do client phát) |
| `AC-09` | — | Kiểm tra tĩnh (grep) |
| `AC-10` (đường 401) | `TC-AUTH-21` | UI |
| `AC-10` (đường 403 ban) | `TC-AUTH-24` | UI — **chưa đạt**: hiện lộ message tiếng Anh của backend (`D-10`) |
| `AC-11` | `TC-AUTH-10`, `TC-AUTH-11` | UI |
| `AC-12` | `TC-AUTH-25` … `TC-AUTH-28` | UI |
| `AC-13` | `TC-AUTH-13` | UI |
| `AC-14` | `TC-AUTH-50`, `TC-AUTH-51` | UI |
| `AC-15` | `TC-AUTH-06`, `TC-AUTH-07` | UI |
| `AC-16` | `TC-AUTH-04`, `TC-AUTH-20` | UI |
| `AC-17` | `TC-AUTH-02`, `TC-AUTH-08` | UI |
| `AC-18` | `TC-AUTH-60` | UI (dev server cấu hình riêng, P2) |
| `AC-19` | phủ định trong `TC-AUTH-20`, `TC-AUTH-30` | UI |
| `AC-20` | `TC-AUTH-29`, `TC-AUTH-31` | UI — `TC-AUTH-31` **chưa đạt**: body non-JSON hiện lộ nguyên văn (`D-11`) |

**Test case không map trực tiếp `AC` nào** (vẫn giữ vì khoá hành vi phụ):

| TC | Vì sao vẫn giữ |
| --- | --- |
| `TC-AUTH-09` | hành vi phụ của `F15`: đã là Admin thì `/login` tự đẩy về `/` |
| `TC-AUTH-12` | tiện ích UI (đổi hiện/ẩn mật khẩu) — không có AC tương ứng nhưng dễ vỡ khi refactor |
| `TC-AUTH-32`, `TC-AUTH-33` | khoá `D-5` và `F12` (localStorage lỗi) — hai nhánh lỗi biên chưa có AC |

**Kết luận traceability:**

- **16/20** `AC` đạt đầy đủ bằng test UI.
- `AC-07` **không kiểm được** ở Stage 1 (`D-3`) — bị chặn bởi việc chưa có endpoint nghiệp vụ nào
  được nối; chuyển sang Stage 2.
- `AC-09` kiểm bằng kiểm tra tĩnh (grep), không phải Playwright.
- `AC-10` đạt một nửa: đúng cho 401, **sai** cho 403 tài khoản bị ban (`D-10`).
- `AC-20` đạt một nửa: đúng cho lỗi mạng, **sai** cho body non-JSON (`D-11`).

Vì vậy **không** nên đánh dấu Stage 1 "verified" chỉ dựa trên `admin_api.md:151-154` — bốn AC ở đó
mới chỉ được thoả mãn ở mức code, và có 4 điểm (`AC-07`, `AC-09`, `D-10`, `D-11`) chưa được kiểm
hoặc chưa đạt.
