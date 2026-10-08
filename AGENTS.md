# WIVI Admin Web (`WIVI_fe`) — Agent Coding Rules

> **Cập nhật hiện trạng 2026-10-07:** §0 và những câu trong file này nói `src/services/`, `src/lib/`, auth, HTTP, test runner hoặc `src/components/ui/` “chưa tồn tại” là snapshot **trước Stage 1**. Các thư mục đó hiện đã có; Stage 3–6 còn lỗi/giới hạn được ghi tại [`docs/plan/admin_api.md`](docs/plan/admin_api.md). Quy tắc đặt code và bảo vệ contract ở các phần sau vẫn áp dụng; luôn kiểm tra source thực tế trước khi kết luận một file chưa có.

> **Áp dụng cho:** mọi thay đổi trong `WIVI_fe/`.
> **Thứ tự ưu tiên nguồn sự thật:** code đang chạy trong `src/` → `DESIGN_SYSTEM.md` → `ADMIN_INTEGRATION_PLAN.md` → `ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md` → file này.
> Khi tài liệu và code mâu thuẫn: **runtime thắng cho hành vi hiện tại**, tài liệu thắng cho **hợp đồng mục tiêu**; chênh lệch phải được ghi rõ trong PR, không được âm thầm chọn một bên.
> Repo liên quan: backend `WVI/Personal_Finance_App` (NestJS, prefix `/api/v1`) là **nguồn có thẩm quyền cho contract API**. Mobile `WVI/WIVI` là nguồn cho design token gốc.

---

## 0. Snapshot repo trước Stage 1 (chỉ để đối chiếu lịch sử)

Đây là **hiện trạng đã kiểm chứng tại thời điểm viết rule ban đầu**, trước khi triển khai Stage 1–6; **không còn là hiện trạng source**. Xem [`docs/struct/struct.md`](docs/struct/struct.md) và [`docs/graph.md`](docs/graph.md) cho cây và luồng đang có.

| Hạng mục | Hiện trạng thật | Bằng chứng |
| --- | --- | --- |
| `src/` chỉ có 4 thư mục | `components/`, `pages/`, `assets/` + 4 file gốc | `Get-ChildItem src -Recurse -Directory` |
| **Không tồn tại** | `src/lib/`, `src/services/`, `src/hooks/`, `src/types/`, `src/context/`, `src/theme/`, `src/components/ui/` | kiểm tra `Test-Path` đều `False` |
| Component dùng chung | **Chỉ 2 file**: `Sidebar.tsx`, `TopNav.tsx` | `src/components/` |
| `SectionCard`, `StatCard`, `HeroCard`, `DataTable`, `Badge`, `Button`, `Modal`, `EmptyState`, `src/lib/format.ts`, `src/theme/chart.ts` | **Chưa tồn tại**, dù `AGENTS.md` cũ / `DESIGN_SYSTEM.md` §8 / BRIEF §9.2 đã đặc tả code cho chúng | grep `src/` = 0 |
| HTTP / API | **0 chỗ**. Không `fetch`, không `axios`, không `import.meta.env` | grep `fetch\(|axios|import.meta.env` = 0 |
| Auth / session / global state | **0 chỗ**. Không `createContext`, không `useContext`, không `localStorage` | grep = 0 |
| `VITE_API_BASE_URL` | Có trong `.env` nhưng **không file nào đọc**; `.env` còn bị `.gitignore` (không có `.env.example`) | `.env:1`, `.gitignore` |
| Routing | 6 route phẳng khai báo trong `App.tsx`, **không** 404, **không** guard, **không** lazy | `src/App.tsx:22-29` |
| Dữ liệu | Toàn bộ là mock module-level const; 4/6 page có `useState` | `Overview.tsx:5-42`, `Members.tsx:20-126` |
| Mutation | Chỉ `alert()` / `confirm()` | `Campaigns.tsx:108,133,146,158,179`, `Configuration.tsx:32` |
| Design token | **Đã áp dụng đầy đủ** trong `index.css` | `src/index.css:3-70` |
| TypeScript `strict` | ⚠️ **Chưa có hiệu lực.** Có `"strict": true` trong `tsconfig.json` gốc, nhưng file đó là solution-style (`"files": []` + `references`) nên `compilerOptions` của nó **không áp dụng** cho `tsconfig.app.json` / `tsconfig.node.json` ⇒ `src/` **vẫn chưa** được check strict. Code **đã pass strict sạch (0 lỗi)** khi test thật | `npx tsc -p tsconfig.app.json --showConfig` **không** in ra `strict`. Chi tiết + cách sửa: [`docs/typescript-strict.md`](docs/typescript-strict.md) |
| `as any` | **0 chỗ** (BRIEF §14 còn ghi 4 chỗ ở `Campaigns.tsx` — đã lỗi thời) | grep `as any` = 0 |
| Alias import | **Không có**. `vite.config.ts` không có `resolve.alias`; tsconfig không có `paths` | `vite.config.ts:1-8`, `tsconfig.app.json` |
| Test | **Không có** runner, không script `test` | `package.json:6-11` |
| Code chết | `src/App.css` (158 dòng, **không được import**); `motion` + `tailwind-merge` trong `package.json` nhưng **0 chỗ dùng**; `src/assets/{hero.png,react.svg,vite.svg}`, `public/icons.svg` **0 chỗ dùng** | grep = 0 |
| Baseline verify | `pnpm lint` = **pass (exit 0)**; `tsc -p tsconfig.app.json --noEmit` = **pass (0 lỗi)**; `tsc -p tsconfig.node.json --noEmit` = **pass** | đã chạy |

**Hệ quả cho agent:** bảng §0 chỉ là snapshot lịch sử. Kiểm tra file thật bằng `rg --files src` trước khi import/tạo mới; `src/lib/format.ts` và bảy primitive trong `src/components/ui/` hiện đã tồn tại.

---

## 1. Project Architecture

### 1.1 Cây thư mục mục tiêu (suy ra từ BRIEF §7 + INTEGRATION_PLAN §7, đã đối chiếu code)

BRIEF §7 và INTEGRATION_PLAN §7 đặc tả **cùng một** cây. Đây là cây có thẩm quyền để đặt file mới:

```text
src/
├── App.tsx                 # route table + guard (đang có)
├── main.tsx                # bootstrap (đang có)
├── index.css               # @theme token + @utility (đang có — KHÔNG tạo file theme thứ hai)
├── lib/
│   ├── api/client.ts       # fetch wrapper: base URL, auth header, 401 hook, error normalize
│   ├── api/normalize.ts    # list-response normalizer (xem §5.5)
│   ├── session.ts          # cửa DUY NHẤT truy cập localStorage
│   └── format.ts           # money/number/date formatter
├── types/
│   └── admin.ts            # DTO types cho endpoint admin
├── services/               # CHỈ nơi này được gọi HTTP
│   ├── auth.ts
│   ├── adminUsers.ts
│   ├── adminDashboard.ts
│   ├── adminCategories.ts
│   ├── adminBroadcasts.ts
│   ├── adminAuditLogs.ts
│   ├── adminAiSettings.ts
│   └── adminPlans.ts
├── hooks/
│   ├── useAsync.ts
│   ├── useAuth.ts
│   └── useDebouncedValue.ts
├── context/
│   └── AuthContext.tsx
├── theme/
│   └── chart.ts
├── components/
│   ├── AppLayout.tsx        # shell tách từ App.tsx
│   ├── Sidebar.tsx          # (đang có)
│   ├── TopNav.tsx           # (đang có)
│   └── ui/                  # primitive, KHÔNG business, KHÔNG HTTP
└── pages/
    ├── Login.tsx            # mới
    ├── NotFound.tsx         # mới
    └── <6 page hiện có>
```

### 1.2 Bảng quyết định "đặt file ở đâu"

