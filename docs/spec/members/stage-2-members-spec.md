# Stage 2 — Quản lý danh sách thành viên và trạng thái · Đặc tả

Phạm vi: **lát cắt Members** của admin portal — danh sách user phân trang/tìm kiếm/lọc theo trạng thái
từ server, chi tiết user, cấm và bỏ cấm tài khoản. Đây là bản đặc tả **hành vi quan sát được trên giao
diện**; mọi phát biểu đều neo vào `file:line` của code đang chạy.

Nguồn kế hoạch: [`../../plan/admin_api.md`](../../plan/admin_api.md) §"Stage 2 — Quản lý danh sách thành
viên và trạng thái" và [`../../../ADMIN_INTEGRATION_PLAN.md`](../../../ADMIN_INTEGRATION_PLAN.md) §9 Flow 5–7.

---

## 1. Mục tiêu và phạm vi

### 1.1 Trong phạm vi

| # | Hạng mục | File sở hữu |
| --- | --- | --- |
| S1 | Service users: list / detail / update status | `src/services/adminUsers.ts` |
| S2 | DTO user, status, pagination, response mutation | `src/types/admin.ts:43-98` |
| S3 | Trang Members: URL state, list, filter, pagination, detail, confirm, notice | `src/pages/Members.tsx` |
| S4 | Formatter ngày giờ theo `Asia/Ho_Chi_Minh` | `src/lib/format.ts:6-25` |
| S5 | Nhận diện `AbortError` trong HTTP client | `src/lib/api/client.ts:27`, `:157` |
| S6 | Primitive dùng chung cho page (theo `DESIGN_SYSTEM.md` §8.5) | `src/components/ui/{Badge,Button,SectionCard,SearchInput,EmptyState,DataTable,Modal}.tsx` |
| S7 | Test Playwright + fixture | `e2e/members/*.spec.ts`, `e2e/fixtures/members.ts` |

### 1.2 Ngoài phạm vi (không đặc tả ở đây)

- **Xoá user**: không có endpoint, không có soft-delete, không có trạng thái `Inactive`/`Disabled`
  ⇒ không có UI. Xem `D-MEM-1` và `Q-MEM-5`.
- **Filter/role**: backend không trả và không lọc `role` ⇒ không có chip lọc role, không có role badge.
  Xem `D-MEM-2`.
- **Gói đăng ký / hạn ngạch AI / usage Sepay theo user**: không có admin API ⇒ không có cột.
  Xem `D-MEM-6`.
- **Đổi role user**: `ADMIN_INTEGRATION_PLAN.md` §2 xếp "Case D — docs-only". Đã kiểm lại: trong `src/`
  backend **không tồn tại** route/handler/command đổi role (xem `D-MEM-2`).
- **Các stage khác** (Activity, Campaigns, AI settings, plans, dashboard) — vẫn mock.
- **Refresh-on-401 khi request nghiệp vụ** (`AC-07` của Stage 1): vẫn treo, xem `G-MEM-5`.
- **Toast/ConfirmDialog dùng chung, `SectionCard` cho các page khác, rollout primitive** — xem `D-MEM-11`.

---

## 2. Actor và quyền

| Actor | Vào được `/members` | Hành vi |
| --- | --- | --- |
| Khách (không session) | ✗ | `RequireAdmin` → `/login` (kế thừa Stage 1, `src/App.tsx:17-19`) |
| Session role `Admin` | ✓ | đầy đủ: xem list/detail, cấm, bỏ cấm |
| Session role khác `Admin` | ✗ | `/login` + banner từ chối (kế thừa Stage 1) |

Backend là nguồn có thẩm quyền: mọi route dưới `@Controller('/api/v1/admin/users')` đều gắn
`@Roles('Admin')` (`admin.controller.ts:17-18`). Guard phía FE **chỉ là UX** (`AGENTS.md` §4.4).

---

## 3. Hợp đồng đã verify

### 3.1 Backend

| # | Method + path | Auth | Request | Response 2xx | Lỗi |
| --- | --- | --- | --- | --- | --- |
| B1 | `GET /api/v1/admin/users` | Bearer `Admin` | query `pageIndex?` (mặc định 1), `pageSize?` (mặc định 20), `status?`, `keyword?` | **200** `{data: User[], pagination:{page,pageSize,totalCount,totalPages}}` | 401/403 (guard), 500 |
| B2 | `GET /api/v1/admin/users/:id` | Bearer `Admin` | route `id` | **200** object user **phẳng** (cùng shape một item của B1) | **404** `{code:'NOT_FOUND', message:'User not found'}` |
| B3 | `PATCH /api/v1/admin/users/:id/status` | Bearer `Admin` | `{status: 'Active'\|'Banned', statusReason?: string}` (không có DTO validate) | **200** — **hai shape khác nhau**: ban `{id,username,firstName,lastName,email,phone,status,statusReason}`; unban `{id,username,status,statusReason}` | **500** khi account không tồn tại (không phải 404) |

`User` = `{id, userName, firstName, lastName, email, phone\|null, avatarUrl\|null, preferredCurrency, isOnboardingCompleted, status, statusReason\|null, createdAt, lastLoginAt\|null}`.

Bằng chứng runtime:

| Sự kiện | File:line |
| --- | --- |
| Controller + `@Roles('Admin')` cho cả 3 route | `.../modules/admin/interface/http/admin.controller.ts:17-18` |
| B1 đọc 4 query param, default `pageIndex=1`, `pageSize=20` | `admin.controller.ts:27-41` |
| B2 | `admin.controller.ts:43-47` |
| B3 rẽ nhánh theo `dto.status === 'Banned'`; **mọi giá trị khác rơi vào unban** | `admin.controller.ts:49-61` |
| B1 gọi `findAll(query, {status, keyword})` | `.../application/queries/get-users.handler.ts:14-17` |
| B1 map response; `createdAt: a.createdAt?.toISOString()` (có thể **vắng key**) | `get-users.handler.ts:19-41`, `:32` |
| B2 `findById` + `NotFoundException({code:'NOT_FOUND'})` | `.../queries/get-user-detail.handler.ts:18-25` |
| B3 ban: `account.ban(reason \|\| 'No reason provided')` → `save` → `BanUserResult` (8 field) | `.../commands/ban-user.handler.ts:28-43` |
| B3 ban account không tồn tại: `throw new Error('Account not found')` ⇒ **500** | `ban-user.handler.ts:29` |
| B3 unban: `account.unban()` → response **4 field** | `.../commands/unban-user.handler.ts:14-25` |
| `AccountStatus` chỉ có `Active`/`Banned` | `.../identity/domain/entities/account.entity.ts:6-9` |
| `ban()` set `status`, `statusReason`; `unban()` set `Active` **và** `statusReason = null` | `account.entity.ts:159-175` |
| Bị ban ⇒ **chặn login** qua `checkCanLogin()` → `AccountBannedError` | `account.entity.ts:182-186` |
| Filter repository **chỉ** có `status` + `keyword` (không có role) | `.../identity/domain/repositories/account.repository.ts:7-10` |
| `findAll`: `innerJoin` role để lấy `role_code` nhưng **không** đưa vào response; `keyword` ILIKE trên `username/email/first_name/last_name`; `ORDER BY createdAt DESC` | `.../identity/infrastructure/persistence/account.repository.impl.ts:38-82`, `:48-51`, `:53-58`, `:70` |
| `PaginatedQuery` clamp `page >= 1`, `pageSize` 1..100; `totalPages = ceil(totalCount/pageSize)` — **không** clamp `page` theo `totalPages` | `.../shared/application/pagination.ts:5-8`, `:32-34` |

