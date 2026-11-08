# Audit bộ e2e Playwright — `WIVI_fe/e2e`

**Ngày audit:** 2026-10-22 · **Phạm vi:** 12 file spec chạy bằng `playwright.config.ts` (+ `auth/config.spec.ts` chạy bằng config riêng, không audit ở đây) · **Không sửa** spec, fixture, app hay backend trong lượt này.

Mục đích: trước khi fix e2e, xác định **mỗi test fail vì đâu** — môi trường, spec lỗi thời, mock lệch contract hay bug app — để lần fix sau không "sửa test cho xanh" che bug thật.

## 1. Kết luận nhanh

| Chỉ số | Giá trị |
| --- | --- |
| Tổng test × project | **102** (84 test case; 18 chạy thêm trên `chromium-mobile`) |
| Lần chạy cũ (`test-results/.last-run.json`, 13:30) | **35 fail** |
| Bộ offline chạy lại (`--grep-invert @real`, 69 test) | **67 pass, 2 fail** |
| Bộ `@real` (33 test) | **Không chạy được** — backend `127.0.0.1:3000` tắt (health = không phản hồi) |

**35 fail cũ = 33 test `@real` + TC-AUTH-32 × 2 project.** Khớp chính xác:
- 33 test `@real` fail vì **backend không chạy** (`ENV`). Bằng chứng: lỗi `TypeError: fetch failed` ném từ `apiLogin()` (`e2e/fixtures/accounts.ts`); các test không có lỗi đó thì snapshot trang hiện "Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại." (vd. `error-context.md` của TC-AUTH-03, TC-AUTH-13, TC-AUTH-33, TC-AUTH-53).
- Chỉ **TC-AUTH-32** là lỗi thật của test (xem §3.1).

Ngoài ra audit tĩnh tìm thêm: 1 mock lệch type (§3.2, do thay đổi `tokenLimit` ngày 2026-10-22), 1 test thiếu tag, rủi ro va dữ liệu giữa các test `@real`, và vài chỗ docs lỗi thời.

## 1b. Chạy lại khi backend đã bật (2026-10-22, sau audit ban đầu)

Backend `127.0.0.1:3000` đã lên, cả hai account seed login được (Admin/User). `pnpm exec playwright test` (cấu hình mặc định, `fullyParallel`): **85 pass, 17 fail**.

| Nhóm | Số fail | Phân loại | Bằng chứng |
| --- | --- | --- | --- |
| Login bị **HTTP 429** | 14 | `ENV` (rate limit) | `AuthRateLimitGuard`: login giới hạn **10 lần/phút theo `ip:email`** (`WVI/Personal_Finance_App/src/modules/identity/interface/http/auth-rate-limit.guard.ts:60-65`). `realAdminSession()` (`e2e/fixtures/accounts.ts`) login lại ở **mỗi** test, không cache; cả suite login bằng cùng email Admin hàng chục lần. Lỗi: `Login thật thất bại (HTTP 429)` hoặc UI "Bạn thao tác quá nhanh". |
| TC-AUTH-32 × 2 | 2 | `SPEC-STALE` + `APP-BUG D-5` | như §3.1 |
| TC-AUTH-03 | 1 | `SPEC-STALE` (phụ thuộc dữ liệu) | §3.7 |

**Kiểm chứng 429:** chạy lại riêng các test từng bị 429 (`--workers=1`, < 10 lần login trong 1 phút):
- Desktop **9/9 pass**: TC-MEM-01..05, feedbacks Admin thật, profile Admin thật, TC-AUTH-40, TC-AUTH-53.
- Mobile (chờ 70 giây cho cửa sổ rate limit reset) **4/4 pass**: TC-AUTH-13, 20, 21, 33.
- **Chưa kiểm chứng lại:** TC-MEM-06 (cấm/bỏ cấm User seed trên DB thật — không chạy lại khi chưa được đồng ý).

⇒ Khi backend bật, các dòng `blocked` ở §5 đều **pass**, trừ TC-AUTH-03 (§3.7) và TC-MEM-06 (chưa chạy lại).

**Hướng fix 429 (chọn một):**
- Môi trường test: chạy backend với `AUTH_RATE_LIMIT_DISABLED=true` (guard chỉ cho phép khi `NODE_ENV !== 'production'`, dòng 27-29). Biến đã có trong `.env.example` nhưng chưa có trong `.env` backend.
- Hoặc sửa fixture: cache session theo worker trong `realAdminSession()`/`realUserSession()` để mỗi worker login một lần; giữ login qua UI chỉ ở các test kiểm tra form login. Cách này giảm phụ thuộc cấu hình backend.