| Loại code | Đặt ở | Ví dụ path |
| --- | --- | --- |
| Route mới | `src/App.tsx` + mục nav ở `src/components/Sidebar.tsx` (luôn đồng bộ cả hai) | `src/App.tsx:22-29`, `Sidebar.tsx:7-14` |
| Page/screen | `src/pages/<PascalCase>.tsx`, export **named** | `src/pages/Members.tsx:128` |
| Layout / shell | `src/components/<PascalCase>.tsx` | `src/components/Sidebar.tsx` |
| Primitive UI tái dùng | `src/components/ui/<PascalCase>.tsx` | `src/components/ui/DataTable.tsx` |
| Gọi HTTP | `src/services/<domain>.ts` | `src/services/adminUsers.ts` |
| Hạ tầng HTTP dùng chung | `src/lib/api/` | `src/lib/api/client.ts` |
| Đọc/ghi token & identity | `src/lib/session.ts` **duy nhất** | `src/lib/session.ts` |
| Format tiền/số/ngày | `src/lib/format.ts` | `src/lib/format.ts` |
| DTO/type của API | `src/types/admin.ts` | `src/types/admin.ts` |
| Hook tái dùng | `src/hooks/use<Something>.ts` | `src/hooks/useAsync.ts` |
| Global state | `src/context/<Name>Context.tsx` | `src/context/AuthContext.tsx` |
| Màu chart | `src/theme/chart.ts` | `src/theme/chart.ts` |
| Design token | `src/index.css` (khối `@theme`) | `src/index.css:3-70` |
| Utility thuần không phải format/HTTP | `src/lib/<name>.ts` | `src/lib/session.ts` |

### 1.3 Rule cứng về kiến trúc

1. **Chỉ `src/services/*` + `src/lib/api/*` được chứa HTTP.** Page, component, hook không được gọi `fetch`/`axios`. *(BRIEF §9.4, §10.1; INTEGRATION_PLAN §7 "Ownership rules".)* Hiện `src/lib/api/client.ts` gọi `fetch`, các service gọi `apiRequest`; giữ ranh giới này khi thêm flow.
2. **Chỉ `src/lib/session.ts` được chạm `localStorage`.** Không rải `localStorage` trong page/service. *(BRIEF §10.4.)*
3. **Không tạo design-token layer thứ hai.** `src/index.css` là nguồn token duy nhất. Không tạo `theme/colors.ts`, không `tailwind.config.js` mới. *(Hiện repo **không có** `tailwind.config.*` và **không có** `postcss.config.*` — Tailwind v4 chạy qua `@tailwindcss/vite`, cấu hình nằm trong CSS.)*
4. **Không tạo API client thứ hai.** Nếu `src/lib/api/client.ts` đã tồn tại, service phải dùng nó; không viết `fetch` riêng trong service.
5. **Không tạo store library.** Global state chỉ bằng React Context. *(BRIEF §10.3: "No store library is added".)*
6. **Không thêm HTTP cache library** (react-query/SWR). Chính sách là **refetch-on-action**. *(BRIEF §10.1, §10.7.)*
7. **Không đổi kiến trúc để phục vụ một feature nhỏ.** Project convention hiện tại là source of truth, trừ khi (a) tài liệu yêu cầu khác, (b) convention hiện tại gây lỗi, (c) task yêu cầu refactor rõ ràng.

---

## 2. Component Rules

### 2.1 Trước khi tạo component mới — BẮT BUỘC search

Không được tạo component trước khi chạy đủ 6 bước tìm kiếm sau (BRIEF §9.2 liệt kê sẵn 20 component đích; nhiều thứ đã có đặc tả code trong `DESIGN_SYSTEM.md` §8.5):

1. Component tương tự? → `src/components/`, `src/components/ui/`
2. Hook tương tự? → `src/hooks/`
3. Service/API tương tự? → `src/services/`
4. Page cùng pattern? → `src/pages/`
5. Utility tương tự? → `src/lib/`
6. Type tương tự? → `src/types/`

**Thứ tự bắt buộc: `reuse > extend > create new`.**
Nếu `DESIGN_SYSTEM.md` §8.5 đã có code mẫu cho component cần tạo (`SectionCard`, `StatCard`, `HeroCard`, `ProgressBar`, `SearchInput`, `EmptyState`, `PageHeader`, `DataTable`, `Modal`, `Button`, `Badge`, `AlertModal`), **dùng đúng đặc tả đó** thay vì tự thiết kế lại — tránh sinh design system thứ hai.

### 2.2 Phân chia trách nhiệm

| Tầng | Được làm | Không được làm |
| --- | --- | --- |
| `src/components/ui/*` | Nhận props, render, style. | Business knowledge, gọi HTTP, đọc `AuthContext`, biết endpoint |
| `src/components/` (layout) | `Sidebar`, `TopNav`, `AppLayout`: đọc auth/session để hiển thị identity và gate nav | Gọi API nghiệp vụ, chứa logic CRUD |
| `src/pages/*` | Gọi hook/service, quản lý UI state, khai báo column của bảng, compose `ui/*` | Gọi `fetch` trực tiếp, tự định nghĩa lại màu/radius/shadow |
| `src/hooks/*` | Bọc vòng đời request (`useAsync`), debounce, tiện ích state | Chứa JSX nghiệp vụ |
| `src/services/*` | Map tham số → request, gọi `lib/api/client`, trả type đã khai báo | Chứa JSX, chứa state React |

*(Nguồn: BRIEF §9.4 "Local vs shared ownership"; INTEGRATION_PLAN §7 "Ownership rules".)*

### 2.3 Convention component (lấy từ code thật)

- **Export:** `export const <Name>: React.FC = () => {}` cho page/component không props — dùng ở **8/8** component hiện có (`Sidebar.tsx:6`, `TopNav.tsx:4`, `Overview.tsx:44`, `Members.tsx:128`, `Activity.tsx:42`, `Intelligence.tsx:41`, `Campaigns.tsx:61`, `Configuration.tsx:4`). `App.tsx:11` là ngoại lệ duy nhất (`function App()` + `export default`).
  - Component **có props** (component mới trong `ui/*`): khai báo props inline ngay trên tham số, **không** dùng `React.FC` với generic. Đây là convention mà `DESIGN_SYSTEM.md` §8.5 đã đặc tả (`Button`, `Badge`, `SectionCard`, `DataTable`…).
  - **Không** dùng `export default` cho page (route table import named: `import { Members } from './pages/Members'` — `App.tsx:4-9`).
- **Props:** dùng `interface` inline trong signature, hoặc `Column<T>` kiểu generic cho `DataTable`. Không tạo file props riêng cho một component.
- **`children` / `right` / `actions` / `footer`:** dùng slot `ReactNode` — pattern đã được đặc tả ở `SectionCard`/`PageHeader`/`Modal`.
- **Composition:** page compose `PageHeader` → `SectionCard` → `DataTable`/form; **không** viết lại markup card. *(BRIEF §9.1.)*
- **Class động:** dùng `clsx` (đã có dependency, đang dùng ở `Sidebar.tsx:4,38,49`). **Không** dùng `tailwind-merge` (có trong `package.json` nhưng 0 chỗ dùng — coi là dead dependency, đừng bắt đầu dùng nó).

### 2.4 Anti-pattern composition đang tồn tại — không được nhân rộng

- **27 chỗ card viết tay** lặp chuỗi `bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm` — `Overview.tsx:79,100,129,167,188,211`; `Intelligence.tsx:63,91,119,141,167,193`; `Activity.tsx:82,245,268`; `Campaigns.tsx:250,357`; `Members.tsx:161,299`; `Configuration.tsx:60,120,190`. Khi tạo card mới → dùng `SectionCard`/`StatCard`.
- **Hai chuẩn `<table>` khác nhau** (`Members.tsx:186-207` dùng `px-4`/`px-3` + `thead text-[10px]`; `Activity.tsx:148,194` + `Campaigns.tsx:373` dùng `text-[9px]` + `px-2`). Khi tạo bảng → dùng `DataTable` theo chuẩn `Members` (`DESIGN_SYSTEM.md` §A.2 đã chốt).
- **Hash `key={idx}`** khi render mảng KPI tĩnh (`Overview.tsx:79`, `Intelligence.tsx:63`, `Activity.tsx:82`, `Campaigns.tsx:250`). Chấp nhận cho mảng tĩnh; **với dữ liệu API luôn dùng `rowKey` là `id` thật**.
- **Card có chiều cao cứng 13 giá trị khác nhau** (`h-[75px]`→`h-[550px]`). Card mới chỉ dùng 1 trong 3 bậc đã chuẩn hoá: `h-[95px]` (KPI), `h-[250px]` (widget), `h-[450px]` (panel chính); còn lại dùng `flex-1 min-h-0` (`DESIGN_SYSTEM.md` §A.1).

---

## 3. Design System Rules

Nguồn chi tiết: `DESIGN_SYSTEM.md`. Dưới đây là bản vận hành **bắt buộc**.

