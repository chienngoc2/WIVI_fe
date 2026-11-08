# Stage 2 — Playwright UI test plan (Admin Members)

Bản test plan này biến các `AC-MEM-xx` trong [`stage-2-members-spec.md`](./stage-2-members-spec.md) §6
thành test case Playwright **thao tác trên giao diện**. Mục tiêu: một người viết/sửa test chỉ cần đọc
file này là viết được `e2e/members/*.spec.ts` mà không phải đọc lại `src/`.

> **Trạng thái: ĐÃ TRIỂN KHAI.** Khác Stage 1 (spec viết trước khi có test), Stage 2 có sẵn
> `e2e/fixtures/members.ts` + 2 spec file + **12 test case**. §7 ghi lại kết quả chạy thật ngày
> 2026-10-07 và các case còn thiếu.

Nền tảng runner/fixture/`@real`–`@stub` được **kế thừa nguyên trạng** từ
[`../auth/playwright-ui-test-plan.md`](../auth/playwright-ui-test-plan.md) §3/§4/§9 — file này chỉ ghi
phần **riêng của Members**. Khi cần chi tiết về Playwright config, quy ước tag hay cách quan sát bằng UI
mode, đọc file đó.

---

## 1. Quyết định thiết kế

| ID | Quyết định | Lý do |
| --- | --- | --- |
| `P-MEM-1` | Dùng runner + fixture có sẵn của Stage 1, **không** thêm dependency | `AGENTS.md` §13.5 cấm thêm library; `@playwright/test` đã có |
| `P-MEM-2` | Case **chỉ đọc** chạy `@real` trên backend thật + account seed, assert cả **query param** lẫn **status code** | Contract với backend là query param + envelope; mock sẽ không chứng minh được điều đó |
| `P-MEM-3` | Case **cấm/bỏ cấm** tách riêng khỏi suite chỉ đọc, có precondition đưa account về `Active` và `finally` **luôn** bỏ cấm | Test phải chạy lại được và không để account seed ở trạng thái bị ban |
| `P-MEM-4` | Nhánh backend **không thể tạo theo yêu cầu** (list rỗng, list 500 rồi retry thành công, PATCH pending, PATCH 500, detail 404) dùng `@stub` | Đúng tiêu chí `@stub` của Stage 1: chỉ dùng cho nhánh bất khả thi, mỗi case ghi lý do |
| `P-MEM-5` | Case `@stub` seed **session giả** (`stubAdminSession`, token giả) và **không** chạm backend | Giữ suite hermetic cho CI; không thay thế `@real` cho phần auth |
| `P-MEM-6` | Assert debounce bằng **thời điểm** ("không gửi ngay sau khi gõ" + "gửi sau ≥ 250 ms") thay vì "không có request cho tiền tố" | Bài học từ fail thật: dưới tải song song, debounce hợp lệ vẫn phát request tiền tố — xem §6.4 |
| `P-MEM-7` | Assert URL/query param qua `trackApiRequests()` (`e2e/fixtures/api-traffic.ts`) chứ không chỉ nhìn DOM | URL + query param là source of truth và là contract với B1 |
| `P-MEM-8` | Không import runtime từ `src/` trong test; chỉ `import type` cho DTO | Convention Stage 1 §2: test quan sát UI, không gọi hàm nội bộ |
| `P-MEM-9` | Tách 3 endpoint bằng glob có dấu `/`: `**/api/v1/admin/users*` (list), `.../users/*` (detail), `.../users/*/status` (status) | Glob Playwright: `*` **không** vượt `/` ⇒ pattern không bắt nhầm nhau |

---

## 2. Bố cục file

```text
WIVI_fe/
└── e2e/
    ├── fixtures/
    │   ├── accounts.ts            # (Stage 1) account seed + apiLogin thật + toSession
    │   ├── api-traffic.ts         # (Stage 1) trackApiRequests / delayRealResponse / abortRealRequest
    │   ├── session.ts             # (Stage 1) seedSession / readStoredSession / clearStoredSession
    │   └── members.ts             # (Stage 2) endpoint pattern + stub list/detail/status + session giả + cleanup API
    └── members/
        ├── members-list.spec.ts   # Suite E (TC-MEM-01..05 @real) + Suite F (TC-MEM-10..12 @stub)
        └── members-actions.spec.ts# Suite G (TC-MEM-06 @real + TC-MEM-07..09 @stub)
```

