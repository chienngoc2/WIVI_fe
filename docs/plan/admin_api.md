# Admin FE ↔ BE Integration Plan

**Trạng thái Stage 0:** Hoàn tất kiểm tra contract và thiết kế ngày 2026-10-05. Pencil MCP đã mở và đọc được `assets/admin_page_exe.pen`; không có thay đổi code. Repo có thay đổi chưa commit từ trước, được giữ nguyên.

**Trạng thái triển khai Stage 2:** hoàn tất. `/members` đã bỏ mock và chạy bằng backend thật (`GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`); search/status/pagination đều server-side và nằm trên URL search params. Đã chạy `pnpm lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.node.json --noEmit`, `pnpm build` (pass; build còn cảnh báo bundle JS > 500 kB như trước). E2E mới trong `e2e/members/*`: **5 test `@real` chỉ đọc đã chạy pass** với backend thật + admin/user seed (list query params, debounce keyword, status filter, pagination, detail) và **6 test `@stub` đã chạy pass** (empty tự nhiên, rỗng-do-filter, error + retry, PATCH pending, PATCH 500 stale, detail lỗi). Riêng `TC-MEM-06 @real` (cấm → refetch → bỏ cấm account seed) chưa chạy trọn vẹn theo yêu cầu vì nó đổi trạng thái account trên DB dùng chung; chạy một phần đã đi hết nhánh cấm thành công. Chi tiết quyết định ở §"Stage 2 — Ghi chú triển khai".

**Trạng thái hiện tại (đối chiếu source ngày 2026-10-07):** Stage 1 và 2 đã có code cùng test Playwright; Stage 3–6 đã có code FE trong working tree nhưng **chưa đạt toàn bộ acceptance criteria** và chưa có test UI riêng. `/members`, `/campaigns` (broadcast thủ công), `/configuration` (AI settings, plans) và `/` (dashboard) đều đã gọi service API. `/activity` và `/intelligence` vẫn hiển thị dữ liệu mẫu. Chi tiết lỗi/giới hạn của Stage 3–6 nằm ở từng stage và §7. Các file source Stage 3–6 đang là thay đổi chưa commit; không xem tài liệu này là bằng chứng chúng đã được deploy.

**Kiểm chứng:** `pnpm lint`, `npx tsc -p tsconfig.app.json --noEmit` và `npx tsc -p tsconfig.node.json --noEmit` pass khi review source ngày 2026-10-07. Bản tổng kết implement báo `pnpm build` pass nhưng lượt review docs này không xác minh lại build; các test `e2e/` hiện chỉ phủ auth và Members. Kết quả test Stage 1–2 trong tài liệu spec là kết quả lịch sử, không đại diện cho Stage 3–6.

**Bằng chứng thiết kế:** kiểm tra trực tiếp các frame đăng nhập, Dashboard, Members và chi tiết/trạng thái thành viên, Activity, Broadcast list/compose/review, AI settings, Audit log, Categories và Subscription plans. Các màn mẫu vẫn là prototype; sự tồn tại trong `.pen` chứng minh flow/UI mục tiêu, không chứng minh dữ liệu hay hành vi đã nối backend.

**Giới hạn runtime:** các kết luận về hành vi hiện tại lấy từ code và test/backend handler. `.pen` là bằng chứng cho UI mục tiêu, không thay thế contract API.

## 1. Current Architecture Summary

### Frontend

`WIVI_fe` là React/Vite/TypeScript. [App.tsx](F:/study/EXE/WIVI_fe/src/App.tsx) khai báo `/login` công khai, sáu route quản trị lồng trong Admin guard và route 404 nằm trong shell. [main.tsx](F:/study/EXE/WIVI_fe/src/main.tsx) bọc ứng dụng bằng `AuthProvider`; `AppLayout` sở hữu shell; [Sidebar.tsx](F:/study/EXE/WIVI_fe/src/components/Sidebar.tsx) chứa sáu mục điều hướng.

