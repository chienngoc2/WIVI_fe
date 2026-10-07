# Admin FE ↔ BE Integration Plan

**Trạng thái Stage 0:** Hoàn tất kiểm tra contract và thiết kế ngày 2026-10-05. Pencil MCP đã mở và đọc được `assets/admin_page_exe.pen`; không có thay đổi code. Repo có thay đổi chưa commit từ trước, được giữ nguyên.

**Trạng thái triển khai Stage 2:** hoàn tất. `/members` đã bỏ mock và chạy bằng backend thật (`GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`); search/status/pagination đều server-side và nằm trên URL search params. Đã chạy `pnpm lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.node.json --noEmit`, `pnpm build` (pass; build còn cảnh báo bundle JS > 500 kB như trước). E2E mới trong `e2e/members/*`: **5 test `@real` chỉ đọc đã chạy pass** với backend thật + admin/user seed (list query params, debounce keyword, status filter, pagination, detail) và **6 test `@stub` đã chạy pass** (empty tự nhiên, rỗng-do-filter, error + retry, PATCH pending, PATCH 500 stale, detail lỗi). Riêng `TC-MEM-06 @real` (cấm → refetch → bỏ cấm account seed) chưa chạy trọn vẹn theo yêu cầu vì nó đổi trạng thái account trên DB dùng chung; chạy một phần đã đi hết nhánh cấm thành công. Chi tiết quyết định ở §"Stage 2 — Ghi chú triển khai".

**Trạng thái triển khai:** Stage 1 hoàn tất ngày 2026-10-05. Frontend đã có API client, session/auth, đăng nhập Admin, route guard và trang 404. Bộ test Playwright UI cho luồng auth **đã chuyển sang chạy bằng dữ liệu thật** (2026-10-07): `test:e2e:real` gọi backend thật với account seed trong `.env.test`, `test:e2e:offline` giữ phần không cần backend cho CI, `live.spec.ts` đã xoá vì `TC-AUTH-20/21/22` phủ trực tiếp contract thật; AC-07 (refresh single-flight) vẫn treo chờ Stage 2 do chưa có request xác thực. `pnpm lint`, hai lệnh TypeScript check và `pnpm build` đều pass; build còn cảnh báo bundle JavaScript vượt 500 kB. Lưu ý: các trang admin (Members, Overview, Activity, Campaigns, Configuration) **vẫn dùng mock data trong page**, chưa gọi API — nên "dữ liệu thật" hiện chỉ đúng cho luồng auth.

**Bằng chứng thiết kế:** kiểm tra trực tiếp các frame đăng nhập, Dashboard, Members và chi tiết/trạng thái thành viên, Activity, Broadcast list/compose/review, AI settings, Audit log, Categories và Subscription plans. Các màn mẫu vẫn là prototype; sự tồn tại trong `.pen` chứng minh flow/UI mục tiêu, không chứng minh dữ liệu hay hành vi đã nối backend.

**Giới hạn runtime:** các kết luận về hành vi hiện tại lấy từ code và test/backend handler. `.pen` là bằng chứng cho UI mục tiêu, không thay thế contract API.

## 1. Current Architecture Summary

### Frontend

`WIVI_fe` là React/Vite/TypeScript. [App.tsx](F:/study/EXE/WIVI_fe/src/App.tsx) khai báo `/login` công khai, sáu route quản trị lồng trong Admin guard và route 404 nằm trong shell. [main.tsx](F:/study/EXE/WIVI_fe/src/main.tsx) bọc ứng dụng bằng `AuthProvider`; `AppLayout` sở hữu shell; [Sidebar.tsx](F:/study/EXE/WIVI_fe/src/components/Sidebar.tsx) chứa sáu mục điều hướng.

`src/lib/api/client.ts` là HTTP client duy nhất; `src/services/auth.ts` gọi login/logout; `src/lib/session.ts` là nơi duy nhất chạm `localStorage`; `AuthContext` giữ phiên và danh tính. Các page nghiệp vụ còn lại vẫn dùng mock và chưa gọi API. `TopNav` lấy danh tính từ session; các thành phần tìm kiếm, vận hành và chuông vẫn là UI tĩnh.

### Backend

Backend NestJS có prefix `/api/v1`. Các route admin được bảo vệ bằng JWT và role `Admin`. Đăng nhập dùng chung `POST /api/v1/auth/login`; không có endpoint đăng nhập admin riêng. Refresh trả token mới; logout hiện chỉ trả thông báo, không thu hồi token ở server.

Các API admin tương ứng một phần giao diện:

- Users, dashboard, audit logs: `modules/admin/interface/http/admin.controller.ts`
- Categories: `modules/category/interface/http/admin-category.controller.ts`
- Broadcasts: `modules/notification/interface/http/notification.controller.ts`
- AI settings: `modules/ai/interface/http/admin-ai.controller.ts`
- Subscription plans: `modules/subscription/interface/http/admin-subscription.controller.ts`