## 2. Phân loại

| Mã | Ý nghĩa |
| --- | --- |
| `ENV` | Môi trường: backend tắt, thiếu env, account seed sai |
| `SPEC-STALE` | Test giả định hành vi app không còn đúng |
| `MOCK-DRIFT` | Stub/fixture khác shape runtime backend hoặc `src/types/admin.ts` |
| `TAG-WRONG` | Tag không phản ánh test có chạm backend thật hay không |
| `APP-BUG` | Test đúng theo spec + runtime, app làm sai |
| `ISOLATION` | Test `@real` đổi dữ liệu DB dùng chung, có thể làm test khác fail khi chạy song song |
| `OK` | Pass và assert đúng contract hiện tại |

Kiểm tra đã làm cho mọi test:
1. **Tag:** test nào có `page.route` / `abortRealRequest` / `stubAdminSession` thì phải là `@stub`; test `@real` không được có stub (feedbacks `@real` tự `page.unroute` stub chung ở `beforeEach` — chấp nhận).
2. **Stub vs runtime:** so body stub với handler backend và `src/types/admin.ts` (bảng §4).
3. **Selector:** mọi `getByTestId(...)` và `getByLabel(...)` trong `e2e/` đều tìm thấy trong `src/` (kể cả testid động `members-status-${value}` ở `src/pages/Members.tsx:684`). **Không có selector lỗi thời.**
4. **Typecheck e2e:** `npx tsc -p tsconfig.node.json --noEmit` (tsconfig này include `e2e/`).

## 3. Vấn đề tìm được

### 3.1 TC-AUTH-32 — `SPEC-STALE` (chính) + `APP-BUG` đã biết `D-5`

- Test: `e2e/auth/login-outcome.spec.ts:264`. Stub login trả 200 **thiếu `accessToken`**, rồi kỳ vọng: shell hiện ra, localStorage còn session thiếu `accessToken`, sau reload mới bị xoá.
- Thực tế: `TypeError: Cannot read properties of null (reading 'accessToken')` — `readStoredSession()` trả `null` ngay sau khi shell hiện.
- Nguyên nhân (FACT): sau login, `/` (Overview) gọi API khi mount → `apiRequest` gọi `readSession()` (`src/lib/api/client.ts:141-146`) → `isAuthSession` thấy thiếu `accessToken` → **xoá key** (`src/lib/session.ts:26-36`). Test được viết ở Stage 1, khi shell chưa gọi API nào (`docs/spec/auth/stage-1-auth-spec.md` `D-3`), nên giả định "chỉ mất phiên sau reload" không còn đúng.
- Lỗi gốc vẫn là `D-5`: `src/services/auth.ts:11-20` không validate token của response 200. Spec đề xuất sửa (`stage-1-auth-spec.md` `Q-6`: "Sửa ngay — 4 dòng").
- **Hướng fix:** cần owner chốt `Q-6`. Nếu sửa `D-5` → `services/auth.ts` ném lỗi khi thiếu token, TC-AUTH-32 đổi kỳ vọng thành "hiện form-error, không vào shell, không lưu session" và bỏ tag `@drift`. Nếu chưa sửa → cập nhật kỳ vọng thành "session bị xoá ở request đầu tiên".

### 3.2 `subscription-layout.spec.ts` — `MOCK-DRIFT`

- `npx tsc -p tsconfig.node.json --noEmit` **fail**: `e2e/configuration/subscription-layout.spec.ts(14,64)` — stub `buildPlans()` thiếu `tokenLimit`, field bắt buộc của `AdminSubscriptionPlan` (thêm ngày 2026-10-22 khi nối `tokenLimit`; lượt đó chỉ chạy `tsconfig.app.json` nên không bắt được).
- Runtime vẫn pass vì Playwright không typecheck, nhưng bảng plans render `tokenLimit = undefined`, khác runtime backend (cột `token_limit` NOT NULL, luôn trả số).
- **Hướng fix:** thêm `tokenLimit: 10000` vào `buildPlans()`; nên thêm 1 test `@stub` cho form/ cột `tokenLimit` (xem §6).

### 3.3 TC-AUTH-29 — `TAG-WRONG` (nhẹ)

