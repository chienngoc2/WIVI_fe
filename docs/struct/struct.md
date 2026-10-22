# Cấu trúc source `WIVI_fe`

Đối chiếu cây file và import ngày 2026-10-07. Đây là **hiện trạng code**, kể cả các file Stage 3–6 đang chưa commit; không phải danh sách feature đã được kiểm chứng end-to-end. Trạng thái từng stage ở [`../plan/admin_api.md`](../plan/admin_api.md).

## Entrypoint và route

```text
index.html → src/main.tsx → AuthProvider → App.tsx
                                      ├─ /login → Login
                                      └─ RequireAdmin → AppLayout → Sidebar + TopNav + Outlet
                                                               ├─ / → Overview
                                                               ├─ /members → Members
                                                               ├─ /activity → Activity
                                                               ├─ /intelligence → Intelligence
                                                               ├─ /campaigns → Campaigns
                                                               ├─ /configuration → Configuration
                                                               └─ * → NotFound
```

`App.tsx` khai báo route; `Sidebar.tsx` khai báo sáu mục nav tương ứng. `RequireAdmin` kiểm tra `session.identity.role === 'Admin'`. `AppLayout.tsx` sở hữu shell; `TopNav.tsx` lấy identity từ session. Search, ticker và chuông của shell chưa có luồng nghiệp vụ.

## Cây thư mục có chức năng

```text
src/
├── App.tsx, main.tsx, index.css
├── components/
│   ├── AppLayout.tsx, Sidebar.tsx, TopNav.tsx
│   └── ui/
│       ├── Badge.tsx, Button.tsx, DataTable.tsx, EmptyState.tsx
│       └── Modal.tsx, SearchInput.tsx, SectionCard.tsx
├── context/
│   ├── AuthProvider.tsx
│   └── auth-context.ts
├── hooks/
│   └── useAuth.ts
├── lib/
│   ├── api/client.ts
│   ├── format.ts
│   └── session.ts
├── pages/
│   ├── Login.tsx, NotFound.tsx
│   ├── Overview.tsx, Members.tsx, Activity.tsx, Intelligence.tsx
│   └── Campaigns.tsx, Configuration.tsx
├── services/
│   ├── auth.ts, adminUsers.ts, adminBroadcasts.ts
│   └── adminAiSettings.ts, adminPlans.ts, adminDashboard.ts
└── types/
    └── admin.ts
```

| Nơi sở hữu | Vai trò hiện tại |
| --- | --- |
| `src/lib/api/client.ts` | HTTP client dùng chung: base URL, Bearer token, refresh/retry 401 và chuẩn hóa lỗi. Đây là nơi gọi `fetch` cho service. |
| `src/lib/session.ts` | Nơi duy nhất trong `src/` đọc/ghi/xóa `localStorage` của admin session. |
| `src/context/` + `src/hooks/useAuth.ts` | Session, identity và thao tác auth cho guard/shell/page. |
| `src/services/` | Mỗi file sở hữu các endpoint của một nhóm chức năng; page không gọi `fetch` trực tiếp. |
| `src/types/admin.ts` | Type FE cho auth, users, broadcasts, AI settings, plans, dashboard. Type là giả định compile-time; phải đối chiếu response backend thực tế. |
| `src/components/ui/` | Bảy primitive đã dùng trong Members và các page Stage 3–6. |
| `src/index.css` | Token Tailwind v4 và style toàn cục. |

## Page và dữ liệu

| Route | Page | Nguồn dữ liệu hiện tại |
| --- | --- | --- |
| `/` | `Overview.tsx` | `adminDashboard.ts`; 3 counter backend tính thật, 6 counter backend stub; chart placeholder. |
| `/members` | `Members.tsx` | `adminUsers.ts`; list/detail/status từ API. |
| `/activity` | `Activity.tsx` | Dữ liệu mẫu cục bộ; chưa có admin transaction-list API. |
| `/intelligence` | `Intelligence.tsx` | Dữ liệu mẫu cục bộ; chưa có admin risk/churn API hoặc audit UI. |
| `/campaigns` | `Campaigns.tsx` | Broadcast thủ công gọi `adminBroadcasts.ts`; GET hiện đọc sai envelope phân trang. Auto rules vẫn là local mock có thao tác. |
| `/configuration` | `Configuration.tsx` | AI settings và active plans gọi API; form AI và plan update còn mismatch ở kế hoạch §4/§7. Chưa có Categories UI. |

## Test và cấu hình

- `e2e/auth/` và `e2e/members/` là hai nhóm Playwright hiện có; chưa có test Stage 3–6.
- `playwright.config.ts` cùng `playwright.config.no-api-base.ts` cấu hình các suite; script thực tế nằm ở `package.json`.
- `.env.example` có placeholder `VITE_API_BASE_URL`; `src/lib/api/client.ts` đọc biến này. Không đưa token/secret vào biến `VITE_*`.
- `vite.config.ts` dùng plugin React và Tailwind; `src/index.css` là nguồn token. TypeScript build dùng `tsconfig.app.json` và `tsconfig.node.json`. Ghi chú về `strict` ở [`../typescript-strict.md`](../typescript-strict.md).
- Chưa có `src/services/adminCategories.ts`, `adminAuditLogs.ts`, `src/hooks/useAsync.ts`, `src/lib/api/normalize.ts` hoặc `src/theme/chart.ts`. Đây là cấu trúc từng được đề xuất, không phải import dùng được ngay.
- `src/App.css` và một số asset mẫu vẫn tồn tại nhưng không thuộc luồng render hiện tại. Không chỉnh chúng khi chỉ cập nhật contract/API.

Khi thêm route, cập nhật đồng thời `src/App.tsx` và `src/components/Sidebar.tsx`. Khi thêm HTTP call, đặt trong `src/services/` và dùng `src/lib/api/client.ts`; không tạo client khác trong page.