Backend API và handler là nguồn để xác nhận contract; [ADMIN_INTEGRATION_PLAN.md](F:/study/EXE/WIVI_fe/ADMIN_INTEGRATION_PLAN.md) hữu ích làm bản đồ nhưng có nội dung kế hoạch chưa phải bằng chứng UI đã tồn tại.

### Current Mock Architecture

Mock nghiệp vụ vẫn nằm trực tiếp trong page; filter, tìm kiếm và mutation chủ yếu cập nhật state tại chỗ hoặc gọi `alert()`/`confirm()`. Các tương tác nghiệp vụ đó chưa lưu lên backend. Auth là flow runtime thật, không dùng mock.

> **Phân biệt hai loại mock** (dễ nhầm khi đọc trạng thái):
>
> | Loại | Vị trí | Trạng thái |
> | --- | --- | --- |
> | **Mock nghiệp vụ trong page** (dữ liệu giả của app) | `src/pages/*.tsx` | **Chưa xoá** — đây là nội dung §6 (Stage 2–6 mới migrate) |
> | **Mock HTTP của e2e** (`page.route` giả `/api/v1/**`) | `e2e/fixtures/auth-backend.ts` | **Đã xoá 2026-10-07** — test chạy backend thật (`@real`), chỉ còn `@stub` cho nhánh backend không tạo được |
>
> Stage 1 chỉ thêm **API auth thật** (`login`/`refresh`/`logout`). Các API admin thật (users, dashboard, categories, broadcasts, audit, plans, ai-settings) backend **đã có** nhưng app **chưa gọi**.

Các phần API/auth runtime hiện có là `src/lib/api/client.ts`, `src/lib/session.ts`, `src/services/auth.ts`, `src/types/admin.ts`, `src/context/AuthProvider.tsx`, `src/context/auth-context.ts` và `src/hooks/useAuth.ts`. Các thư mục UI primitives (`src/components/ui`) và service cho domain nghiệp vụ vẫn chưa được tạo; khi triển khai các stage sau, chỉ thêm phần thực sự dùng tới.

## 2. Admin User-flow Inventory

| ID    | Flow runtime hoặc mục tiêu trong thiết kế                      | FE evidence                                                                  | Backend API                                         | Trạng thái                                                                                                                                      |
| ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| UF-01 | Mở trang Tổng quan và xem KPI, biểu đồ, danh sách             | `pages/Overview.tsx`; prototype có các frame dashboard trong `.pen`          | `GET /api/v1/admin/dashboard`                       | **Mismatch** — 6/9 counter là stub; `totalUsers` thực tế đếm account `Active`; hai danh sách rỗng và biểu đồ không có API tương ứng             |
| UF-02 | Tìm/lọc thành viên, xem chi tiết, ban/bỏ ban                 | Page hiện tại có list mock; `.pen` có list/detail/confirm/success flows       | list, detail, status ở `/api/v1/admin/users`        | **Mismatch** — API list/detail/ban-unban có; filter gói không có dữ liệu và runtime UI `Suspended` không khớp backend `Banned`                 |
| UF-03 | Xem nhật ký giao dịch, chuyển Spending/Subscription, tìm kiếm | `.pen` có Activity/Ledger và ghi rõ preview, dữ liệu mẫu, chưa có API admin  | Không có admin transaction-list API                 | **BLOCKED** — theo quyết định Stage 0, giữ route và hiện trạng thái chưa khả dụng; không trình bày dữ liệu mẫu như giao dịch thật                |
| UF-04 | Xem risk/churn và chỉ số hành vi AI                            | `.pen` có risk/churn lists và chart; runtime dùng dữ liệu mẫu               | Không có API admin cho risk/churn/time-series       | **BLOCKED** — không thay bằng AI settings API; các chỉ số trong prototype không có nguồn backend                                           |
| UF-05 | Soạn, xem lại, lên lịch broadcast thủ công và xem lịch sử     | `.pen` có list/compose/review/queued; thiết kế có channel và segment presets  | `GET/POST /api/v1/admin/broadcasts`                 | **Mismatch** — API chỉ lưu title/body/audience/schedule; không có channel field hoặc bằng chứng consumer xử lý segment/dispatch                |
| UF-06 | Tạo/sửa/xóa quy tắc gửi tự động                               | `.pen` đánh dấu automation chưa khả dụng; runtime có local mock              | Không có endpoint cho auto rules                    | **BLOCKED** — loại khỏi thao tác thật cho tới khi backend có capability                                                                        |
| UF-07 | Chỉnh cấu hình AI và gói dịch vụ                              | Runtime có form AI/plan mock; `.pen` có AI settings và Subscription Plans    | AI settings, subscription plans                     | **Mismatch** — có API; cần ánh xạ field và các giới hạn response/update theo backend                                                            |
| UF-08 | Xem/tạo/sửa/xóa danh mục hệ thống                              | `.pen` có Category List/Create/Edit/Delete trong Configuration             | Categories CRUD                                      | **Ready (design-backed)** — list hỗ trợ `page/pageSize/keyword/includeDeleted`, không có filter `isActive`                                   |
| UF-09 | Xem và lọc nhật ký kiểm toán                                  | `.pen` có Audit Log read-only trong Intelligence                            | `GET /api/v1/admin/audit-logs`                       | **Mismatch (design-backed)** — API có; `adminUsername` response thực tế là actor UUID, không phải tên hiển thị                               |