- `e2e/auth/login-outcome.spec.ts:95` dùng `abortRealRequest` (= `page.route(...).abort`, `e2e/fixtures/api-traffic.ts:66-68`) nhưng không có tag. Chạy đúng ở cả hai chế độ, nhưng `pnpm test:e2e:stub` bỏ sót nó.
- **Hướng fix:** gắn `@stub`.
- Các test không tag khác (TC-AUTH-01, 02, 06, 10, 11, 12) không chạm network → để nguyên hoặc gắn tag riêng (vd. `@offline`) nếu muốn `test:e2e:stub` bao phủ toàn bộ bộ không cần backend.

### 3.4 `ISOLATION` — TC-MEM-06 cấm account User seed

- `e2e/members/members-actions.spec.ts:30-95`: cấm rồi bỏ cấm `E2E_USER_EMAIL` trên DB thật (có `finally` để bỏ cấm).
- `playwright.config.ts` bật `fullyParallel: true`. Trong khoảng account đang bị cấm, các test `@real` khác đăng nhập bằng User seed sẽ nhận 403 thay vì hành vi mong đợi: TC-AUTH-05, TC-AUTH-22 (×2 project), `feedbacks.spec.ts:126`, `profile.spec.ts:189`. **[INFERENCE]** — chưa tái hiện vì backend tắt.
- **Hướng fix:** dùng account seed riêng cho TC-MEM-06, hoặc đặt suite G `test.describe.configure({ mode: 'serial' })` và chạy `@real` với `--workers=1`.

### 3.5 `@real` phụ thuộc backend không cần thiết

- TC-AUTH-07 (`guard.spec.ts:88`) chỉ cần một session thiếu `refreshToken`; việc login thật không ảnh hưởng kết quả (session bị xoá trước khi gọi API). Có thể chuyển sang session giả + bỏ `@real` để giảm phụ thuộc môi trường. Không bắt buộc.

### 3.7 TC-AUTH-03 — `SPEC-STALE` (phụ thuộc dữ liệu)

- Test: `e2e/auth/guard.spec.ts:31`. Mở `/members?pageIndex=2&keyword=an`, login, kỳ vọng URL giữ nguyên.
- Thực tế: `Received: /members?keyword=an`. Snapshot trang: "1 tài khoản · Trang 1/1". Redirect sau login **đúng** (giữ `keyword`), nhưng Members cố ý clamp `pageIndex` vượt trang cuối về trang cuối (`src/pages/Members.tsx:206-212`, quy tắc `AGENTS.md` §4.6), nên `pageIndex=2` bị bỏ.
- Test chỉ pass nếu DB có > 20 tài khoản khớp "an" — giả định dữ liệu không được seed.
- **Hướng fix:** dùng destination không phụ thuộc số bản ghi, vd. `/members?keyword=an&status=Active`, hoặc route không clamp (vd. `/feedbacks?...` nếu không clamp). Không sửa app.

### 3.6 Test khoá hành vi drift (`@drift`)

TC-AUTH-23, 24, 31, 32 cố ý khoá hành vi **đang lệch spec** (role case-sensitive, hiện nguyên message 403/HTML 502, thiếu token). Khi team sửa drift tương ứng trong `stage-1-auth-spec.md`, các test này **phải đổi kỳ vọng cùng lúc**; không coi chúng là lỗi spec độc lập.

## 4. Stub so với runtime backend

| Endpoint | Stub trong e2e | Runtime backend | Kết luận |
| --- | --- | --- | --- |
| `GET /admin/users` | `{data, pagination{page,pageSize,totalCount,totalPages}}` (`fixtures/members.ts`) | `get-users.handler.ts` trả đúng shape này | Khớp |
| `GET /admin/broadcasts` | `{items,totalCount,page,pageSize}` | `PaginatedResult` (`shared/application/pagination.ts`); `totalPages` là **getter** nên không vào JSON | Khớp — nhưng `AGENTS.md` §4.5 ghi envelope có `totalPages` là **sai docs** |
| `GET /admin/feedbacks` | `{items,totalCount,page,pageSize}` | `get-admin-feedbacks.handler.ts` | Khớp |
| `GET /admin/dashboard` | đủ field `summary`; `totalJars/activeGoals/pendingImportJobs = 777` | backend luôn trả `null` cho 3 field này | Cố ý (test chứng minh UI không render chúng) — OK |
| `GET /admin/me` | `AdminProfile` đủ field | `get-admin-profile.handler.ts:55-68` | Khớp |
| `GET /admin/subscriptions/plans` | mảng plan **thiếu `tokenLimit`** | entity có `token_limit` NOT NULL | `MOCK-DRIFT` (§3.2) |
| `POST /auth/login` (stub lỗi) | 403/422/500/502/200-thiếu-token | các nhánh backend không tự tạo được | Đúng mục đích `@stub` |