`src/lib/api/client.ts` là HTTP client dùng chung; `src/services/` chứa auth, users, broadcasts, AI settings, plans và dashboard; `src/lib/session.ts` là nơi duy nhất chạm `localStorage`; `AuthContext` giữ phiên và danh tính. Members gọi API thật. Campaigns, Configuration và Overview có request thật nhưng còn lỗi/giới hạn ở §4 và §7. Activity và Intelligence vẫn là trang dữ liệu mẫu. `TopNav` lấy danh tính từ session; search, ticker và chuông vẫn là UI tĩnh.

### Backend

Backend NestJS có prefix `/api/v1`. Các route admin được bảo vệ bằng JWT và role `Admin`. Đăng nhập dùng chung `POST /api/v1/auth/login`; không có endpoint đăng nhập admin riêng. Refresh trả token mới; logout hiện chỉ trả thông báo, không thu hồi token ở server.

Các API admin tương ứng một phần giao diện:

- Users, dashboard, audit logs: `modules/admin/interface/http/admin.controller.ts`
- Categories: `modules/category/interface/http/admin-category.controller.ts`
- Broadcasts: `modules/notification/interface/http/notification.controller.ts`
- AI settings: `modules/ai/interface/http/admin-ai.controller.ts`
- Subscription plans: `modules/subscription/interface/http/admin-subscription.controller.ts`

Backend API và handler là nguồn để xác nhận contract; [ADMIN_INTEGRATION_PLAN.md](F:/study/EXE/WIVI_fe/ADMIN_INTEGRATION_PLAN.md) hữu ích làm bản đồ nhưng có nội dung kế hoạch chưa phải bằng chứng UI đã tồn tại.

### Mock còn lại và ranh giới API

Mock nghiệp vụ còn ở `Activity.tsx`, `Intelligence.tsx` và tab auto rules của `Campaigns.tsx`. Tab auto rules hiện vẫn cho tạo/sửa/xóa/bật tắt local, dù backend không có API. Các luồng auth, Members, broadcast thủ công, AI settings, plans và dashboard đã có lời gọi HTTP; có lời gọi HTTP **không đồng nghĩa** flow đã đúng contract hoặc đã được kiểm chứng end-to-end.

> **Phân biệt hai loại mock** (dễ nhầm khi đọc trạng thái):
>
> | Loại | Vị trí | Trạng thái |
> | --- | --- | --- |
> | **Mock nghiệp vụ trong page** (dữ liệu giả của app) | `Activity.tsx`, `Intelligence.tsx`, auto rules trong `Campaigns.tsx` | Vẫn tồn tại; không có admin API tương ứng |
> | **Stub HTTP của e2e** (`page.route`) | `e2e/fixtures/` và các test `@stub` | Chỉ dùng để kiểm nhánh khó tạo với backend thật; không phải dữ liệu app |
>
> FE đã gọi users, dashboard, broadcasts, plans và AI settings. Categories và audit logs có API backend nhưng FE chưa nối.

Các phần nền gồm `src/lib/api/client.ts`, `src/lib/session.ts`, `src/lib/format.ts`, `src/types/admin.ts`, `src/context/`, `src/hooks/useAuth.ts` và các primitive trong `src/components/ui/`. Service nghiệp vụ đã có cho users, broadcasts, AI settings, plans và dashboard; chưa có `adminCategories.ts` và `adminAuditLogs.ts`.

## 2. Admin User-flow Inventory