**Flow có bằng chứng thiết kế nhưng chưa có trong runtime:** Categories nằm trong Configuration; Audit Log nằm trong Intelligence. `.pen` xác nhận vị trí và màn hình, nên Categories được phân loại **Ready (design-backed)**, còn Audit là **Mismatch (design-backed)** do `adminUsername` hiện là actor UUID; UI cần ghi `Admin ID` hoặc placeholder cho tới khi backend cung cấp tên.

## 3. API Mapping

| FE action                | Backend endpoint và contract                                                                                                                                                                     | FE change / mismatch                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng nhập admin          | `POST /api/v1/auth/login`, body `{email,password}`; response có identity, `role`, `accessToken`, `refreshToken`                                                                                  | Thêm form/session; chỉ cho vào portal khi role là Admin                                                                                                                           |
| Làm mới phiên            | `POST /api/v1/auth/refresh`, body `{refreshToken}`; response chỉ có hai token                                                                                                                    | Thêm refresh/retry một lần cho 401; identity không được cấp lại từ response refresh                                                                                               |
| Dashboard                | `GET /api/v1/admin/dashboard`; `{summary, recentUsers, recentTransactions}`                                                                                                                      | `activeUsersLast30Days` và `bannedUsers` là số có nghĩa; `totalUsers` hiện đếm trạng thái `Active`, chỉ được hiển thị với nhãn đúng. Sáu counter 0, hai list rỗng và chart không được giả làm dữ liệu thật |
| Danh sách thành viên     | `GET /api/v1/admin/users?pageIndex&pageSize&status&keyword`; response `{data,pagination}`                                                                                                        | Đổi sang server paging/search/status; chuẩn hóa `userName` và shape pagination. API hiện không lọc theo role, nên có thể trả admin accounts                                       |
| Chi tiết thành viên      | `GET /api/v1/admin/users/:id`; object phẳng                                                                                                                                                      | `.pen` có màn chi tiết và confirm ban/bỏ ban; có bằng chứng UI để nối API, nhưng runtime page hiện chưa triển khai flow                                                          |
| Ban/bỏ ban               | `PATCH /api/v1/admin/users/:id/status`, body `{status,statusReason?}`                                                                                                                            | Chuẩn hóa response khác nhau giữa ban và unban; UI dùng `Banned`, không phải `Suspended`. Lỗi account không tồn tại hiện có thể thành 500                                         |
| Gửi broadcast            | `POST /api/v1/admin/broadcasts`, `{title,body,targetAudience?,scheduledAt?}`; tạo broadcast trả 201, trạng thái Queued                                                                           | Ánh xạ campaign name → title, message → body. Channel không có field tương ứng; audience free-text không chứng minh hỗ trợ segment theo gói                                       |
| Broadcast history        | `GET /api/v1/admin/broadcasts?pageIndex&pageSize&status`; response `{items,totalCount,page,pageSize,totalPages}`                                                                                 | Nối bảng lịch sử; chuẩn hóa pagination phẳng                                                                                                                                      |
| Đọc/cập nhật AI settings | `GET/PATCH /api/v1/admin/ai-settings`; GET trả modelName, systemPrompt, temperature, maxTokens, isEnabled, rebalanceThresholdPercent…; PATCH còn nhận `apiKeyEncrypted` | `.pen` chỉ rõ không hiển thị khóa bí mật. UI không hiển thị/ghi API key; GET không có `apiKeyMasked`. Không gửi key từ FE nếu chưa có contract mã hóa và quyết định bảo mật rõ ràng |
| Subscription plans       | `GET /api/v1/admin/subscriptions/plans` trả mảng raw, chỉ plan active; `POST` tạo plan; `PATCH /plans/:id` cập nhật một số field                                                                 | Form đang chia tier và nhiều chu kỳ giá; cần ánh xạ về `billingCycle`/plan thật. Backend update hiện không áp dụng `description` và `isPopular`; API list không trả plan inactive |
| Giao dịch admin          | Không thấy endpoint list giao dịch phù hợp                                                                                                                                                       | Không thể nối `Activity` vào API người dùng cá nhân mà không có contract admin phù hợp                                                                                            |
| Risk/churn/auto rules    | Không thấy admin endpoint phù hợp                                                                                                                                                                | Không thay bằng AI settings; đó là capability khác                                                                                                                                |