### 3.1 Màu

- Chỉ dùng token trong `src/index.css` khối `@theme` (`index.css:3-70`) hoặc utility sinh từ `@theme`. **Cấm hex/rgba trong page, component, và props chart.**
- Accent **duy nhất** là `primary` = `#2563EB` (`index.css:5`). CTA, link, focus ring, trạng thái active đều dùng hệ `primary`.
- Trạng thái dùng token semantic: `success` / `success-deep` / `success-soft` / `success-soft-border`, `warning*`, `danger*`, `info*`, `vip*`.
- **Cấm palette Tailwind rời** trong code mới: `gray-*`, `slate-*`, `indigo-*`, `purple-*`, `emerald-*`, `amber-*`, `red-*`, `blue-*`, `pink-*`. Map về token:
  `text-gray-900`→`text-ink` · `text-gray-800/700`→`text-ink-soft` · `text-gray-600`→`text-body` · `text-gray-500`→`text-muted` · `text-gray-400`→`text-muted-light` · `bg-gray-50*`→`bg-surface-alt` · `bg-gray-100`→`bg-surface-alt` (chip) / `bg-surface-sunken` (track) · `bg-gray-200`→`bg-surface-sunken` · `border-gray-100`→`border-hairline` · `emerald-*`→`success*` · `amber-*`→`warning*`/`vip*` · `red-*`→`danger*` · `indigo-*`/`purple-*`→`info*` (nhãn tier Pro → `vip`).
- Nhóm nền tối `dark-*` **chỉ** cho khối AI/Sepay, và chỉ khi màn đó thực sự dùng nền tối. Hiện **chưa page nào** dùng (`Intelligence.tsx` nền sáng). Không thêm accent thứ hai cho AI.
- Chart **không** hard-code màu: dùng `src/theme/chart.ts` (`DESIGN_SYSTEM.md` §8.3).

### 3.2 Typography

- `Inter` là font duy nhất; `font-display` cũng trỏ về Inter (`index.css:60-61`). `font-mono` cho mã, số tiền, số liệu căn cột.
- Weight cho phép: `400`, `500` (**chỉ** cho text ≤ 13px), `600`, `700`. **Cấm `font-extrabold` / `font-black`.** (Hiện code = 0 chỗ vi phạm — giữ nguyên.)
- Heading ≥ 20px → `font-bold`. Tiền/% → `font-mono tabular-nums font-bold`.
- Thang chữ house style đang dùng thật, giữ nguyên:
  - H1 page: `text-xl font-bold font-display text-ink tracking-tight` (`Members.tsx:152`)
  - Subtitle: `text-[11px] text-muted font-medium`
  - Tiêu đề khối: `text-xs font-bold uppercase tracking-wider` (`Members.tsx:167`)
  - Nhãn field: `text-[10px] font-bold text-muted-light uppercase tracking-wider` (`Members.tsx:308`)
  - Meta/mono: `text-[10px] font-mono text-muted` (`Members.tsx:274`)
  - Badge: `text-[9px] font-bold uppercase tracking-wider`
- **Không** tạo scale chữ tuỳ ý nếu token/utility tương ứng đã tồn tại.

### 3.3 Shape, spacing, elevation

- Chỉ **5 radius**: `rounded-chip` (10px), `rounded-control` (12px), `rounded-panel` (16px), `rounded-card` (22px), `rounded-pill` (9999px). Map: `rounded`/`rounded-md`→`rounded-chip`; `rounded-lg`→`rounded-control`; `rounded-2xl`→`rounded-panel`; `rounded-full`→`rounded-pill`.
  *(Lưu ý: code hiện còn dùng `rounded-2xl` và `rounded-lg` — `Members.tsx:161,178` — vì scale token mới chỉ được áp dụng một phần.)*
- Shadow: card thường = `shadow-premium-sm`; card hover/dropdown = `shadow-premium`; modal = `shadow-premium-lg`; sidebar/sticky = `shadow-float`. **`shadow-primary` / `shadow-primary-sm` tối đa 1 lần/màn hình** và chỉ cho hero/CTA chính.
- Layout: padding ngoài **24px** (`p-6` — `App.tsx:21`), gap **24px** (`gap-6` — `Members.tsx:158`), card padding **16px** (`p-4`), hero card **22px** (`p-[22px]`). Nav cao **56px** (`h-14`), sidebar rộng **240px** (`w-60`).
- **Mọi khối card/panel phải đi qua `SectionCard`/`StatCard`/`HeroCard`.** PR phải chặn `bg-white rounded-* border-border-premium` viết tay trong page.

### 3.4 Component chuẩn & tone map

- Tones của `Badge`: `neutral | primary | success | warning | danger | info | vip`.
- Map trạng thái backend → tone (BRIEF §9.2 + INTEGRATION_PLAN §9):
  - user `Active`→`success` · user `Banned`→`danger` · `isOnboardingCompleted` true→`success` / false→`neutral`
  - broadcast `Queued`→`neutral` · `Sent`→`success` · `Failed`→`danger` · `Cancelled`→`neutral`
  - transaction `Income`→`success` · `Expense`→`danger`
  - tier Pro/Premium/Basic/Miễn phí → `vip` / `primary` / `warning` / `neutral` (`DESIGN_SYSTEM.md` §A.4, §A.14)
- Loading: skeleton đúng kích thước nội dung cho lần load đầu; refetch giữ nội dung cũ + busy indicator nhẹ, **không nhảy layout** (BRIEF §10.6).
- Empty state: phân biệt **rỗng tự nhiên** ("Không có dữ liệu") với **rỗng do filter** ("Không tìm thấy kết quả khớp bộ lọc" + nút xoá filter) (BRIEF §10.6).
- Responsive mục tiêu (BRIEF §9.5): `≥1024px` sidebar hiện, 24px padding/gap, KPI 3–4 cột; `768–1023px` sidebar thu gọn, KPI 2 cột, bảng scroll ngang; `<768px` sidebar thành drawer overlay, KPI 1 cột, dialog thành sheet full-width.
- Icon: `@phosphor-icons/react`, luôn truyền `size` tường minh. Nav dùng `size={20}` + `weight="regular"` (`Sidebar.tsx:8-13`); trong bảng/chip dùng `size={12}`–`size={15}` (`Members.tsx:172`, `Activity.tsx:35-39`); nút CTA dùng `size={14}` + `weight="bold"` (`Configuration.tsx:51`).

---

## 4. Admin Portal Rules

Nguồn: `ADMIN_INTEGRATION_PLAN.md` (đã verify với code backend) + `ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md`.

### 4.1 Cấu trúc page Admin

Mỗi page admin theo đúng thứ tự này (BRIEF §9.1):

```text
<PageHeader title subtitle actions?>            → tách từ khối h-10 hiện có
<SectionCard>  ... các khối nội dung ...        → thay card viết tay
```

- Wrapper page: giữ nhất quán `h-full flex flex-col gap-6 select-none w-full text-xs`. Lưu ý **bất nhất hiện có**: `max-w-7xl mx-auto` chỉ có ở 4/6 page (`Activity.tsx:65`, `Intelligence.tsx:43`, `Campaigns.tsx:204`, `Configuration.tsx:36`), thiếu ở `Overview.tsx:46` và `Members.tsx:148`. Khi sửa một page, đưa nó về dạng có `max-w-7xl mx-auto`; **không** sửa 5 page còn lại trong cùng task.
- Tiêu đề page nằm **trong page**, không ở `TopNav`. (`TopNav` ≈ app bar của mobile — không map sang `PageHeader`.)

### 4.2 Routing

- Khai báo **tập trung** trong `src/App.tsx`. Không dùng route object rải rác.
- Thêm route mới ⇒ **cập nhật `Sidebar.tsx` cùng lúc** (đồng bộ route ↔ nav).
- `/` phải có `end` trên `NavLink` để không match mọi path con (`Sidebar.tsx:34` hiện **thiếu** `end` — sửa khi chạm file).
- Route `*` → `NotFound` hiện đã có bên trong Admin guard; giữ fallback khi đổi bảng route.
- Route bảo vệ phải nằm trong guard; `/login` là route công khai duy nhất.

### 4.3 Layout & navigation