## 5. Bảng từng test

Cột **Project**: D = `chromium-desktop`, M = `chromium-mobile`. **Kết quả** = lần chạy lại offline 2026-10-22; test `@real` ghi "blocked" (backend tắt) và đều fail ở lần chạy cũ với cùng nguyên nhân.

| Spec:line | Test | Tag | Project | Kết quả | Phân loại | Ghi chú / hướng fix |
| --- | --- | --- | --- | --- | --- | --- |
| auth/guard:6 | TC-AUTH-01 khách bị đẩy về /login | — | D | pass | OK | |
| auth/guard:14 | TC-AUTH-02 khách vào route admin | — | D | pass | OK | |
| auth/guard:31 | TC-AUTH-03 redirect sau login | @real | D | **fail** (backend bật) | SPEC-STALE | phụ thuộc dữ liệu (§3.7) |
| auth/guard:45 | TC-AUTH-04 session sống qua reload | @real | D | blocked | ENV | |
| auth/guard:65 | TC-AUTH-05 role khác Admin bị đẩy | @real | D | blocked | ENV; ISOLATION | dùng User seed (§3.4) |
| auth/guard:77 | TC-AUTH-06 session hỏng JSON | — | D | pass | OK | |
| auth/guard:88 | TC-AUTH-07 thiếu refreshToken | @real | D | blocked | ENV | có thể bỏ phụ thuộc backend (§3.5) |
| auth/guard:99 | TC-AUTH-08 404 trong shell | @real | D | blocked | ENV | |
| auth/guard:108 | TC-AUTH-09 có session thì rời /login | @real | D | blocked | ENV | |
| auth/login-form:6 | TC-AUTH-10 chặn submit rỗng | — | D+M | pass | OK | |
| auth/login-form:20 | TC-AUTH-11 thiếu mật khẩu | — | D+M | pass | OK | |
| auth/login-form:34 | TC-AUTH-12 hiện/ẩn mật khẩu | — | D+M | pass | OK | |
| auth/login-form:52 | TC-AUTH-13 chống double-submit | @real | D+M | blocked | ENV | |
| auth/login-outcome:12 | TC-AUTH-20 login Admin thật | @real | D+M | blocked | ENV | |
| auth/login-outcome:38 | TC-AUTH-21 401 sai mật khẩu | @real | D+M | blocked | ENV | |
| auth/login-outcome:58 | TC-AUTH-22 role User bị từ chối | @real | D+M | blocked | ENV; ISOLATION | dùng User seed (§3.4) |
| auth/login-outcome:79 | TC-AUTH-25 422 field email | @real | D+M | blocked | ENV | |
| auth/login-outcome:95 | TC-AUTH-29 lỗi mạng | — | D+M | pass | TAG-WRONG | gắn `@stub` (§3.3) |
| auth/login-outcome:107 | TC-AUTH-33 localStorage lỗi | @real | D+M | blocked | ENV | |
| auth/login-outcome:131 | TC-AUTH-23 role `admin` thường | @stub @drift | D+M | pass | OK | khoá drift (§3.6) |
| auth/login-outcome:157 | TC-AUTH-24 403 banned | @stub @drift | D+M | pass | OK | khoá drift (§3.6) |
| auth/login-outcome:181 | TC-AUTH-26 422 field password | @stub | D+M | pass | OK | |
| auth/login-outcome:198 | TC-AUTH-27 422 field lạ | @stub | D+M | pass | OK | |
| auth/login-outcome:215 | TC-AUTH-28 422 field null | @stub | D+M | pass | OK | |
| auth/login-outcome:230 | TC-AUTH-30 500 không lộ stack | @stub | D+M | pass | OK | |
| auth/login-outcome:251 | TC-AUTH-31 502 HTML | @stub @drift | D+M | pass | OK | khoá drift (§3.6) |
| auth/login-outcome:264 | TC-AUTH-32 200 thiếu accessToken | @stub @drift | D+M | **fail** | SPEC-STALE; APP-BUG `D-5` | §3.1, cần owner chốt `Q-6` |
| auth/logout:11 | TC-AUTH-53 logout, Back bị chặn | @real | D | blocked | ENV | |
| auth/logout:32 | TC-AUTH-50 logout từ banner denied | @real | D | blocked | ENV | |
| auth/logout:56 | TC-AUTH-51 logout 401 vẫn xoá session | @real | D | blocked | ENV | |
| auth/logout:77 | TC-AUTH-52 logout gửi Authorization | @real | D | blocked | ENV | |
| auth/session-expiry:6 | TC-AUTH-40 sự kiện hết hạn phiên | @real | D | blocked | ENV | |
| campaigns/broadcasts:21 | list + pagination envelope phẳng | @stub | D | pass | OK | |
| campaigns/broadcasts:42 | list rỗng không NaN | @stub | D | pass | OK | |
| campaigns/broadcasts:57 | 500 rồi retry | @stub | D | pass | OK | |
| configuration/subscription-layout:31 | nhãn bắt buộc, field khoá khi sửa | @stub | D | pass | MOCK-DRIFT | thiếu `tokenLimit` (§3.2) |
| configuration/subscription-layout:55 | cuộn form, 2 plans 1280×720 | @stub | D | pass | MOCK-DRIFT | như trên |
| configuration/subscription-layout:55 | cuộn form, 20 plans 1440×900 | @stub | D | pass | MOCK-DRIFT | như trên |
| dashboard/overview:26 | chart + số tài khoản | @stub | D | pass | OK | |
| dashboard/overview:48 | 4 tile tổng + link feedback | @stub | D | pass | OK | |
| dashboard/overview:72 | doanh thu không có ≠ 0 | @stub | D | pass | OK | |
| dashboard/overview:82 | doanh thu 0 hợp lệ | @stub | D | pass | OK | |
| dashboard/overview:82 | doanh thu 98000.5 hợp lệ | @stub | D | pass | OK | |
| dashboard/overview:91 | metric thiếu không fallback | @stub | D | pass | OK | |
| dashboard/overview:105 | search + status filter | @stub | D | pass | OK | |
| dashboard/overview:130 | menu refresh + bàn phím | @stub | D | pass | OK | |
| dashboard/overview:156 | loading vs error, retry | @stub | D | pass | OK | |
| dashboard/overview:179 | 0 và list rỗng | @stub | D | pass | OK | |
| dashboard/overview:189 | thiếu count, rỗng do filter | @stub | D | pass | OK | |
| dashboard/overview:206 | không tràn ngang 1440px | @stub | D | pass | OK | |
| dashboard/overview:206 | không tràn ngang 820px | @stub | D | pass | OK | |
| dashboard/overview:206 | không tràn ngang 390px | @stub | D | pass | OK | |
| feedbacks/feedbacks:13 | filter + pagination | @stub | D | pass | OK | |
| feedbacks/feedbacks:37 | lỗi retry, rỗng do filter | @stub | D | pass | OK | |
| feedbacks/feedbacks:49 | null/thiếu profile/comment an toàn | @stub | D | pass | OK | |
| feedbacks/feedbacks:59 | 403 giữ session | @stub | D | pass | OK | |
| feedbacks/feedbacks:67 | đổi filter bỏ response trễ | @stub | D | pass | OK | |
| feedbacks/feedbacks:84 | refresh giữ nội dung cũ | @stub | D | pass | OK | |
| feedbacks/feedbacks:102 | chưa login / non-admin bị đẩy | @stub | D | pass | OK | |
| feedbacks/feedbacks:110 | Admin thật đọc list + summary | @real | D | blocked | ENV | |
| feedbacks/feedbacks:126 | User thật không vào được | @real | D | blocked | ENV; ISOLATION | dùng User seed (§3.4) |
| members/members-actions:30 | TC-MEM-06 cấm rồi bỏ cấm | @real | D | blocked | ENV; ISOLATION | nguồn gây va dữ liệu (§3.4) |
| members/members-actions:97 | TC-MEM-07 PATCH pending | @stub | D | pass | OK | |
| members/members-actions:131 | TC-MEM-08 PATCH 500 stale | @stub | D | pass | OK | |
| members/members-actions:155 | TC-MEM-09 detail lỗi + retry | @stub | D | pass | OK | |
| members/members-list:17 | TC-MEM-01 query mặc định | @real | D | blocked | ENV | |
| members/members-list:51 | TC-MEM-02 debounce keyword | @real | D | blocked | ENV | |
| members/members-list:101 | TC-MEM-03 lọc trạng thái | @real | D | blocked | ENV | |
| members/members-list:142 | TC-MEM-04 pagination envelope | @real | D | blocked | ENV | |
| members/members-list:178 | TC-MEM-05 xem detail | @real | D | blocked | ENV | |
| members/members-list:212 | TC-MEM-10 rỗng tự nhiên | @stub | D | pass | OK | |
| members/members-list:223 | TC-MEM-11 rỗng do filter | @stub | D | pass | OK | |
| members/members-list:246 | TC-MEM-12 lỗi + retry | @stub | D | pass | OK | |
| profile/profile:13 | skeleton, read-only, giờ VN | @stub | D | pass | OK | |
| profile/profile:29 | field rỗng hiện — | @stub | D | pass | OK | |
| profile/profile:38 | retry lỗi network | @stub | D | pass | OK | |
| profile/profile:38 | retry lỗi server | @stub | D | pass | OK | |
| profile/profile:52 | 403 giữ session, logout pending | @stub | D | pass | OK | |
| profile/profile:70 | request treo timeout + retry | @stub | D | pass | OK | |
| profile/profile:90 | 401 refresh rồi retry | @stub | D | pass | OK | |
| profile/profile:104 | menu tài khoản bàn phím | @stub | D | pass | OK | |
| profile/profile:132 | logout shell khoá khi pending | @stub | D | pass | OK | |
| profile/profile:170 | profile khớp identity Admin thật | @real | D | blocked | ENV | |
| profile/profile:189 | User không vào được profile | @real | D | blocked | ENV; ISOLATION | dùng User seed (§3.4) |