**Hệ quả contract bắt buộc nhớ:**

1. **B3 là nguồn của "status đích tường minh".** Controller chỉ so sánh `=== 'Banned'`; gửi
   `status: 'Active'` (hoặc bất kỳ chuỗi nào khác) đều chạy `unban()`. Vì vậy FE **phải** gửi đúng
   `'Banned'`/`'Active'` và **không** được suy ra hành vi từ giá trị lạ.
2. **Response B3 không dùng để patch state được.** Ban trả 8 field, unban trả 4 field ⇒ luôn refetch
   (`AGENTS.md` §4.6).
3. **Account không tồn tại ở B3 là 500, không phải 404** ⇒ FE coi là "view đã cũ".
4. **B1 không lọc role** ⇒ danh sách có thể chứa cả account `Admin`.
5. **B1 không trả `role`** ⇒ FE không thể hiển thị hay lọc role kể cả muốn.
6. **`createdAt` có thể vắng** do optional chaining ở handler ⇒ type FE khai báo `| null`.
7. **`userName` (B1/B2) vs `username` (B3)** — cùng một khái niệm, hai tên khác nhau.

Đối chiếu docs service backend:

| Doc | Nói gì | Runtime |
| --- | --- | --- |
| `users-list.md:79` | "Query accounts **role User**, filter status/keyword" | **Không** lọc role (`account.repository.impl.ts:42-64`) |
| `users-list.md:101` | Drift/backlog: "pagination envelope DRIFT-005" | đúng — xem `D-MEM-7` |
| `users-update-status.md:37-58` | Response B3 = object user phẳng đầy đủ | **Khác**: ban 8 field, unban 4 field ⇒ `D-MEM-5` |
| `users-update-status.md:92` | "login banned enforcement can audit" | **Đã enforce**: `account.entity.ts:182-186` |

### 3.2 Frontend — URL là source of truth

`Members.tsx:128-133` parse 4 param; giá trị không hợp lệ rơi về mặc định (`parsePageIndex`
`Members.tsx:68-71`, `parsePageSize` `:73-76`, `parseStatus` `:78-79`).

| Param | Kiểu | **Bỏ hẳn param khi** | Gửi lên B1 |
| --- | --- | --- | --- |
| `keyword` | string **nguyên văn** người dùng gõ | `length === 0` | `keyword=<trim>` chỉ khi `trim !== ''` |
| `status` | `Active` \| `Banned` | giá trị `all` | `status=` chỉ khi khác "tất cả" |
| `pageIndex` | số nguyên ≥ 1 | `1` | **luôn** gửi `pageIndex` |
| `pageSize` | `20` \| `50` \| `100` | `20` | **luôn** gửi `pageSize` |

`applyQuery` (`Members.tsx:135-172`) là cửa duy nhất đổi URL: dùng `setSearchParams` với functional
updater để không mất param khác; `keyword` truyền `{ replace: true }` khi gõ để không tạo history entry
(`:353-356`).

### 3.3 Frontend — hành vi đã verify

| # | Hành vi | Neo |
| --- | --- | --- |
| F1 | URL là source of truth; page/search/status đọc từ `searchParams`, không có state song song | `Members.tsx:128-133` |
| F2 | Bỏ hẳn param khi rỗng / "Tất cả" / giá trị mặc định (không gửi `keyword=''`, `status=''`) | `:135-172` |
| F3 | Đổi status, pageSize, keyword ⇒ `pageIndex` reset về 1 | `:665`, `:615`, `:353-356` |
| F4 | Debounce keyword **350 ms**; chỉ debounce khi **keyword** vừa đổi, đổi status/page gọi **ngay** | `:44`, `:177-183` |
| F5 | Mỗi lần query đổi tạo `AbortController` mới + cleanup abort ⇒ không có response cũ ghi đè | `:180-216` |
| F6 | Lỗi abort **không** thành lỗi UI (`isAbortError` được rethrow nguyên trạng từ client) | `client.ts:27`, `:157`; `Members.tsx:210` |
| F7 | Clamp trang: response có `pageIndex > max(1,totalPages)` ⇒ điều hướng về trang cuối và **bỏ** response đó | `:198-202` |
| F8 | Dữ liệu cũ vẫn render khi refetch; "busy" chỉ khi key dữ liệu lệch key query hiện tại | `:98-103`, `:219-224` |
| F9 | `isRefreshing` **không** bật khi refetch lỗi ⇒ spinner không quay mãi, nút "Tải lại" không bị khoá | `:224` |
| F10 | Pagination đọc `pagination.page/pageSize/totalCount/totalPages` từ B1, không tự tính từ mảng | `:490-497`, `:597-644` |
| F11 | Detail **luôn** gọi B2 khi mở (token tăng dần ⇒ mở lại cùng user vẫn refetch), không dùng row | `:230-266` |
| F12 | B2 trả 404 ⇒ coi bản ghi đã mất và refetch list | `:250-255` |
| F13 | Cấm ⇒ `PATCH {status:'Banned'}` + `statusReason` khi có nội dung; bỏ cấm ⇒ `PATCH {status:'Active'}` **không** kèm reason | `:297-315`; `adminUsers.ts:53-64` |
| F14 | Sau mutation thành công: **refetch list + refetch detail đang mở**, không patch từ response | `:317-328` |
| F15 | Pending khoá dialog: nút submit + textarea `disabled`, `closeStatusDialog` return sớm khi `isMutating` (backdrop/X không đóng được) | `:290-295`, `:796-808`, `:837-847` |
| F16 | PATCH lỗi 500 ⇒ coi view stale: đóng dialog + notice cảnh báo + refetch list/detail | `:332-342` |
| F17 | PATCH lỗi khác ⇒ **giữ** dialog và hiện `members-mutation-error` | `:343-344`, `:850-854` |
| F18 | Empty phân biệt **rỗng tự nhiên** vs **rỗng do filter** (kèm nút xoá bộ lọc) | `:469-488` |
| F19 | Loading lần đầu = skeleton `role="status"`; refetch = giữ nội dung + indicator ở header + `opacity-60` trên bảng | `:567-573`, `:510-515`, `:593` |
| F20 | Error: banner `role="alert"` khi còn dữ liệu cũ; error state đầy đủ + nút "Thử lại" khi chưa có dữ liệu | `:554-565`, `:574-586` |
| F21 | Không gọi HTTP trong page; toàn bộ request đi qua `services/adminUsers.ts` | `Members.tsx:18`; grep `fetch(` trong page = 0 |
| F22 | Ngày giờ format qua `lib/format.ts` (timezone `Asia/Ho_Chi_Minh`), `null`/invalid → `—` | `format.ts:6-25`; `Members.tsx:422`, `:427`, `:781-782` |
| F23 | Không retry tự động PATCH (chỉ có nhánh refresh-on-401 của client, chạy trước khi request tới handler) | `AGENTS.md` §4.6; `client.ts:171-175` |