| ID    | Flow runtime hoặc mục tiêu trong thiết kế                      | FE evidence                                                                  | Backend API                                         | Trạng thái                                                                                                                                      |
| ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| UF-01 | Mở trang Tổng quan và xem KPI, biểu đồ, danh sách             | `pages/Overview.tsx` đã gọi API; prototype có các frame dashboard trong `.pen` | `GET /api/v1/admin/dashboard`                     | **Đã nối FE, backend còn stub** — 3 counter có dữ liệu; `totalUsers` đếm account `Active`; 6 counter cố định `0`, hai danh sách cố định rỗng, không có API time-series |
| UF-02 | Tìm/lọc thành viên, xem chi tiết, ban/bỏ ban                 | `pages/Members.tsx` đã dùng API; `.pen` có list/detail/confirm/success flows  | list, detail, status ở `/api/v1/admin/users`        | **Đã nối Stage 2** — server paging/search/status; filter gói và trạng thái `Suspended` đã bỏ; test mutation thật chưa chạy trọn vẹn |
| UF-03 | Xem nhật ký giao dịch, chuyển Spending/Subscription, tìm kiếm | `.pen` có Activity/Ledger; `Activity.tsx` vẫn render giao dịch/chart mẫu      | Không có admin transaction-list API                 | **BLOCKED, FE chưa sửa đúng mục tiêu Stage 0** — route còn hiển thị dữ liệu mẫu như số liệu vận hành; cần trạng thái chưa khả dụng rõ ràng        |
| UF-04 | Xem risk/churn và chỉ số hành vi AI                            | `.pen` có risk/churn lists và chart; runtime dùng dữ liệu mẫu               | Không có API admin cho risk/churn/time-series       | **BLOCKED** — không thay bằng AI settings API; các chỉ số trong prototype không có nguồn backend                                           |
| UF-05 | Soạn broadcast thủ công và xem lịch sử                       | `Campaigns.tsx` đã gọi GET/POST; không có UI lên lịch dù API nhận `scheduledAt` | `GET/POST /api/v1/admin/broadcasts`               | **Đã nối FE nhưng list lỗi contract** — service kỳ vọng `pagination` lồng; backend trả phẳng. POST chỉ tạo `Queued`; không có channel/segment hoặc bằng chứng đã phân phối |
| UF-06 | Tạo/sửa/xóa quy tắc gửi tự động                               | Tab auto rules còn dữ liệu và thao tác local                                  | Không có endpoint cho auto rules                    | **BLOCKED** — UI ghi mock nhưng vẫn hiển thị số “Đang chạy” và cho thao tác; cần xử lý theo Stage 3 AC |
| UF-07 | Chỉnh cấu hình AI và gói dịch vụ                              | `Configuration.tsx` đã gọi API cho cả hai panel                              | AI settings, subscription plans                     | **Đã nối FE, còn sai hành vi** — AI form submit thiếu `preventDefault`, ngưỡng rebalance không được gửi; plan update gửi field handler bỏ qua |
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
| Chi tiết thành viên      | `GET /api/v1/admin/users/:id`; object phẳng                                                                                                                                                      | `Members.tsx` đã có modal chi tiết và gọi API; test đọc backend thật đã pass theo spec Stage 2                                                                                   |
| Ban/bỏ ban               | `PATCH /api/v1/admin/users/:id/status`, body `{status,statusReason?}`                                                                                                                            | Chuẩn hóa response khác nhau giữa ban và unban; UI dùng `Banned`, không phải `Suspended`. Lỗi account không tồn tại hiện có thể thành 500                                         |
| Gửi broadcast            | `POST /api/v1/admin/broadcasts`, `{title,body,targetAudience?,scheduledAt?}`; tạo broadcast trả 201, trạng thái Queued                                                                           | Ánh xạ campaign name → title, message → body. Channel không có field tương ứng; audience free-text không chứng minh hỗ trợ segment theo gói                                       |
| Broadcast history        | `GET /api/v1/admin/broadcasts?pageIndex&pageSize&status`; handler trả `PaginatedResult` với field riêng `{items,totalCount,page,pageSize}` và getter `totalPages` | `adminBroadcasts.ts` hiện đọc sai `response.pagination`. Getter `totalPages` ở prototype có thể không được JSON serialize; cần kiểm response HTTP thật hoặc tính từ `totalCount/pageSize` |
| Đọc/cập nhật AI settings | `GET/PATCH /api/v1/admin/ai-settings`; GET trả modelName, systemPrompt, temperature, maxTokens, isEnabled, rebalanceThresholdPercent…; PATCH còn nhận `apiKeyEncrypted` | `.pen` chỉ rõ không hiển thị khóa bí mật. UI không hiển thị/ghi API key; GET không có `apiKeyMasked`. Không gửi key từ FE nếu chưa có contract mã hóa và quyết định bảo mật rõ ràng |
| Subscription plans       | `GET /api/v1/admin/subscriptions/plans` trả mảng raw, chỉ plan active; `POST` tạo plan; `PATCH /plans/:id` cập nhật một số field                                                                 | FE đã thay tier mock bằng plan API; sửa plan vẫn gửi `description`/`isPopular` dù handler bỏ qua; plan inactive không hiện để kích hoạt lại                                       |
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
- [x] **Code có**: 401 thử refresh một lần, retry request tối đa một lần; refresh thất bại ⇒ xoá session và về đăng nhập. ⚠️ **Chưa kiểm chứng qua UI**: Stage 2 đã có request xác thực nhưng test chưa kích hoạt nhánh refresh-on-401; xem `docs/spec/members/README.md` §6 và `G-MEM-5`.
- [x] Token chỉ được đọc/ghi/xóa qua `src/lib/session.ts`, không lưu trong page/component.
- [x] Logout luôn xoá session local kể cả khi API trả 401 (`TC-AUTH-51 @real`), và request logout gắn `Authorization: Bearer` (`TC-AUTH-52 @real`).
- [ ] Nút logout trong shell portal — **chưa có**; hiện chỉ logout được từ banner `login-denied` ở `/login` (`src/pages/Login.tsx:92`). Design chưa xác nhận vị trí (task 5).