Categories có `GET/POST/PATCH/DELETE /api/v1/admin/categories`; Audit có `GET /api/v1/admin/audit-logs`. Cả hai có frame thiết kế trong `.pen`. Category list runtime nhận `page`, `pageSize`, `keyword`, `includeDeleted` (không nhận `isActive`); Audit nhận `page` cùng filter admin/action/entity/date. Lưu ý audit response trả `adminUsername` bằng actor UUID trong handler hiện tại.

## 4. Implementation Stages

### Stage 0 — Chốt contract và kiểm chứng thiết kế

#### Goal

Khóa bản đồ FE ↔ BE và xác minh các flow/UI chưa chứng minh được trước khi thêm màn hoặc thao tác mới.

#### Existing FE

Sáu page, `App.tsx`, `Sidebar.tsx`, `TopNav.tsx`; không có service/API layer.

#### Backend API

Các route được liệt kê ở phần API Mapping. Nguồn runtime chính là controller, DTO, handler và repository; tài liệu API admin nằm trong `WIVI_fe/ADMIN_INTEGRATION_PLAN.md`.

#### FE ↔ BE Flow

Đối chiếu từng control runtime và frame thiết kế → xác nhận API tương ứng → ghi mismatch/blocker. Đã kiểm tra trực tiếp `assets/admin_page_exe.pen`; danh sách frame gồm Admin Sign-in, Dashboard, Members/Member Details, Activity, Campaigns/Broadcasts, AI Settings, Audit Log, Categories và Subscription Plans.

#### Tasks

1. **Hoàn tất:** đọc `.pen` bằng Pencil MCP; dùng thiết kế làm bằng chứng flow mục tiêu, không xem mock như runtime.
2. **Đã chốt theo contract:** login role là `Admin` PascalCase; FE chỉ vào portal với role `Admin`. Lưu session trong một module `localStorage`; request 401 dùng một lần refresh single-flight; refresh lỗi thì xóa session. Logout luôn xóa local session; backend hiện không thu hồi token.
3. **Đã chốt:** chỉ trình bày `activeUsersLast30Days`, `bannedUsers` và `totalUsers` với nhãn đúng (`totalUsers` runtime đang đếm account Active). Sáu counter stub hiển thị `—`/chưa có dữ liệu; recent lists dùng empty state; chart không dùng số mẫu.
4. **Đã chốt mặc định an toàn theo API hiện có:** broadcast UI chỉ gửi `targetAudience: "All"` cho tới khi backend định nghĩa semantics của segment; ẩn channel vì API không có field tương ứng. Backend hiện chỉ lưu audience, tạo trạng thái `Queued` và phát event; chưa tìm thấy consumer fan-out, nên không tuyên bố đã gửi tới người nhận.
5. **Đã chốt theo `.pen`:** không hiển thị hay nhập API key AI. GET không trả key/masked key; dù PATCH runtime nhận `apiKeyEncrypted`, FE không có contract mã hóa key.
6. **Đã chốt:** giữ `/activity` và hiện trạng thái chưa khả dụng; không hiển thị các hàng giao dịch mẫu như dữ liệu thật. Risk/churn và auto rules cũng giữ ở trạng thái không khả dụng cho đến khi backend có API.
7. **Đã xác nhận thiết kế:** Categories thuộc Configuration, Audit Log thuộc Intelligence; đưa vào phạm vi triển khai ở stage tiếp theo sau khi bổ sung thứ tự/stage cụ thể.

#### Files affected

- Cập nhật tài liệu này để ghi kết quả Stage 0; không sửa code/backend hoặc thêm endpoint.
- Stage triển khai Categories/Audit cần được xếp cụ thể trước khi bắt đầu phần tương ứng.

#### Acceptance Criteria

- [x] Có bằng chứng thiết kế trong `.pen` cho các flow mục tiêu đã nêu.
- [x] Mỗi flow đã phân loại Ready, Mismatch, Blocked hoặc Unused trong inventory và migration matrix.
- [x] Không giả định API; channel, segments, transaction admin, risk/churn và auto rules được ghi nhận theo giới hạn backend.

### Stage 1 — API client và đăng nhập Admin

#### Goal

Thiết lập một đường HTTP và session dùng chung, chặn truy cập portal cho phiên không phải Admin.

#### Existing FE

Trước Stage 1: `App.tsx`, `main.tsx`, `TopNav.tsx`; lúc đó chưa có login page, auth guard, session hay API client. Hiện các phần nền này đã được triển khai.

#### Backend API

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

#### FE ↔ BE Flow

Admin nhập email/password → auth service gọi login → kiểm tra role → lưu session → render portal. Request nghiệp vụ gắn bearer token; 401 thử refresh token một lần; refresh thất bại thì xóa session và quay lại đăng nhập.

#### Tasks