### 3.4 Mapping enum, tone và nhãn

| Giá trị backend | Nhãn hiển thị | Tone `Badge` | Neo |
| --- | --- | --- | --- |
| `status: 'Active'` | `Hoạt động` | `success` (có dot) | `Members.tsx:56-64`, `:389-391` |
| `status: 'Banned'` | `Bị cấm` | `danger` (có dot) | `Members.tsx:56-64`, `:389-391` |
| `isOnboardingCompleted: true` | `Đã xong` | `success` | `:404-406` |
| `isOnboardingCompleted: false` | `Chưa xong` | `neutral` | `:404-406` |
| `statusReason` khi `Banned` | hiển thị dưới badge, `Không có lý do` nếu `null` | — | `:392-396` |
| `phone: null` | `—` | — | `:414` |
| `lastLoginAt: null` | `—` | — | `:427` |

> Enum backend dùng **tiếng Anh**, nhãn UI **tiếng Việt** (`AGENTS.md` §8). UI **không** dùng
> `Suspended`/`Tạm dừng` — giá trị đó chỉ tồn tại trong mock cũ và đã bị xoá.

---

## 4. Máy trạng thái

### 4.1 Vòng đời list

```
[Mở /members] ──► [initial-loading] ──200, có rows────► [ready]
                        │                └─200, rows=[]─► [empty tự nhiên] hoặc [empty do filter]
                        └─lỗi──────────► [error + Thử lại] ──click──► [initial-loading]
[ready] ──đổi keyword/status/page/pageSize──► [refreshing] (giữ rows cũ + indicator)
[refreshing] ──200──► [ready]        ──lỗi──► [ready + banner lỗi + Thử lại]
[ready] ──pageIndex > totalPages──► [clamp về trang cuối] ──► [refreshing]
```

Bảng trạng thái quan sát được:

| Trạng thái | Điều kiện code | Biểu hiện |
| --- | --- | --- |
| `initial-loading` | `snapshot === null && listErrorMessage === null` (`:222`) | `members-loading` (skeleton 5 dòng, `role="status"`), chưa có bảng |
| `ready` | có `snapshot.key === queryKey` | bảng render `snapshot.rows` |
| `refreshing` | `snapshot.key !== queryKey && không có lỗi` (`:224`) | giữ rows cũ + `opacity-60` + `Đang cập nhật…` ở header, nút "Tải lại" `disabled` |
| `error` (chưa có dữ liệu) | `snapshot === null && listErrorMessage !== null` | `members-error` (`role="alert"`) + `members-retry` |
| `error` (đã có dữ liệu) | `snapshot !== null && listErrorMessage !== null` | `members-list-error` (banner) + rows cũ vẫn hiển thị |
| `empty tự nhiên` | `rows.length === 0 && !hasActiveFilter` | `Chưa có thành viên nào` |
| `empty do filter` | `rows.length === 0 && hasActiveFilter` | `Không tìm thấy kết quả khớp bộ lọc` + `Xoá bộ lọc` |

### 4.2 Vòng đời detail (modal)

```
[đóng] ──click "Xem"──► [detail-loading] ──B2 200──► [detail-ready]
                              ├─B2 404/lỗi──► [detail-error + Thử lại] (+ refetch list nếu 404)
                              └─đóng──► [đóng]
[sau mutation] ──refetchDetail()──► [detail-loading] (token tăng ⇒ luôn gọi lại B2)
```

### 4.3 Vòng đời mutation (cấm/bỏ cấm)

```
[đóng] ──click "Cấm tài khoản"/"Bỏ cấm tài khoản"──► [confirm] (title + email + trạng thái đích)
[confirm] ──submit──► [pending]  (submit disabled + "Đang xử lý…", textarea disabled, không đóng được)
   ├─2xx──► [đóng] + notice success + refetch list + refetch detail
   ├─500──► [đóng] + notice warning "bản ghi có thể đã bị thay đổi ở nơi khác" + refetch
   └─lỗi khác──► [confirm] giữ nguyên + members-mutation-error
[confirm] ──Huỷ / backdrop / X──► [đóng]   (chỉ khi KHÔNG pending)
```

---

## 5. Đặc tả UI theo khối

`Members.tsx` — wrapper: `h-full flex flex-col gap-6 select-none w-full text-xs max-w-7xl mx-auto` (`:500`).

### 5.1 Header + notice (`:501-534`)

| Hạng mục | Đặc tả |
| --- | --- |
| Tiêu đề | `Thành Viên Hệ Thống` (`text-xl font-bold font-display text-ink`) |
| Subtitle | `Danh sách, tìm kiếm và trạng thái tài khoản lấy trực tiếp từ backend (server-side).` |
| Busy indicator | chỉ khi `isRefreshing`: `ArrowClockwise` spin + `Đang cập nhật…`, `role="status"` |
| Nút "Tải lại" | gọi `refetchList()`; `disabled` khi `isRefreshing` |
| Notice | `members-notice`, `role="status"`, tone `success` (nền `success-soft`) hoặc `warning` (nền `warning-soft`); xuất hiện sau mutation thành công hoặc khi gặp 500 |