### Stage 2 — Quản lý danh sách thành viên và trạng thái

#### Goal

Thay mock list bằng truy vấn phân trang, tìm kiếm và trạng thái từ server.

#### Existing FE

Trước Stage 2: `Members.tsx` dùng bảng mock, search/filter local, filter plan và nút Xóa. Hiện đã thay bằng list/detail/status API như phần Tasks bên dưới.

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

Trước Stage 3: `Campaigns.tsx` có form channel/segment và bảng log mock. Hiện tab thủ công đã gọi GET/POST; tab auto rules vẫn có dữ liệu và thao tác local.

#### Backend API

`GET/POST /api/v1/admin/broadcasts`; backend hỗ trợ title, body, targetAudience, scheduledAt. POST tạo trạng thái Queued; không có field channel.

#### FE ↔ BE Flow

Mở Campaigns → lấy broadcast list → soạn nội dung → POST → nhận Queued → refetch list. Không được báo “đã gửi” như thành công phát đến người nhận khi backend chỉ xác nhận đã queue.

#### Tasks

1. [x] Form thủ công map `campaignName → title`, `message → body`; POST với `scheduledAt: null` (UI chưa có lịch gửi).
2. [x] Chỉ gửi `targetAudience: "All"`; không có channel/segment selector trong tab thủ công.
3. [ ] Sửa `adminBroadcasts.ts`: handler trả phân trang **phẳng**, còn service đọc `response.pagination`. `totalPages` chỉ là getter của `PaginatedResult`, không phải field own; cần kiểm response HTTP thật trước khi đưa vào type hoặc tính từ `totalCount/pageSize`.
4. [ ] Có loading/error/pending/success và refetch sau create trong source; cần test UI và backend sau khi sửa task 3. Thông báo chỉ nói tạo `Queued`, không nói đã gửi.
5. [ ] Tab auto rules vẫn cho thêm/sửa/xóa/bật tắt local và ghi số “Đang chạy”; các nhãn mock chưa đáp ứng tiêu chí không trình bày rule như đã kích hoạt.

#### Files affected

