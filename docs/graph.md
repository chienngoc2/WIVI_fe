# Sơ đồ phụ thuộc & luồng dữ liệu `WIVI_fe`

> **Mô tả hiện trạng đã kiểm chứng.** Mọi cạnh trong sơ đồ đều tương ứng một dòng `import` thật.
> Cây thư mục ở [`struct/struct.md`](./struct/struct.md). Quy tắc vận hành ở [`../AGENTS.md`](../AGENTS.md).

---

## 1. Điểm vào

```text
index.html
  └─ <script type="module" src="/src/main.tsx">
       └─ src/main.tsx
            ├─ import { StrictMode } from 'react'
            ├─ import { createRoot } from 'react-dom/client'
            ├─ import './index.css'          ← token + utility vào bundle
            └─ import App from './App.tsx'   ← ngoại lệ duy nhất có extension
                 └─ src/App.tsx
```

---

## 2. Sơ đồ phụ thuộc module (thực tế)

```text
                          src/App.tsx
                               │
        ┌──────────────────────┼──────────────────────────┐
        │                      │                          │
   ./components/          ./pages/                   (react-router-dom)
        │                      │
   ┌────┴────┐        ┌────┬───┴┬────┬────┬────┐
   │         │        │    │    │    │    │    │
Sidebar   TopNav  Overview Members Activity Intelligence Campaigns Configuration
   │         │        │      │      │       │          │           │
   │         │        │      │      │       │          │           │
 react-    phosphor  recharts │   recharts │      phosphor     phosphor
 router-   -icons      │    phosphor  +icons        -icons       -icons
 dom  +    + clsx      │     -icons              + react        + react
 phosphor              │    + react
 -icons                │
                     react
```

### Dạng bảng (dễ tra cứu hơn)

| File | `react` | `react-router-dom` | `recharts` | `@phosphor-icons/react` | `clsx` | Import nội bộ |
| --- | :-: | :-: | :-: | :-: | :-: | --- |
| `src/main.tsx` | ✓ | — | — | — | — | `./index.css`, `./App.tsx` |
| `src/App.tsx` | — | ✓ | — | — | — | 8 file (`components/` ×2, `pages/` ×6) |
| `src/components/Sidebar.tsx` | ✓ | ✓ | — | ✓ | ✓ | — |
| `src/components/TopNav.tsx` | ✓ | — | — | ✓ | — | — |
| `src/pages/Overview.tsx` | ✓ | — | ✓ | ✓ | — | — |
| `src/pages/Members.tsx` | ✓ | — | — | ✓ | — | — |
| `src/pages/Activity.tsx` | ✓ | — | ✓ | ✓ | — | — |
| `src/pages/Intelligence.tsx` | ✓ | — | ✓ | ✓ | — | — |
| `src/pages/Campaigns.tsx` | ✓ | — | — | ✓ | — | — |
| `src/pages/Configuration.tsx` | ✓ | — | — | ✓ | — | — |

### Bốn kết luận rút ra từ sơ đồ

1. **`App.tsx` là module duy nhất có import nội bộ.** 8/8 file còn lại chỉ import thư viện ngoài. **Không** có page → page, **không** có page → component, **không** có component → component.
2. **Đồ thị phụ thuộc là hình sao (star), độ sâu tối đa 2.** `main → App → {components, pages}`. Đây là trạng thái khoẻ mạnh để mở rộng — thêm `lib/`, `services/`, `hooks/` sẽ chèn vào giữa mà không phá gì.
3. **`Sidebar` và `TopNav` là anh em, không lồng nhau.** Cả hai đều là con trực tiếp của `App.tsx`, nằm ở hai nhánh layout khác nhau.
4. **`recharts` chỉ có ở 3/6 page** (`Overview`, `Activity`, `Intelligence`) — đúng 3 page "đọc dữ liệu". 3 page "thao tác" (`Members`, `Campaigns`, `Configuration`) không vẽ chart.

---

## 3. Sơ đồ cây render