### 5.2 Bảng thành viên (`:538-645`, `DataTable` ở `:588-594`)

7 cột, đúng thứ tự:

| Cột | Render | Neo |
| --- | --- | --- |
| `Thành viên` | avatar tròn (`avatarUrl` nếu có, ngược lại initials) + họ tên (fallback `userName`) + dòng mono `@userName · email` | `:361-383` |
| `Trạng thái` | `Badge` tone theo §3.4 + `statusReason` (chỉ khi `Banned`) | `:384-399` |
| `Onboarding` | `Badge` `Đã xong`/`Chưa xong` | `:400-408` |
| `Liên hệ` | `phone ?? '—'` (mono) + `preferredCurrency` | `:409-418` |
| `Ngày tạo` | `formatDateTime(createdAt)` (mono, `—` nếu null) | `:419-423` |
| `Đăng nhập gần nhất` | `formatDateTime(lastLoginAt)` (mono, `—` nếu null) | `:424-428` |
| `Thao tác` | `Xem` (`members-action-view`) + **một** trong hai: `Cấm tài khoản` (`danger`) hoặc `Bỏ cấm tài khoản` (`secondary`) | `:429-466` |

`rowKey` = `user.id` (không dùng index — `:591`). Không còn cột Gói/Thời hạn/Hạn ngạch AI/Sepay.

### 5.3 Panel "Lọc nâng cao" (`:647-713`)

| Hạng mục | Đặc tả |
| --- | --- |
| Chip trạng thái | 3 nút `Tất cả` / `Hoạt động` / `Bị cấm` → `members-status-all|Active|Banned`, có `aria-pressed`; click ⇒ `applyQuery({status, pageIndex: 1})` (`:654-675`) |
| Ghi chú giới hạn API 1 | "Gói đăng ký, hạn ngạch AI và usage Sepay theo từng user chưa có API admin ⇒ đã bỏ khỏi bảng thay vì hiển thị số mock." (`:678-685`) |
| Ghi chú giới hạn API 2 | "`/admin/users` hiện không lọc và không trả `role`, nên danh sách có thể chứa cả tài khoản Admin. Filter role là follow-up backend." (`:686-693`) |
| Nút `Xoá bộ lọc` | `members-clear-filters`; `disabled` khi `!hasActiveFilter`; xoá `keyword` + `status` + `pageIndex` (`:358`, `:697-706`) |
| Ghi chú mapping | "`Cấm tài khoản` gửi `PATCH status=Banned` (chặn đăng nhập). Đây không phải thao tác xoá tài khoản." (`:707-711`) |

### 5.4 Pagination (`:597-644`)

| Hạng mục | Đặc tả |
| --- | --- |
| Chuỗi thông tin | `members-page-info`: `—` khi chưa có dữ liệu; `0 / <totalCount> · Trang p/P` khi trang rỗng; ngược lại `<đầu>–<cuối> / <totalCount> · Trang p/P` với `P = max(1, totalPages)` |
| Chọn số dòng | `members-page-size`, option `20/50/100`; đổi ⇒ reset `pageIndex` về 1 |
| `Trước` | `members-prev`; `disabled` khi `pageIndex <= 1` |
| `Sau` | `members-next`; `disabled` khi chưa có `pagination` **hoặc** `pageIndex >= max(1,totalPages)` |

### 5.5 Modal chi tiết (`:716-786`)

| Hạng mục | Đặc tả |
| --- | --- |
| Mở bằng | `members-action-view` của row ⇒ `openDetail(id)` (token +1 ⇒ luôn gọi B2) |
| Title / description | `Chi tiết thành viên`; description = `detailUser.id` hoặc `Đang tải dữ liệu từ backend…` |
| Width | `max-w-2xl` |
| Loading | skeleton 5 dòng, `role="status"` |
| Error | `role="alert"` + message + nút `Thử lại` (gọi lại B2) |
| 10 field | `ID`, `Tên đăng nhập`, `Họ tên`, `Email`, `Điện thoại`, `Tiền tệ ưu tiên`, `Trạng thái` (+ lý do khi `Banned`), `Onboarding`, `Ngày tạo`, `Đăng nhập gần nhất` |
| Footer | nút `Đóng` |
| Không hiển thị | quota / subscription / Sepay (API không trả) |

### 5.6 Modal confirm cấm / bỏ cấm (`:788-861`)

| Hạng mục | Đặc tả |
| --- | --- |
| Title | `Cấm tài khoản` hoặc `Bỏ cấm tài khoản` (theo `nextStatus`, `:280-281`) |
| Description | `<họ tên> · <email>` |
| Body | nêu **trạng thái đích** + tên + email; có `Badge` `Bị cấm`/`Hoạt động` |
| Ô lý do | chỉ khi **cấm**: `members-confirm-reason` (`textarea`, nhãn `Lý do cấm (không bắt buộc)`), `disabled` khi pending |
| Lỗi | `members-mutation-error`, `role="alert"` khi PATCH lỗi (không phải 500) |
| Footer | `Huỷ` (disabled khi pending) + submit `members-confirm-submit` (`Cấm tài khoản`/`Bỏ cấm tài khoản`, đổi thành `Đang xử lý…` + disabled khi pending) |
| Ghi chú kỹ thuật | hiển thị `PATCH /api/v1/admin/users/{id}/status` + câu "Thành công thì danh sách và chi tiết đang mở được tải lại." |

---

## 6. Acceptance criteria

Nguồn: yêu cầu Stage 2 trong `admin_api.md` §"Stage 2" + `AGENTS.md` §4.6/§5.4/§11 + quyết định đã chốt
khi triển khai. Cột **Kiểm bằng** cho biết cơ chế kiểm chứng thực tế.