- Sửa: `src/pages/Campaigns.tsx`.
- Mới: `src/services/adminBroadcasts.ts`, cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] List và create chạy với response backend thật; tạo mới hiện `Queued` sau refetch. Chưa có test Stage 3 và list đang đọc sai envelope.
- [ ] Auto rules không bị hiểu là đã lưu hoặc kích hoạt trên server; UI hiện vẫn có thao tác local và số “Đang chạy”.
- [x] Tab thủ công không có channel/segment selector và POST gửi `targetAudience: "All"` (đối chiếu source; chưa test UI Stage 3).

### Stage 4 — Cấu hình AI

#### Goal

Đọc và lưu đúng AI settings mà backend sở hữu.

#### Existing FE

Trước Stage 4: `Configuration.tsx` dùng field AI local khác DTO backend. Hiện form đã dùng các field backend và gọi GET/PATCH.

#### Backend API

`GET/PATCH /api/v1/admin/ai-settings`. PATCH cho phép `modelName`, `systemPrompt`, `temperature`, `maxTokens`, `isEnabled`, `rebalanceThresholdPercent` và `apiKeyEncrypted`.

#### FE ↔ BE Flow

Mở cấu hình AI → GET → điền form có field tương ứng → PATCH → refetch → UI hiển thị response đã lưu.

#### Tasks

1. [x] Form đã thay field mock bằng `modelName`, `systemPrompt`, `temperature`, `maxTokens`, `isEnabled`, `rebalanceThresholdPercent`.
2. [ ] `handleAiSave` được gắn vào `<form onSubmit>` nhưng không gọi `preventDefault()`; submit có thể tải lại trang trước khi request/refetch hoàn tất.
3. [ ] `rebalanceThresholdPercent` cho nhập nhưng không nằm trong payload PATCH; backend DTO thực tế **cho phép** field này (`@Min(1)`, `@Max(100)`). Type FE hiện ghi sai rằng field không PATCH được.
4. [x] Không có control nhập API key; GET không trả masked key. Source có nhánh GET 404 và gọi refetch sau PATCH, nhưng chưa có test UI Stage 4.
5. [x] Panel plan dùng service riêng và được theo dõi ở Stage 5.

#### Files affected

- Sửa: `src/pages/Configuration.tsx`.
- Mới: `src/services/adminAiSettings.ts`; cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] Submit không reload trang; mọi field cho sửa phải được PATCH hoặc hiển thị read-only; giá trị được GET xác nhận sau lưu.
- [ ] Validation form khớp DTO backend, gồm `temperature` 0–2, `maxTokens` 1–32768, `rebalanceThresholdPercent` 1–100.
- [x] Không hiển thị API key giả lập/masked (đối chiếu source; chưa test UI Stage 4).

### Stage 5 — Subscription plans

#### Goal

Hiển thị và chỉnh sửa các plan theo model backend, không theo các giá mock hiện tại.

#### Existing FE

Trước Stage 5: `Configuration.tsx` có ba tier hard-code và nút alert. Hiện có bảng active plans từ GET và form create/edit.

#### Backend API

- `GET /api/v1/admin/subscriptions/plans`: chỉ plan active, mảng raw.
- `POST /api/v1/admin/subscriptions/plans`: cần `code`, `name`, `price`, `billingCycle`; có thể nhận description/features/isPopular.
- `PATCH /api/v1/admin/subscriptions/plans/:id`: một số field được nhận nhưng handler chỉ áp dụng name/price/features/isActive.

#### FE ↔ BE Flow

Mở plan settings → GET active plans → render bảng → tạo hoặc sửa → POST/PATCH → refetch. Không có dữ liệu để giả định các mức giá tháng/6 tháng/năm hiện tại map một-một thành plan.

#### Tasks