1. [x] Thêm `VITE_API_BASE_URL` và API client dùng chung.
2. [x] Thêm type cho login/session và normalize lỗi `{code,message,field,details}`.
3. [x] Thêm session helper duy nhất chạm `localStorage`, AuthContext và login/guard.
4. [x] Thêm refresh single-flight; mỗi request được retry tối đa một lần.
5. [x] Kiểm tra vị trí logout theo UI/design. Chưa thêm nút logout vào shell vì các frame hiện có không xác nhận vị trí; auth context có logout action và luôn xóa session dù API lỗi.

#### Files affected

- Sửa: `src/App.tsx`, `src/main.tsx`, `src/components/TopNav.tsx`.
- Mới: `src/components/AppLayout.tsx`, `src/lib/api/client.ts`, `src/lib/session.ts`, `src/services/auth.ts`, `src/types/admin.ts`, `src/context/AuthProvider.tsx`, `src/context/auth-context.ts`, `src/pages/Login.tsx`, `src/pages/NotFound.tsx`, `src/hooks/useAuth.ts`.
- Cấu hình: `.env.example` (chỉ chứa địa chỉ API local, không chứa secret; `.env` không đưa vào git).

#### Acceptance Criteria

- [x] User không phải Admin không vào được route admin; role được so sánh chính xác với `Admin` theo quyết định Stage 0 và login runtime.
- [x] API client tự gắn Bearer access token cho request xác thực.
- [x] **Code có**: 401 thử refresh một lần, retry request tối đa một lần; refresh thất bại ⇒ xoá session và về đăng nhập. ⚠️ **Chưa kiểm chứng runtime** (`D-3`): Stage 1 chưa có request xác thực nào phát từ UI nên không tạo được 401 để chạy qua nhánh refresh — `TC-AUTH-41..43` chừa cho Stage 2 (test plan §7).
- [x] Token chỉ được đọc/ghi/xóa qua `src/lib/session.ts`, không lưu trong page/component.
- [x] Logout luôn xoá session local kể cả khi API trả 401 (`TC-AUTH-51 @real`), và request logout gắn `Authorization: Bearer` (`TC-AUTH-52 @real`).
- [ ] Nút logout trong shell portal — **chưa có**; hiện chỉ logout được từ banner `login-denied` ở `/login` (`src/pages/Login.tsx:92`). Design chưa xác nhận vị trí (task 5).

### Stage 2 — Quản lý danh sách thành viên và trạng thái

#### Goal

Thay mock list bằng truy vấn phân trang, tìm kiếm và trạng thái từ server.

#### Existing FE

`src/pages/Members.tsx`: bảng mock, search/filter local, filter plan, status, nút Xem và Xóa.

#### Backend API

- `GET /api/v1/admin/users?pageIndex&pageSize&status&keyword`
- `GET /api/v1/admin/users/:id`
- `PATCH /api/v1/admin/users/:id/status`

#### FE ↔ BE Flow

Mở Members → request trang đầu → render data/pagination → đổi search/status/page → query server → bảng cập nhật. Ban/unban → xác nhận → PATCH với status/reason → refetch list.

#### Tasks

1. [x] Khai báo DTO response; map `userName`, `status`, timestamps.
2. [x] Thay search/filter local bằng `keyword/status` server-side; debounce search 350 ms.
3. [x] Xử lý `Active`/`Banned`; thay mapping `Suspended` sai contract.
4. [x] Kết nối paging; không giả lập total/page ở client.
5. [x] Nút Xem gọi detail khi flow detail đã có UI được xác nhận.
6. [x] Ban/unban dùng confirm và refetch; xử lý shape response khác nhau.

#### Files affected

- Sửa: `src/pages/Members.tsx`, `src/lib/api/client.ts` (nhận diện `AbortError` để bỏ qua response cũ), `src/types/admin.ts`.
- Mới: `src/services/adminUsers.ts`, `src/lib/format.ts`, `src/components/ui/*` (Badge, Button, SectionCard, SearchInput, EmptyState, DataTable, Modal — theo đặc tả `DESIGN_SYSTEM.md` §8.5), `e2e/fixtures/members.ts`, `e2e/members/*.spec.ts`.

#### Ghi chú triển khai (quyết định đã chốt khi code)

> Đặc tả đầy đủ + test plan + sổ drift của stage này nằm ở [`../spec/members/README.md`](../spec/members/README.md).

- **Không có API xoá user.** Đã kiểm tra `admin.controller.ts`: chỉ có `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`. Không có `DELETE`, không có soft-delete, và `AccountStatus` chỉ có `Active`/`Banned` (không có `Inactive`/`Disabled`). Vì vậy nút "Xoá" cũ được thay bằng "Cấm tài khoản"/"Bỏ cấm tài khoản" và chỉ gửi status đích tường minh.
- **Không thêm filter role.** Runtime không trả và không lọc `role` trong `/admin/users` (đúng như §7 MISMATCH), UI Stage 2 cũng không có yêu cầu filter role. Giữ nguyên contract; bổ sung role vào response + query server-side là follow-up backend riêng nếu sản phẩm cần.
- **Bỏ cột gói/quota/Sepay.** Không có admin API trả subscription, AI quota hay Sepay usage theo từng user (`TokenQuotaService` chỉ giữ usage trong memory, limit đọc từ env backend) ⇒ các cột này bị bỏ khỏi bảng, không map số mock thành dữ liệu thật.
- **Không patch list từ response mutation.** `ban` trả `{id,username,firstName,lastName,email,phone,status,statusReason}`, `unban` trả `{id,username,status,statusReason}` — khác shape, nên sau PATCH luôn refetch list và detail đang mở.
- **500 khi ban/unban = bản ghi đã cũ.** Handler ném `Error('Account not found')` ⇒ 500; FE đóng dialog, cảnh báo và refetch thay vì hiển thị lỗi thô.
- **Clamp page.** Backend không clamp `pageIndex` theo `totalPages`; khi `pageIndex > totalPages`, FE chuyển URL về trang cuối rồi refetch.