| ID | Tiêu chí | Nguồn | Kiểm bằng |
| --- | --- | --- | --- |
| `AC-MEM-01` | Không còn `mockMembers`: bảng render dữ liệu từ B1 | plan task 1 | `TC-MEM-01`, `TC-MEM-03` (`@real`) |
| `AC-MEM-02` | Tìm kiếm chạy **server-side** qua `keyword`; debounce ~350 ms; reset page 1 | plan task 2, §7 | `TC-MEM-02` (`@real`) |
| `AC-MEM-03` | Lọc **server-side** theo `status`; map `Tất cả` → không gửi, `Hoạt động` → `Active`, `Bị cấm` → `Banned` | plan task 3, §7 | `TC-MEM-03`, `TC-MEM-11` |
| `AC-MEM-04` | Phân trang **server-side** dùng `pagination` của B1 (không tự tính total) | plan task 4 | `TC-MEM-01`, `TC-MEM-04` |
| `AC-MEM-05` | `keyword`/`status`/`pageIndex`/`pageSize` nằm trên **URL**; bỏ param khi rỗng hoặc "Tất cả" | yêu cầu Stage 2 §5 | `TC-MEM-01`, `TC-MEM-02`, `TC-MEM-03`, `TC-MEM-11` |
| `AC-MEM-06` | Đổi filter/search ⇒ reset `pageIndex` về 1 | yêu cầu Stage 2 §5 | `TC-MEM-02`, `TC-MEM-03` |
| `AC-MEM-07` | Request cũ bị abort/bỏ qua khi query đổi (không có response cũ ghi đè) | yêu cầu Stage 2 §5 | Một phần: `TC-MEM-02` (chỉ 1 request cho 1 keyword); cơ chế abort xem `F5` — `G-MEM-4` |
| `AC-MEM-08` | `pageIndex` vượt `totalPages` ⇒ clamp về trang cuối rồi refetch | `AGENTS.md` §4.6 | **Chưa phủ** — `G-MEM-2` |
| `AC-MEM-09` | Detail lấy từ B2, gọi lại mỗi lần mở (không tin row) | plan task 5 | `TC-MEM-05` (`@real`), `TC-MEM-09` |
| `AC-MEM-10` | Chi tiết hiển thị đúng field backend, không hiện quota/subscription/Sepay | yêu cầu Stage 2 §4 | `TC-MEM-05` (`@real`) |
| `AC-MEM-11` | Cấm tài khoản ⇒ gửi `status: 'Banned'` kèm `statusReason` (nếu nhập) | quyết định đã chốt | `TC-MEM-06` (nhánh cấm), `TC-MEM-07` |
| `AC-MEM-12` | Bỏ cấm ⇒ gửi `status: 'Active'`, **không** kèm `statusReason` | quyết định đã chốt | `TC-MEM-06` (nhánh bỏ cấm — chạy một phần, `Q-MEM-6`) |
| `AC-MEM-13` | Không có nút "Xoá"; nhãn đúng `Cấm tài khoản`/`Bỏ cấm tài khoản`, phản ánh `Banned`/`Active` | yêu cầu Stage 2 §4 | `TC-MEM-06`, `TC-MEM-07`, kiểm tra tĩnh (không còn chuỗi `Xóa`) |
| `AC-MEM-14` | Không toggle mù: `status` đích luôn tường minh từ trạng thái hiện tại của row | yêu cầu Stage 2 §4 | `TC-MEM-06`, `TC-MEM-07` |
| `AC-MEM-15` | Sau mutation thành công ⇒ refetch list (và detail đang mở); **không** patch từ response mutation | `AGENTS.md` §4.6 | `TC-MEM-06` (ban), `TC-MEM-07`, `TC-MEM-08` |
| `AC-MEM-16` | Không retry tự động PATCH | `AGENTS.md` §4.6 | Gián tiếp: `TC-MEM-08` (1 PATCH, không lặp) |
| `AC-MEM-17` | Control mutation `disabled` khi pending; dialog không đóng được khi pending | `AGENTS.md` §4.6 | `TC-MEM-07` |
| `AC-MEM-18` | Loading / empty / error / pending **phân biệt được**; rỗng tự nhiên ≠ rỗng do filter | `AGENTS.md` §11 | `TC-MEM-10`, `TC-MEM-11`, `TC-MEM-12`, `TC-MEM-07` |
| `AC-MEM-19` | Lỗi tải list hiện `message` + nút **Retry** hoạt động | `AGENTS.md` §11 | `TC-MEM-12` |
| `AC-MEM-20` | PATCH 500 (account đã đổi/bị xoá ở nơi khác) ⇒ coi view stale: refetch + báo phù hợp, không phơi lỗi thô | drift backend (`ban-user.handler.ts:29`) | `TC-MEM-08` |
| `AC-MEM-21` | Không còn filter "gói" giả; không hiển thị quota/subscription/Sepay mock như dữ liệu thật | yêu cầu Stage 2 §4 | `TC-MEM-05` (assert phủ định trong detail) + kiểm tra tĩnh |
| `AC-MEM-22` | Không thêm filter/role badge khi backend chưa trả `role`; contract giữ nguyên | `AGENTS.md` §4.5 | Kiểm tra tĩnh (`grep role` trong `services/` + `Members.tsx` = 0) |
| `AC-MEM-23` | HTTP chỉ trong `src/services/*`; page không gọi `fetch`/axios | `AGENTS.md` §13.21 | Kiểm tra tĩnh (grep `fetch(` trong `Members.tsx` = 0) |
| `AC-MEM-24` | Không dùng `any`; field nullable khai báo `| null` tường minh | `AGENTS.md` §7 | Kiểm tra tĩnh (grep `any` trong file Stage 2 = 0) |
| `AC-MEM-25` | Enum backend tiếng Anh trong code, nhãn tiếng Việt trên UI; datetime hiển thị `Asia/Ho_Chi_Minh` | `AGENTS.md` §3.1/§10 | Kiểm tra tĩnh (`format.ts:6-25`) |
| `AC-MEM-26` | `pnpm lint`, 2 lệnh `tsc --noEmit`, `pnpm build` pass | `AGENTS.md` §14 | Chạy tay 2026-10-07 — xem README §1 |

---

## 7. Sổ drift và khuyết điểm

> Phần **quan trọng nhất** của tài liệu: các phát hiện khi đối chiếu code với plan/rule/docs backend.
> Không mục nào được sửa trong tài liệu này — chỉ ghi nhận để owner quyết (`Q-MEM-x`).

### `D-MEM-1` — Không tồn tại đường "xoá user"; sản phẩm chỉ có ban/bỏ cấm

- Kiểm tra toàn bộ `src/modules/admin` + `src/modules/identity`: **0** `@Delete` trong admin controller
  (`admin.controller.ts:27,43,49` chỉ có 3 route `GET/GET/PATCH`), **0** khớp
  `softDelete|deletedAt|deleted_at|isDeleted` trong module identity, và `AccountStatus` chỉ có
  `Active`/`Banned` (`account.entity.ts:6-9`).
- Mock cũ có nút `Xóa` (`git show HEAD:src/pages/Members.tsx` — dòng 284-286) nhưng không có backend
  đằng sau ⇒ đã bị thay bằng `Cấm tài khoản`/`Bỏ cấm tài khoản`.