Quy ước: **không** import từ `src/` trong test (trừ `import type` cho DTO). Mọi file đều nằm trong
`tsconfig.node.json` → `e2e` ⇒ `npx tsc -p tsconfig.node.json --noEmit` và `pnpm build` typecheck luôn
cả test.

---

## 3. Cấu hình

### 3.1 `playwright.config.ts` (không đổi so với Stage 1)

Điểm cần biết khi chạy Members:

| Hạng mục | Giá trị | Ảnh hưởng |
| --- | --- | --- |
| `testDir` | `./e2e` | file mới tự được nhặt, không cần sửa config |
| `testIdAttribute` | `data-testid` | khớp 22 attribute ở §5 |
| `testIgnore` | `**/config.spec.ts` | suite `@config` không chạy ở đây |
| `webServer` | `pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort`, `reuseExistingServer: !CI` | dev server + `VITE_API_BASE_URL = E2E_API_BASE_URL \|\| BASE_URL` |
| project `chromium-desktop` | viewport 1440×900, mọi file | nơi Members chạy |
| project `chromium-mobile` | `testMatch: /auth\/login-(form\|outcome)\.spec\.ts/` | **Members không chạy mobile** — `AppLayout` chưa responsive (`D-8` của Stage 1) |
| `fullyParallel` | `true` | 5 worker mặc định ⇒ assertion phải chịu được tải song song (bài học `P-MEM-6`) |

### 3.2 Env — `.env.test` (không commit)

`playwright.config.ts` tự `process.loadEnvFile('.env.test')`; biến set trong shell thắng file.

| Biến | Dùng cho |
| --- | --- |
| `E2E_API_BASE_URL` | backend thật (`http://127.0.0.1:3000`) — vừa là `VITE_API_BASE_URL` của dev server, vừa cho `apiLogin()`/`setUserStatusDirectly()` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | session Admin thật (`realAdminSession()`) cho toàn bộ case `@real` |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | account **mục tiêu** của `TC-MEM-06` (cấm/bỏ cấm) |
| `E2E_LIVE_BASE_URL` | hiện không code nào đọc (config hard-code 4173) |

### 3.3 Lệnh chạy

| Lệnh | Chạy gì | Cần backend? |
| --- | --- | --- |
| `pnpm run test:e2e:offline` | bỏ `@real` ⇒ 6 case Members `@stub` + toàn bộ case auth offline | ✗ |
| `pnpm run test:e2e:real` | mọi case `@real`, gồm `TC-MEM-01..06` | ✓ |
| `pnpm run test:e2e:stub` | mọi case `@stub`, gồm `TC-MEM-07..12` | ✗ |
| `npx playwright test e2e/members --project=chromium-desktop` | cả 12 case Members | ✓ (5 case `@real`) |
| `npx playwright test e2e/members/members-list.spec.ts --grep=@real` | 5 case chỉ đọc (không mutation) | ✓ |
| `pnpm run test:e2e:ui` | UI mode để quan sát snapshot từng action | tùy tag |

**Lưu ý PowerShell:** `--grep @real` bị PowerShell hiểu là biến ⇒ phải quote: `--grep '@real'` hoặc
`'--grep=@real'`.

---

## 4. Test harness — `e2e/fixtures/members.ts`