- Shell hiện nằm trong `AppLayout` dưới `RequireAdmin`; `/login` ở ngoài shell.
- `Sidebar` chỉ render bên trong Admin guard. Nếu sau này thêm nhiều role vào shell, phải gate nav theo role phù hợp.
- `TopNav` đã lấy identity từ session. Search/ticker/chuông còn là affordance tĩnh; cần nối capability hoặc hiển thị rõ trạng thái chưa có chức năng.

### 4.4 Authentication & Authorization

- Auth dùng chung `POST /api/v1/auth/login` với user thường — **không có** endpoint admin login riêng.
- Gate hiện tại so sánh chính xác `role === 'Admin'` ở `App.tsx` và `AuthProvider.tsx`. Tài liệu cũ từng đề xuất case-insensitive; đó là drift `D-1`/`Q-1` trong [`docs/spec/auth/stage-1-auth-spec.md`](docs/spec/auth/stage-1-auth-spec.md), không được âm thầm đổi một phía.
- Identity (id, fullName, email, role) **chỉ** đến từ response login và phải persist qua refresh + reload. **Không** rebuild từ `/user/me` (không có admin `/me`; `/user/me` là policy `User`) — BRIEF §10.4.
- `401` → thử refresh **đúng một lần** (single-flight cho các 401 đồng thời) → retry → thất bại thì clear session + về `/login`. `403` → forbidden state, **không** logout, **không** retry loop. `User` login thành công nhưng không phải Admin → không render shell, báo "Tài khoản này không có quyền truy cập trang quản trị" + cho logout.
- Guard ở frontend **chỉ là UX**. Backend (`JwtAuthGuard` + `RolesGuard`) mới là nguồn có thẩm quyền. Không gate thứ gì dựa vào giá trị client có thể giả.

### 4.5 API integration cho Admin

- Mọi path dưới `/api/v1/...`, cần `Authorization: Bearer <accessToken>` với token role `Admin`.
- **Dùng đúng tên param theo từng endpoint** — đây là drift đã verify, không được "chuẩn hoá" cho đẹp:
  | Endpoint | Param phân trang | Envelope response |
  | --- | --- | --- |
  | `/admin/users` | `pageIndex`, `pageSize` | `{data[], pagination{page,…}}` |
  | `/admin/broadcasts` | `pageIndex`, `pageSize` | `{items[], totalCount, page, pageSize, totalPages}` (flat) |
  | `/admin/audit-logs` | `page`, `pageSize` | `{items[], pagination{page,…}}` |
  | `/admin/categories` | `page`, `pageSize` (KHÔNG `isActive`) | `{items[], totalCount, page, pageSize, totalPages}` (flat) |
  | `/admin/subscriptions/plans` | — | mảng entity thô, **chỉ plan `isActive:true`** |
- **Đọc tolerant:** field user là `userName` (list/detail) **hoặc** `username` (login/ban/unban, dashboard `recentUsers`) → đọc `userName ?? username`. Category dùng `displayOrder`, **không phải** `order`.
- **Bất kỳ 2xx là thành công.** Không branch theo `200` vs `201`. `DELETE /admin/categories/:id` trả **200 + body rỗng** → không parse body.
- Xử lý drift đã biết (INTEGRATION_PLAN §6.2) — **không tự ý work around, phải nêu cờ cho owner**:
  - Dashboard 6/9 counter và 2 list là **stub** (`0` / `[]`) → render `—`, **không** render `0` khi lỗi hoặc khi biết là stub.
  - `GET /admin/users` **không** filter role → đừng kỳ vọng chỉ có `User`, cũng đừng thêm filter role/Admin-badge (BRIEF C11 nói ngược lại — **code thắng**, ghi rõ).
  - ban/unban user không tồn tại → **500**, không phải 404 → treat là "bản ghi đã cũ", refetch.
  - `adminUsername` trong audit log thực chất là UUID `actorAccountId` → nhãn "Admin ID", không format như tên người.
  - `GET /admin/ai-settings` **không** trả `apiKeyMasked` (BRIEF §6.7 nói có — **code thắng**). `PATCH` **có** nhận `apiKeyEncrypted` (BRIEF C10 nói không — **code thắng**) → chỉ expose field key nếu owner xác nhận.
  - Plan create/update **bỏ qua** `description`/`isPopular`; duplicate `code` → 500.
  - `price` là `numeric(18,2)` → có thể serialize thành string → **coerce sang number** trong types/mapper.
  - Không gửi `includeDeleted` trừ khi có control include-deleted tường minh (repository coi `"false"` là truthy).
- **Không build UI cho capability không có endpoint:** change-role, admin transaction log (`/activity`), campaign auto-rules. *(INTEGRATION_PLAN §2 "Not implemented", §6.4.)*

### 4.6 CRUD, form, filter, pagination, modal, confirm, notification

- **List:** phân trang **server-side** ở mọi list; ngoại lệ `/admin/categories` và `/admin/subscriptions/plans` (không phân trang). Page size: 20 (mặc định), 50, 100.
- **Filter/search:** state filter nằm trên **URL search params** — URL là source of truth, để share được và sống qua reload. Đổi filter → reset về page 1. `keyword` debounce ~350ms, abort request cũ khi có request mới. Bỏ hẳn param khi giá trị là "tất cả"/rỗng (**không** gửi `keyword=''` hay `status=''`).
- **Mutation:** mọi control mutate phải **disable khi đang in-flight** + hiện busy state; confirm dialog khoá theo pending flag, không chỉ theo nút. **Không** retry tự động POST không idempotent (không endpoint admin nào có idempotency contract) — operator retry thủ công, form giữ nguyên.
- **Sau mutation:** **refetch list** — không patch list từ response mutation (shape response khác shape list, ví dụ AI settings PATCH chỉ trả 2 field). Detail drawer refetch khi mở, không tin row trong list.
- **Delete/ban:** confirm dialog phải chứa **định danh của đối tượng bị tác động** trong text. Ban/unban gửi **status đích tường minh**, không bao giờ là toggle mù.
- **Notification:** thay `alert()`/`confirm()` bằng `Toast` + `ConfirmDialog`/`AlertModal`. Hiện còn 6 chỗ: `Campaigns.tsx:108,133,146,158,179`, `Configuration.tsx:32`. Không thêm chỗ mới.
- **Unauthorized/unavailable:** `404`/`409` khi thao tác ⇒ coi view là stale: refetch rồi mới báo.
- `pageIndex` vượt trang cuối sau mutation ⇒ clamp về trang cuối rồi refetch.

---

## 5. API Integration Rules

### 5.1 Tổ chức

- **1 file service / 1 domain**, export các hàm thuần (`list`, `detail`, `create`, `update`, `remove`). Tên file: `adminUsers.ts`, `adminCategories.ts`, `adminPlans.ts`, `auth.ts`… (INTEGRATION_PLAN §7).
- Service **không** giữ state React, **không** chứa JSX, **không** tự tính base URL.
- Mọi request đi qua `src/lib/api/client.ts` — client chịu trách nhiệm: base URL từ `import.meta.env.VITE_API_BASE_URL`, inject `Authorization`, normalize error thành `{code, message, field}`, gọi 401 hook, timeout/abort.
- Base URL thiếu ⇒ **fail fast** với lỗi rõ ràng. **Không** fallback im lặng, **không** hard-code URL.

### 5.2 Request/response type

- Type DTO khai báo tập trung ở `src/types/admin.ts`, **không** `any`. Request type và response type tách riêng khi shape khác nhau (ví dụ AI settings PATCH).
- Nếu tài liệu và runtime lệch field, **khai báo theo runtime** và ghi chú drift ngay tại type đó.

### 5.3 Error handling

