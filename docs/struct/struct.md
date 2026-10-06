# Cấu trúc thư mục `WIVI_fe`

> **Mô tả hiện trạng đã kiểm chứng**, không phải trạng thái mục tiêu.
> Mọi con số trong file này lấy trực tiếp từ cây thư mục tại thời điểm viết.
> Cây mục tiêu (sau khi nối API) nằm ở [`../AGENTS.md`](../AGENTS.md) §1.1.

---

## 1. Cây thư mục thật

```text
WIVI_fe/
├── index.html                    # entry HTML; nạp Inter từ Google Fonts, mount #root
├── package.json                  # script + dependency
├── vite.config.ts                # CHỈ plugins: [react(), tailwindcss()]
├── eslint.config.js              # flat config
├── tsconfig.json                 # solution-style (files: [], references) — KHÔNG compile gì
├── tsconfig.app.json             # compile src/
├── tsconfig.node.json            # compile vite.config.ts
├── .env                          # VITE_API_BASE_URL (bị .gitignore, KHÔNG file nào đọc)
├── .gitignore
├── README.md                     # template Vite mặc định — không có instruction dự án
│
├── public/
│   ├── favicon.svg               # ✓ dùng (index.html:5)
│   └── icons.svg                 # ✗ 0 tham chiếu
│
├── docs/                         # ← thư mục này
│   ├── README.md
│   ├── graph.md
│   ├── typescript-strict.md
│   └── struct/
│       └── struct.md
│
├── .github/workflows/
│   └── ci.yml                    # Node 20 + pnpm 9 → pnpm lint, pnpm build
│
└── src/
    ├── main.tsx                  # 9 dòng  — bootstrap React
    ├── App.tsx                   # 35 dòng — shell + 6 route
    ├── index.css                 # 132 dòng — @theme token + @layer base + @utility
    ├── App.css                   # 158 dòng — ✗ CODE CHẾT, 0 nơi import
    │
    ├── assets/
    │   ├── hero.png              # ✗ 0 tham chiếu
    │   ├── react.svg             # ✗ 0 tham chiếu
    │   └── vite.svg              # ✗ 0 tham chiếu
    │
    ├── components/               # 2 file — toàn bộ component dùng chung hiện có
    │   ├── Sidebar.tsx           # 76 dòng
    │   └── TopNav.tsx            # 46 dòng
    │
    └── pages/                    # 6 file — mỗi file = 1 route
        ├── Overview.tsx          # 222 dòng  →  /
        ├── Members.tsx           # 352 dòng  →  /members
        ├── Activity.tsx          # 282 dòng  →  /activity
        ├── Intelligence.tsx      # 210 dòng  →  /intelligence
        ├── Campaigns.tsx         # 644 dòng  →  /campaigns
        └── Configuration.tsx     # 279 dòng  →  /configuration
```

**Tổng `src/`: 12 file nguồn, 2.445 dòng** (chưa tính `assets/`).
Trong đó **158 dòng là code chết** (`App.css`).

---

## 2. Những thư mục **KHÔNG** tồn tại

Tài liệu (`DESIGN_SYSTEM.md` §8, `ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md` §7/§9.2) mô tả các thư mục này như thể đã có. **Thực tế không có cái nào.**

| Thư mục | Dùng để làm gì (theo tài liệu) | Trạng thái |
| --- | --- | --- |
| `src/lib/` | `format.ts`, `session.ts`, `api/client.ts`, `api/normalize.ts` | ❌ chưa có |
| `src/services/` | 8 file service gọi API | ❌ chưa có |
| `src/hooks/` | `useAsync`, `useAuth`, `useDebouncedValue` | ❌ chưa có |
| `src/types/` | `admin.ts` — DTO của API | ❌ chưa có |
| `src/context/` | `AuthContext.tsx` | ❌ chưa có |
| `src/theme/` | `chart.ts` — màu chart | ❌ chưa có |
| `src/components/ui/` | 12 primitive: `SectionCard`, `DataTable`, `Badge`… | ❌ chưa có |

⇒ `src/` có **đúng 2 thư mục con thật sự được dùng**: `components/` và `pages/` (cộng `assets/` chết).

---

## 3. Vai trò từng file nguồn

### 3.1 Điểm vào

| File | Dòng | Vai trò | Ghi chú |
| --- | --- | --- | --- |
| `index.html` | 16 | Entry HTML | Nạp Inter (weight 300–700) từ Google Fonts; `<body class="bg-canvas text-ink antialiased">` |
| `src/main.tsx` | 9 | Bootstrap | `StrictMode` + `createRoot`; `import './index.css'` |
| `src/App.tsx` | 35 | Shell + route table | `BrowserRouter`, shell hard-code, 6 route phẳng, **không** guard / 404 / lazy |

`src/main.tsx` là **file duy nhất trong `src/` ghi phần mở rộng khi import** (`'./App.tsx'`). 100% file còn lại import không extension.

### 3.2 Component dùng chung — `src/components/`

| File | Dòng | Vai trò | Vấn đề đã biết |
| --- | --- | --- | --- |
| `Sidebar.tsx` | 76 | Nav dọc 240px, 6 mục, `NavLink` + `clsx` | Mục `/` **thiếu `end`** (`:34`) → match mọi path con. Footer hard-code `v2.4.1-build // 100,240 nút hoạt động` |
| `TopNav.tsx` | 46 | App bar 56px: ô search + chuông + identity | Identity hard-code `"Nicholas Gray"` / `"Giám đốc Vận hành"` (`:40-41`). Search (`:14-18`) và chuông (`:30-33`) **không có handler** |

Hai file này là **anh em (sibling)**, không lồng nhau — `App.tsx` render cả hai ở hai nhánh layout khác nhau.

### 3.3 Page — `src/pages/`