| Export | Công dụng | Neo |
| --- | --- | --- |
| `USERS_LIST_ENDPOINT` = `**/api/v1/admin/users*` | pattern B1 (query string không chứa `/` nên `*` khớp) | `:9` |
| `USER_DETAIL_ENDPOINT` = `**/api/v1/admin/users/*` | pattern B2 (không khớp B1 vì B1 không có `/`) | `:10` |
| `USER_STATUS_ENDPOINT` = `**/api/v1/admin/users/*/status` | pattern B3 | `:11` |
| `stubAdminSession()` / `seedStubAdminSession(page)` | session Admin **giả** cho `@stub` (`P-MEM-5`) | `:25`, `:36` |
| `buildUser(overrides)` | account đúng shape `AdminUser` (mặc định `Active`, `nva@wivi.vn`) | `:41` |
| `usersListResponse(users, pagination?)` | envelope thật `{data, pagination}` với `totalPages` tự tính | `:59` |
| `stubUsersList(page, replies[])` | stub B1 **theo chuỗi** reply (dùng cho lỗi→retry); reply cuối lặp lại | `:88` |
| `stubUserDetail(page, reply)` | stub B2 (chỉ `GET`) | `:102` |
| `stubUserStatus(page, reply, delayMs)` | stub B3 (chỉ `PATCH`), `delayMs` để quan sát pending | `:115` |
| `setUserStatusDirectly(baseUrl, token, id, status, reason?)` | gọi B3 **thật** để precondition/cleanup `TC-MEM-06` | `:127` |

Bất biến dùng chung cho suite Members:

| Bất biến | Cách assert |
| --- | --- |
| PATCH gửi **status đích tường minh** | `expect(await request.postDataJSON()).toEqual({status:'Banned', statusReason: reason})` / `{status:'Active'}` |
| Sau mutation **có** GET refetch | đăng ký `page.waitForRequest(... GET .../admin/users? ...)` **trước** khi click submit |
| List không gửi param rỗng | đọc `new URL(request.url).searchParams` ⇒ `status`/`keyword` phải `null` |
| Không lộ token ra DOM | không cần cho Members (danh sách không render token); vẫn giữ nguyên tắc của Stage 1 |

---

## 5. Hợp đồng selector

Toàn bộ `data-testid` của Members nằm trong `src/pages/Members.tsx` (**22** attribute) — **không** thêm
vào component dùng chung để giữ `src/components/ui/*` không biết gì về business:

| # | Selector | Vùng | Neo |
| --- | --- | --- | --- |
| 1 | `members-page` | root page | `:500` |
| 2 | `members-notice` | banner success/warning (`role="status"`) | `:524` |
| 3 | `members-list-error` | banner lỗi khi vẫn còn dữ liệu cũ (`role="alert"`) | `:556` |
| 4 | `members-loading` | skeleton lần đầu (`role="status"`) | `:568` |
| 5 | `members-error` | error state đầy đủ (`role="alert"`) | `:576` |
| 6 | `members-retry` | nút "Thử lại" của error state | `:583` |
| 7 | `members-pagination` | khối pagination | `:599` |
| 8 | `members-page-info` | chuỗi `x–y / total · Trang p/P` | `:602` |
| 9 | `members-page-size` | `select` 20/50/100 | `:614` |
| 10 | `members-prev` | nút "Trước" | `:628` |
| 11 | `members-next` | nút "Sau" | `:637` |
| 12 | `members-status-{all\|Active\|Banned}` | 3 chip trạng thái (template literal) | `:663` |
| 13 | `members-clear-filters` | nút xoá bộ lọc ở panel phải | `:701` |
| 14 | `members-empty-clear` | nút xoá bộ lọc **trong empty state do filter** | `:476` |
| 15 | `members-action-view` | nút "Xem" trên row | `:438` |
| 16 | `members-action-ban` | nút "Cấm tài khoản" trên row (chỉ khi `Active`) | `:457` |
| 17 | `members-action-unban` | nút "Bỏ cấm tài khoản" trên row (chỉ khi `Banned`) | `:447` |
| 18 | `members-detail` | body modal chi tiết | `:729` |
| 19 | `members-confirm` | body modal confirm | `:812` |
| 20 | `members-confirm-reason` | `textarea` lý do (chỉ khi cấm) | `:839` |
| 21 | `members-confirm-submit` | nút submit của confirm | `:801` |
| 22 | `members-mutation-error` | lỗi PATCH inline | `:851` |