- **Hệ quả:** `AC-MEM-13` khoá việc không còn nhãn "Xoá". Nếu sản phẩm thực sự cần xoá user thì phải
  quyết định mô hình (hard delete / soft delete / ẩn danh hoá) trước — xem `Q-MEM-5`.

### `D-MEM-2` — B1 không trả và không lọc `role`; sổ drift backend ghi sai về route đổi role

- B1 map response **không có** field `role` (`get-users.handler.ts:19-34`) dù repository có `innerJoin`
  role và `Account` có `roleCode` (`account.repository.impl.ts:48-51`, `account.entity.ts:74-76`).
- Filter repository chỉ nhận `status` + `keyword` (`account.repository.ts:7-10`).
- Docs service backend nói ngược lại: `users-list.md:79` — "Query accounts **role User**".
- Nghiêm trọng hơn, sổ drift backend `_meta/drift-register.md` mục **DRIFT-007** ghi:
  *"Route đổi vai trò hiện tại là `/api/v1/admin/users/{id}/role` (xem `admin.controller.ts:105`)"*.
  Runtime: `admin.controller.ts` **chỉ có 102 dòng** (không tồn tại dòng 105) và grep toàn `src/` cho
  `change-role|ChangeRole|/:id/role|updateRole` = **0 khớp**.
- **Hệ quả cho Stage 2:** không dựng role filter, không dựng role badge, không dựng UI đổi role. Đây
  cũng là lý do UI ghi rõ "danh sách có thể chứa cả tài khoản Admin" (`Members.tsx:689-696`).
- **Đề xuất:** sửa `DRIFT-007` (đánh dấu lỗi thời) và `users-list.md:79`; nếu cần filter role thì thêm
  `role` vào DTO + query server-side (`Q-MEM-1`).

### `D-MEM-3` — Ban/unban account không tồn tại trả **500**, không phải 404

- `ban-user.handler.ts:29` và `unban-user.handler.ts:15` ném `new Error('Account not found')` (plain
  `Error`) ⇒ `GlobalExceptionFilter` rơi vào nhánh 500 `INTERNAL_ERROR`, trái với convention
  (`conventions.md`: "Not found / not owned → 404").
- FE đã xử lý phòng thủ: 500 trên B3 ⇒ coi view stale, đóng dialog, cảnh báo, refetch
  (`Members.tsx:334-348`), có test khoá hành vi (`TC-MEM-08`).
- **Đề xuất:** backend đổi sang `NotFoundException` ⇒ FE có thể phân biệt 404 (không còn tồn tại) và 500
  (lỗi thật). Xem `Q-MEM-3`.

### `D-MEM-4` — `createdAt` có thể **vắng key** trong response B1/B2

- Handler dùng `a.createdAt?.toISOString()` (`get-users.handler.ts:32`, `get-user-detail.handler.ts:39`).
  `Account.createdAt` khai báo `Date` (non-null) nên trên thực tế key luôn có; nhưng nếu mapper trả
  `undefined` thì `JSON.stringify` **bỏ key** ⇒ response thiếu field.
- FE khai báo `createdAt: string | null` (`types/admin.ts:68`) và render `—` nếu thiếu
  (`Members.tsx:414-421`) ⇒ không vỡ UI.
- **Đề xuất:** bỏ `?.` ở handler (2 chỗ) để contract chặt lại.

### `D-MEM-5` — `userName` vs `username`, và response B3 khác docs

- B1/B2 trả `userName` (`get-users.handler.ts:22`, `get-user-detail.handler.ts:29`); B3 (ban) trả
  `username` (`ban-user.handler.ts:36`). Cùng khái niệm, hai tên khác nhau — đã verify và ghi ngay tại
  type (`types/admin.ts:63`).
- `users-update-status.md:37-58` mô tả response B3 là object user phẳng đầy đủ; runtime **không** như
  vậy: ban trả 8 field, unban trả 4 field (`ban-user.handler.ts:6-15`, `unban-user.handler.ts:20-25`).
- **Hệ quả:** FE khai báo `UpdateUserStatusResponse` với các field tuỳ chọn và **không** dùng response
  để patch state (`types/admin.ts:85-98`; `Members.tsx:317-322`). Đây chính là lý do `AC-MEM-15`.

### `D-MEM-6` — Không có admin API theo user cho gói đăng ký / quota AI / Sepay

- `grep -i 'quota|subscription|sepay'` trong `src/modules/admin` = **0 khớp**.
- `TokenQuotaService` giữ usage **trong memory** và đọc limit từ env backend
  (`AI_DAILY_TOKEN_LIMIT_FREE|PRO`, `SYSTEM_TOTAL_DAILY_TOKEN_LIMIT` trong `.env`) ⇒ không có nguồn dữ
  liệu bền để hiển thị theo từng user, và env key **không được** đưa xuống frontend.
- Mock cũ có 4 cột (`plan`, `duration`, `aiQuotaUsed/Limit`, `sepayNotificationsUsed/Limit`) đã bị **xoá
  hoàn toàn** khỏi bảng; thay bằng ghi chú giới hạn trong panel lọc (`Members.tsx:682-688`).
- **Đề xuất:** nếu sản phẩm cần, mở follow-up backend riêng (endpoint admin + quyết định dữ liệu), không
  dựng lại cột từ mock. Xem `Q-MEM-2`.

### `D-MEM-7` — Envelope phân trang của B1 lệch convention (`DRIFT-005`)

- `conventions.md` quy định `{items,totalCount,page,pageSize}`; B1 trả `{data, pagination:{...}}` và
  nhận `pageIndex` thay vì `page`. Đúng như `DRIFT-005` (drift-register) và `users-list.md:101`.
- FE **không** chuẩn hoá qua `src/lib/api/normalize.ts` (file này không tồn tại) mà khai báo type đúng
  runtime cho riêng B1 (`types/admin.ts:71-82`), vì Stage 2 chỉ có một list thuộc envelope này.
- Backend **không** clamp `pageIndex` theo `totalPages` (`pagination.ts:32-34`) ⇒ FE phải tự clamp
  (`AC-MEM-08`).

### `D-MEM-8` — State `list` không dùng `useState` cho pending: mọi setState đều ở nhánh async

- Ràng buộc thật: `eslint-plugin-react-hooks@7` bật `react-hooks/set-state-in-effect` ở mức **error**
  (`recommended` preset), nên **không** được `setState` đồng bộ trong effect.