1. [x] Thay tier hard-code bằng `listPlans()`; form create gửi `code`, `name`, `price`, `billingCycle`, `features` cùng field tùy chọn.
2. [x] Khi edit, `code` và `billingCycle` bị khóa; disable dùng PATCH `isActive: false`, không có DELETE.
3. [ ] Form edit vẫn gửi `description` và `isPopular` rồi báo thành công; `SubscriptionService.updatePlan()` chỉ áp dụng `name`, `price`, `features`, `isActive`. Service FE cũng type response PATCH là plan trực tiếp, trong khi backend trả `{message,plan}`.
4. [ ] List chỉ trả active plans; nút “Kích hoạt lại” trong row hiện không thể xuất hiện cho plan inactive. Cần quyết định UX hoặc backend API để quản trị inactive.

#### Files affected

- Sửa: `src/pages/Configuration.tsx`.
- Mới: `src/services/adminPlans.ts`; cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] List/create/edit chạy với backend thật và được test; chưa có test Stage 5.
- [ ] Không cho sửa hoặc báo lưu thành công đối với field backend bỏ qua (`description`, `isPopular` khi PATCH).
- [ ] Giá, kỳ hạn và features map đúng từng plan; luồng plan inactive được chốt hoặc loại nút kích hoạt lại không tới được.

### Stage 6 — Dashboard có dữ liệu thật

#### Goal

Thay các mock KPI/list bằng dữ liệu dashboard nhưng trình bày trung thực phần backend còn stub.

#### Existing FE

Trước Stage 6: `Overview.tsx` dùng KPI/chart/list mock. Hiện page gọi GET dashboard và hiển thị dữ liệu response.

#### Backend API

`GET /api/v1/admin/dashboard`; handler hiện chỉ tính tổng user theo trạng thái, active 30 ngày, banned. Sáu counter khác trả `0`; `recentUsers` và `recentTransactions` trả mảng rỗng.

#### FE ↔ BE Flow

Mở Overview → GET dashboard → map summary → render các số thật và empty list. Không diễn giải zero stub thành số đo thực tế.

#### Tasks

1. [x] Có DTO dashboard và `adminDashboard.ts`; page gọi `getAdminDashboard()`.
2. [x] Với response backend hiện tại, ba counter có nghĩa được hiển thị; sáu counter cố định `0` hiện `—` và badge stub. Nếu backend đổi một field stub thành số khác 0, code hiện sẽ tự gắn nhãn “Dữ liệu thực” mà chưa có contract mới.
3. [x] Hai list response rỗng được render bằng `EmptyState`; hai chart mock đã được thay bằng placeholder thiếu time-series.
4. [ ] Thêm test UI Stage 6 cho loading/error, ba KPI thật, sáu stub và hai list rỗng; chưa có test tương ứng.

#### Files affected

- Sửa: `src/pages/Overview.tsx`.
- Mới: `src/services/adminDashboard.ts`; cập nhật `src/types/admin.ts`.

#### Acceptance Criteria

- [ ] Ba số có nguồn backend hiển thị đúng với response thật (source đã map; chưa test UI Stage 6).
- [ ] Sáu counter stub không bị trình bày như số đo vận hành; code đang dựa vào giá trị `0` để nhận diện stub.
- [x] Source không còn chart/list mock trên Overview; chart có placeholder và list dùng response backend.

## 5. State Map

State ở page cho filter/form/dialog và response/loading/error theo request; session và identity ở AuthContext. Không có store library. `/members` dùng URL search params làm source of truth cho `keyword`, `status`, `pageIndex`, `pageSize`. `/campaigns` đọc `pageIndex`, `pageSize`, `status` từ URL **chỉ lúc khởi tạo**, sau đó đổi state local mà không ghi lại URL; comment “URL-based” trong page chưa đúng hành vi.