Hook ngữ nghĩa dùng được, **không** cần test id: ô tìm kiếm (`getByPlaceholder('Tìm theo username, email,
họ tên…')`), tiêu đề modal (`getByRole('heading', { name })`), nút footer (`getByRole('button', { name: 'Đóng' })`),
chip trạng thái (`aria-pressed`).

Selector kế thừa từ Stage 1 được Members dùng lại: `app-shell`, `topnav-identity-name`.

### 5.1 Ba cái bẫy đã trả giá thật

1. **Tiêu đề modal KHÔNG nằm trong `members-confirm`.** `Modal` render `<h3>{title}</h3>` ở header, còn
   `members-confirm` chỉ là body ⇒ `expect(getByTestId('members-confirm')).toContainText('Bỏ cấm tài khoản')`
   **fail** dù UI đúng. Dùng `getByRole('heading', { name: 'Bỏ cấm tài khoản' })` hoặc assert câu trong body.
2. **`EmptyState` render bằng `<tr>`.** Khi bảng rỗng, `tbody tr` **vẫn có 1 phần tử** (hàng chứa empty
   state) ⇒ `const rowCount = await page.locator('tbody tr').count(); if (rowCount > 0) {...}` là sai.
   Muốn biết bảng có dữ liệu thật thì đọc `payload.data.length` từ response.
3. **`members-detail` chỉ chứa nội dung modal, không chứa text của page.** Assert phủ định kiểu
   `not.toContainText('Sepay')` trên `members-detail` là **hợp lệ** (panel lọc nằm ngoài modal), nhưng
   assert trên toàn page thì sẽ fail vì panel lọc có nhắc "Sepay" trong ghi chú giới hạn.

---

## 6. Catalogue test case

Tag: `@real` = cần backend thật (assert cả status code thật); `@stub` = response giả, không chạm backend.
Cột **Kết quả** là lần chạy 2026-10-07 trên máy dev.

### 6.1 Suite E — Danh sách (dữ liệu thật) · `members-list.spec.ts`

| ID | Given | When | Then | Kết quả |
| --- | --- | --- | --- | --- |
| `TC-MEM-01` `@real` | session Admin thật | `goto /members` | response B1 **200**; request có `pageIndex=1`, `pageSize=20`, **không** có `status`, **không** có `keyword`; `members-page-info` chứa `totalCount` thật; số `tbody tr` = `data.length` | pass |
| `TC-MEM-02` `@real` | session Admin thật | `goto /members?pageIndex=1`, gõ `abc` vào ô tìm kiếm (`pressSequentially`, delay 50 ms) | ngay sau khi gõ xong **chưa** có request `keyword=abc`; request `keyword=abc` tới sau **≥ 250 ms**; URL có `keyword=abc` và **không** còn `pageIndex` | pass |
| `TC-MEM-03` `@real` | session Admin thật | `goto /members`, click chip `Bị cấm` | response B1 **200** với `status=Banned`, `pageIndex=1`; chip `aria-pressed=true`; URL có `status=Banned`; nếu `data.length > 0` thì hàng đầu hiện `Bị cấm`, nếu `= 0` thì hiện empty-state "do filter" (DB hiện **0** account bị cấm); click `Tất cả` ⇒ request **không** có `status=` và URL mất param | pass |
| `TC-MEM-04` `@real` | session Admin thật | `goto /members`, đọc `pagination` từ response | `Trước` **disabled**; `members-page-info` = `Trang 1/<totalPages thật>`; nếu `totalPages ≥ 2`: click `Sau` ⇒ request `pageIndex=2`, `pagination.page=2`, `Trước` enabled; nếu `< 2`: `Sau` **disabled** (nhánh này mới là nhánh chạy hiện tại) | pass |
| `TC-MEM-05` `@real` | session Admin thật | click `Xem` ở hàng đầu | có request `GET /api/v1/admin/users/<id>` **đúng id của hàng đó**; `members-detail` hiện `id`, `userName`, `email`; **không** chứa `Sepay`/`Hạn ngạch`; click `Đóng` ⇒ modal ẩn | pass |