Tổng theo test × project (102), cập nhật sau khi chạy với backend: `OK` 62 · `ENV` 32 (pass khi không vượt rate limit, trừ TC-MEM-06 chưa chạy lại; 6 test kèm rủi ro `ISOLATION`) · `SPEC-STALE` 3 (TC-AUTH-32 × 2, TC-AUTH-03) · `MOCK-DRIFT` 3 · `TAG-WRONG` 2 (TC-AUTH-29 D+M).

## 6. Docs lỗi thời và khoảng trống coverage

**Docs lệch runtime:**
- `AGENTS.md` §4.5: envelope `/admin/broadcasts` không có `totalPages` ở runtime (getter của `PaginatedResult`).
- `docs/plan/admin_api.md` dòng 9: "các test `e2e/` hiện chỉ phủ auth và Members" — nay đã có dashboard, feedbacks, profile, campaigns, configuration.

**Chưa có test:**
- Configuration: tạo/sửa plan (gồm `tokenLimit`, validate số nguyên ≥ -1, payload POST/PATCH), lưu AI settings.
- Campaigns: tạo broadcast.
- Activity / Intelligence: vẫn là dữ liệu mẫu; nếu đổi sang trạng thái "chưa khả dụng" thì nên có test khoá.
- Refresh-on-401 với backend thật: mới phủ bằng stub (`profile.spec.ts:90`).