| Flow                             | State sau tích hợp                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth                             | `idle → submitting → success/Admin route`; nhánh sai role, credential lỗi, server error; refresh `retrying → success` hoặc session cleared |
| Users                            | `idle → loading → success/empty`; refetch giữ dữ liệu cũ và báo busy; lỗi initial/refetch; mutation `confirm → pending → refetch` hoặc lỗi |
| Broadcast                        | Có loading/list/empty/error và POST pending → thông báo `Queued` → refetch; GET hiện lỗi vì đọc sai envelope phẳng                         |
| AI settings                      | Có loading/loaded/404/save/refetch; submit form thiếu `preventDefault` và ngưỡng rebalance được sửa nhưng không lưu                       |
| Plans                            | Có loading/active plans/empty/create/edit/disable; update gửi field bị bỏ qua, inactive không hiện trong list                              |
| Dashboard                        | Có loading/summary/error/refresh; hai list backend rỗng và chart placeholder; không có mutation                                           |
| Activity, risk/churn, auto rules | Không có success state từ API admin; Activity/Intelligence vẫn là mock, auto rules còn thao tác local                                      |

## 6. Mock → Real API Migration Matrix

| Mock source                         | Current use                | Real API                                   | Migration action                                         | Status           |
| ----------------------------------- | -------------------------- | ------------------------------------------ | -------------------------------------------------------- | ---------------- |
| `Overview.tsx` KPI                  | Đã gọi dashboard API       | Admin dashboard                            | 3 counter thật; 6 counter stub hiển thị `—`              | **Đã nối FE; chờ test UI/backend hoàn thiện** |
| `Overview.tsx` charts/lists         | Chart placeholder; list từ response | Không có time-series; list API hiện rỗng | Chờ backend cấp dữ liệu                                  | **Đã bỏ mock FE; backend blocked** |
| `Members.tsx` users/search/status   | Đã gọi API                | Users list/detail/status                   | Server query, normalize field/status/pagination          | **Đã migrate (Stage 2)** |
| `Members.tsx` plan filter           | Đã bỏ                     | Không có subscription info trên users list | Không hiển thị filter/cột giả                            | **Đã bỏ (Stage 2)** |
| `Activity.tsx` transactions/charts  | Vẫn render mock           | Không thấy admin transactions API          | Cần trạng thái chưa khả dụng hoặc backend endpoint       | **Blocked; mock còn hiển thị** |
| `Intelligence.tsx` risk/churn/chart | Vẫn render mock           | Không có risk/churn admin API              | Cần capability backend hoặc loại dữ liệu giả             | **Blocked; mock còn hiển thị** |
| `Campaigns.tsx` manual/history      | Đã gọi GET/POST            | Admin broadcasts GET/POST                  | Sửa map phân trang phẳng; test list/create               | **Đã nối FE; list lỗi contract** |
| `Campaigns.tsx` auto rules          | State local, alert/confirm | Không có API                               | Ngăn hiểu nhầm là đang chạy/lưu trên server              | **Blocked; mock còn thao tác** |
| `Configuration.tsx` AI fields       | Đã gọi GET/PATCH           | Admin AI settings GET/PATCH                | Sửa submit và field rebalance; test refetch              | **Đã nối FE; còn lỗi form** |
| `Configuration.tsx` plan fields     | Đã gọi GET/POST/PATCH      | Admin subscription plans GET/POST/PATCH    | Không gửi field PATCH bị bỏ qua; xử lý inactive          | **Đã nối FE; còn mismatch** |
| Categories (Configuration)         | `.pen` có list/create/edit/delete screens | Categories CRUD                    | Nối list/CRUD; map pagination/search; list không nhận `isActive` filter | Ready (design-backed) |
| Audit logs (Intelligence)          | `.pen` có read-only list/filter screen | Audit GET                                 | Nối filters; `adminUsername` thực tế là actor UUID       | Mismatch (design-backed) |

## 7. Blockers / Mismatches

### BLOCKED