### 6.2 Suite F — Empty / error / retry · `members-list.spec.ts`

| ID | Given (`@stub`) | When | Then | Kết quả |
| --- | --- | --- | --- | --- |
| `TC-MEM-10` | session giả; B1 trả `{data:[], totalCount:0}` | `goto /members` | thấy `Chưa có thành viên nào`; **không** thấy `members-empty-clear`; **không** thấy `members-error` | pass |
| `TC-MEM-11` | session giả; B1 trả rỗng | `goto /members?keyword=khong-co-ai&status=Banned` | thấy `Không tìm thấy kết quả khớp bộ lọc`; click `members-empty-clear` ⇒ URL mất `keyword` **và** `status`, request mới không có `keyword=` | pass |
| `TC-MEM-12` | session giả; B1 trả **500** lần 1 rồi **200** (1 user) lần 2 | `goto /members`, click `members-retry` | `members-error` hiện `Lỗi máy chủ tạm thời`; sau retry: error ẩn, bảng có 1 hàng chứa `nva@wivi.vn` | pass |

### 6.3 Suite G — Chi tiết & cấm/bỏ cấm · `members-actions.spec.ts`

| ID | Given | When | Then | Kết quả |
| --- | --- | --- | --- | --- |
| `TC-MEM-06` `@real` | session Admin thật **+** account seed `E2E_USER_EMAIL`; precondition: `setUserStatusDirectly(..., 'Active')`; `goto /members?keyword=<email user>` | click `Cấm tài khoản` → nhập lý do → submit; sau đó click `Bỏ cấm tài khoản` → submit | PATCH #1 body **đúng** `{status:'Banned', statusReason:<lý do>}`; có **GET refetch** sau đó; dialog đóng; hàng hiện `Bị cấm`; notice `Đã cấm tài khoản…`; PATCH #2 body **đúng** `{status:'Active'}` (không có `statusReason`); dialog bỏ cấm **không** có ô lý do; hàng hiện `Hoạt động`; notice `Đã bỏ cấm tài khoản…`; `finally` luôn `setUserStatusDirectly(..., 'Active')` | **một phần**: nhánh cấm pass tới hết; nhánh bỏ cấm fail ở assertion sai phạm vi (`§5.1` bẫy 1) — đã sửa test, **chưa chạy lại** (`Q-MEM-6`) |
| `TC-MEM-07` `@stub` | session giả; B1 trả 1 user `Active`; B3 trả 200 **sau 1500 ms** | click `Cấm tài khoản` → submit | trong lúc pending: `members-confirm-submit` **disabled** + text `Đang xử lý…`, `members-confirm-reason` **disabled**, `members-confirm` vẫn hiện; sau khi xong: dialog đóng, có GET refetch, notice `Đã cấm tài khoản` | pass |
| `TC-MEM-08` `@stub` | session giả; B1 trả 1 user; B3 trả **500** `{code:'INTERNAL_ERROR'}` | click `Cấm tài khoản` → submit | có GET refetch; dialog **đóng**; notice cảnh báo `có thể đã bị thay đổi ở nơi khác`; `members-mutation-error` **không** hiện (không phơi lỗi thô) | pass |
| `TC-MEM-09` `@stub` | session giả; B1 trả 1 user; B2 trả **404** `User not found` | click `Xem` → click `Thử lại` | `members-detail` hiện `User not found`; click `Thử lại` ⇒ có **request B2 thứ hai** đúng `/admin/users/<id>` | pass |

### 6.4 Kết quả chạy và bài học

| Lệnh | Kết quả 2026-10-07 |
| --- | --- |
| `npx playwright test --grep-invert=@real --project=chromium-desktop` | **21 passed** = 15 case auth offline (không regression) + 6 case Members `@stub` |
| `npx playwright test e2e/members/members-list.spec.ts --grep=@real --project=chromium-desktop` | **5 passed** (backend thật + `E2E_*` seed) |
| `npx playwright test e2e/members --project=chromium-desktop` (đầy đủ, gồm `TC-MEM-06`) | **10 passed, 2 failed** — cả hai fail đều là **lỗi assertion của test**, không phải lỗi app; đã sửa (§5.1) |