```text
<App>
└─ <BrowserRouter>
   └─ div.w-full.h-screen.flex.bg-canvas.overflow-hidden.relative      ← shell
      ├─ <Sidebar />                    aside.w-60.bg-white.border-r
      │                                   ├─ Brand logo   h-14
      │                                   ├─ nav  ← 6 NavLink (map từ navItems[])
      │                                   └─ Footer  ← hard-code "v2.4.1-build…"
      │
      └─ div.flex-1.flex.flex-col.overflow-hidden
         ├─ <TopNav />                  header h-14
         │                                ├─ Search box  (KHÔNG handler)
         │                                ├─ Ticker      (hard-code)
         │                                ├─ Bell        (KHÔNG handler)
         │                                └─ Identity    (hard-code)
         │
         └─ <main>.flex-1.overflow-y-auto.bg-canvas.p-6.scrollbar-premium
            └─ <Routes>                 ← 6 route phẳng, KHÔNG guard, KHÔNG fallback
               ├─ "/"              → <Overview />
               ├─ "/members"       → <Members />
               ├─ "/activity"      → <Activity />
               ├─ "/intelligence"  → <Intelligence />
               ├─ "/campaigns"     → <Campaigns />
               └─ "/configuration" → <Configuration />
```

**Đối chiếu với đồ thị import:** shell này hard-code trong `App.tsx:15-31` cho **mọi** path. Chưa có `AppLayout` tách riêng, chưa có route `/login`, chưa có route `*` → 404.

---

## 4. Luồng dữ liệu hiện tại — **hoàn toàn cục bộ**

```text
   ┌────────────────────────────────────────────────────────────────┐
   │  KHÔNG CÓ TẦNG DỮ LIỆU                                         │
   │  fetch / axios / import.meta.env  =  0 chỗ                     │
   │  createContext / useContext / localStorage  =  0 chỗ           │
   └────────────────────────────────────────────────────────────────┘

   const mock X = [...]   (module-level, khai báo đầu file page)
            │
            │  đọc trực tiếp, không qua props, không qua hook
            ▼
   ┌──────────────────────────────────────────────┐
   │  page component                              │
   │                                              │
   │  useState  ──►  useMemo  ──►  JSX render     │
   │  (37 chỗ)       (3 chỗ)        (chart/table)  │
   └──────────────────────────────────────────────┘
            │
            │  mutation "giả"
            ▼
      alert() / confirm()      ← 6 chỗ, không gọi backend
```

### Nơi `useState` / `useMemo` thực sự được dùng

| Hook | Tổng số chỗ | File |
| --- | :-: | --- |
| `useState` | 37 | `Configuration.tsx` (19), `Campaigns.tsx` (13), `Members.tsx` (3), `Activity.tsx` (2), `Overview.tsx` (0), `Intelligence.tsx` (0) |
| `useMemo` | 3 | `Activity.tsx` (2), `Members.tsx` (1) |
| `useEffect` | **0** | — |
| `useCallback` | **0** | — |
| `useRef` | **0** | — |

> **Đọc bảng này thế nào:** `useEffect`/`useCallback`/`useRef` = 0 nghĩa là **chưa từng có nhu cầu đồng bộ với bên ngoài** (network, timer, DOM). Đây là dấu hiệu rõ nhất cho thấy app chưa nối backend. Khi thêm `useAsync`/`useDebouncedValue`, ba hook này sẽ xuất hiện — đó là thay đổi hợp lệ, không phải vi phạm convention.

### Dữ liệu mock khai báo ở đâu

| Page | Const/type module-level | Có annotate type? |
| --- | --- | --- |
| `Overview.tsx` | `userGrowthData` `:5`, `revenueTrendData` `:14`, `segments` `:23`, `activeUsers` `:30`, `activities` `:37` | ✗ |
| `Members.tsx` | `interface Member` `:4`, `mockMembers: Member[]` `:20` | ✓ |
| `Activity.tsx` | `revenueData` `:5`, `customerTransactions` `:15`, `subscriptionTransactions` `:24`, `categoryIcons: Record<string, React.ReactNode>` `:34` | ✗ (trừ cái cuối) |
| `Intelligence.tsx` | `behaviorTrends` `:5`, `riskUsers` `:14`, `churnUsers` `:20`, `goalAchievers` `:26`, `radarData` `:32` | ✗ |
| `Campaigns.tsx` | `type Channel/TriggerType/RuleStatus` `:4-6`, `interface Campaign/AutoRule/ChannelOption` `:8-32`, `mockCampaigns: Campaign[]` `:34`, `segments` `:41`, `manualChannelOptions` `:49`, `autoChannelOptions` `:55` | ✓ |
| `Configuration.tsx` | — | — |