- **Giao dịch:** FE có flow bảng/tra cứu giao dịch; chưa tìm thấy admin list API tương ứng.
- **Quy tắc gửi tự động:** có create/edit/delete/toggle local nhưng không có endpoint backend.
- **Risk/churn:** UI intelligence có dữ liệu mock; các endpoint AI hiện có không trả dữ liệu đó.
- **Biểu đồ dashboard:** endpoint dashboard không trả chuỗi thời gian.
- **Gửi broadcast tới audience:** API nhận và lưu chuỗi audience nhưng chưa thấy consumer fan-out; queued không chứng minh đã phát tin.
- **Plan inactive:** API list chỉ trả active plans; nút kích hoạt lại trong danh sách hiện không thể dùng cho plan đã disable.

### MISMATCH

- Dashboard trả sáu trường placeholder (`0`) và danh sách rỗng; `totalUsers` đang đếm account Active nên cần nhãn đúng hoặc backend sửa.
- Users endpoint không lọc role, nên admin account cũng có thể xuất hiện.
- Users UI hiện dùng `Banned` và đã bỏ filter gói; drift còn ở backend (list không lọc role, response và lỗi status khác docs).
- Broadcast API không nhận channel; audience chỉ được lưu và event được phát, chưa thấy consumer phân phối theo segment.
- `adminBroadcasts.ts` đọc `response.pagination` dù handler trả envelope phẳng; `totalPages` là getter có thể vắng trong JSON. Stage 3 GET chưa đúng contract.
- AI settings UI mục tiêu `.pen` không hiển thị khóa; GET không trả key/masked key, PATCH runtime nhận `apiKeyEncrypted` nhưng FE chưa có cách tạo payload hợp lệ.
- AI form submit thiếu `preventDefault`; ngưỡng `rebalanceThresholdPercent` có ô nhập nhưng không nằm trong payload PATCH dù backend DTO nhận field này.
- Plan API chỉ list active; update nhận `description`/`isPopular` trong body nhưng handler bỏ qua. FE gửi hai field này, báo thành công, và type PATCH response sai shape `{message,plan}`.
- Campaigns hiển thị kết quả tạo `Queued`, nhưng tab auto rules vẫn có nút bật/tắt và số “Đang chạy” cho dữ liệu local.

### NEEDS CLARIFICATION

- Nếu sản phẩm cần channel hoặc segment broadcast, backend cần bổ sung contract và consumer trước khi bật các lựa chọn này.
- Nếu sản phẩm cần xoay AI provider key, cần contract write-only/mã hóa được xác định; thiết kế hiện tại không có control nhập key.
- Ba nhóm giá hiện tại là ba plan riêng, nhiều billing cycle hay chỉ dữ liệu minh họa?

## 8. Recommended Implementation Order

1. Stage 0 — **hoàn tất** kiểm chứng thiết kế và chốt các mặc định ghi ở trên.
2. Stage 1 — **hoàn tất** API client/session/auth làm nền cho mọi request.
3. Stage 2 — **hoàn tất**: Users là flow có API tương đối đầy đủ.
4. Stage 3 — **đã có code FE, chưa đạt**: sửa phân trang GET, xử lý auto rules local và thêm test UI/backend cho list/create.
5. Stage 4 — **đã có code FE, chưa đạt**: sửa submit form và lưu ngưỡng rebalance; test GET 404, PATCH và refetch.
6. Stage 5 — **đã có code FE, chưa đạt**: bỏ field PATCH bị backend bỏ qua, sửa type response, chốt UX inactive và test create/update.
7. Stage 6 — **đã nối FE, backend còn stub**: test ba KPI thật, sáu placeholder, empty/error; dashboard đầy đủ cần backend bổ sung counter/list/time-series.

Activity và Intelligence vẫn hiển thị mock; auto rules chưa có API và vẫn cho thao tác local. Categories và Audit đã có thiết kế/backend API nhưng chưa được xếp stage triển khai FE. Kết quả test auth/Members đã ghi ở `docs/spec/`; Stage 3–6 chưa có test tương ứng trong `e2e/`. Không dùng kết quả lint/typecheck/build để thay thế kiểm chứng contract hoặc thao tác UI.