#### Acceptance Criteria

- [x] Paging/search/status lấy dữ liệu server.
- [x] Empty, loading, error và mutation states phân biệt được.
- [x] Filter plan không được hiển thị như filter backend nếu không có API hỗ trợ.
- [x] Banned/Active phản ánh đúng response.

### Stage 3 — Broadcast thủ công

#### Goal

Nối phần soạn broadcast và lịch sử với API hiện có. Giữ `targetAudience` ở `All` và ẩn channel/segment cho tới khi backend định nghĩa và thực thi contract tương ứng.

#### Existing FE

`src/pages/Campaigns.tsx`: tab thủ công/tự động, form gồm channel, tên, nội dung, segment; bảng log mock; auto rules local.

#### Backend API

`GET/POST /api/v1/admin/broadcasts`; backend hỗ trợ title, body, targetAudience, scheduledAt. POST tạo trạng thái Queued; không có field channel.

#### FE ↔ BE Flow

Mở Campaigns → lấy broadcast list → soạn nội dung → POST → nhận Queued → refetch list. Không được báo “đã gửi” như thành công phát đến người nhận khi backend chỉ xác nhận đã queue.

#### Tasks

1. Ánh xạ form field có tương ứng trực tiếp.
2. Chỉ gửi `targetAudience: "All"`; không gửi channel hay segment vì backend hiện chỉ lưu chuỗi audience, không có consumer phân phối theo nhóm.
3. Nối status/pagination của bảng lịch sử.
4. Thêm submit/loading/error/success; refetch sau create.
5. Giữ auto rules ở trạng thái BLOCKED cho tới khi có API.

#### Files affected

- Sửa: `src/pages/Campaigns.tsx`.
- Mới: `src/services/adminBroadcasts.ts`, cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] Broadcast tạo mới hiển thị theo response backend và trạng thái Queued.
- [ ] Không hiển thị auto rule như đã lưu hoặc đã kích hoạt.
- [ ] Không có channel hoặc segment selector; `targetAudience` dùng mặc định `All` cho tới khi backend định nghĩa và thực thi targeting.

### Stage 4 — Cấu hình AI

#### Goal

Đọc và lưu đúng AI settings mà backend sở hữu.

#### Existing FE

`src/pages/Configuration.tsx`: model type, learning rate, aggregation interval, auto suspend và các trường local.

#### Backend API

`GET/PATCH /api/v1/admin/ai-settings`. PATCH cho phép `modelName`, `systemPrompt`, `temperature`, `maxTokens`, `isEnabled`, `rebalanceThresholdPercent` và `apiKeyEncrypted`.

#### FE ↔ BE Flow

Mở cấu hình AI → GET → điền form có field tương ứng → PATCH → refetch → UI hiển thị response đã lưu.

#### Tasks

1. Thay mock field bằng field backend thực sự có.
2. Giữ nguyên các field chưa có mapping trong trạng thái chưa nối; không ánh xạ học-rate sang temperature nếu nghiệp vụ chưa xác nhận.
3. Không thêm control nhập key: `.pen` không thiết kế control này, GET không trả masked key và FE chưa có contract để tạo `apiKeyEncrypted` hợp lệ.
4. Xử lý GET 404 khi chưa có settings và trạng thái save.
5. Tách phần subscription plan ra stage riêng.

#### Files affected

- Sửa: `src/pages/Configuration.tsx`.
- Mới: `src/services/adminAiSettings.ts`; cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] Các field gửi đi đúng DTO và validation backend.
- [ ] Sau lưu, GET trả lại giá trị đã lưu.
- [ ] Không hiển thị API key giả lập/masked nếu backend không trả.

### Stage 5 — Subscription plans

#### Goal

Hiển thị và chỉnh sửa các plan theo model backend, không theo các giá mock hiện tại.

#### Existing FE

`Configuration.tsx`: ba tier, nhiều kỳ hạn và quota/SePay fields; hiện lưu local, nút chỉ alert.

#### Backend API