⇒ Quy tắc quyết định khi nào bắt buộc khai type: [`../AGENTS.md`](../AGENTS.md) §8.

---

## 5. Luồng design token

```text
   src/index.css
        │
        ├─ @theme { ... }            ← 44 token màu + 3 font + 5 radius
        │       │
        │       └─► Tailwind v4 sinh utility: bg-canvas, text-ink,
        │           rounded-panel, border-hairline, shadow-premium-sm…
        │
        ├─ @layer base { ... }       ← reset + body font + scrollbar
        │
        └─ @utility { ... }          ← 10 utility tuỳ biến:
                shadow-premium-sm / shadow-premium / shadow-premium-lg
                shadow-float / shadow-primary / shadow-primary-sm
                bg-hero-primary / border-double-bezel
                scrollbar-none / scrollbar-premium
                     │
                     ▼
        dùng trong className của page/component

   ⚠ KHÔNG có tailwind.config.js / postcss.config.js
   ⚠ KHÔNG có file CSS thứ hai (App.css tồn tại nhưng 0 nơi import)
   ⚠ KHÔNG có src/theme/chart.ts  → 3 page đang hard-code màu cho Recharts
```

---

## 6. Bảng route ↔ nav (phải luôn đồng bộ)

| # | Route (`App.tsx`) | Nav item (`Sidebar.tsx`) | Icon | Trạng thái |
| :-: | --- | --- | --- | --- |
| 1 | `/` `:23` | `'Tổng quan'` `:8` | `SquaresFour` | ⚠ thiếu `end` → match mọi path con |
| 2 | `/members` `:24` | `'Thành viên'` `:9` | `Users` | ✓ |
| 3 | `/activity` `:25` | `'Nhật ký giao dịch'` `:10` | `ArrowsLeftRight` | ⚠ backend **không có endpoint** |
| 4 | `/intelligence` `:26` | `'Hệ thống AI & Sepay'` `:11` | `Brain` | ✓ |
| 5 | `/campaigns` `:27` | `'Chiến dịch gửi tin'` `:12` | `Megaphone` | ✓ |
| 6 | `/configuration` `:28` | `'Cấu hình hệ thống'` `:13` | `Sliders` | ✓ |

Hai danh sách này **khai báo độc lập ở hai file**, thứ tự hiện trùng nhau nhưng không có gì ràng buộc. Thêm route mà quên `Sidebar` (hoặc ngược lại) sẽ tạo màn hình không tới được. Xem [`../AGENTS.md`](../AGENTS.md) §4.2.

---

## 7. Điểm nối tương lai (khi thêm API layer)

Sơ đồ dưới đây là **đích đến**, chưa có gì trong đó tồn tại:

```text
   page  ──►  hooks/useAsync  ──►  services/<domain>.ts  ──►  lib/api/client.ts
     │                                                            │
     │                                                            ├─► import.meta.env.VITE_API_BASE_URL
     │                                                            ├─► lib/api/normalize.ts  (4 shape envelope)
     │                                                            └─► lib/session.ts  ← cửa DUY NHẤT vào localStorage
     │
     └─►  components/ui/*   (SectionCard, DataTable, Badge…)

   context/AuthContext  ◄──  hooks/useAuth  ◄──  components/AppLayout (guard + shell)
```

**Đường cắt hợp lệ:** page hiện gọi mock trực tiếp. Khi nối API, thay điểm đọc mock bằng `useAsync` — **không** đổi cấu trúc JSX, **không** đổi tên component. Đó là lý do thứ tự ưu tiên là **`reuse > extend > create new`**.

---

## 8. Tóm tắt bằng một câu

> `WIVI_fe` hiện là **một cây render hình sao, độ sâu 2, dữ liệu 100% mock cục bộ, không có tầng dữ liệu, không có state toàn cục, không có auth** — mọi sơ đồ trong tài liệu (`services/`, `hooks/`, `lib/`, `context/`, `components/ui/`) đều là **đích đến cần tạo**, không phải thứ đang có.