Ba bài học (đã encode thành `P-MEM-6` và §5.1):

1. **`TC-MEM-02` (debounce)** — assertion "không bao giờ có request cho tiền tố `a`/`ab`" **fail thật**
   khi chạy 5 worker song song: `Received array: ["a"]`. Nguyên nhân: debounce nằm ở tầng fetch, nên nếu
   main thread bị chặn > 350 ms (tải song song + DB remote), request cho tiền tố là **hành vi đúng**.
   Đã đổi sang assert **thời điểm**. Ghi thành `D-MEM-9`.
2. **`TC-MEM-03` (empty do filter)** — hàng đầu tiên không có chữ `Bị cấm` vì DB thật có **0** account bị
   cấm ⇒ UI đúng khi hiện empty-state "do filter". Assertion dựa vào `tbody tr` là sai vì `EmptyState`
   cũng là một `<tr>`. Đã đổi sang đọc `payload.data.length` từ response.
3. **`TC-MEM-06` (bỏ cấm)** — UI đúng, test sai phạm vi assert: `members-confirm` là **body** modal,
   còn tiêu đề `Bỏ cấm tài khoản` nằm ở header `Modal`. Đã đổi sang `getByRole('heading', …)`.

---

## 7. Phạm vi chưa phủ (và lý do)

| ID | Không phủ | Lý do | Xử lý |
| --- | --- | --- | --- |
| `G-MEM-1` | `pageSize` 50/100; nút `Trước` khi đang ở trang ≥ 2 | DB seed hiện chỉ có 1 trang nên `TC-MEM-04` chạy nhánh "`Sau` disabled" | Thêm case `@stub`: `usersListResponse(rows, {page:2, totalCount:137})` ⇒ assert `Trước` enabled + `pageInfo` đúng, và đổi `pageSize` ⇒ `pageIndex` reset 1 |
| `G-MEM-2` | Clamp khi `pageIndex > totalPages` (`AC-MEM-08`) | Chưa có case | Thêm case `@stub`: request `?pageIndex=9` + response `pagination{page:9, totalPages:1}` ⇒ assert URL bị đổi về `pageIndex=1`/mất param và có request lần 2 |
| `G-MEM-3` | `F12` — B2 trả 404 thì **refetch list** | `TC-MEM-09` chỉ assert error + retry, chưa assert refetch list | Thêm `waitForRequest(GET /admin/users?)` trong `TC-MEM-09` hoặc case riêng |
| `G-MEM-4` | `AC-MEM-07` — request cũ **đang bay** bị abort khi query đổi | Cần response chậm + đổi filter giữa chừng ⇒ dễ flaky nếu không kiểm soát bằng `page.route` delay | Thêm case `@stub`: B1 delay 1500 ms cho keyword `a`, đổi keyword sang `b` sau 200 ms, assert **chỉ** response của `b` được render |
| `G-MEM-5` | `AC-07` Stage 1 — refresh-on-401 cho request nghiệp vụ | Không tạo được 401 thật mà không làm hỏng token; Stage 1 đã ghi nhận treo | Chờ owner: hoặc làm hỏng `accessToken` trong localStorage trong test, hoặc thêm case backend test riêng |
| `G-MEM-6` | `@real` trong CI | Runner CI không có backend/DB; `ci.yml` + `playwright.yml` chỉ chạy `test:e2e:offline` | Cần môi trường test riêng + account seed (`Q-MEM-6`) trước khi thêm job `@real` |
| `G-MEM-7` | URL param không hợp lệ (`?pageIndex=abc`, `?pageSize=999`, `?status=Suspended`) và `keyword` chỉ khoảng trắng | Là fallback phòng thủ (`Members.tsx:68-79`), chưa có case | Thêm case `@stub`: assert request dùng giá trị mặc định `pageIndex=1`/`pageSize=20` và **không** gửi `status` |