- Hệ quả thiết kế: `Members` dùng cặp `{key, data}` cho list/detail (`Members.tsx:98-114`) để suy ra
  `initial-loading`/`refreshing`/`error` **không cần** setState trong effect, và debounce keyword được
  quyết định bằng `useRef` so sánh keyword lần trước (`:177-183`).
- Điểm cần lưu ý khi bảo trì: sửa `Members.tsx` mà thêm `setState` thẳng trong `useEffect` sẽ **fail
  `pnpm lint`**. Đây là lý do kỹ thuật, không phải sở thích.

### `D-MEM-9` — Debounce có thể phát request trung gian nếu keystroke cách nhau > 350 ms

- Debounce nằm ở **tầng fetch** (`Members.tsx:44`, `:177-183`) chứ không ở tầng URL: URL cập nhật ngay
  từng keystroke để `keyword` luôn là source of truth và không lệch với ô nhập.
- Hệ quả: nếu người dùng gõ chậm (hoặc main thread bị chặn > 350 ms do tải), request cho tiền tố
  (`keyword=a`) vẫn có thể được phát. **Đây là hành vi đúng của debounce**, không phải bug.
- Ban đầu test `TC-MEM-02` assert cứng "không bao giờ có request cho tiền tố" và đã **fail thật** khi
  chạy 5 worker song song (bằng chứng: `test-results/...-ngừng-gõ-và-reset-page-về-1/error-context.md`,
  `Received array: ["a"]`). Assertion đã được sửa sang kiểm **thời điểm** (không gửi ngay sau khi gõ +
  gửi sau ≥ 250 ms) — xem test plan §6.

### `D-MEM-10` — `statusReason` là tuỳ chọn ở cả hai phía

- Backend: `dto.statusReason?` (`admin.controller.ts:52`) và `ban(reason || 'No reason provided')`
  (`ban-user.handler.ts:31`) ⇒ cấm không nhập lý do sẽ lưu chuỗi `'No reason provided'` (tiếng Anh) vào
  `status_reason`.
- FE: ô lý do có nhãn `Lý do cấm (không bắt buộc)` và chỉ gửi khi có nội dung
  (`Members.tsx:839-847`, `adminUsers.ts:59-60`).
- **Hệ quả:** nếu admin bỏ trống, DB lưu literal tiếng Anh hiển thị lại trong cột `Trạng thái` và modal
  chi tiết. Không sai contract, nhưng là chi tiết UX/dữ liệu cần chốt — xem `Q-MEM-4`.

### `D-MEM-11` — Bảy primitive dùng chung được tạo mới, chưa có `Pagination`/`Toast`/`ConfirmDialog`

- Vì `src/components/ui/` chưa tồn tại, Stage 2 tạo 7 file **đúng đặc tả** `DESIGN_SYSTEM.md` §8.5:
  `Badge`, `Button`, `SectionCard`, `SearchInput`, `EmptyState`, `DataTable`, `Modal`.
- Chưa có: `StatCard`, `HeroCard`, `ProgressBar`, `PageHeader`, `Pagination`, `Toast`, `ConfirmDialog`,
  `LoadingState`, `ErrorState`, `ForbiddenState`, `AsyncBoundary`, `Field`/`FormError`.
- **Hệ quả:** pagination của `Members` vẫn là markup trong page (`:597-644`); success/warning dùng banner
  notice trong page thay vì `Toast`; confirm dùng `Modal` chung thay vì `ConfirmDialog` có tone.
  Các stage sau nên tách khi có page thứ hai dùng lại — xem `Q-MEM-7`.
- Điểm nhỏ: nút `X` của `Modal` vẫn hiển thị khi pending (dialog bị khoá bằng `onClose` no-op chứ không
  ẩn nút) ⇒ nên bổ sung prop `dismissible` khi tách `ConfirmDialog`.

### `D-MEM-12` — Chưa tạo `src/hooks/useAsync.ts` và `src/lib/api/normalize.ts` dù cây thư mục mục tiêu có

- `AGENTS.md` §1.1 và `graph.md` §7 liệt kê hai file này như đích đến khi nối API; Stage 2 **không** tạo.
- Lý do: chỉ một page dùng, và `Members` cần semantics riêng (giữ dữ liệu cũ khi refetch, key-based
  state, clamp trang, abort theo query). Trừu tượng hoá sớm sẽ chôn các quyết định này.
- **Đề xuất:** tạo `useAsync`/`normalize` ở stage có **page thứ hai** cùng lifecycle (Campaigns/Audit),
  rồi refactor `Members` sang đó — không làm ngược lại. Xem `Q-MEM-7`.

### `D-MEM-13` — Ràng buộc sandbox của môi trường agent (không phải lỗi code)

- `pnpm build` = `tsc -b && vite build` **fail trong sandbox** vì: (a) `tsc -b` không ghi được
  `node_modules/.tmp/*.tsbuildinfo` (`EPERM`), (b) `vite` gặp `spawn EPERM` khi `exec('net use')` trong
  `optimizeSafeRealPathSync` và khi nạp native binding `@tailwindcss/oxide`.
- Ngoài sandbox, cả 4 lệnh verify đều pass (2026-10-07). Đã ghi ở `AGENTS.md` §14 Step 5 (`G-6` của
  Stage 1) — Stage 2 gặp lại đúng hiện tượng, ghi lại để không ai kết luận sai là "build hỏng".

---

## 8. Câu hỏi cần owner quyết