- `GET /api/v1/admin/subscriptions/plans`: chỉ plan active, mảng raw.
- `POST /api/v1/admin/subscriptions/plans`: cần `code`, `name`, `price`, `billingCycle`; có thể nhận description/features/isPopular.
- `PATCH /api/v1/admin/subscriptions/plans/:id`: một số field được nhận nhưng handler chỉ áp dụng name/price/features/isActive.

#### FE ↔ BE Flow

Mở plan settings → GET active plans → render bảng → tạo hoặc sửa → POST/PATCH → refetch. Không có dữ liệu để giả định các mức giá tháng/6 tháng/năm hiện tại map một-một thành plan.

#### Tasks

1. Thay form tier hard-code bằng dữ liệu plan.
2. Chốt UX cho billingCycle, create và field chỉ đọc.
3. Không kỳ vọng update description/isPopular có tác dụng trước khi backend hỗ trợ.
4. Phân biệt active-only list với nhu cầu quản trị plan inactive.

#### Files affected

- Sửa: `src/pages/Configuration.tsx`.
- Mới: `src/services/adminPlans.ts`; cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] List phản ánh đúng active plans backend trả về.
- [ ] Không báo cập nhật thành công cho field backend bỏ qua.
- [ ] Giá, kỳ hạn và features map đúng từng plan.

### Stage 6 — Dashboard có dữ liệu thật

#### Goal

Thay các mock KPI/list bằng dữ liệu dashboard nhưng trình bày trung thực phần backend còn stub.

#### Existing FE

`src/pages/Overview.tsx`: KPI, hai chart và ba danh sách mock.

#### Backend API

`GET /api/v1/admin/dashboard`; handler hiện chỉ tính tổng user theo trạng thái, active 30 ngày, banned. Sáu counter khác trả `0`; `recentUsers` và `recentTransactions` trả mảng rỗng.

#### FE ↔ BE Flow

Mở Overview → GET dashboard → map summary → render các số thật và empty list. Không diễn giải zero stub thành số đo thực tế.

#### Tasks

1. Thêm DTO dashboard và service.
2. Phân biệt counter có dữ liệu với counter stub; dùng placeholder/nhãn phù hợp đã thống nhất.
3. Hiển thị empty state cho hai list.
4. Không gán dashboard response vào biểu đồ mock vì API không trả chuỗi thời gian.

#### Files affected

- Sửa: `src/pages/Overview.tsx`.
- Mới: `src/services/adminDashboard.ts`; cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] Số có nguồn backend hiển thị đúng.
- [ ] Counter stub không được trình bày như số liệu vận hành thật.
- [ ] Không còn mock list/chart mang nhãn dữ liệu thực.

## 5. State Map

State nên ở page cho filter/form/dialog; server response và loading/error theo request ở hook/page; session và identity ở AuthContext. Không cần store library. URL/query params là source of truth cho `keyword`, `status`, `pageIndex`, `pageSize` của list (Stage 2 đã áp dụng cho `/members`); các page khác chưa dùng URL state.

| Flow                             | State sau tích hợp                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth                             | `idle → submitting → success/Admin route`; nhánh sai role, credential lỗi, server error; refresh `retrying → success` hoặc session cleared |
| Users                            | `idle → loading → success/empty`; refetch giữ dữ liệu cũ và báo busy; lỗi initial/refetch; mutation `confirm → pending → refetch` hoặc lỗi |
| Broadcast                        | `loading → list/empty`; form local/validation; mutation pending → Queued + refetch hoặc lỗi                                                |
| AI settings                      | loading → loaded; 404 “chưa cấu hình” nếu được xác định; form dirty là derived từ values; save pending → refetch hoặc lỗi                  |
| Plans                            | loading → active plans/empty; form create/edit local; mutation pending → refetch hoặc lỗi                                                  |
| Dashboard                        | loading → summary; empty recent lists; API error; không có mutation                                                                        |
| Activity, risk/churn, auto rules | Không thể xác định success state từ API hiện có; giữ là BLOCKED                                                                            |

## 6. Mock → Real API Migration Matrix