## 7. Thứ tự fix khuyến nghị

1. **ENV / rate limit:** chạy backend test với `AUTH_RATE_LIMIT_DISABLED=true`, hoặc cache session theo worker trong `e2e/fixtures/accounts.ts` (§1b). Đây là nguyên nhân của 14/17 fail khi backend bật.
2. **MOCK-DRIFT §3.2:** thêm `tokenLimit` vào stub plans; chạy lại `npx tsc -p tsconfig.node.json --noEmit` cho tới khi sạch.
3. **TAG-WRONG §3.3:** gắn `@stub` cho TC-AUTH-29.
4. **ISOLATION §3.4:** account seed riêng hoặc chế độ serial cho TC-MEM-06.
5. **SPEC-STALE §3.7:** đổi destination của TC-AUTH-03 sang URL không phụ thuộc số bản ghi.
6. **SPEC-STALE / APP-BUG §3.1:** chờ owner chốt `Q-6` rồi sửa `D-5` + TC-AUTH-32 trong cùng một thay đổi.
7. Bổ sung test cho khoảng trống §6.

## 8. Lệnh đã chạy

```bash
# backend health + login seed (không in secret)
curl $E2E_API_BASE_URL/api/v1/health        # không phản hồi
pnpm exec playwright test --list             # 102 tests in 12 files
pnpm exec playwright test --grep-invert @real --reporter=json --output=<scratchpad>   # 67 pass / 2 fail
npx tsc -p tsconfig.node.json --noEmit       # 1 lỗi (§3.2)
```

Kết quả chạy lại được ghi ra thư mục tạm, không ghi đè `test-results/` của lần chạy cũ.