| ID | Câu hỏi | Ảnh hưởng nếu chưa quyết | Đề xuất |
| --- | --- | --- | --- |
| `Q-MEM-1` | Có bổ sung `role` vào response B1/B2 **và** query `role` server-side không? | Danh sách tiếp tục trộn account `Admin`; không thể lọc theo vai trò; `AGENTS.md` §4.5 đang chặn dựng UI role khi contract chưa có | Chỉ làm nếu có yêu cầu nghiệp vụ rõ; khi làm thì phải sửa đồng thời handler + repository + docs service + `DRIFT-007`/`users-list.md:79` |
| `Q-MEM-2` | Gói đăng ký / hạn ngạch AI / usage Sepay theo user có thuộc roadmap admin không? | 4 cột cũ đã bị xoá; nếu cần thì phải có endpoint mới (không dựng lại từ mock) | Mở follow-up backend riêng: quyết định nguồn dữ liệu (bảng quota bền hay chỉ số tổng hợp) trước khi thiết kế UI |
| `Q-MEM-3` | Ban/unban account không tồn tại nên trả `404` thay vì `500`? | FE đang phải coi **mọi** 500 của B3 là "bản ghi đã cũ", che mất lỗi server thật | Sửa backend sang `NotFoundException` (2 dòng); FE đã sẵn nhánh 404 cho B2 |
| `Q-MEM-4` | Khi cấm mà không nhập lý do: để backend lưu `'No reason provided'` (hiện tại), bắt buộc nhập, hay đổi default tiếng Việt? | Chuỗi tiếng Anh hiển thị lại trên UI ở cột trạng thái và modal chi tiết | Bắt buộc nhập lý do ở FE (validate client) **hoặc** đổi default backend thành `null` |
| `Q-MEM-5` | Sản phẩm có cần **xoá** user (khác ban) không? | Mock cũ có nút "Xoá" nhưng không có backend; nếu cần thì đây là capability mới (migration + contract) | Giữ ban là biện pháp duy nhất ở v1; nếu cần xoá thì chốt mô hình dữ liệu trước |
| `Q-MEM-6` | Chạy `TC-MEM-06` (cấm/bỏ cấm thật) trên môi trường nào? | Case này đổi trạng thái account thật ⇒ không nên chạy trên DB dùng chung; hiện chỉ được xác thực một phần | Cấp một DB test riêng (hoặc account seed riêng chỉ dùng cho test) rồi chạy `TC-MEM-06` đầy đủ trong CI `@real` |
| `Q-MEM-7` | Có tách `useAsync`/`normalize` + `Pagination`/`Toast`/`ConfirmDialog` trước Stage 3 không? | Mỗi page mới sẽ lặp lại logic lifecycle/pagination/notice ⇒ trái `AGENTS.md` §12 | Tạo khi có page thứ hai cùng pattern; refactor `Members` ngay sau đó trong PR riêng |
| `Q-MEM-8` | `pageSize` chỉ 20/50/100 đã đủ chưa? | Nếu user cần mức khác thì sửa 1 dòng `PAGE_SIZE_OPTIONS` | Giữ 20/50/100 theo `AGENTS.md` §4.6; ghi nhận nếu có yêu cầu khác |

---

## 9. Traceability — `AC-MEM` ↔ `TC-MEM`

| AC | Test case | Loại | Trạng thái |
| --- | --- | --- | --- |
| `AC-MEM-01` | `TC-MEM-01`, `TC-MEM-03` | `@real` | pass 2026-10-07 |
| `AC-MEM-02` | `TC-MEM-02` | `@real` | pass |
| `AC-MEM-03` | `TC-MEM-03`, `TC-MEM-11` | `@real` + `@stub` | pass |
| `AC-MEM-04` | `TC-MEM-01`, `TC-MEM-04` | `@real` | pass |
| `AC-MEM-05` | `TC-MEM-01`, `02`, `03`, `11` | `@real` + `@stub` | pass |
| `AC-MEM-06` | `TC-MEM-02`, `TC-MEM-03` | `@real` | pass |
| `AC-MEM-07` | một phần `TC-MEM-02` | `@real` | **chưa đủ** (`G-MEM-4`) |
| `AC-MEM-08` | — | — | **chưa phủ** (`G-MEM-2`) |
| `AC-MEM-09` | `TC-MEM-05`, `TC-MEM-09` | `@real` + `@stub` | pass |
| `AC-MEM-10` | `TC-MEM-05` | `@real` | pass |
| `AC-MEM-11` | `TC-MEM-06` (cấm), `TC-MEM-07` | `@real` + `@stub` | pass một phần (`Q-MEM-6`) |
| `AC-MEM-12` | `TC-MEM-06` (bỏ cấm) | `@real` | **chạy một phần** (`Q-MEM-6`) + phủ logic bằng `@stub` |
| `AC-MEM-13` | `TC-MEM-06`, `TC-MEM-07` + kiểm tra tĩnh | hỗn hợp | pass |
| `AC-MEM-14` | `TC-MEM-06`, `TC-MEM-07` | hỗn hợp | pass |
| `AC-MEM-15` | `TC-MEM-06`, `TC-MEM-07`, `TC-MEM-08` | hỗn hợp | pass |
| `AC-MEM-16` | `TC-MEM-08` | `@stub` | pass (gián tiếp) |
| `AC-MEM-17` | `TC-MEM-07` | `@stub` | pass |
| `AC-MEM-18` | `TC-MEM-07`, `TC-MEM-10`, `TC-MEM-11`, `TC-MEM-12` | `@stub` | pass |
| `AC-MEM-19` | `TC-MEM-12` | `@stub` | pass |
| `AC-MEM-20` | `TC-MEM-08` | `@stub` | pass |
| `AC-MEM-21` | `TC-MEM-05` + kiểm tra tĩnh | hỗn hợp | pass |
| `AC-MEM-22` | — | kiểm tra tĩnh | pass |
| `AC-MEM-23` | — | kiểm tra tĩnh | pass |
| `AC-MEM-24` | — | kiểm tra tĩnh | pass |
| `AC-MEM-25` | — | kiểm tra tĩnh | pass |
| `AC-MEM-26` | — | chạy tay | pass (README §1) |

**Test case không map `AC` nào** (vẫn giữ vì khoá hành vi phụ):

| TC | Vì sao vẫn giữ |
| --- | --- |
| `TC-MEM-09` | nhánh detail lỗi + retry (biên của `AC-MEM-09`, không có AC riêng) |
| `TC-MEM-10` | khoá nhánh rỗng-tự-nhiên **không** hiện nút xoá filter (chống nhầm với `TC-MEM-11`) |

**Kết luận traceability:**

- **22/26** `AC-MEM` đạt đầy đủ bằng test UI (trong đó 5 đạt bằng kiểm tra tĩnh/chạy tay).
- `AC-MEM-08` (clamp trang) **chưa phủ** — cần thêm case `@stub` với response `page` vượt `totalPages`
  (`G-MEM-2`).
- `AC-MEM-07` (abort request cũ) chỉ được phủ **một phần**: `TC-MEM-02` chứng minh 1 keyword = 1 request,
  nhưng không chứng minh request cũ bị huỷ khi vẫn đang bay (`G-MEM-4`).
- `AC-MEM-11` (cấm) đã verified trên backend thật ở phần assertion PATCH/refetch/UI, nhưng **cả case**
  `TC-MEM-06` không chạy tới cuối nên chưa được tính là đạt đầy đủ.
- `AC-MEM-12` (bỏ cấm) đã verified ở tầng logic (`@stub`) và gián tiếp qua trạng thái dialog của
  `TC-MEM-06`, nhưng **chưa** chạy trọn vẹn trên backend thật (`Q-MEM-6`).