| Mock source                         | Current use                | Real API                                   | Migration action                                         | Status           |
| ----------------------------------- | -------------------------- | ------------------------------------------ | -------------------------------------------------------- | ---------------- |
| `Overview.tsx` KPI                  | Hằng số local              | Admin dashboard                            | Nối summary, đánh dấu stubbed counters                   | Mismatch         |
| `Overview.tsx` charts/lists         | Mảng dữ liệu cục bộ        | Không có time-series; list API hiện rỗng   | Không map giả; chờ capability/backend data               | Blocked/Mismatch |
| `Members.tsx` users/search/status   | Hằng số và lọc client      | Users list/detail/status                   | Server query, normalize field/status/pagination          | **Đã migrate (Stage 2)** |
| `Members.tsx` plan filter           | Giá trị local              | Không có subscription info trên users list | Không giữ như filter thật khi chưa có API                | **Đã bỏ filter + cột gói/quota/Sepay (Stage 2)** |
| `Activity.tsx` transactions/charts  | Mảng cục bộ                | Không thấy admin transactions API          | Cần backend endpoint phù hợp                             | Blocked          |
| `Intelligence.tsx` risk/churn/chart | Mảng cục bộ                | Không có risk/churn admin API              | Cần backend capability hoặc quyết định bỏ flow           | Blocked          |
| `Campaigns.tsx` manual/history      | Mảng + local form          | Admin broadcasts GET/POST                  | Nối list/create; giải quyết channel/audience             | Mismatch         |
| `Campaigns.tsx` auto rules          | State local, alert/confirm | Không có API                               | Không thể migrate                                        | Blocked          |
| `Configuration.tsx` AI fields       | Local fields và alert      | Admin AI settings GET/PATCH                | Thay bằng contract backend                               | Mismatch         |
| `Configuration.tsx` plan fields     | Local fields và alert      | Admin subscription plans GET/POST/PATCH    | Chuyển sang dữ liệu plan và chốt billing model           | Mismatch         |
| Categories (Configuration)         | `.pen` có list/create/edit/delete screens | Categories CRUD                    | Nối list/CRUD; map pagination/search; list không nhận `isActive` filter | Ready (design-backed) |
| Audit logs (Intelligence)          | `.pen` có read-only list/filter screen | Audit GET                                 | Nối filters; `adminUsername` thực tế là actor UUID       | Mismatch (design-backed) |

## 7. Blockers / Mismatches

### BLOCKED

- **Giao dịch:** FE có flow bảng/tra cứu giao dịch; chưa tìm thấy admin list API tương ứng.
- **Quy tắc gửi tự động:** có create/edit/delete/toggle local nhưng không có endpoint backend.
- **Risk/churn:** UI intelligence có dữ liệu mock; các endpoint AI hiện có không trả dữ liệu đó.
- **Biểu đồ dashboard:** endpoint dashboard không trả chuỗi thời gian.
- **Gửi broadcast tới audience:** API nhận và lưu chuỗi audience nhưng chưa thấy consumer fan-out; queued không chứng minh đã phát tin.

### MISMATCH

- Dashboard trả sáu trường placeholder (`0`) và danh sách rỗng; `totalUsers` đang đếm account Active nên cần nhãn đúng hoặc backend sửa.
- Users endpoint không lọc role, nên admin account cũng có thể xuất hiện.
- UI dùng `Suspended`, API dùng `Banned`; filter gói trong UI không có nguồn dữ liệu.
- Broadcast API không nhận channel; audience chỉ được lưu và event được phát, chưa thấy consumer phân phối theo segment.
- AI settings UI mục tiêu `.pen` không hiển thị khóa; GET không trả key/masked key, PATCH runtime nhận `apiKeyEncrypted` nhưng FE chưa có cách tạo payload hợp lệ.
- Plan API chỉ list active; một số field nhận ở update nhưng chưa được áp dụng.
- UI báo gửi campaign thành công trong khi backend chỉ tạo broadcast Queued, không chứng minh đã gửi tới người nhận.

### NEEDS CLARIFICATION

- Nếu sản phẩm cần channel hoặc segment broadcast, backend cần bổ sung contract và consumer trước khi bật các lựa chọn này.
- Nếu sản phẩm cần xoay AI provider key, cần contract write-only/mã hóa được xác định; thiết kế hiện tại không có control nhập key.
- Ba nhóm giá hiện tại là ba plan riêng, nhiều billing cycle hay chỉ dữ liệu minh họa?

## 8. Recommended Implementation Order

1. Stage 0 — **hoàn tất** kiểm chứng thiết kế và chốt các mặc định ghi ở trên.
2. Stage 1 — **hoàn tất** API client/session/auth làm nền cho mọi request.
3. Stage 2 — **hoàn tất**: Users là flow có API tương đối đầy đủ.
4. Stage 3 — Broadcast thủ công với audience `All`; channel/segment chỉ bật sau khi backend có contract và consumer.
5. Stage 4 — AI settings theo field contract thực.
6. Stage 5 — Subscription plans sau khi làm rõ mô hình kỳ hạn và field update.
7. Stage 6 — Dashboard sau khi thống nhất cách trình bày stub; có thể triển khai wiring trước, nhưng không coi dashboard hoàn tất nghiệp vụ cho tới khi backend trả dữ liệu đầy đủ.

Activity giữ route với trạng thái chưa khả dụng; risk/churn và auto rules chưa nối vì thiếu backend capability. Categories và Audit đã có thiết kế, cần được xếp thành stage trước khi triển khai. Stage 1 đã chạy `pnpm lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.node.json --noEmit` và `pnpm build`; tất cả pass. Build phát cảnh báo bundle JS lớn hơn 500 kB. **Cập nhật 2026-10-07:** đăng nhập đã được xác nhận với backend runtime — suite `@real` (`pnpm run test:e2e:real`, 22 test) login thật và assert status thật (200/401/422) bằng account seed trong `.env.test`.