- Error envelope backend: `{ code, message, field, details }`. Map `code` → message tiếng Việt: `VALIDATION_FAILED`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`; fallback `message`, rồi tới câu generic.
- Body lỗi không phải JSON (proxy/gateway) **không được throw** → degrade thành lỗi generic kèm status.
- **Không bao giờ** hiển thị stack trace, token, hay secret provider.
- `422` → map `field` về đúng field của form (server là nguồn có thẩm quyền).

### 5.4 Loading / pagination / mutation / cache

- Loading: hiện skeleton ngay cho lần load đầu; với refetch, chờ ~150–200ms trước khi hiện busy indicator để tránh nháy. Request treo phải có timeout để cuối cùng thành error, không spinner vô hạn. Abort request khi filter đổi hoặc unmount.
- Pagination: theo §4.5.
- Mutation: xem §4.6.
- Cache/refetch: **không có** cache library. Fetch on mount; refetch tường minh sau mỗi mutation thành công; dashboard có nút refresh thủ công.

### 5.5 List normalizer (bắt buộc vì `DRIFT-005`)

Viết **một** normalizer ở `src/lib/api/normalize.ts` để hấp thụ 4 shape envelope (BRIEF §8.5, INTEGRATION_PLAN §6.1 M1):

- Đọc list: `items ?? data`.
- Đọc trang: `pagination.page ?? pagination.pageIndex`.
- Hỗ trợ envelope phẳng (`{items,totalCount,page,pageSize,totalPages}`) và envelope lồng (`{data|items, pagination{...}}`).
- Thiếu pagination ⇒ trả list không phân trang, không throw.
- Log (dev-only) khi phải dùng nhánh fallback, để drift còn quan sát được.

**Không** hard-code một shape trong từng screen.

### 5.6 Authentication token

- Access token + refresh token + identity lưu trong **một** namespace `localStorage` qua `src/lib/session.ts`. Không lưu password, không lưu API key thô.
- Refresh: replace **cả hai** token, giữ identity đã cache. **Không** tính expiry ở client; mọi `401` = "thử refresh một lần, không thì logout".
- Rủi ro XSS của `localStorage` đã được chấp nhận và ghi nhận (BRIEF §10.4). Đổi sang httpOnly cookie là **thay đổi contract backend** → cần owner quyết, không tự làm.

---

## 6. State Management Rules

| Loại state | Dùng khi | Đặt ở | Ví dụ trong repo |
| --- | --- | --- | --- |
| Local component state | UI tạm: mở/đóng dialog, draft form, row đang chọn | `useState` trong page/component | `Members.tsx:129-131`, `Activity.tsx:43-44`, `Campaigns.tsx:62-84` |
| Derived state | Tính từ state/props khác | `useMemo` ngay tại chỗ dùng | `Members.tsx:134-145`, `Activity.tsx:47-62` |
| Form state | Giá trị field + lỗi + pending của một form | Local state trong page, hoặc hook form cục bộ | `Campaigns.tsx:66-84`, `Configuration.tsx:5-29` |
| Server state | Dữ liệu đến từ API | State trong page/hook; **không** cache library | `Members.tsx`, `Campaigns.tsx`, `Configuration.tsx`, `Overview.tsx`; `useAsync.ts` chưa có |
| URL / query state | page, pageSize, status, keyword của list | URL search params khi cần deep link | `Members.tsx` đã dùng; `Campaigns.tsx` mới đọc URL lúc khởi tạo |
| Global state | **Chỉ** session/identity/role | `src/context/AuthProvider.tsx` + `hooks/useAuth.ts` | Đã có |

Rule quyết định:

1. Mặc định là **local state**. Không đưa lên global nếu chỉ một page dùng.
2. **Chỉ** session đi vào Context, vì guard + shell + API client đều cần. Không context thứ hai cho tới khi có nhu cầu thật (BRIEF §10.3).
3. State của list (page/filter/search) **phải** nằm trên URL, không nằm trong `useState` thuần — hiện `Members.tsx:129-131` và `Activity.tsx:43-44` làm sai chuẩn này. Khi rewire các page đó sang API, chuyển sang URL state.
4. **Không** thêm Redux/Zustand/Jotai/react-query/SWR.
5. Không derive state bằng `useEffect` nếu `useMemo`/tính trực tiếp được.

---

## 7. TypeScript Rules

> **Cảnh báo quan trọng về `strict`:** đã có `"strict": true` trong `tsconfig.json` gốc, **nhưng nó chưa có tác dụng** — file gốc là solution-style (`"files": []` + `references`) nên `compilerOptions` của nó không áp dụng cho `tsconfig.app.json` / `tsconfig.node.json`. Kiểm chứng: `npx tsc -p tsconfig.app.json --showConfig` **không** in ra `strict`.
> ⇒ **Hiện tại compiler vẫn KHÔNG bắt null/undefined.** Agent phải tự kỷ luật; **không** dựa vào `tsc` để bắt lỗi null.
> Code **đã pass strict sạch (0 lỗi)** khi test thật ⇒ có thể bật bất cứ lúc nào mà không cần sửa `src/`. Chi tiết và cách sửa: [`docs/typescript-strict.md`](docs/typescript-strict.md)

Đang bật: `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `moduleResolution: bundler`, `allowImportingTsExtensions`, `jsx: react-jsx`.

- **`verbatimModuleSyntax: true` ⇒ import type BẮT BUỘC dùng `import type`.** Ví dụ: `import type { ReactNode } from 'react'`. Import giá trị thường. Không trộn type vào import giá trị.
- `noUnusedLocals` / `noUnusedParameters` ⇒ **không** để biến/tham số thừa; `pnpm build` sẽ fail.
- `erasableSyntaxOnly: true` ⇒ **không** dùng `enum` (không erasable). Dùng **union type**:
  ```ts
  type BillingCycle = 'monthly' | 'yearly' | 'lifetime';   // ✅
  enum BillingCycle { Monthly }                            // ❌
  ```
  Convention đang dùng thật: `type Channel = 'Push' | 'In-App' | 'Email'` (`Campaigns.tsx:4-6`).
- **`interface` vs `type`:**
  - `interface` cho **shape object của domain/model** — đang dùng: `interface Member` (`Members.tsx:4`), `interface Campaign` / `AutoRule` / `ChannelOption` (`Campaigns.tsx:8-32`).
  - `type` cho **union / alias / mapped type** — `type Channel`, `type TriggerType`, `type RuleStatus` (`Campaigns.tsx:4-6`), `type Column<T>` (đặc tả `DataTable`).
  - Với **API DTO** trong `src/types/admin.ts`: dùng `interface` cho object shape, `type` cho union (`UserStatus = 'Active' | 'Banned'`).
- **Props type:** khai báo inline ở signature, hoặc `interface` ngay trên component. Component không props dùng `React.FC` (theo `Sidebar.tsx:6`). Component có props **không** dùng `React.FC` + generic — khai báo props tường minh (`DESIGN_SYSTEM.md` §8.5).
- **Nullable:** field backend nullable (`phone`, `avatarUrl`, `statusReason`, `lastLoginAt`, `scheduledAt`, `sentAt`, `apiKeyMasked`, sub-object của `recentTransactions`) khai báo `| null` **tường minh** và render `—`, không render `null`/`undefined` (BRIEF §11.2). Vì `strict` **chưa có hiệu lực**, hiện chưa có gì nhắc bạn — phải tự làm; sau khi bật `strict` thì `tsc` sẽ nhắc.
- **Tránh `any`:** hiện repo có **0 `any`** (grep `as any|: any|<any>` = 0). Giữ nguyên con số này. Nếu shape chưa rõ, dùng `unknown` rồi narrow, hoặc khai báo DTO theo runtime.
- **Generic:** dùng cho component dữ liệu — `DataTable<T>`, `Column<T>`.
- Type cho reference tới DOM/React: `React.ReactNode`, `React.FormEvent`, `React.FC` — dùng chính namespace `React` (đang bật `react-jsx`, `React` vẫn import được vì `import React from 'react'` ở đầu file page).

---

## 8. Naming Rules

Lấy trực tiếp từ codebase:

| Đối tượng | Convention | Bằng chứng |
| --- | --- | --- |
| File component/page | `PascalCase.tsx`, khớp tên export | `Sidebar.tsx`, `Members.tsx`, `TopNav.tsx` |
| File hook | `camelCase.ts`, bắt đầu `use` | `useAsync.ts`, `useDebouncedValue.ts` (đặc tả) |
| File service | `camelCase.ts`, domain-first | `adminUsers.ts`, `adminCategories.ts` (đặc tả) |
| File util/lib | `camelCase.ts` | `session.ts`, `format.ts`, `normalize.ts`, `chart.ts` |
| File type | `camelCase.ts` (không `.d.ts`) | `types/admin.ts` |
| Component | `PascalCase`, export **named** | `export const Members: React.FC` |
| Hook | `useXxx`, export named | `useAsync`, `useAuth` |
| Domain model | `interface` + danh từ số ít, `PascalCase` | `Member`, `Campaign`, `AutoRule` |
| Union/enum-ish | `type` + `PascalCase` | `Channel`, `TriggerType`, `RuleStatus` |
| Hằng số mock/module-level | `camelCase` | `mockMembers` (`Members.tsx:20`), `mockCampaigns` (`Campaigns.tsx:34`), `userGrowthData` (`Overview.tsx:5`), `segments` (`Overview.tsx:23`, `Campaigns.tsx:41`) |
| Type cho dữ liệu mock | **Có `interface` tường minh nếu page mutate/filter; suy luận từ literal nếu page read-only** — xem ghi chú dưới | `interface Member`+`mockMembers: Member[]` (`Members.tsx:4,20`); `interface Campaign`+`mockCampaigns: Campaign[]` (`Campaigns.tsx:8,34`) **vs** `userGrowthData`/`activeUsers`/`activities` không type (`Overview.tsx:5,30,37`), `behaviorTrends`/`radarData` (`Intelligence.tsx:5,32`), `customerTransactions` (`Activity.tsx:15`) |
| Handler | `handleXxx` | `handleDispatch` (`Campaigns.tsx:92`), `handleSaveRule` (`:122`), `handleEditRule` (`:169`), `handleDeleteRule` (`:178`), `handleToggleStatus` (`:187`), `handleCancelEdit` (`:194`), `handleSave` (`Configuration.tsx:31`) |
| Hàm con | `camelCase` động từ | `toggleSegment` (`Campaigns.tsx:86`), `getTriggerLabel` (`:113`) |
| State setter | `[x, setX]` | `[search, setSearch]`, `[filterPlan, setFilterPlan]` |
| Boolean state | tiền tố `is`/`has`/`should` | `autoSuspend` (`Configuration.tsx:8`), `isActive`, `isEnabled` |
| API method | động từ: `list`, `detail`, `create`, `update`, `remove`, `updateStatus` | đặc tả INTEGRATION_PLAN §9 |
| Route path | `kebab-case`, danh từ | `/members`, `/activity`, `/intelligence`, `/campaigns`, `/configuration` (`App.tsx:23-28`) |
| Field trong mock | `camelCase`, **tiếng Anh** | `disciplineScore`, `aiQuotaUsed`, `lastActive` (`Members.tsx:12-17`) |
| Giá trị enum-like trong mock | **tiếng Việt** | `'Hoạt động' \| 'Tạm dừng'` (`Members.tsx:11`), `'Đã gửi' \| 'Nháp' \| 'Đang gửi'` (`Campaigns.tsx:16`) |
| Command/label/placeholder UI | **tiếng Việt** | `'Thành Viên Hệ Thống'` (`Members.tsx:152`), `'Tìm thành viên, email, mã ID...'` (`:175`) |

**Ghi chú về type cho dữ liệu (rule quyết định):** repo chia **hai nhóm rõ rệt**, và agent phải theo đúng nhóm của page mình đang sửa:

| Nhóm page | Có khai báo type? | Bằng chứng |
| --- | --- | --- |
| Page **có mutate / filter / state** | **CÓ** — `interface` + annotate mảng | `interface Member` + `mockMembers: Member[]` (`Members.tsx:4,20`); `interface Campaign`/`AutoRule`/`ChannelOption` + `mockCampaigns: Campaign[]` (`Campaigns.tsx:8-32,34`) |
| Page **read-only** (chỉ render) | **KHÔNG** — suy luận từ literal | `userGrowthData`/`revenueTrendData`/`segments`/`activeUsers`/`activities` (`Overview.tsx:5,14,23,30,37`); `behaviorTrends`/`riskUsers`/`churnUsers`/`goalAchievers`/`radarData` (`Intelligence.tsx:5,14,20,26,32`); `revenueData`/`customerTransactions`/`subscriptionTransactions`/`categoryIcons: Record<string, React.ReactNode>` (`Activity.tsx:5,15,24,34`) |

⇒ **Rule:** page/fixture **read-only** được phép bỏ type (giữ đúng hiện trạng). Ngay khi dữ liệu đi qua `useState`, `filter`, `map` sang handler, hoặc đến từ API ⇒ **bắt buộc** khai báo `interface` + annotate. Không "chuẩn hoá" các page read-only hiện có (vi phạm Minimal Change), nhưng cũng không được bỏ type ở code mới có state.

**Lưu ý drift naming:** giá trị enum trong mock hiện là tiếng Việt, còn giá trị backend là tiếng Anh (`Active`/`Banned`, `Queued`/`Sent`). Khi nối API, **type phải theo backend** (tiếng Anh) và **label hiển thị** mới dịch sang tiếng Việt. `Members.tsx:330-342` đang trộn hai hệ (`'Active'`/`'Suspended'` vs `'Hoạt động'`/`'Tạm dừng'`) — không nhân rộng pattern này.

---

## 9. Import Rules

- **Không có path alias.** `vite.config.ts:1-8` không có `resolve.alias`; `tsconfig.app.json` không có `paths`; `tsconfig.node.json` cũng vậy. ⇒ **Dùng relative import.** Ví dụ hiện có: `import { Sidebar } from './components/Sidebar'` (`App.tsx:2`), `import { Overview } from './pages/Overview'` (`App.tsx:4`).
- **Không tự tạo alias mới.** Nếu thật sự cần `@/`, đó là thay đổi config ảnh hưởng toàn repo → phải là task riêng, và phải sửa `vite.config.ts` + `tsconfig.app.json` **cùng lúc**.
- **Độ sâu tương đối:** từ `src/components/ui/X.tsx` tới lib là `../../lib/format` (đặc tả `ProgressBar` dùng đúng dạng này). Từ `src/pages/X.tsx` là `../lib/...`, `../components/ui/...`.
- **Extension:** import `.tsx`/`.ts` **không** ghi extension trong `src/` (trừ `main.tsx` import `'./App.tsx'` — ngoại lệ có sẵn, `main.tsx:4`). `allowImportingTsExtensions` được bật nên có extension vẫn compile, nhưng convention hiện tại là **không**.
- **Barrel export:** **không tồn tại** trong repo. Không tạo `src/components/ui/index.ts` trừ khi thực sự cần và được yêu cầu — import trực tiếp file.
- **Thứ tự import** (theo code hiện có): (1) `react`; (2) thư viện ngoài (`react-router-dom`, `recharts`, `@phosphor-icons/react`, `clsx`); (3) import nội bộ. Xem `Members.tsx:1-2`, `Activity.tsx:1-3`, `Configuration.tsx:1-2`, `App.tsx:1-9`.
- **`import type`** cho type-only — bắt buộc do `verbatimModuleSyntax`.

---

## 10. Form & Validation Rules

- **Không thêm form library.** BRIEF §9.3 chốt: "Controlled inputs with a single `useForm`-style local hook per form; no form library is added". Repo **không** có `react-hook-form` và **không** có `zod`. Không cài.
- **Controlled component** với `value` + `onChange` — pattern hiện có: `Members.tsx:173-179`, `Configuration.tsx:70-…`, `Campaigns.tsx`.
- **Vị trí:** field + state + validate nằm **trong page** (hoặc hook cục bộ của form trong page). Không tạo `src/forms/`. Type của form khai báo cùng page.
- **Default values:** khai báo trong `useState(...)`. Với form sửa từ API: nạp bằng `useEffect` khi data về, hoặc key lại component; không giữ default của "create" khi đang "edit".
- **Validation:** client-side cho required và range rõ ràng; **server `422` là nguồn có thẩm quyền** và phải map `field` về đúng field. Không silently coerce input rỗng thành `0` (lỗi hiện có ở `Configuration.tsx` — BRIEF §11.1).
- **Error message:** hiển thị inline cạnh field, tiếng Việt, dùng `Field` + `FormError` (component cần tạo).
- **Submit:** handler `handleSubmit`/`handleXxx(e: React.FormEvent)` như `Campaigns.tsx:92`. Nút submit **disable + busy** khi pending; chặn double-submit ở tầng pending flag, không chỉ ở nút.
- **Mapping payload:** form state (UI) → request type (API) trong **service** hoặc ngay trước khi gọi. Không gửi field mà backend bỏ qua (`description`/`isPopular` của plan) trừ khi không gây hại, và **không** hiển thị chúng như state editable.
- **Ngày giờ:** `scheduledAt`/`fromDate`/`toDate` gửi **ISO-8601 UTC**; hiển thị theo `Asia/Ho_Chi_Minh`. Mock hiện hard-code chuỗi `'18/06/2026 12:10'` (`Members.tsx:34`) — **không** nhân rộng; dùng formatter trong `src/lib/format.ts`.