---

## 8. CI

**Không cần sửa workflow.** Hai workflow hiện có đều chạy `pnpm run test:e2e:offline`:

| Workflow | Job | Nội dung |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `build-and-lint` → `e2e` | `e2e` chạy `test:e2e:offline` sau khi build+lint pass; upload `playwright-report/` khi fail |
| `.github/workflows/playwright.yml` | `test` | `test:e2e:offline`, upload report |

Vì 6 case Members `@stub` **không** gắn `@real`, chúng tự động nằm trong `test:e2e:offline` ⇒ được CI phủ
mà không phải sửa gì. Case `@real` (`TC-MEM-01..06`) chỉ chạy ở máy dev cho tới khi `G-MEM-6` được giải.

---

## 9. Definition of done — trạng thái thực tế

- [x] `data-testid` cần thiết đã có trong `src/pages/Members.tsx` (§5), **không** đổi hành vi để phục vụ test.
- [x] `pnpm lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.node.json --noEmit`,
      `pnpm build` pass.
- [x] `test:e2e:offline` chạy **không** cần backend/DB.
- [x] 12 case §6 đã viết; 6 `@stub` pass; 5 `@real` chỉ đọc pass; `TC-MEM-06` pass một phần (`Q-MEM-6`).
- [x] Mỗi case `@stub` ghi rõ lý do trong test (nhánh backend không tạo được theo yêu cầu).
- [x] Trace/screenshot/video bật khi fail (`playwright.config.ts`).
- [x] Fixture chỉ dùng `page.route` cho nhánh bất khả thi; suite `@real` không mock gì.
- [ ] Phủ hết `G-MEM-1..4`, `G-MEM-7` (các case còn thiếu).
- [ ] Chạy `TC-MEM-06` trọn vẹn trên môi trường test được duyệt (`G-MEM-6`/`Q-MEM-6`).

---

## 10. Quan sát & debug

### 10.1 Chạy nhanh một case

```bash
# Chỉ 5 case chỉ đọc của Members (cần backend + .env.test)
npx playwright test e2e/members/members-list.spec.ts --project=chromium-desktop '--grep=@real' --reporter=list

# Chỉ các case stub (không cần backend)
npx playwright test e2e/members '--grep=@stub' --project=chromium-desktop --reporter=list
```

### 10.2 UI mode

`pnpm run test:e2e:ui` → filter `@stub` (không cần backend) hoặc `TC-MEM-0` → bấm ▶ → xem cột **Actions**
để thấy từng bước: `newPage` → `goto /members` (skeleton → bảng) → `click members-action-ban` (modal confirm)
→ `fill members-confirm-reason` → `click members-confirm-submit` (`Đang xử lý…` → notice + refetch).
UI mode luôn ép trace `on` và **không** xoá output dir giữa các lần chạy (chi tiết ở
[`../auth/playwright-ui-test-plan.md`](../auth/playwright-ui-test-plan.md) §11).

### 10.3 Xem lại trace của lần fail

```bash
pnpm exec playwright show-trace "test-results-ui/<tên-test>/trace.zip"
```

Trong `test-results/<tên-test>/` luôn có `error-context.md` chứa **accessibility snapshot** của trang lúc
fail — đây là thứ nhanh nhất để biết UI thật đang hiển thị gì (đã dùng để chẩn đoán cả 3 bài học ở §6.4 mà
không cần chạy lại test).

### 10.4 Giới hạn môi trường agent (không phải lỗi test)

Trong sandbox bị hạn chế, `vite` (dev server mà Playwright cần) **không khởi động được**: `spawn EPERM`
khi `exec('net use')` trong `optimizeSafeRealPathSync` và khi nạp native binding `@tailwindcss/oxide`.
Hệ quả: `pnpm build` và `pnpm run test:e2e*` fail **trước khi** chạy test. Đây là giới hạn đã ghi ở
`AGENTS.md` §14 Step 5 và `D-MEM-13` — phải chạy ngoài sandbox (hoặc CI) rồi mới kết luận về test.