| File | Dòng | Route | Nav label | State | Mock module-level | Có type? |
| --- | --- | --- | --- | --- | --- | --- |
| `Overview.tsx` | 222 | `/` | Tổng quan | **0** | 5 const | ✗ |
| `Members.tsx` | 352 | `/members` | Thành viên | 3 `useState` | `mockMembers` | ✓ `interface Member` |
| `Activity.tsx` | 282 | `/activity` | Nhật ký giao dịch | 3 `useState` + 2 `useMemo` | 4 const | ✗ (trừ `Record<string, React.ReactNode>`) |
| `Intelligence.tsx` | 210 | `/intelligence` | Hệ thống AI & Sepay | **0** | 5 const | ✗ |
| `Campaigns.tsx` | 644 | `/campaigns` | Chiến dịch gửi tin | 13 `useState` | 4 const + 3 type + 3 interface | ✓ |
| `Configuration.tsx` | 279 | `/configuration` | Cấu hình hệ thống | 19 `useState` | 0 const | ✗ |

**Quan sát:** kích thước page **không** tỉ lệ với độ phức tạp nghiệp vụ mà tỉ lệ với số `useState`. `Campaigns.tsx` (644 dòng) và `Configuration.tsx` (279 dòng) chiếm 38% code `src/` nhưng chỉ là form + table trên mock data.

---

## 4. File chết và dependency chết

### 4.1 File chết

| File | Kích thước | Bằng chứng |
| --- | --- | --- |
| `src/App.css` | 158 dòng / 3.075 B | tìm `App.css` trong `src/` = **0 kết quả** |
| `src/assets/hero.png` | 13.057 B | 0 tham chiếu |
| `src/assets/react.svg` | 4.126 B | 0 tham chiếu |
| `src/assets/vite.svg` | 8.710 B | 0 tham chiếu |
| `public/icons.svg` | 5.055 B | 0 tham chiếu |

### 4.2 Dependency chết trong `package.json`

| Package | Tham chiếu trong `src/` |
| --- | --- |
| `motion` | **0** |
| `tailwind-merge` | **0** |

> `tailwind-merge` thường đi kèm `clsx`. Repo có `clsx` và **đang dùng thật** ở `Sidebar.tsx`, nhưng `tailwind-merge` chưa bao giờ được gọi. **Không** bắt đầu dùng nó — xem `AGENTS.md` §13 rule 7.

---

## 5. Nơi cấu hình thực sự nằm

| Việc cấu hình | Nằm ở đâu | **Không** nằm ở đâu |
| --- | --- | --- |
| Design token (màu, radius, font) | `src/index.css` khối `@theme` | ❌ không có `tailwind.config.*` |
| Utility tuỳ biến (`shadow-premium`, `bg-hero-primary`…) | `src/index.css` khối `@utility` | ❌ không có file CSS thứ hai |
| Base style toàn cục | `src/index.css` khối `@layer base` | ❌ không trong `App.css` (file chết) |
| Plugin build | `vite.config.ts` — chỉ `[react(), tailwindcss()]` | ❌ không có `resolve.alias`, không `server.proxy` |
| Alias import | — | ❌ không có ở `vite.config.ts` **lẫn** `tsconfig.app.json` |
| Biến môi trường | `.env` → `VITE_API_BASE_URL` | ❌ **0 file đọc**; không có `.env.example` |
| TypeScript | `tsconfig.app.json` + `tsconfig.node.json` | `tsconfig.json` gốc là solution-style, **không** compile gì |

---

## 6. Đối chiếu nhanh: tài liệu nói gì vs thực tế có gì

| Hạng mục | Tài liệu mô tả | Thực tế |
| --- | --- | --- |
| `src/components/ui/` — 12 primitive | Có code mẫu đầy đủ trong `DESIGN_SYSTEM.md` §8.5 | ❌ thư mục không tồn tại |
| `src/lib/format.ts` | Được chỉ định là nơi format tiền/số/ngày | ❌ không tồn tại; tiền hard-code trong JSX |
| `src/services/*` — 8 file | Có bảng endpoint đầy đủ trong `ADMIN_INTEGRATION_PLAN.md` | ❌ không tồn tại |
| Auth + `AuthContext` | `BRIEF` §10.4 mô tả chi tiết | ❌ 0 chỗ `createContext`/`localStorage` |
| Route guard + `NotFound` | `BRIEF` §9.1 | ❌ 6 route phẳng, không guard, không fallback |
| Tailwind config | — | ❌ không có; Tailwind v4 cấu hình trong CSS |

**Cách đọc bảng này:** cột "Tài liệu" mô tả **hợp đồng mục tiêu**, cột "Thực tế" là **hiện trạng**. Khi làm việc, tin cột phải; khi thiết kế feature mới, theo cột trái.

---

## 7. Quy tắc đặt file mới

Bảng đầy đủ ở [`../AGENTS.md`](../AGENTS.md) §1.2. Tóm tắt:

```text
Route mới        →  src/App.tsx  +  src/components/Sidebar.tsx   (cập nhật CẢ HAI)
Page mới         →  src/pages/<PascalCase>.tsx                    (export named)
Component chung  →  src/components/<PascalCase>.tsx
Primitive UI     →  src/components/ui/<PascalCase>.tsx            (chưa tồn tại — phải tạo)
Gọi HTTP         →  src/services/<domain>.ts                      (chưa tồn tại — phải tạo)
Token/utility    →  src/index.css                                 (KHÔNG tạo file theme thứ hai)
```

⚠️ Bảng trên trộn **hiện trạng** (`App.tsx`, `Sidebar.tsx`, `pages/`) với **đích đến** (`components/ui/`, `services/`). Xem `AGENTS.md` §0 trước khi import bất cứ thứ gì chưa tồn tại.
