# Phụ thuộc và luồng dữ liệu `WIVI_fe`

Đối chiếu source ngày 2026-10-07. Sơ đồ này mô tả **code hiện có**; mũi tên request không khẳng định contract đã đúng hoặc test end-to-end đã pass. Trạng thái từng flow ở [`plan/admin_api.md`](./plan/admin_api.md).

## Render và quyền truy cập

```text
index.html
  → main.tsx
    → AuthProvider
      → App.tsx / BrowserRouter
        ├─ /login → Login → services/auth.ts
        └─ RequireAdmin (session + role === 'Admin')
          → AppLayout
            ├─ Sidebar (6 NavLink)
            ├─ TopNav (identity từ AuthProvider)
            └─ Outlet (6 page quản trị hoặc NotFound)
```

`RequireAdmin` đưa khách hoặc session không có role `Admin` về `/login`. Shell chỉ render sau guard. `Sidebar` và `App.tsx` có hai danh sách route/nav riêng nên phải sửa cùng nhau khi thêm page. `TopNav` hiển thị identity từ session; search/ticker/chuông chưa có API nghiệp vụ.

## Luồng API

```text
Page → service theo domain → lib/api/client.ts → /api/v1/*
                              ↑                     │
                         lib/session.ts ← auth refresh/session
```

`apiRequest` trong `lib/api/client.ts` gắn Bearer token và thử refresh khi gặp 401. `lib/session.ts` là nơi duy nhất lưu session vào `localStorage`. Page giữ state hiển thị và gọi service; không gọi `fetch` trực tiếp. `types/admin.ts` mô tả DTO FE, nhưng TypeScript generic không kiểm tra shape JSON lúc runtime.

| Page | Service | Backend/hiện trạng |
| --- | --- | --- |
| `Login.tsx` | `auth.ts` | Login/logout/refresh đã có code và test auth. |
| `Members.tsx` | `adminUsers.ts` | GET list/detail, PATCH status. URL search params là nguồn filter/page. Test đọc backend thật và stub có trong `e2e/members/`; ca mutation thật chưa chạy trọn vẹn. |
| `Campaigns.tsx` | `adminBroadcasts.ts` | GET/POST broadcasts, GET stats. Xác nhận modal, fan-out thông báo tới user Active, tỷ lệ đã đọc và lọc status. Đã bỏ mock automation. |
| `Configuration.tsx` | `adminAiSettings.ts`, `adminPlans.ts` | GET/PATCH AI settings, GET/POST/PATCH plans. AI form submit thiếu `preventDefault`; rebalance cho sửa nhưng không PATCH. Plan update gửi field backend bỏ qua; list chỉ có active plans. |
| `Overview.tsx` | `adminDashboard.ts` | GET dashboard, GET registrations time-series (chuỗi đăng ký theo thời gian có zero-fill). |
| `Activity.tsx` | `adminRevenue.ts`, `adminPlans.ts` | Sổ cái mua gói: GET orders (phân trang/lọc trạng thái/gói/tìm kiếm), GET revenue (tốc độ tăng trưởng doanh thu, doanh thu theo gói, đơn SePay). 100% dữ liệu thật. |
| `Intelligence.tsx` | `adminAiUsage.ts`, `adminSepay.ts`, `adminAiSettings.ts`, `adminRevenue.ts` | Vận hành AI & SePay: GET AI usage report, GET SePay webhook stats, GET AI settings. 100% dữ liệu thật, không còn mock. |

## Các nhánh mock và giới hạn backend

```text
Campaigns / auto rules → useState + alert/confirm
Activity / ledger    → hằng số local + filter local
Intelligence         → hằng số local + chart local
```

Auto rules hiển thị nhãn mock/chưa khả dụng nhưng nút thêm/sửa/xóa/bật tắt vẫn hoạt động trên state local và có số “Đang chạy”. Các trạng thái đó **không** đại diện tác vụ trên backend. `Activity` và `Intelligence` cũng chưa được thay bằng API admin phù hợp. Categories và audit logs có API/backend design nhưng chưa có service/page flow FE.

## Design token và vị trí đặt code

```text
src/index.css (@theme, @utility) → Tailwind classes trong layout/page/ui
src/components/ui/            → primitive không biết endpoint
src/pages/                    → UI state, gọi service
src/services/                 → request theo domain qua apiRequest
src/lib/api/client.ts         → fetch, auth header, refresh, lỗi chung
```

Không có `src/theme/chart.ts`; chart còn ở `Activity`/`Intelligence` là dữ liệu mẫu. Các primitive thực có trong `src/components/ui/`; xem cây file ở [`struct/struct.md`](./struct/struct.md).

## Route ↔ menu

| Route `App.tsx` | Page | Menu `Sidebar.tsx` |
| --- | --- | --- |
| `/` | `Overview` | Tổng quan |
| `/members` | `Members` | Thành viên |
| `/activity` | `Activity` | Nhật ký giao dịch |
| `/intelligence` | `Intelligence` | Hệ thống AI & Sepay |
| `/campaigns` | `Campaigns` | Chiến dịch gửi tin |
| `/configuration` | `Configuration` | Cấu hình hệ thống |

`/login` là route công khai, không có mục menu. Route `*` đi tới `NotFound` bên trong shell cho Admin.