---

## 11. Error / Loading / Empty State Rules

Feature mới **không được chỉ implement happy path**. Tối thiểu phải xử lý:

| Trạng thái | Bắt buộc | Component/pattern |
| --- | --- | --- |
| Loading (lần đầu) | Skeleton đúng kích thước nội dung | `LoadingState` / `AsyncBoundary` |
| Loading (refetch) | Giữ nội dung cũ + busy indicator nhẹ, sau ~150–200ms | `AsyncBoundary` |
| Request failed | Inline error + `message` của server + nút Retry | `ErrorState` |
| Empty — rỗng tự nhiên | "Không có dữ liệu" | `EmptyState` |
| Empty — rỗng do filter | "Không tìm thấy kết quả khớp bộ lọc" + nút xoá filter | `EmptyState` + action |
| Invalid input | Lỗi inline cạnh field, tiếng Việt | `Field` + `FormError` |
| Submit pending | Nút disable + busy, chặn double-submit | `Button loading` |
| Submit success | Toast, đóng dialog, **refetch list** | `Toast` |
| Submit failure | Giữ form, hiện lỗi, cho retry thủ công | `Toast` / `ErrorState` |
| `403` | Forbidden state, **không** logout | `ForbiddenState` |
| `401` | Refresh một lần → retry → logout | xử lý trong `lib/api/client.ts` |

- **Phải reuse** component hiện có. Nếu chưa tồn tại, tạo theo đặc tả BRIEF §9.2 / `DESIGN_SYSTEM.md` §8.5 — **không** viết empty state ad-hoc.
- Hiện repo có **4 empty state ad-hoc** (`Members.tsx:201`, `Activity.tsx:163,209`, `Campaigns.tsx:577` dạng `<td colSpan>/text-center py-10`) và **0** loading/error state. Không nhân rộng.
- Counter/metric: khi chưa resolve hoặc load lỗi ⇒ render `—`, **không** render `0` (BRIEF §6.2, §11.3).
- Vùng loading/error phải có `role="status"` / `role="alert"` (BRIEF §9.6).

---

## 12. Code Reuse Rules

Trước khi viết implementation mới, **bắt buộc** search theo thứ tự:

1. **Component** tương tự? → `src/components/`, `src/components/ui/`, và các card/badge/table inline trong 6 page.
2. **Hook** tương tự? → `src/hooks/`
3. **Service/API** tương tự? → `src/services/`
4. **Page cùng pattern**? → 6 page hiện có (mọi list đều đi theo pattern "header + card + table + filter panel").
5. **Utility** tương tự? → `src/lib/`
6. **Type** tương tự? → `src/types/`, và các `interface` khai báo trong page.

Kết quả search phải được viết ra trong plan (Step 3, §14) — kể cả khi kết luận là "không có gì để reuse".

**Cấm copy-paste nguyên một implementation rồi đổi tên** nếu có thể abstraction/reuse hợp lý. Cụ thể trong repo này:

- Đừng copy chuỗi card `bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm` lần thứ 28 — dùng `SectionCard`.
- Đừng copy `<table>` inline — dùng `DataTable`.
- Đừng copy progress bar inline (7 biến thể ở `Members.tsx:243-268`, `Intelligence.tsx:75-80,210-211`, `Campaigns.tsx:352-353`, `Activity.tsx:282-283`) — dùng `ProgressBar`.
- Đừng copy search box (3 bản: `TopNav.tsx:14-18`, `Members.tsx:171-180`, `Activity.tsx:139-…`) — dùng `SearchInput`.
- Đừng copy badge tier (17 biến thể) — dùng `Badge` + tone map §3.4.

---

## 13. Forbidden Patterns

Danh sách dưới đây suy ra **trực tiếp từ repo này**. Không được vi phạm.

### Kiến trúc
1. **Không tạo design system thứ hai.** Token duy nhất ở `src/index.css`; primitive duy nhất ở `src/components/ui/`.
2. **Không tạo API client thứ hai.** Chỉ `src/lib/api/client.ts`.
3. **Không tạo layout/shell thứ hai.** Dùng `AppLayout` (tách từ `App.tsx`) + `Sidebar` + `TopNav`.
4. **Không tạo store/context thứ hai** ngoài `AuthContext` khi chưa có nhu cầu thật.
5. **Không thêm library** (state, form, cache, UI kit, icon set khác) khi functionality hiện có giải quyết được. Cụ thể: **không** thêm `react-hook-form`, `zod`, `react-query`, `swr`, `zustand`, `redux`, `axios`, `lucide-react`, `antd`, `shadcn/ui`.
6. **Không thêm `tailwind.config.js` / `postcss.config.js`.** Tailwind v4 cấu hình trong `src/index.css` qua `@theme`/`@utility`.
7. **Không dùng `tailwind-merge`/`motion`** — có trong `package.json` nhưng 0 chỗ dùng. `clsx` là cách duy nhất để ghép class động.
8. **Không tạo path alias** (`@/…`) nếu chưa sửa cả `vite.config.ts` và `tsconfig.app.json`.
9. **Không tạo barrel export** (`index.ts`) tuỳ tiện.
10. **Không đổi `verbatimModuleSyntax`, `erasableSyntaxOnly`** hay tắt `noUnusedLocals`.

### UI / Design system
11. **Không hard-code hex/rgba** trong page, component, `className`, hay props chart. Chỉ token hoặc `src/theme/chart.ts`.
12. **Không dùng palette Tailwind rời** (`gray-*`, `slate-*`, `emerald-*`, `amber-*`, `red-*`, `indigo-*`, `purple-*`, `blue-*`, `pink-*`) trong code mới.
13. **Không thêm accent thứ hai.** Accent duy nhất `primary` `#2563EB`.
14. **Không dùng `font-extrabold` / `font-black`.** Tối đa `font-bold`.
15. **Không dùng radius ngoài 5 token** (`chip`/`control`/`panel`/`card`/`pill`).
16. **Không dùng `shadow-primary*` quá 1 lần/màn.**
17. **Không viết markup card/bảng tay** khi `SectionCard`/`StatCard`/`HeroCard`/`DataTable` đã tồn tại.
18. **Không dùng class không tồn tại trong Tailwind.** Hiện còn 19 chỗ trong repo: `text-gray-450` ×3 (`Activity.tsx:179,224,225`), `bg-gray-105` ×1 (`Campaigns.tsx:546`), `py-0.2` ×14, `py-0.8` ×16. Class này **không sinh CSS** (đã kiểm tra CSS build không chứa chúng) ⇒ element mất style. Sửa: `text-muted-light`, `bg-surface-alt`, `py-0.5`, `py-1`/`py-1.5`. **Không thêm chỗ mới.**
19. **Không dùng `toLocaleString`/`Intl` rải rác trong page.** Mọi tiền/số đi qua `src/lib/format.ts`. Hiện repo có **0** chỗ `toLocaleString` — giữ nguyên.
20. **Không hard-code chuỗi tiền** kiểu `'642,8M đ'` (`Overview.tsx:75`, `Activity.tsx:77`), `'990.000 đ'` (`Activity.tsx:25`, `Overview.tsx:40`), `'104,240'` (`Overview.tsx:72`).

### Dữ liệu / API
21. **Không gọi `fetch`/`axios` trong page, component, hay hook.** Chỉ trong `src/services/*` qua `src/lib/api/client.ts`.
22. **Không chạm `localStorage` ngoài `src/lib/session.ts`.**
23. **Không hard-code API base URL / token / secret.** Chỉ `import.meta.env.VITE_API_BASE_URL`.
24. **Không commit `.env`.** Khi thêm config, tạo/cập nhật `.env.example` bằng placeholder. (`VITE_*` là biến public phía client — chỉ để dữ liệu không nhạy cảm.)
25. **Không hard-code một shape pagination** trong từng screen — dùng normalizer §5.5.
26. **Không branch theo `200` vs `201`** — mọi 2xx là thành công.
27. **Không parse body của `DELETE /admin/categories/:id`** — body rỗng.
28. **Không retry tự động** POST/PATCH không idempotent.
29. **Không patch list từ response mutation** — luôn refetch.
30. **Không trình bày mock action như API thật.** Nếu backend chưa có endpoint, hiển thị trạng thái "chưa có API" hoặc bỏ affordance — không để nút giả.
31. **Không thêm `alert()`/`confirm()`** mới. Thay bằng `Toast`/`ConfirmDialog`.
32. **Không tạo UI cho change-role, admin transaction log, campaign auto-rules** — không có endpoint.

### TypeScript / code chất lượng
33. **Không dùng `any`** để bypass type error. Repo hiện có 0 `any` — giữ nguyên.
34. **Không dùng `enum`** (`erasableSyntaxOnly: true`). Dùng union type.
35. **Không import type bằng import giá trị** (`verbatimModuleSyntax: true`).
36. **Không để biến/tham số không dùng** (`noUnusedLocals`/`noUnusedParameters`).
37. **Không giả định `strict` bắt lỗi null.** Cờ `strict` trong `tsconfig.json` gốc **chưa có hiệu lực** cho `src/` (xem §7) ⇒ hiện `tsc` vẫn không bắt null/undefined. Tự khai báo `| null`. Sau khi bật đúng `strict` (theo `docs/typescript-strict.md`), rule này đổi thành "tin `tsc` nhưng vẫn khai báo `| null` tường minh".
38. **Không `console.log`** trong code sản phẩm (ngoại lệ: log dev-only của normalizer fallback, phải được gate).

### Phạm vi thay đổi
39. **Không refactor code không liên quan.** Ví dụ: đang thêm feature cho `/members` thì **không** migrate màu của `Campaigns.tsx`.
40. **Không đổi naming hàng loạt**, không format lại toàn repo.
41. **Không thay library/framework** (React, Vite, Tailwind, React Router, Recharts, Phosphor).
42. **Không đổi public behavior hiện tại** ngoài scope task.
43. **Không sửa `node_modules/`, `dist/`, file binary, `.pen`, ảnh, SVG.**
44. **Không xoá code chết trong cùng task feature** trừ khi task yêu cầu (đã có danh sách riêng: `src/App.css`, `motion`, `tailwind-merge`, `src/assets/*`, `public/icons.svg`).
45. **Không dùng `pnpm lint` dạng auto-fix trên toàn repo** khi task chỉ đụng một file.

---

## 14. Implementation Workflow (bắt buộc theo thứ tự)

### Step 1 — Understand
Xác định và viết ra:
- Feature thuộc **domain** nào (users / categories / broadcasts / audit / AI settings / plans / auth / dashboard).
- **Page** nào bị ảnh hưởng (`src/pages/*`), có cần route mới không.
- **API** nào liên quan — đối chiếu bảng INTEGRATION_PLAN §3, dùng **tên field theo runtime** (§4.5 của file này).
- **Role** nào dùng: mọi `/admin/**` = `Admin`; `/login` = public.
- Nếu endpoint **không tồn tại** ⇒ dừng và báo, không tự thiết kế API.

### Step 2 — Explore
Search codebase tìm: feature tương tự · page tương tự · component reuse được · hook reuse được · service/API reuse được · design pattern tương ứng (`SectionCard`/`DataTable`/`Badge`/`PageHeader`/`useAsync`).
Ghi lại kết quả search, kể cả "không tìm thấy".

### Step 3 — Plan
Trước khi code, liệt kê:
- **File cần tạo** (đường dẫn đầy đủ, theo §1.2).
- **File cần sửa** (chỉ những file thật cần).
- **Component reuse** (tên cụ thể).
- **API/service reuse** (hàm cụ thể).
- **State cần quản lý** và **loại state** theo §6.
- **Edge case phải xử lý** theo §11.
- **Rủi ro drift** đã biết đụng tới.
Nếu plan cần refactor ngoài scope ⇒ tách task riêng, không gộp.

### Step 4 — Implement
Theo convention hiện tại. Ưu tiên: **`reuse > extend > create new`**.
Giữ diff nhỏ nhất. Không format lại file lớn. Không đổi tên ngoài scope.

### Step 5 — Verify
Kiểm tra tối thiểu:

```bash
cd WIVI_fe
pnpm lint
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

> **Lưu ý môi trường:** `pnpm build` (= `tsc -b && vite build`) có thể fail trong sandbox vì (a) `tsc -b` không ghi được `node_modules/.tmp/*.tsbuildinfo` (EPERM) và (b) `vite build` gặp `spawn EPERM` khi load native binding `@tailwindcss/oxide`. **Đây là giới hạn sandbox, không phải lỗi code.** Baseline hiện tại: `pnpm lint` pass (exit 0) và cả hai `tsc --noEmit` pass (0 lỗi). Khi cần xác nhận bundle, chạy ngoài sandbox hoặc dùng CI (`.github/workflows/ci.yml` chạy `pnpm run lint` + `pnpm run build`).

Checklist verify (BRIEF §14 + workflow yêu cầu):
- [ ] TypeScript error: 0
- [ ] Lint error: 0
- [ ] Build/typecheck: pass (hoặc ghi rõ giới hạn sandbox)
- [ ] Import: đúng relative, đúng `import type`; không có import chết
- [ ] Route: route mới khai báo ở `App.tsx` **và** `Sidebar.tsx`; `/` có `end`
- [ ] Loading state tồn tại
- [ ] Error state tồn tại + có retry
- [ ] Empty state tồn tại, phân biệt rỗng-tự-nhiên vs rỗng-do-filter
- [ ] Submit pending: nút disable, chặn double-submit
- [ ] Responsive: kiểm tra `≥1024`, `768–1023`, `<768`
- [ ] Design consistency: không hex, không palette rời, radius/shadow/weight đúng token
- [ ] Tiền/số/ngày đi qua `lib/format.ts`
- [ ] Regression: page không bị đụng vẫn chạy; không có thay đổi public behavior ngoài scope
- [ ] Không còn `alert`/`confirm` mới
- [ ] Không còn mock được trình bày như API thật

---

## 15. Nguyên tắc xuyên suốt

### Preserve Existing Architecture
Project convention hiện tại là **source of truth**. Không tự "cải tiến kiến trúc" chỉ vì có pattern khác được coi là best practice. Chỉ lệch khi: tài liệu dự án yêu cầu rõ ràng, convention hiện tại gây lỗi, hoặc task yêu cầu refactor.

### Evidence-Based
Mỗi rule quan trọng phải dẫn được ví dụ thực tế `src/...:line`. Không tạo rule chỉ dựa trên suy đoán. Nếu một kết luận chỉ đến từ một file duy nhất, phải nói rõ mức độ tin cậy.

### Minimal Change
Chỉ sửa file cần thiết · không refactor unrelated · không đổi naming hàng loạt · không format toàn repo · không thay library/framework · không thay architecture nếu không cần.

### Honest about drift
Khi code và tài liệu lệch nhau, **báo cả hai phía** và nói rõ bên nào đang thắng trong implementation. Danh sách drift đang mở (tính đến thời điểm viết file này):
- Mobile còn `#0066cc` vs admin `#2563EB`; admin giữ `#2563EB`.
- Mobile lạm dụng weight 800/900 (125 chỗ) và weight 500 (34 chỗ); **không** copy sang admin.
- BRIEF §6.7 nói `GET /admin/ai-settings` trả `apiKeyMasked` — **runtime không trả**. Code thắng.
- BRIEF C10 nói PATCH AI settings không nhận key — **runtime nhận `apiKeyEncrypted`**. Code thắng.
- BRIEF C11 nói `GET /admin/users` chỉ trả role `User` — **runtime không filter role**. Code thắng.
- BRIEF §14 ghi 4 `as any` ở `Campaigns.tsx` — **hiện 0 chỗ**. Tài liệu lỗi thời.
- BRIEF §8.5 nói categories nhận `isActive` — **runtime nhận `page/pageSize/keyword/includeDeleted`**. Code thắng.
- `strict` TypeScript: **cờ đã được thêm vào `tsconfig.json` gốc nhưng chưa có hiệu lực** cho `src/`, vì file gốc là solution-style (`"files": []` + `references`). Code đã pass strict sạch khi test thật ⇒ chỉ cần thêm 2 dòng config. Chi tiết: [`docs/typescript-strict.md`](docs/typescript-strict.md).
- Repo đã có `src/lib/format.ts` và bảy primitive trong `src/components/ui/`; xem [`docs/struct/struct.md`](docs/struct/struct.md) trước khi tạo component mới.
- `README.md` là template Vite mặc định (2.453 bytes) — **không** chứa instruction dự án.
