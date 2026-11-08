# Hợp đồng Design System WIVI — Mobile (`WVI/WIVI`) ⇄ Admin Web (`WIVI_fe`)

> **Lưu ý hiện trạng 2026-10-07:** Các bảng đếm component, mô tả `src/components/ui/` “chưa có” và checklist tạo file trong tài liệu này là snapshot trước Stage 1–6. Source hiện có bảy primitive trong `src/components/ui/`; các phần còn lại là đặc tả thiết kế, không phải bằng chứng file đã tồn tại. Xem [`docs/struct/struct.md`](docs/struct/struct.md) và [`docs/plan/admin_api.md`](docs/plan/admin_api.md) để biết runtime/contract hiện tại.

**Phiên bản 2 — viết lại từ đầu.** Mọi con số trong tài liệu này là **kết quả đếm thật** bằng ripgrep trên `WVI/WIVI/src/**/*.{ts,tsx}`, không phải ước lượng. Chỗ nào là suy luận/cần bạn xác nhận đều được ghi rõ.

**Hai quyết định đã chốt (theo yêu cầu của bạn):**
1. Accent duy nhất = **`#2563EB`**
2. **Bỏ `Plus Jakarta Sans`** khỏi `WIVI_fe`, dùng `Inter` cho cả `sans` và `display`

---

## 1. Đã kiểm tra gì, và nguồn nào có thẩm quyền

### 1.1 Phạm vi đã đọc

| Nhóm | Nội dung đã kiểm tra | Kết quả |
| --- | --- | --- |
| Tài liệu bạn chỉ định | `AGENTS.md` (root), `WVI/WIVI/AGENTS.md`, `WVI/WIVI/CLAUDE.md`, `WVI/WIVI/DESIGN.md` | Đã đọc hết |
| Tài liệu khác trong workspace | `WVI/**/*.md` (grep toàn bộ tìm brand color / font) | **Chỉ `DESIGN.md` định nghĩa màu & font.** Không tài liệu nào khác (`PROJECT_OVERVIEW.md`, `FINANCIAL_PRODUCT_SPECIFICATION.md`, `FE_ARCHITECTURE_AND_FLOW.md`, …) nhắc tới màu/font |
| Config mobile | `app.json`, `app/_layout.tsx`, `package.json`, `tsconfig.json` | Đã đọc. `expo-font` có trong plugins nhưng **không nạp font nào** |
| Docs admin | `WIVI_fe/README.md` | **Là README mẫu của Vite** ("React + TypeScript + Vite"), không có chủ đích thiết kế. File là binary/UTF-16 nên `read` từ chối, phải đọc qua grep |
| Runtime mobile | 10 screen + 17 component + 5 service trong `src/` | Đếm định lượng (§2) |
| Runtime admin | 6 page + 2 component + `App.tsx` + `index.css` + `index.html` | Đếm định lượng (§2.4) |

### 1.2 Phát hiện then chốt lần này

| # | Phát hiện | Bằng chứng |
| --- | --- | --- |
| **F1** | `DESIGN.md` là **nguồn duy nhất** định nghĩa brand: accent `#0066cc`, font SF Pro, ladder 300/400/600/700 (cố ý **không có 500**), **chỉ 1 shadow** cho ảnh sản phẩm, **cấm gradient** | `DESIGN.md:7,287,491,363,400,326` |
| **F2** | Mobile **thực tế không dùng SF Pro**. Chỉ có 3 chỗ khai báo `fontFamily`, và cả 3 đều là **chuỗi CSS font-stack** — React Native không hiểu font-stack, nó nhận 1 tên font duy nhất ⇒ **rơi về font hệ thống** | `StripedJar.tsx:131`, `WaveChart.tsx:270,286` đều ghi `'SF Pro Text, system-ui, -apple-system, sans-serif'` |
| **F3** | Palette mobile thực chất là **Tailwind CSS v3 palette** viết thẳng vào RN. 153 chỗ dùng nền pastel đúng mã Tailwind | `#EFF6FF` blue-50 (**52**), `#DBEAFE` blue-100 + `#BFDBFE` blue-200 (**35**), `#FEF2F2` red-50 + `#FEE2E2` red-100 (**27**), `#FEF3C7` amber-100 (**24**), `#ECFDF5` emerald-50 + `#F0FDF4` green-50 (**24**) |
| **F4** | ⇒ Admin (đã dùng Tailwind v4) **không cần "dịch" palette**, chỉ cần **đặt tên token** cho đúng các mã Tailwind mà mobile đang dùng. Đây là lý do bảng token ở §3 dùng mã Tailwind gốc thay vì mã rgba tự chế | — |
| **F5** | Mobile vi phạm hợp đồng chữ rất nặng: **125 chỗ** weight 800/900 (DESIGN.md cấm), **34 chỗ** weight 500 (DESIGN.md cấm), weight 400 chỉ **1 chỗ** | §2.2 |
| **F6** | Mobile có **22 chỗ** shadow màu (`shadowOpacity: 0.2 / 0.25` với `shadowColor` là màu thương hiệu) — DESIGN.md cho phép đúng **1** shadow và **không** cho card/button | grep `shadowOpacity: 0.2` = 22 |
| **F7** | Cùng một khái niệm "màu hũ mặc định" có **2 giá trị khác nhau**: `#2563EB` ở `JarsScreen.tsx:526` và `#0066cc` ở `FinancialContext.tsx:424` | grep trực tiếp |
| **F8** | Admin **không dùng `toLocaleString`/`Intl` ở đâu cả** (0 kết quả), tiền hiển thị kiểu Anh `'642,8M đ'` trong khi mobile có hẳn hàm chuẩn `formatCompactMoney` cho ra `"1,2 Tỷ" / "10 Tr" / "500k" / "500 đ"` | `Overview.tsx:75`, `Activity.tsx:77` vs `budget.ts:20-46` |
| **F9** | Admin nền app dùng **2 mã khác nhau** và **không mã nào khớp mobile**: `#FAFBFD` (ngoài) + `#F8F9FA` (trong), mobile `#F8FAFC` | `App.tsx:15,21`, `index.html:12` |
| **F10** | Code chết trong admin: `App.css` (184 dòng CSS mẫu Vite) **không được import** ở đâu; `motion` và `tailwind-merge` có trong `package.json` nhưng **không file nào dùng**; `clsx` chỉ dùng ở 1 file | `main.tsx:1-4` chỉ import `./index.css`; grep `motion\|twMerge` = 0 kết quả trong `src/` |
| **F11** | `userInterfaceStyle: "automatic"` + splash có biến thể `dark` ⇒ app khai báo hỗ trợ dark mode, nhưng **chỉ 4 component AI/Sepay có nền tối**; toàn bộ phần còn lại là light-only | `app.json:10,38-40`; dark hex chỉ 36 lần, tập trung ở `AiChatAssistantModal`, `UpgradeProModal`, `LinkBankModal` |

### 1.3 Xử lý mâu thuẫn `#0066cc` (doc) vs `#2563EB` (code)

Đây là mâu thuẫn thật, không được phép đoán. Trình bày để bạn quyết có cơ sở:

| | `#0066cc` (Action Blue) | `#2563EB` (Blue-600) |
| --- | --- | --- |
| Nguồn | `DESIGN.md` — nguồn duy nhất có thẩm quyền | Runtime mobile |
| Số lần xuất hiện trong mobile | **59** | **162** |
| Tập trung ở | Login, Register, ForgotPassword, OTP, Onboarding, History, RecordScreen (một phần) | Home, Discipline, Jars, Record (phần lớn), AppHeader, toàn bộ modal |
| Comment trong code | Có: `OnboardingScreen.tsx:32` ghi `'#0066cc', // Action Blue` | Không |
| Trạng thái | Contract mục tiêu của tài liệu | Hiện trạng chiếm ưu thế |

**Bạn đã chốt `#2563EB` cho admin.** Tài liệu này tuân theo, kèm 1 công tắc đổi màu duy nhất (§3.2) để sau này chuyển sang `#0066cc` nếu team muốn bám doc. Bản thân mobile **vẫn còn drift** giữa hai giá trị — cần một task riêng để hợp nhất, không thuộc phạm vi tài liệu này.

---

## 2. Số liệu đo được (làm cơ sở cho mọi bảng dưới)

### 2.1 Màu — `WVI/WIVI/src`

| Mã | Vai trò | Số lần |
| --- | --- | --- |
| `#FFFFFF` | nền card / chữ trên nền màu | **250** (chạm trần đo) |
| `#0F172A` | ink (tiêu đề, số liệu) | **167** |
| `#2563EB` | accent chính | **162** |
| `#64748B` | chữ phụ | **154** |
| `#E2E8F0` | viền hairline | **119** |
| `#DC2626` + `#CBD5E1` | danger đậm + disabled | **91** |
| `#F8FAFC` | nền app | **65** |
| `#F59E0B` + `#D97706` | warning / VIP | **62** |
| `#0066cc` | accent (nhóm auth) | **59** |
| `#F1F5F9` | surface phụ | **57** |
| `#EFF6FF` | nền soft primary (blue-50) | **52** |
| `#10B981` | success | **43** |
| `#94A3B8` | chữ mờ / placeholder | **42** |
| `#13151B`,`#181A22`,`#222634`,`#2F3447`,`#1E293B`,`#222530` | dark surface | **36** |
| `#DBEAFE` + `#BFDBFE` | viền/nền soft primary | **35** |
| `#EF4444` | danger | **28** |
| `#FEF2F2` + `#FEE2E2` | nền soft danger | **27** |
| `#1d1d1f` | ink (nhóm auth) | **24** |
| `#FEF3C7` | nền soft warning | **24** |
| `#ECFDF5` + `#F0FDF4` | nền soft success | **24** |
| `#3B82F6` | accent phụ / link trên nền tối | **16** |
| `#6C5CE7` | accent khối AI (tím) | **14** |
| `#1D4ED8` | accent pressed | **11** |
| `#16A34A`,`#059669`,`#22C55E`,`#4ADE80` | success các sắc độ | **53** |

### 2.2 Chữ

| `fontWeight` | Số lần | DESIGN.md cho phép? |
| --- | --- | --- |
| `'800'` / `'900'` | **125** | ❌ cấm |
| `'700'` | **201** | ✅ |
| `'600'` | **112** | ✅ |
| `'500'` | **34** | ❌ cố ý bỏ |
| `'400'` | **1** | ✅ (nhưng gần như không dùng) |
| `'300'` | **0** | ✅ (không dùng) |

| Dải `fontSize` | Số lần | Ghi chú |
| --- | --- | --- |
| 9 – 11.5 | **160** | meta, badge, nhãn uppercase, mono |
| 12 – 15 | **318** | body chính (12 và 13 trội nhất) |
| 15.5 – 20 | **46** | tiêu đề khối, số liệu lớn |
| 20 – 39 | **23** | 32 (số dư) ×3, 30, 28, 26 ×4, 22 ×6 |
| **Tổng** | **547** | |

### 2.3 Bo góc & bóng & padding

| `borderRadius` | Số lần |
| --- | --- |
| 2 / 4 / 5 / 6 / 7 / 8 | **102** (4 và 8 trội) |
| 10 / 12 / 14 / 16 | **197** (14 trội nhất) |
| 18 / 20 / 22 | **44** (20 trội nhất) |
| **Tổng** | **343** |

- **Không có** `borderRadius: 999` — mobile làm hình tròn bằng nửa kích thước (`46/2 = 23`, `42/2 = 21`).
- `shadowOpacity: 0.2 / 0.25` (shadow màu) = **22 chỗ**.
- `paddingHorizontal`: **20** (phổ biến nhất, ~20 chỗ), **24** (nhóm auth), **16** (khối lồng trong card).

### 2.4 Admin — `WIVI_fe/src`

| Chỉ số | Giá trị |
| --- | --- |
| Tổng số hex hard-code | **35** |
| Hex **không tồn tại** trong mobile | `#7C5CFF` ×8 (toàn bộ nằm trong props recharts: `Overview:121,157`; `Activity:255,256,261`; `Intelligence:110,130`), `#8E79FF`/`#A695FF`/`#BFB2FF` (`Activity:277,278,279`), `#B3C5FF` (`Intelligence:131`) |
| Hex **có** trong mobile nhưng admin dùng với vai trò khác | `#818CF8` — mobile dùng 1 lần làm **nền badge ADMIN** (`AvatarDropdownModal.tsx:365`), admin dùng 1 lần làm **series chart** (`Overview.tsx:122`). **Không** phải hex lạ |
| Hex lưới/trục chart | `#F1F3F5` ×5, `#8E9AA8` ×9 |
| Class palette Tailwind dùng thay token | **294 dòng** — `text-gray-400` 93, `text-gray-800` 34, `text-gray-500` 27, `bg-gray-100` 24, `text-gray-900` 23, `bg-gray-50` 18, `text-gray-600` 15, `text-gray-700` 13, `bg-gray-200` 11; emerald 16, indigo 11, amber 10, red 7, purple 4, blue 1, pink 1 |
| Class **không tồn tại** trong Tailwind (vô hiệu, không sinh CSS) | `text-gray-450` ×3 (`Activity.tsx:179,224,225`), `bg-gray-105` ×1 (`Campaigns.tsx:546`) |
| Class padding **ngoài scale** | `py-0.2` ×14, `py-0.8` ×16 — xem §11.3 |
| `font-extrabold` / `font-black` | **0 chỗ** — weight cao nhất đang dùng là `font-bold`. ✅ Không có drift weight |
| `toLocaleString` / `Intl.NumberFormat` | **0** |
| Nền app | 2 mã: `#FAFBFD` + `#F8F9FA` |
| Token/utility định nghĩa nhưng **0 chỗ dùng** | `--color-success-subtle`, `--color-warning`, `--color-warning-subtle`, `--color-danger-subtle`, `@utility border-double-bezel`, `@utility shadow-premium-lg` |
| Modal / dialog | **không có chỗ nào** trong `src/` |
| File CSS chết | `src/App.css` (184 dòng) |

---

## 3. Hợp đồng MÀU

### 3.1 Token lõi — Surface & Text

| Token Tailwind v4 | Giá trị | Mobile dùng ở đâu | Thay cho (admin) |
| --- | --- | --- | --- |
| `--color-canvas` | `#F8FAFC` | nền app (65 chỗ) | `#FAFBFD`, `#F8F9FA` |
| `--color-surface` | `#FFFFFF` | card, panel, sidebar (250 chỗ) | `#FFFFFF` (giữ) |
| `--color-surface-alt` | `#F1F5F9` | header bảng, chip, icon box (57 chỗ) | `gray-50`, `#F1F3F5` |
| `--color-surface-sunken` | `#E2E8F0` | track progress, divider đậm | `gray-100` |
| `--color-hairline` | `#E2E8F0` | viền 1px (119 chỗ) | `#F1F3F5`, `gray-100` |
| `--color-border-premium` | `rgba(15,23,42,0.05)` | viền mặc định card/input | `rgba(0,0,0,0.05)` — **giữ tên biến**, chỉ đổi giá trị |
| `--color-ink` | `#0F172A` | H1/H2, số liệu (167 chỗ) | `#1A1A1E`, `text-gray-900` |
| `--color-ink-soft` | `#334155` | body đậm, ô bảng | `text-gray-800`, `text-gray-700` |
| `--color-body` | `#475569` | đoạn văn | `text-gray-600`, `text-gray-700` |
| `--color-muted` | `#64748B` | phụ đề, label (154 chỗ) | `text-gray-500` |
| `--color-muted-light` | `#94A3B8` | meta, placeholder, tick chart (42 chỗ) | `text-gray-400`, `#8E9AA8` |
| `--color-disabled` | `#CBD5E1` | disabled, chevron mờ | `gray-300` |
| `--color-on-accent` | `#FFFFFF` | chữ trên nền accent | `text-white` |

### 3.2 Token lõi — Accent

| Token | Giá trị | Ghi chú |
| --- | --- | --- |
| `--color-primary` | **`#2563EB`** | **Công tắc duy nhất cần đổi nếu muốn chuyển sang `#0066cc`** |
| `--color-primary-hover` | `#1D4ED8` | 11 chỗ trong mobile |
| `--color-primary-active` | `#1E40AF` | suy ra từ nhóm `1E40AF` trong Onboarding |
| `--color-primary-soft` | `#EFF6FF` | blue-50, mobile dùng **52 chỗ** |
| `--color-primary-soft-border` | `#DBEAFE` | blue-100 |
| `--color-primary-soft-border-strong` | `#BFDBFE` | blue-200 |
| `--color-primary-on-dark` | `#3B82F6` | 16 chỗ; **chỉ** dùng trên nền tối |
| `--color-primary-ring` | `rgba(37,99,235,0.28)` | focus ring |
| `--color-primary-gradient` | `linear-gradient(135deg,#3B82F6,#2563EB 52%,#1D4ED8)` | nguyên văn `HomeScreen.tsx:961` — **chỉ dùng cho 1 thẻ hero/màn** |

### 3.3 Token lõi — Semantic (đúng mã Tailwind mobile đang dùng)

| Token | Giá trị | Count mobile | Vai trò |
| --- | --- | --- | --- |
| `--color-success` | `#10B981` | 43 | trạng thái OK |
| `--color-success-deep` | `#059669` | (trong nhóm 53) | chữ/nhãn success |
| `--color-success-soft` | `#ECFDF5` | 24 | nền badge success |
| `--color-success-soft-border` | `#A7F3D0` | | viền badge success |
| `--color-warning` | `#F59E0B` | 62 (chung `#D97706`) | cảnh báo |
| `--color-warning-deep` | `#D97706` | | chữ/nhãn warning, **và nhãn VIP/PRO** |
| `--color-warning-soft` | `#FEF3C7` | 24 | nền badge warning/VIP |
| `--color-warning-soft-border` | `#FDE68A` | | viền badge warning |
| `--color-danger` | `#EF4444` | 28 | lỗi, "Tạm dừng" |
| `--color-danger-deep` | `#DC2626` | 91 (chung `#CBD5E1`) | chữ trên nền soft |
| `--color-danger-soft` | `#FEF2F2` | 27 | nền badge danger |
| `--color-danger-soft-strong` | `#FEE2E2` | | nền danger đậm hơn |
| `--color-danger-soft-border` | `#FECACA` | | viền badge danger |
| `--color-info` | `#3B82F6` | 16 | series chart phụ |
| `--color-info-soft` | `#E0F2FE` | | nền chip "thiết yếu" (sky-100) |
| `--color-vip` | `#D97706` | | nhãn gói Pro/Premium |
| `--color-vip-soft` | `#FEF3C7` | | nền nhãn VIP |
| `--color-vip-deep` | `#B45309` | | chữ VIP trên nền `#FEF3C7` — mobile dùng ở `AvatarDropdownModal:351,462,537` (còn `AppHeader:265` dùng `#D97706`; xem §B.2.4) |
| `--color-warning-soft-alt` | `#FFFBEB` | | amber-50: nền dialog/banner/promo cảnh báo (`CustomAlertModal:50`; `AvatarDropdownModal:440,519`). **Phân biệt** với `warning-soft` `#FEF3C7` (amber-100) dùng cho badge |

### 3.4 Dark surface — chỉ cho khối AI / Sepay

| Token | Giá trị (mobile) | Ghi chú |
| --- | --- | --- |
| `--color-dark-canvas` | `#13151B` | nền modal AI |
| `--color-dark-surface` | `#181A22` | header/footer modal |
| `--color-dark-elevated` | `#222634` | ô input, bubble |
| `--color-dark-hairline` | `#2F3447` | viền |
| `--color-dark-hairline-soft` | `#222530` | divider |
| `--color-dark-text` | `#E2E8F0` | chữ chính |
| `--color-dark-muted` | `#8A92A6` | chữ phụ |
| accent trong dark | `--color-primary-on-dark` = `#3B82F6` | **bỏ tím `#6C5CE7`** |

36 chỗ dùng dark hex, tập trung ở `AiChatAssistantModal.tsx`, `UpgradeProModal.tsx`, `LinkBankModal.tsx`.

> **Quyết định cần bạn xác nhận:** admin hiện chưa có màn AI nào dùng nền tối (`Intelligence.tsx` vẫn nền sáng). Nếu muốn giữ "chất AI" của mobile, có 2 lựa chọn: (a) dùng `#3B82F6` làm accent trong khối đó và **không** thêm màu thứ hai — khuyến nghị; (b) thêm `--color-ai-accent: #6C5CE7` và **ghi rõ** đây là accent thứ hai, phá luật 1-accent của `DESIGN.md`.

### 3.5 Palette phụ trợ đã tồn tại trong mobile → nên đưa vào admin

Ba bảng màu này là **định nghĩa thật** trong code mobile, admin đang thiếu:

**a) Bảng màu chọn cho hũ** — `JarsScreen.tsx:525-534` (8 màu):
`#2563EB` · `#10B981` · `#F59E0B` · `#EF4444` · `#8B5CF6` · `#06B6D4` · `#EC4899` · `#475569`

**b) Thang màu theo % tiêu dùng** — `utils/budget.ts:5-11` (5 bậc, dùng cho progress bar & KPI):

| Ngưỡng | Màu | Ý nghĩa |
| --- | --- | --- |
| ≥ 100% | `#DC2626` | vượt ngân sách |
| ≥ 90% | `#EF4444` | báo động cao |
| ≥ 75% | `#F59E0B` | cảnh báo |
| ≥ 50% | `#FBBF24` | đã tiêu một nửa |
| < 50% | `#10B981` | an toàn |

**c) Theme theo nhóm hũ** — `HomeScreen.tsx:806-871`: mỗi nhóm có 5 giá trị `color / iconColor / bgColor / badgeBg / badgeText`:

| Nhóm | color | iconColor | bgColor |
| --- | --- | --- | --- |
| Tăng trưởng / Đầu tư | `#10B981` | `#059669` | `#E8F8F0` |
| Giải trí / Hưởng thụ | `#8B5CF6` | `#7C3AED` | `#F3E8FF` |
| Học tập / Bản thân | `#F59E0B` | `#D97706` | `#FEF3C7` |
| Thiết yếu / Ăn uống | `#3B82F6` | `#2563EB` | `#E0F2FE` |
| Di chuyển / Xe | `#06B6D4` | `#0891B2` | `#CFFAFE` |

> Ý nghĩa cho admin: các nhãn "Gói Pro / Premium / Basic / Miễn phí" trong `Members.tsx` nên map vào **cùng một hệ** (vip / primary / warning / neutral) thay vì tự pha `indigo-50`, `amber-50`, `gray-100` như hiện tại.

---

## 4. Hợp đồng CHỮ

### 4.1 Font family

| Vai trò | Mobile thực tế | Admin hiện tại | **Chuẩn hoá** |
| --- | --- | --- | --- |
| Body/UI | font hệ thống (RN bỏ qua font-stack — xem F2) | `Inter` | `--font-sans: 'Inter','SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif` |
| Display/heading | font hệ thống | `Plus Jakarta Sans` | `--font-display:` **= Inter** (bỏ Jakarta) |
| Mono | `'monospace'` (`HistoryScreen.tsx:1085`) | mặc định | `--font-mono: 'SF Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace` |

Bù trừ khi dùng Inter thay SF Pro (theo `DESIGN.md:370-371`): thêm `letter-spacing: -0.006em` cho body, `-0.02em` cho heading (`h1,h2,h3`), và line-height body 1.44 thay vì 1.47.

### 4.2 Thang chữ — map thẳng sang class Tailwind

| Vai trò | Mobile (đo được) | DESIGN.md token | Admin đang dùng | **Class chuẩn** |
| --- | --- | --- | --- | --- |
| Số dư/KPI hero | **32 / 900**, tracking −0.5 | `hero-display` 56/600 | `text-base font-bold` (16/700) | `text-[32px] font-bold tracking-[-0.02em] leading-none tabular-nums` |
| H1 trang | **20 / 800**, tracking −0.3 | `display-lg` 40/600 | `text-xl font-bold` | `text-xl font-bold tracking-tight` (giữ) |
| Số liệu lớn trong card | **18–20 / 800** | `tagline` 21/600 | `text-base font-bold` | `text-lg font-bold tracking-tight tabular-nums` |
| Tiêu đề khối | **16–17 / 700–800** | `display-md` 34/600 | `text-xs font-bold uppercase tracking-wider` | `text-xs font-bold uppercase tracking-wider` (giữ — house style của cả 2 bên) |
| Body mạnh | **13 / 700** (201 chỗ weight 700) | `body-strong` 17/600 | `text-xs font-semibold` | `text-xs font-semibold` |
| Body thường | **12–13 / 500–600** | `body` 17/400 | `text-xs font-medium` | `text-xs font-medium` |
| Phụ / caption | **11–11.5 / 500–600** (160 chỗ ở dải 9–11.5) | `caption` 14/400 | `text-[11px]` | `text-[11px] font-medium` |
| Meta mono | **9.5–10.5 / 700–800** | `fine-print` 12/400 | `text-[10px] font-mono` | `text-[10px] font-mono tabular-nums` |
| Nhãn uppercase | **9.5–10 / 800** | `micro-legal` 10/400 | `text-[10px] font-bold uppercase tracking-wider` | `text-[10px] font-bold uppercase tracking-wider` (giữ) |
| Badge | **9.5–11 / 800** | `button-utility` 14/400 | `text-[9px] font-bold uppercase tracking-wider` | `text-[9px] font-bold uppercase tracking-wider` (giữ) |
| Nút | **12–13 / 700** | `body` 17/400 | `text-[11px] font-semibold` | `text-[11px] font-semibold` (giữ) |

### 4.3 Luật weight (chốt cho admin)

```
Cho phép: 400 · 500 (chỉ size ≤ 13px) · 600 · 700
Cấm:      800 (font-extrabold) · 900 (font-black)
```

- Lý do cấm: `DESIGN.md:361-363` chốt ladder `300/400/600/700`, và mobile đã lạm dụng 800/900 **125 lần** (F5) — admin không nên copy lỗi đó.
- Heading ≥ 20px: `font-bold` (700). Không dùng weight nhẹ cho heading.
- Số tiền/%: `font-mono` + `tabular-nums` + `font-bold`.

---

## 5. Hợp đồng HÌNH DẠNG & BÓNG & LAYOUT

### 5.1 Bo góc — rút 343 giá trị mobile về 5 token

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--radius-chip` | `10px` | badge, chip, icon box nhỏ |
| `--radius-control` | `12px` | input, button, nút nhỏ |
| `--radius-panel` | `16px` | card, panel, bảng |
| `--radius-card` | `22px` | card hero, KPI lớn |
| `--radius-pill` | `9999px` | avatar, dot, progress, pill |

Thay thế trong admin: `rounded` (4px) → `rounded-chip`; `rounded-md` (6px) → `rounded-chip`; `rounded-lg` (8px) → `rounded-control`; `rounded-2xl` (16px) → `rounded-panel`; `rounded-full` → `rounded-pill`.

### 5.2 Đổ bóng

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `shadow-premium-sm` | `0 1px 2px rgba(0,0,0,.02), 0 0 0 1px rgba(0,0,0,.03)` | card mặc định (**giữ nguyên**) |
| `shadow-premium` | `0 1px 3px rgba(0,0,0,.04), 0 6px 16px rgba(0,0,0,.03), 0 0 0 1px rgba(0,0,0,.04)` | card hover/dropdown (**giữ nguyên**) |
| `shadow-premium-lg` | `0 1px 4px rgba(0,0,0,.04), 0 12px 32px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)` | modal (**giữ nguyên**) |
| `shadow-float` | `0 10px 30px rgba(15,23,42,.10)` | sidebar, sticky bar |
| `shadow-primary` | `0 6px 14px rgba(37,99,235,.25)` | **chỉ** thẻ hero / CTA chính |
| `shadow-primary-sm` | `0 3px 6px rgba(37,99,235,.25)` | avatar/CTA nhỏ |

**Luật:** `shadow-primary*` tối đa **1 lần/màn** (mobile lạm dụng 22 lần — F6). Card thường luôn dùng neutral.

### 5.3 Khoảng cách

| Hạng mục | Mobile | Admin | **Chuẩn hoá** |
| --- | --- | --- | --- |
| Padding ngoài | 20 | 24 (`p-6`) | **24px** (dashboard vận hành dày hơn mobile là chủ ý) |
| Padding trong card | 22 (card lớn) / 16 (khối lồng) | 16 (`p-4`) | **16px**; card hero **22px** |
| Gap giữa card | 16 | 24 (`gap-6`) | **24px** desktop, `gap-4` < 1024px |
| Chiều cao nav | ~64 (tab bar) | 56 (`h-14`) | **56px** (giữ) |
| Rộng sidebar | — | 240 (`w-60`) | **240px** (giữ) |

---

## 6. Hợp đồng ĐỊNH DẠNG SỐ & TIỀN

Đây là drift nặng nhất về mặt người dùng cuối và **dễ sửa nhất**.

| | Mobile | Admin hiện tại |
| --- | --- | --- |
| Hàm | `formatCompactMoney` (`budget.ts:20-46`) | không có, hard-code chuỗi |
| ≥ 1 tỷ | `"1,2 Tỷ"` | — |
| ≥ 1 triệu | `"10 Tr"` / `"1,5 Tr"` | `'642,8M đ'` (`Overview.tsx:75`, `Activity.tsx:77`) |
| ≥ 1 nghìn | `"500k"` | `'104,240'` (không hậu tố đơn vị) |
| < 1 nghìn | `"500 đ"` | — |
| Dấu thập phân | `,` (vi-VN) | `.` và `,` trộn lẫn |
| `toLocaleString` | dùng nhiều | **0 chỗ** |

**Việc cần làm:** copy nguyên `formatCompactMoney` + `getProgressColor` từ `WVI/WIVI/src/utils/budget.ts` sang `WIVI_fe/src/lib/format.ts` (giữ nguyên chuỗi đầu ra), rồi thay mọi chuỗi tiền hard-code trong 6 page. Đây là util thuần, không phụ thuộc React Native, copy được 1:1.

---

## 7. BẢNG FIND & REPLACE trong `WIVI_fe`

| # | Tìm | Thay bằng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `--color-primary: #7C5CFF` | `#2563EB` | `index.css:4` — **công tắc accent** |
| 2 | `--color-primary-hover: #6C4EE8` | `#1D4ED8` | `index.css:5` |
| 3 | `stroke="#7C5CFF"`, `fill="#7C5CFF"`, `stopColor="#7C5CFF"` | `var(--color-primary)` / `#2563EB` | `Activity.tsx:255,256,261`; `Intelligence.tsx:110,130`; `Overview.tsx:121,157` |
| 4 | `#818CF8`, `#B3C5FF` | `#93C5FD` (blue-300) | `Overview.tsx:122`, `Intelligence.tsx:131` |
| 5 | `#8E79FF`, `#A695FF`, `#BFB2FF` | `#2563EB`, `#3B82F6`, `#93C5FD` | `Activity.tsx:277-279` (phễu chuyển đổi) |
| 6 | `#F1F3F5` (lưới chart) | `#F1F5F9` | 5 chỗ |
| 7 | `#8E9AA8` (tick chart) | `#94A3B8` | 9 chỗ |
| 8 | `bg-[#F8F9FA]`, `bg-[#FAFBFD]` | `bg-canvas` (`#F8FAFC`) | `App.tsx:15,21`, `index.html:12` |
| 9 | `text-[#1A1A1E]` | `text-ink` | `index.html:12` |
| 10 | `bg-[#10B981]/10`, `border-[#10B981]/20` | `bg-success-soft`, `border-success/20` | `Overview.tsx:59`, `Activity.tsx:183` |
| 11 | `bg-[#F1F3F5]` | `bg-surface-alt` | `Campaigns.tsx:316` |
| 12 | `text-gray-900` | `text-ink` | nhiều |
| 13 | `text-gray-800` / `text-gray-700` | `text-ink-soft` | nhiều |
| 14 | `text-gray-600` | `text-body` | nhiều |
| 15 | `text-gray-500` | `text-muted` | nhiều |
| 16 | `text-gray-400` | `text-muted-light` | nhiều |
| 17 | `bg-gray-50`, `bg-gray-50/40`, `bg-gray-50/20` | `bg-surface-alt` (+ độ mờ) | nhiều |
| 18 | `bg-gray-100` (track progress) | `bg-surface-sunken` | 4 |
| 19 | `border-gray-100`, `divide-gray-100` | `border-hairline`, `divide-hairline` | nhiều |
| 20 | `emerald-*` | `success` / `success-deep` / `success-soft` | nhiều |
| 21 | `amber-*` | `warning*` | nhiều |
| 22 | `red-*` | `danger*` | nhiều |
| 23 | `indigo-*`, `purple-*` | `info*` (hoặc `vip*` cho nhãn gói) | 4+ |
| 24 | `font-extrabold`, `font-black` | `font-bold` | **0 chỗ hiện tại** (đã kiểm chứng) — giữ làm luật phòng ngừa, không phải việc cần sửa |
| 25 | `rounded`, `rounded-md` | `rounded-chip` / `rounded-control` | nhiều |
| 26 | `rounded-lg` | `rounded-control` | nhiều |
| 27 | `rounded-2xl` | `rounded-panel` | nhiều |
| 28 | `Plus Jakarta Sans` | xoá khỏi `index.html`, `--font-display` dùng Inter | 2 |
| 29 | chuỗi tiền hard-code `'642,8M đ'` | `formatCompactMoney(...)` | `Overview.tsx:75`, `Activity.tsx:77` |
| 30 | `bg-primary/10`, `bg-primary/5` | `bg-primary-soft` | nhiều |
| 31 | `ring-primary/10` | `ring-primary-ring` | nhiều |

**Dọn code chết (F10):** xoá `src/App.css`; gỡ `motion` và `tailwind-merge` khỏi `package.json` nếu không dùng; hoặc giữ `motion` nếu có kế hoạch animation.

---

## 8. Template component chung

Trạng thái: `WIVI_fe/src/components/` **chỉ có `Sidebar.tsx` + `TopNav.tsx`**. `Overview.tsx` lặp 6 lần chuỗi `bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm`, `Members.tsx` lặp bảng + badge + progress inline. Mobile thì ngược lại: có component dùng chung thật (`AppHeader`, `CustomAlertModal`, `FloatingTabBar`, …).

### 8.1 Bảng đối chiếu

| Mobile | Vai trò | Admin hiện tại | **Component cần tạo** | Props |
| --- | --- | --- | --- | --- |
| `AppHeader.tsx` | **app bar**: logo + tên user + badge gói (VIP PRO / Miễn phí) + chuông + bottom-sheet thông báo | `TopNav.tsx` | giữ `TopNav.tsx` (app bar). **KHÔNG** map sang `PageHeader` — `AppHeader` không hề có tiêu đề trang (xem §B.1) | — |
| (tiêu đề nằm trong từng screen mobile, không ở AppHeader) | tiêu đề màn | khối `h-10` ở đầu **cả 6 page** | `ui/PageHeader.tsx` | `title, subtitle, status?, actions?` |
| style `balanceCard` (`HomeScreen.tsx:1923`) | thẻ hero gradient | inline `Overview.tsx` | `ui/HeroCard.tsx` | `label, amount, delta?, caption?, action?` |
| style KPI card | ô số liệu | inline `Overview.tsx:79` | `ui/StatCard.tsx` | `label, value, delta?, up?, tone?, icon?` |
| panel có dot + tiêu đề uppercase | card khối | lặp ở cả 6 page | `ui/SectionCard.tsx` | `title, subtitle?, right?, padded?, children` |
| `CustomAlertModal.tsx` | modal 4 tone (`error/warning/info/success`) | — | `ui/Modal.tsx` + `ui/AlertModal.tsx` | `open, onClose, tone, title, description, confirmText` |
| badge VIP (`AvatarDropdownModal.tsx:343`) | nhãn trạng thái | inline `Members.tsx:222` | `ui/Badge.tsx` | `tone: neutral\|primary\|success\|warning\|danger\|info\|vip, dot?, size?` |
| progress quota (`Members.tsx:248`) | thanh tiến độ + ngưỡng màu | inline | `ui/ProgressBar.tsx` | `value, max, tone?, autoTone?, label?, showValue?` |
| `ThermalReceiptModal.tsx` | bảng dữ liệu | `<table>` inline `Members.tsx:186` | `ui/DataTable.tsx` | `columns, rows, rowKey, empty?` |
| search (`Members.tsx:173`, `TopNav.tsx:14`) | ô tìm kiếm | **2 bản lặp** | `ui/SearchInput.tsx` | `value, onChange, placeholder?, size?` |
| "Không tìm thấy…" (`Members.tsx:201`) | empty state | inline | `ui/EmptyState.tsx` | `title, description?, icon?, action?, colSpan?` |
| CTA (`Overview.tsx:63`) | button | inline | `ui/Button.tsx` | `variant, size, icon?, loading?` |
| `WaveChart.tsx` | chart wrapper | `recharts` inline | `ui/ChartCard.tsx` + `theme/chart.ts` | `title, legend?, children` |

### 8.2 `src/index.css` — thay khối `@theme`

```css
@import "tailwindcss";

@theme {
  /* ── Accent — công tắc duy nhất: đổi #2563EB → #0066cc nếu bám DESIGN.md ── */
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-active: #1E40AF;
  --color-primary-soft: #EFF6FF;
  --color-primary-soft-border: #DBEAFE;
  --color-primary-soft-border-strong: #BFDBFE;
  --color-primary-on-dark: #3B82F6;
  --color-primary-ring: rgba(37, 99, 235, 0.28);
  --color-on-accent: #FFFFFF;

  /* ── Ink / Text ── */
  --color-ink: #0F172A;
  --color-ink-soft: #334155;
  --color-body: #475569;
  --color-muted: #64748B;
  --color-muted-light: #94A3B8;
  --color-disabled: #CBD5E1;

  /* ── Surface / Border ── */
  --color-canvas: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-alt: #F1F5F9;
  --color-surface-sunken: #E2E8F0;
  --color-hairline: #E2E8F0;
  --color-border-premium: rgba(15, 23, 42, 0.05); /* giữ tên để không phải sửa 6 page */

  /* ── Semantic ── */
  --color-success: #10B981;
  --color-success-deep: #059669;
  --color-success-soft: #ECFDF5;
  --color-success-soft-border: #A7F3D0;
  --color-warning: #F59E0B;
  --color-warning-deep: #D97706;
  --color-warning-soft: #FEF3C7;
  --color-warning-soft-border: #FDE68A;
  --color-danger: #EF4444;
  --color-danger-deep: #DC2626;
  --color-danger-soft: #FEF2F2;
  --color-danger-soft-strong: #FEE2E2;
  --color-danger-soft-border: #FECACA;
  --color-info: #3B82F6;
  --color-info-soft: #E0F2FE;
  --color-vip: #D97706;
  --color-vip-soft: #FEF3C7;
  --color-vip-deep: #B45309;          /* chữ VIP trên nền vip-soft */
  --color-warning-soft-alt: #FFFBEB;  /* amber-50: nền dialog/banner cảnh báo */

  /* ── Dark (khối AI / Sepay) ── */
  --color-dark-canvas: #13151B;
  --color-dark-surface: #181A22;
  --color-dark-elevated: #222634;
  --color-dark-hairline: #2F3447;
  --color-dark-hairline-soft: #222530;
  --color-dark-text: #E2E8F0;
  --color-dark-muted: #8A92A6;

  /* ── Typography ── */
  --font-sans: 'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* ── Radius (rút 343 giá trị mobile về 5) ── */
  --radius-chip: 10px;
  --radius-control: 12px;
  --radius-panel: 16px;
  --radius-card: 22px;
  --radius-pill: 9999px;
}

@layer base {
  body {
    background-color: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    letter-spacing: -0.006em;   /* bù Inter thay SF Pro, DESIGN.md:370 */
  }
  h1, h2, h3 { letter-spacing: -0.02em; font-weight: 700; }
  .font-mono, code, kbd { font-variant-numeric: tabular-nums; }
}

/* Giữ nguyên 4 utility cũ để không phá 6 page đang chạy */
@utility shadow-premium-sm {
  box-shadow: 0 1px 2px rgba(0,0,0,.02), 0 0 0 1px rgba(0,0,0,.03);
}
@utility shadow-premium {
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 6px 16px rgba(0,0,0,.03), 0 0 0 1px rgba(0,0,0,.04);
}
@utility shadow-premium-lg {
  box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 12px 32px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04);
}
@utility border-double-bezel { background: var(--color-surface); position: relative; }

/* Thêm mới */
@utility shadow-float { box-shadow: 0 10px 30px rgba(15,23,42,.10); }
@utility shadow-primary { box-shadow: 0 6px 14px rgba(37,99,235,.25); }      /* tối đa 1 lần/màn */
@utility shadow-primary-sm { box-shadow: 0 3px 6px rgba(37,99,235,.25); }
@utility bg-hero-primary {                                                    /* HomeScreen.tsx:961 */
  background-image: linear-gradient(135deg, #3B82F6 0%, #2563EB 52%, #1D4ED8 100%);
}

@utility scrollbar-none {
  -ms-overflow-style: none; scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
@utility scrollbar-premium {
  &::-webkit-scrollbar { width: 5px; height: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(15,23,42,.1); border-radius: 99px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,.2); }
}
```

`index.html`: bỏ `Plus+Jakarta+Sans` khỏi link Google Fonts → `family=Inter:wght@300;400;500;600;700&display=swap`; `body class="bg-canvas text-ink antialiased"`.

### 8.3 `src/theme/chart.ts` — hết hard-code trong recharts

```ts
export const chartTheme = {
  grid: 'var(--color-surface-alt)',      // #F1F5F9  — thay #F1F3F5
  axisTick: 'var(--color-muted-light)',  // #94A3B8  — thay #8E9AA8
  series: ['#2563EB', '#3B82F6', '#93C5FD', '#10B981', '#F59E0B', '#EF4444'],
  areaFillFrom: 'rgba(37, 99, 235, 0.10)',
  areaFillTo: 'rgba(37, 99, 235, 0)',
  tooltip: {
    background: '#fff',
    border: '1px solid rgba(15,23,42,0.05)',
    borderRadius: '8px',
    fontSize: '11px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
} as const;
```

### 8.4 `src/lib/format.ts` — copy 1:1 từ mobile

```ts
/** Copy nguyên từ WVI/WIVI/src/utils/budget.ts — giữ đúng chuỗi đầu ra. */
export function formatCompactMoney(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs === 0) return '0 đ';
  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    return `${sign}${val % 1 === 0 ? val : val.toFixed(1).replace('.', ',')} Tỷ`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}${val % 1 === 0 ? val : val.toFixed(1).replace('.', ',')} Tr`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}${val % 1 === 0 ? val : val.toFixed(1).replace('.', ',')}k`;
  }
  return `${sign}${abs.toLocaleString('vi-VN')} đ`;
}

/** Copy nguyên thang màu từ budget.ts:5-11. */
export function getProgressColor(pct: number): string {
  if (pct >= 100) return '#DC2626';
  if (pct >= 90) return '#EF4444';
  if (pct >= 75) return '#F59E0B';
  if (pct >= 50) return '#FBBF24';
  return '#10B981';
}
```

### 8.5 Component (11 file trong `src/components/ui/`, cộng `AlertModal.tsx` ở §B.2.1)

**`Button.tsx`**
```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary hover:bg-primary-hover text-on-accent shadow-premium-sm',
  secondary: 'bg-surface text-ink-soft border border-hairline hover:bg-surface-alt',
  ghost: 'bg-transparent text-muted hover:bg-surface-alt hover:text-ink',
  danger: 'bg-danger hover:bg-danger-deep text-on-accent shadow-premium-sm',
};
const SIZES = {
  sm: 'h-7 px-2.5 text-[11px] rounded-control',
  md: 'h-9 px-3.5 text-xs rounded-control',
};

export const Button = ({ variant = 'primary', size = 'sm', icon, className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES; icon?: ReactNode }) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-200',
      'outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
      'active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
      VARIANTS[variant], SIZES[size], className)}
    {...rest}
  >
    {icon}{children}
  </button>
);
```

**`Badge.tsx`**
```tsx
import type { ReactNode } from 'react';
import clsx from 'clsx';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'vip';
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-alt text-muted border-hairline',
  primary: 'bg-primary-soft text-primary border-primary-soft-border',
  success: 'bg-success-soft text-success-deep border-success-soft-border',
  warning: 'bg-warning-soft text-warning-deep border-warning-soft-border',
  danger:  'bg-danger-soft text-danger-deep border-danger-soft-border',
  info:    'bg-info-soft text-primary border-primary-soft-border-strong',
  vip:     'bg-vip-soft text-vip border-warning-soft-border',
};

export const Badge = ({ tone = 'neutral', dot, children, className }: {
  tone?: Tone; dot?: boolean; children: ReactNode; className?: string;
}) => (
  <span className={clsx(
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-chip border',
    'text-[9px] font-bold uppercase tracking-wider whitespace-nowrap',
    TONES[tone], className)}>
    {dot && <span className="w-1.5 h-1.5 rounded-pill bg-current" />}
    {children}
  </span>
);
```

**`SectionCard.tsx`** — thay mọi chuỗi card viết tay
```tsx
import type { ReactNode } from 'react';
import clsx from 'clsx';

export const SectionCard = ({ title, subtitle, right, children, className, bodyClassName, padded = true }: {
  title?: string; subtitle?: string; right?: ReactNode; children: ReactNode;
  className?: string; bodyClassName?: string; padded?: boolean;
}) => (
  <section className={clsx(
    'bg-surface rounded-panel border border-border-premium shadow-premium-sm',
    'flex flex-col min-h-0 overflow-hidden', className)}>
    {title && (
      <header className="px-4 py-3 border-b border-border-premium bg-surface-alt/40 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-pill bg-primary animate-pulse shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider truncate">{title}</h3>
            {subtitle && <p className="text-[10px] text-muted-light truncate">{subtitle}</p>}
          </div>
        </div>
        {right}
      </header>
    )}
    <div className={clsx('min-h-0', padded && 'p-4', bodyClassName)}>{children}</div>
  </section>
);
```

**`StatCard.tsx`**
```tsx
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

export const StatCard = ({ label, value, delta, up = true, tone = 'primary', icon, onClick }: {
  label: string; value: string; delta?: string; up?: boolean;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: ReactNode; onClick?: () => void;
}) => {
  const toneText = {
    primary: 'text-primary', success: 'text-success', warning: 'text-warning',
    danger: 'text-danger', info: 'text-info',
  }[tone];
  return (
    <div onClick={onClick} className="bg-surface p-4 rounded-panel border border-border-premium shadow-premium-sm flex flex-col justify-between h-[95px] transition-all duration-300 hover:border-primary/20 hover:shadow-premium">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-light uppercase tracking-wider truncate">{label}</span>
        {icon && <div className={clsx('w-6 h-6 rounded-chip bg-surface-alt border border-border-premium flex items-center justify-center', toneText)}>{icon}</div>}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold font-display text-ink tracking-tight leading-tight tabular-nums truncate">{value}</span>
        {delta && (
          <span className={clsx('text-[9px] font-semibold font-mono px-1.5 py-0.5 rounded-chip inline-flex items-center gap-0.5 shrink-0',
            up ? 'text-success bg-success-soft' : 'text-danger bg-danger-soft')}>
            {up ? <TrendUp size={10} /> : <TrendDown size={10} />}{delta}
          </span>
        )}
      </div>
    </div>
  );
};
```

**`HeroCard.tsx`**
```tsx
import type { ReactNode } from 'react';

export const HeroCard = ({ label, amount, caption, delta, action }: {
  label: string; amount: string; caption?: string; delta?: string; action?: ReactNode;
}) => (
  <div className="relative bg-hero-primary rounded-card p-[22px] shadow-primary overflow-hidden">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-semibold text-white/90">{label}</span>{action}
    </div>
    <div className="text-[32px] font-bold text-white tracking-[-0.02em] leading-none tabular-nums mb-3">{amount}</div>
    <div className="flex items-center gap-1.5">
      {delta && <span className="text-[12.5px] font-bold text-[#4ADE80]">{delta}</span>}
      {caption && <span className="text-xs font-medium text-white/80">{caption}</span>}
    </div>
  </div>
);
```

**`ProgressBar.tsx`** — hỗ trợ thang màu tự động của mobile
```tsx
import clsx from 'clsx';
import { getProgressColor } from '../../lib/format';

const TONES = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' } as const;

export const ProgressBar = ({ value, max = 100, tone, autoTone = false, label, showValue = true, width = 'w-28' }: {
  value: number; max?: number; tone?: keyof typeof TONES; autoTone?: boolean;
  label?: string; showValue?: boolean; width?: string;
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={clsx('flex flex-col gap-1', width)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-[10px] font-mono">
          {label && <span className="text-muted">{label}</span>}
          {showValue && <span className="font-semibold text-ink-soft tabular-nums">{value} / {max}</span>}
        </div>
      )}
      <div className="h-1 bg-surface-sunken rounded-pill overflow-hidden">
        <div
          className={clsx('h-full rounded-pill transition-all duration-500', !autoTone && TONES[tone ?? 'primary'])}
          style={{ width: `${pct}%`, backgroundColor: autoTone ? getProgressColor(pct) : undefined }}
        />
      </div>
    </div>
  );
};
```

**`SearchInput.tsx`**
```tsx
import { MagnifyingGlass } from '@phosphor-icons/react';
import clsx from 'clsx';

export const SearchInput = ({ value, onChange, placeholder = 'Tìm kiếm…', className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) => (
  <div className={clsx('relative group', className)}>
    <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light group-focus-within:text-primary transition-colors" />
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface border border-hairline rounded-control py-1.5 pl-9 pr-3 text-xs text-ink placeholder-muted-light outline-none transition-all focus:border-primary/30 focus:ring-2 focus:ring-primary-ring"
    />
  </div>
);
```

**`EmptyState.tsx`**
```tsx
import type { ReactNode } from 'react';

export const EmptyState = ({ title, description, icon, action, colSpan }: {
  title: string; description?: string; icon?: ReactNode; action?: ReactNode; colSpan?: number;
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
      {icon && <div className="w-10 h-10 rounded-pill bg-surface-alt border border-border-premium flex items-center justify-center text-muted-light">{icon}</div>}
      <p className="text-xs font-semibold text-ink-soft">{title}</p>
      {description && <p className="text-[11px] text-muted-light max-w-xs">{description}</p>}
      {action}
    </div>
  );
  return colSpan ? <tr><td colSpan={colSpan}>{content}</td></tr> : content;
};
```

**`PageHeader.tsx`**
```tsx
import type { ReactNode } from 'react';

export const PageHeader = ({ title, subtitle, status, actions }: {
  title: string; subtitle?: string; status?: ReactNode; actions?: ReactNode;
}) => (
  <div className="flex justify-between items-center gap-4 h-10 px-1 shrink-0">
    <div className="min-w-0">
      <h1 className="text-xl font-bold font-display text-ink tracking-tight truncate">{title}</h1>
      {subtitle && <p className="text-[11px] text-muted font-medium truncate">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-3 shrink-0">{status}{actions}</div>
  </div>
);
```

**`DataTable.tsx`**
```tsx
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string; header: string; align?: 'left' | 'right' | 'center'; width?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, empty, className }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T, i: number) => string;
  empty?: ReactNode; className?: string;
}) {
  return (
    <div className={`flex-1 overflow-y-auto scrollbar-premium ${className ?? ''}`}>
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border-premium bg-surface-alt/80 backdrop-blur text-[10px] uppercase font-bold text-muted-light tracking-wider">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }}
                  className={`py-2.5 px-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline text-xs text-body">
          {rows.length === 0
            ? (empty ?? <EmptyState title="Không có dữ liệu." colSpan={columns.length} />)
            : rows.map((row, i) => (
                <tr key={rowKey(row, i)} className="hover:bg-surface-alt/50 transition-colors group">
                  {columns.map((c) => (
                    <td key={c.key} className={`py-3 px-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
```

**`Modal.tsx`**
```tsx
import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

export const Modal = ({ open, onClose, title, description, children, footer, width = 'max-w-md' }: {
  open: boolean; onClose: () => void; title: string; description?: string;
  children?: ReactNode; footer?: ReactNode; width?: string;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className={`w-full ${width} bg-surface rounded-card border border-hairline shadow-premium-lg overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border-premium">
          <div>
            <h3 className="text-sm font-bold text-ink">{title}</h3>
            {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-control text-muted-light hover:bg-surface-alt hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && <div className="px-5 py-3 border-t border-border-premium bg-surface-alt/40 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};
```

---

## 9. Checklist áp dụng

- [ ] **1.** Dán `index.css` mới (§8.2) + sửa `index.html` (bỏ Jakarta, `bg-canvas text-ink`). Chạy `pnpm build`.
- [ ] **2.** Tạo `src/theme/chart.ts` (§8.3) và `src/lib/format.ts` (§8.4).
- [ ] **3.** Tạo `src/components/ui/` với **12 file** (11 file ở §8.5 + `AlertModal.tsx` ở §B.2.1). `pnpm build` phải pass dù chưa page nào dùng.
- [ ] **4.** Restyle shell: `App.tsx` (`bg-canvas`, `p-6`), `Sidebar.tsx`, `TopNav.tsx` (dùng `SearchInput`).
- [ ] **5.** Migrate từng page theo §7, mỗi page 1 commit: `Overview` → `Members` → `Activity` → `Intelligence` → `Campaigns` → `Configuration`.
- [ ] **6.** Dọn code chết: xoá `src/App.css`; gỡ `motion`, `tailwind-merge` khỏi `package.json` nếu không dùng.
- [ ] **7.** Verify:
  ```bash
  cd WIVI_fe
  pnpm lint
  pnpm build
  ```
- [ ] **8.** Ghi drift còn lại vào `AGENTS.md` root mục "Drift đã biết": mobile còn `#0066cc` vs `#2563EB`; mobile lạm dụng weight 800/900 (125 chỗ) và weight 500 (34 chỗ); mobile dùng font-stack CSS trong RN (F2); `package.json` mobile tên `stickersmash` trong khi app là `WIVI` (`app.json:3`).

### Quy tắc chống drift (thêm vào quy ước `WIVI_fe`)

1. **Cấm hex trong page/component.** Chỉ token hoặc class sinh từ `@theme`; chart dùng `theme/chart.ts`.
2. **Cấm palette Tailwind ngoài hệ** (`gray-*`, `slate-*`, `emerald-*`, `amber-*`, `indigo-*`, `red-*`, `purple-*`) trong `src/`. Dùng token semantic.
3. **Một accent.** Mọi CTA/link/focus = `primary`. Không thêm màu thứ hai (kể cả cho khối AI).
4. **Cấm `font-extrabold`/`font-black`.** Tối đa `font-bold`.
5. **`shadow-primary*` tối đa 1 lần/màn.**
6. **Radius chỉ thuộc 5 token** §5.1.
7. **Mọi khối card đi qua `SectionCard`/`StatCard`/`HeroCard`.** Review PR chặn `bg-white rounded-* border-border-premium` viết tay trong page.
8. **Tiền/số luôn qua `lib/format.ts`.** Cấm hard-code `'642,8M đ'`.
9. Dữ liệu vẫn là mock và phải giữ nhãn mock; không mô tả action mock như API thật (AGENTS.md root §6).

---

## 10. Giới hạn & việc cần bạn quyết

**Giới hạn kỹ thuật của phiên này**

- Mọi lệnh shell (`pwsh`) đều bị chặn: `SetNamedSecurityInfoW failed (Win32 5): grantWrite(F:\study\EXE)`. Vì vậy:
  - **Chưa chạy được** `pnpm lint` / `pnpm build` ở `WIVI_fe` để xác nhận bản refactor.
  - Số liệu trong §2 là **đếm bằng ripgrep** (chính xác), nhưng bảng find & replace §7 **chưa có số lần chính xác cho từng class `gray-*`** — cần chạy shell hoặc bật full access để đếm.
- `#FFFFFF` chạm trần 250 kết quả nên con số thật có thể cao hơn.

**Cần bạn quyết**

1. **Accent:** đã chốt `#2563EB`. Nếu sau này đổi sang `#0066cc`, chỉ cần sửa `--color-primary` + `--color-primary-hover` (`#0071e3`) + `--color-primary-ring` và 2 giá trị gradient — không phải sửa page.
2. **Khối AI (`Intelligence.tsx`) có dùng nền tối không?** Nếu có → tôi thêm section dark vào template; nếu không → bỏ luôn bộ token dark khỏi `index.css` cho gọn.
3. **Có muốn tôi apply trực tiếp không?** Tôi làm được ngay theo checklist §9, nhưng cần **full access** cho phiên này để chạy `pnpm lint` + `pnpm build` xác minh sau mỗi bước (hiện tại không chạy được shell).

---

# PHỤ LỤC A — Kiểm kê dòng-dòng `WIVI_fe` (để refactor)

Toạ độ `file:line` cho từng chỗ cần thay. Cột "SL" = số dòng chứa class (ripgrep trên `src/`).

> **Đính chính so với bản trước của tài liệu này:** tôi từng ghi `font-extrabold`/`font-black` "có dùng" ở admin. **Sai.** Đã kiểm chứng bằng grep: **0 kết quả**. Weight cao nhất trong `WIVI_fe` là `font-bold`. §4.3 vì vậy là **luật phòng ngừa**, không phải việc cần sửa.

## A.1 — 27 chỗ card viết tay → `SectionCard`

Class lõi xuất hiện ở **mọi** card: `bg-white rounded-2xl border border-border-premium`.

| Biến thể (rút gọn phần chung) | file:line |
| --- | --- |
| `p-4 … shadow-premium-sm flex flex-col justify-between h-full` | `Overview:100,129,167,188,211` |
| `p-4 … shadow-premium-sm … h-[95px] hover:border-primary/20` (KPI 6 cột) | `Overview:79` |
| `p-3.5 … shadow-premium-sm … h-[85px] hover:border-primary/20` (KPI) | `Intelligence:63` |
| `p-3.5 … shadow-premium-sm flex justify-between items-center h-[75px]` (KPI) | `Activity:82`, `Campaigns:228` |
| `p-4 … shadow-premium flex flex-col justify-between h-full` | `Intelligence:119,141,167,193` |
| `lg:col-span-2 p-4 … shadow-premium …` | `Intelligence:91` |
| `p-3 … shadow-premium … h-full` | `Activity:245` |
| `p-3.5 … shadow-premium … h-full` | `Activity:268` |
| `… shadow-premium flex flex-col h-[300px] overflow-hidden` | `Activity:96` |
| `lg:col-span-3 … shadow-premium … h-[550px] overflow-hidden` | `Members:161` |
| `lg:col-span-1 … shadow-premium p-4 … h-[550px]` | `Members:299` |
| `lg:col-span-5 … shadow-premium p-4 … h-[450px]` | `Campaigns:245,414` |
| `p-3 … shadow-premium … h-[180px] overflow-hidden` | `Campaigns:339` |
| `… shadow-premium … h-[250px] overflow-hidden` | `Campaigns:368` |
| `lg:col-span-7 … shadow-premium p-4 … h-[450px] overflow-hidden` | `Campaigns:562` |
| `… shadow-premium p-4 … h-[470px]` | `Configuration:60,120` (+`overflow-hidden` ở `190`) |

Phân bổ: Overview 6 · Intelligence 6 · Activity 4 · Campaigns 6 · Configuration 3 · Members 2.

**Chiều cao cố định — 13 giá trị khác nhau:** `h-[75px]` (Activity:82, Campaigns:228) · `h-[85px]` · `h-[95px]` · `h-[170px]` · `h-[180px]` · `h-[190px]` · `h-[200px]` · `h-[250px]` · `h-[255px]` · `h-[300px]` · `h-[450px]` (4 chỗ) · `h-[470px]` (3 chỗ) · `h-[550px]` (2 chỗ).
→ Đề xuất chuẩn hoá còn 3 bậc: `h-[95px]` (KPI), `h-[250px]` (widget), `h-[450px]` (panel chính); phần còn lại dùng `flex-1 min-h-0`.

**Header khối (h3 uppercase) — 8 biến thể:**
| Class | file:line |
| --- | --- |
| `text-xs font-bold text-gray-800 uppercase tracking-wider` | `Overview:103,132,169,190,213`; `Members:167`; `Intelligence:94,121`; `Campaigns:341,370,566` |
| `… uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5` | `Configuration:62,122`; `Campaigns:247,416` |
| `… pb-1 border-b …` | `Configuration:192` |
| `text-[11px] font-bold text-gray-800 uppercase tracking-wider` | `Activity:247,270` |
| `text-[11px] … flex items-center gap-1 text-red-500` | `Intelligence:143` |
| `… text-amber-500` | `Intelligence:169` |
| `… text-emerald-600` | `Intelligence:195` |
| `flex items-center gap-1.5 pb-2 border-b border-border-premium text-gray-900 font-bold text-xs uppercase tracking-wider` | `Members:301` |

Chấm trạng thái: `w-2 h-2 rounded-full bg-primary animate-pulse` — `Members:166`; `w-1.5 h-1.5 rounded-full bg-success animate-pulse` — `Overview:60`, `Sidebar:69`; `w-1.5 h-1.5 rounded-full bg-primary animate-pulse` — `Sidebar:58`.

## A.2 — Hai chuẩn bảng khác nhau → `DataTable`

| | Members | Activity / Campaigns |
| --- | --- | --- |
| `<table>` | `w-full text-left border-collapse` (`Members:186`) | `… border-collapse text-xs` (`Activity:148,194`; `Campaigns:373`) |
| `<thead>` | `border-b border-border-premium bg-gray-50/20 text-[10px] …` (`Members:188`) | `bg-gray-50/10 text-[9px] …` (`Activity:150,196`; `Campaigns:375`) |
| `<tbody>` | `divide-y divide-gray-100 text-xs text-gray-700` (`Members:198`) | `divide-y divide-gray-100 text-gray-700` (`Activity:160,206`; `Campaigns:383`) |
| `th` padding | `py-2.5 px-4` / `py-2.5 px-3` (`Members:189-195`) | `py-2 px-3` / `py-2 px-2` (`Activity:151-157,197-203`; `Campaigns:376-380`) |
| hover hàng | `hover:bg-gray-50/50 transition-colors group` (`Members:207`) | `hover:bg-gray-50/50` (`Activity:169,215`); `hover:bg-gray-50/30` (`Campaigns:385`) |

→ `DataTable` ở §8.5 chọn chuẩn Members (`th py-2.5 px-3`, thead `text-[10px]`) vì nó là bảng đầy đủ nhất.

## A.3 — ⚠️ Class vô hiệu & ngoài scale (phải sửa)

| Class | SL | file:line | Xử lý |
| --- | --- | --- | --- |
| `text-gray-450` | 3 | `Activity:179,224,225` | **Không tồn tại trong palette Tailwind** ⇒ element không nhận màu nào (kế thừa). Thay `text-muted-light` |
| `bg-gray-105` | 1 | `Campaigns:546` | **Không tồn tại** ⇒ nút phụ mất nền. Thay `bg-surface-alt` |
| `py-0.2` | 14 | `Sidebar:23`; `Overview:199`; `Activity:182,219,227`; `Intelligence:155,181,207`; `Campaigns:393,601,612`; `Configuration:201,233,265` | Xem ghi chú ngay dưới |
| `py-0.8` | 16 | `Campaigns:313`; `Configuration:206,210,214,220,224,238,242,246,252,256,270,274,278,284,288` | Xem ghi chú ngay dưới |

**Ghi chú `py-0.2` / `py-0.8` — chưa phân định được, nhưng cách sửa thì giống nhau:** Tailwind v4 sinh utility spacing động từ `--spacing: 0.25rem` (đã xác nhận tại `node_modules/tailwindcss/index.css:329` và `theme.css:325`). Nếu v4 chấp nhận số thập phân thì `py-0.2` compile thành `calc(var(--spacing) * 0.2)` ≈ **0.16px** — tức có class nhưng padding coi như bằng 0; nếu không chấp nhận thì class vô hiệu — cũng là padding bằng 0. **Cả hai nhánh đều dẫn tới cùng kết luận: badge đang thiếu padding dọc.** Vì vậy **thay `py-0.2` → `py-0.5` (2px)** ở cả 14 chỗ và `py-0.8` → `py-1`/`py-1.5`.

Không phân định được dứt điểm trong phiên này vì `pwsh` bị chặn (không build được) và `web_search` không có API key. Sau khi có full access, chạy `pnpm build` rồi tìm `py-0\.2` trong `dist/assets/*.css` là biết ngay.

## A.4 — Badge: 17 biến thể → 7 tone của `Badge`

| Nhóm badge | Hiện tại | **Tone chuẩn** |
| --- | --- | --- |
| Gói Basic (`Members:225`, `Configuration:201`) | `bg-amber-50 text-amber-600 border-amber-100` / `bg-amber-100 text-amber-700` | `warning` hoặc `neutral` (xem A.15) |
| Gói Premium (`Members:224`, `Configuration:233`) | `bg-primary/5 text-primary border-primary/10` | `primary` |
| Gói Pro (`Members:223`, `Configuration:265`) | `bg-indigo-50 text-indigo-600 border-indigo-100` / `bg-indigo-100 text-indigo-700` | **`vip`** (`#D97706`/`#FEF3C7` — đúng mã mobile dùng cho VIP) |
| Gói Miễn phí (`Members:226`) | `bg-gray-100 text-gray-500` | `neutral` |
| Trạng thái GD (`Activity:182`) | `bg-[#10B981]/10 text-success` | `success` |
| GD chờ (`Activity:183`) | `bg-amber-500/10 text-amber-500` | `warning` |
| Hoá đơn lỗi (`Activity:228`) | `bg-red-500/10 text-red-500 border-red-200` | `danger` |
| Rủi ro cao (`Intelligence:155`) | `text-red-500 bg-red-50 border-red-100` | `danger` |
| Churn (`Intelligence:181`) | `text-amber-500 bg-amber-50/5 border-amber-100` | `warning` |
| Mục tiêu OK (`Intelligence:207`) | `text-emerald-500 bg-emerald-50/5 border-emerald-100` | `success` |
| Trigger rule (`Campaigns:593-597`) | red / emerald / amber 50-100-600 | `danger` / `success` / `warning` |
| Đang chạy (`Campaigns:569`) | `text-emerald-600 bg-emerald-50 border-emerald-200` | `success` |
| Kênh, gói audience (`Campaigns:601,393`) | `bg-gray-100 text-gray-500` | `neutral` |
| Mốc gửi (`Campaigns:612`) | `bg-primary/10 text-primary` | `primary` |
| Toggle rule (`Campaigns:625-629`) | `bg-emerald-500/10 text-success` / `bg-gray-100 text-gray-400` | `success` / `neutral` |
| Chip điểm (`Overview:199`) | `text-emerald-500 bg-emerald-500/5 border-emerald-500/10` | `success` |
| Chip ổn định (`Overview:59`) | `bg-[#10B981]/10 border-[#10B981]/20` | `success` |
| PRO ở Sidebar (`Sidebar:23`) | `text-primary bg-primary/10` | `primary` |

Padding: `py-0.2` ×14 · `px-2 py-0.5` ×4 · `px-1.5 py-0.5` ×7 → chuẩn hoá `Badge` dùng `px-2 py-0.5` (khớp `Members:222`, đúng scale).

## A.5 — Progress bar: 7 biến thể → `ProgressBar`

| Biến thể | file:line |
| --- | --- |
| `w-28` + nhãn `text-[10px] font-mono` + `h-1 bg-gray-100 rounded-full` + `bg-primary` | `Members:243-252` |
| như trên, thanh `bg-success` | `Members:259-268` |
| `w-16 h-1 …` + `bg-primary`/`bg-indigo-500`/`bg-purple-500`/`bg-success` | `Intelligence:75-80` |
| `w-12 h-1 …` + `bg-success` | `Intelligence:210-211` |
| `flex-1 h-1.5 …` + `bg-primary` | `Campaigns:352-353` |
| `h-2 rounded bg-gray-100 …` + `h-full ${step.color}` | `Activity:282-283` |
| `<input type="range">` + `accent-primary` | `Configuration:101,109` |

3 giá trị độ dày (`h-1`, `h-1.5`, `h-2`) và 2 cách bo (`rounded-full`, `rounded`) → chuẩn hoá `h-1` + `rounded-pill`; slider giữ `accent-primary`.

## A.6 — Ô search: 3 bản lặp → `SearchInput`

| Biến thể | file:line |
| --- | --- |
| `bg-gray-50 border-transparent focus:bg-white focus:border-primary/20 focus:ring-primary/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-gray-800 placeholder-gray-400` | `TopNav:17` |
| `bg-white border-border-premium focus:border-primary/30 focus:ring-primary/10 rounded-lg py-1.5 pl-9 pr-4 text-xs` | `Members:178`; `Activity:140` |
| icon `absolute left-3 top-1/2 -translate-y-1/2 text-gray-400` | `Members:172`; `Activity:134` (+`group-focus-within:text-primary transition-colors` ở `TopNav:11`) |

## A.7 — Nút: 4 CTA + 1 phụ + 5 nút icon → `Button`

CTA (base `bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold rounded-lg shadow-premium-sm active:scale-95`):
`Overview:63` (`px-3 py-1.5`) · `Configuration:49` (`px-4 py-1.5` + `shadow-premium` + `gap-1.5`) · `Campaigns:328` (`w-full py-2`) · `Campaigns:553` (`flex-[2] py-2`).
Nút phụ: `Campaigns:546` (`bg-gray-105` ← **vô hiệu**, xem A.3). Reset: `Members:357`.
Nút icon: `Members:281,284` (`p-1 rounded`) · `Campaigns:638,646` (`p-0.5 rounded`) · `TopNav:30` (`p-1.5 rounded-lg`).

## A.8 — Tab/filter: 7 pattern → `SegmentedControl` + `FilterChip`

| Pattern | Class | file:line |
| --- | --- | --- |
| Tab container | `flex items-center bg-gray-100 p-0.5 rounded-lg border border-border-premium` | `Activity:101`; `Campaigns:191` |
| Tab button | `flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all` + `bg-white text-gray-900 shadow-premium-sm` / `text-gray-500 hover:text-gray-950` | `Activity:107-111,121-125` |
| Tab button (Campaigns) | `… px-3.5 py-1.5 …` | `Campaigns:194-198,208-212` |
| Filter chip gói | `text-[11px] py-1 px-2.5 rounded-lg border font-medium …` | `Members:314-318` |
| Filter chip trạng thái | `text-[10px] py-1 rounded-lg border …` | `Members:334-340` |
| Chip kênh | `py-1.5 rounded-lg border text-[10px] font-medium flex flex-col items-center gap-1` | `Campaigns:265-269,497-501` |
| Pill phân khúc | `px-2 py-0.8 rounded-full border text-[9px] font-medium` | `Campaigns:313-317` |

## A.9 — Form control

| Loại | Class | file:line |
| --- | --- | --- |
| Select | `w-full bg-white border border-border-premium rounded-lg py-1.5 px-2 text-xs text-gray-600 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20` | `Configuration:73,87,133` |
| Input | như trên `px-3` (+`text-gray-700`, có bản `font-mono`) | `Campaigns:286,299,434,456,521` |
| Select nhỏ | `… rounded-lg py-1 px-2 text-xs text-gray-700` | `Campaigns:532` |
| Input number | `… rounded-lg px-1.5 py-0.8 text-[10px] outline-none` | `Configuration:206,210,214,220,224,238,242,246,252,256,270,274,278,284,288` |
| Toggle | track `w-9 h-5 rounded-full p-0.5 transition-colors duration-200` + knob `w-4 h-4 rounded-full bg-white shadow-sm transform duration-200` `translate-x-4`/`translate-x-0` | `Configuration:151-157,166-167,176-177` |
| Label | `text-[10px] font-bold text-gray-400 uppercase tracking-wider` | `Members:308,328`; `Configuration:69,83,97,105,129`; `Campaigns:254,280,293,306,423,444,486,513,528` |
| Label nhỏ | `text-[8px] font-bold text-gray-400 uppercase` | `Configuration:205…287` (15 chỗ) |

→ 3 cấp cỡ chữ label (`text-[10px]`, `text-[8px]`), 2 cấp focus ring (`ring-1 /20` vs `ring-2 /10`), 2 border color khác nhau. Chuẩn hoá: label `text-[10px] font-bold uppercase tracking-wider`; input `rounded-control` + `focus:ring-2 focus:ring-primary-ring`.

## A.10 — Empty state · List row · Note box

**Empty state (4 chỗ):** `<td colSpan={7} className="py-10 text-center text-gray-400">` — `Members:201`, `Activity:163,209`; `<div className="text-center py-10 text-gray-400">` — `Campaigns:577`.

**List row (7 chỗ):** `flex items-center justify-between text-xs py-0.5` (`Overview:172`) · `… py-1 border-b border-gray-50 last:border-0` (`Overview:193`; `Intelligence:149,175,201`) · `flex items-start justify-between text-[11px] gap-2 py-0.5` (`Overview:216`) · `flex items-center justify-between text-xs border-b border-gray-50 pb-1 last:border-0 last:pb-0` (`Campaigns:347`) · `p-3 rounded-xl border transition-all flex flex-col gap-2` + `border-primary bg-primary/5 ring-1 ring-primary/20` (`Campaigns:584-588`).

**Note/hint box (5 chỗ):** `bg-gray-50 p-2.5 rounded-lg border border-border-premium flex items-start gap-2 text-[10px] text-gray-400` (`Configuration:113,183,294`) · `p-3 bg-gray-50 rounded-xl …` (`Members:361`) · `p-2.5 bg-gray-50 rounded-xl …` (`Campaigns:668`) · `p-3 bg-gray-50/50 border border-border-premium rounded-xl space-y-2.5` (`Configuration:198,230,262`) · `bg-white/70 p-2 rounded-lg border border-gray-200/50` (`Campaigns:656`).

## A.11 — Chart: 5 chỗ `ResponsiveContainer` → `ChartCard` + `theme/chart.ts`

Wrapper `flex-1 min-h-0 w-full mt-2` (`Overview:111,140`; `Intelligence:103`), `mt-1` (`Activity:250`).
Hex hard-code đầy đủ: `#F1F3F5` grid (`Overview:114,149`; `Intelligence:106,127`) · `#8E9AA8` tick (`Overview:115,116,150,151`; `Activity:259`; `Intelligence:107,108,128`) · series `#7C5CFF`/`#818CF8`/`#10B981`/`#EF4444`/`#B3C5FF` (§2.4) · Tooltip `contentStyle` (`Overview:118,153`) vs `{ fontSize: '10px' }` (`Activity:260`; `Intelligence:109`) — **2 chuẩn tooltip khác nhau**.
Tick font size: 9 (`Overview`, `Intelligence`), 8 (`Activity:259`, `Intelligence:128`), 7 (`Intelligence:129`) — 3 giá trị.
Legend chip: `flex gap-4 text-[10px] font-mono` + `w-2 h-2 rounded-full` (`Overview:106-108,135-137`) vs `gap-3 text-[9px]` + `w-1.5 h-1.5` (`Intelligence:97-100`) — 2 chuẩn.

## A.12 — Layout & độ rộng

- **Wrapper page — 3 biến thể:** `h-full flex flex-col justify-between gap-5 select-none w-full text-xs` (`Overview:46`) · `h-full flex flex-col gap-6 …` (`Members:148`) · `h-full flex flex-col justify-between gap-5 max-w-7xl mx-auto …` (`Activity:65`; `Intelligence:43`; `Campaigns:182`; `Configuration:36`).
- **`max-w-7xl mx-auto` chỉ có ở 4/6 page** — Overview và Members không có ⇒ bề rộng nội dung không đồng nhất.
- **Title header:** `flex justify-between items-center h-10 px-1` (5 page) vs `h-10 px-2` (`Members:150`) + `text-xl font-bold font-display text-gray-900 tracking-tight` + `text-[11px] text-gray-500 font-medium` (6/6).
- **Cây layout tổng** (`App.tsx:13-29`): `<BrowserRouter>` → `div.w-full.h-screen.flex.bg-[#FAFBFD].overflow-hidden.relative` → (`Sidebar` `aside.w-60.bg-white.border-r` + `div.flex-1.flex.flex-col.overflow-hidden` → (`TopNav` `header.h-14` + `main.flex-1.overflow-y-auto.bg-[#F8F9FA].p-6.scrollbar-premium` → 6 `<Route>`)).
- **Chiều cao cố định khác:** `h-screen` (App:15, Sidebar:17) · `h-14` (TopNav:6, Sidebar:19) · `h-10` (title 6 page) · `max-h-[130px]` (Overview:170,191,214) · `max-h-[120px]` (Intelligence:147,173,199) · `max-h-[75px]` (Campaigns:307) · `w-60` (Sidebar:17) · `h-8 w-8` (avatar: Members:210, Activity:88, Campaigns:234, TopNav:43).

## A.13 — Bảng tone map: thay 294 dòng class palette

| Admin hiện tại | Token/class chuẩn | SL |
| --- | --- | --- |
| `text-gray-900` | `text-ink` | 23 |
| `text-gray-800` | `text-ink-soft` | 34 |
| `text-gray-700` | `text-ink-soft` (ô bảng) / `text-body` | 13 |
| `text-gray-600` | `text-body` | 15 |
| `text-gray-500` | `text-muted` | 27 |
| `text-gray-400` | `text-muted-light` | 93 |
| `text-gray-450` ⚠️ | `text-muted-light` (đang vô hiệu) | 3 |
| `bg-gray-50`, `/10`, `/20`, `/30`, `/40`, `/50`, `/60` | `bg-surface-alt` (+ opacity) | 18+5+3+2+2+1+2+1 |
| `bg-gray-100` | `bg-surface-alt` (chip) / `bg-surface-sunken` (track) | 24 |
| `bg-gray-105` ⚠️ | `bg-surface-alt` (đang vô hiệu) | 1 |
| `bg-gray-200` | `bg-surface-sunken` | 11 |
| `border-gray-50` / `100` / `200` (`/50`) | `border-hairline` / `divide-hairline` | 5 / 4 / 2 |
| `hover:border-gray-300`, `hover:bg-gray-200`, `hover:bg-gray-100` | `hover:bg-surface-sunken` | 1 / 9 / 3 |
| `text-emerald-500/600`, `bg-emerald-400/500`, `bg-emerald-500/5,/10`, `bg-emerald-50(/5)`, `border-emerald-100/200`, `border-emerald-500/10` | `success`, `success-deep`, `success-soft`, `success-soft-border` | 16 |
| `text-amber-500/600/700`, `bg-amber-400/500`, `bg-amber-500/10`, `bg-amber-50(/5)`, `bg-amber-100`, `border-amber-100` | `warning`, `warning-deep`, `warning-soft`; `amber-100/700` → `vip-soft`/`vip` | 10 |
| `text-red-500/600`, `bg-red-500`, `bg-red-500/10`, `bg-red-50`, `border-red-100/200` | `danger`, `danger-deep`, `danger-soft`, `danger-soft-border` | 7 |
| `text-indigo-500/600/700`, `bg-indigo-400/500/50/100`, `border-indigo-100` | **2 vai trò khác nhau** — xem A.14 | 11 |
| `text-purple-500`, `bg-purple-500` | `info-deep` (hoặc bỏ nếu chỉ là series chart) | 4 |
| `text-blue-500` (`Activity:36`), `text-pink-500` (`Activity:39`) | `info` / `danger` (icon trang trí) | 1 / 1 |
| `bg-[#10B981]/10`, `border-[#10B981]/20` (`Overview:59`) | `bg-success-soft`, `border-success/20` | 1 |
| `bg-[#F1F3F5]` (`Campaigns:316`) | `bg-surface-alt` | 1 |
| `bg-primary/5`, `bg-primary/10`, `border-primary/10|20|30` | `bg-primary-soft`, `border-primary-soft-border` | 7 / 4 / 4 |
| `focus:ring-primary/10` + `focus:border-primary/20|30|40` | `ring-primary-ring` + `border-primary/30` | 3 / 11 |

## A.14 — `indigo-*` là 1 family phục vụ 2 nghĩa (cần bạn chốt)

| Vai trò | file:line | Đề xuất |
| --- | --- | --- |
| Series chart thứ 2 (legend "Active") | `Overview:25,108` (`bg-indigo-400`), `Overview:122` (`#818CF8`), `Intelligence:78` (`bg-indigo-500`) | → `info` (`#3B82F6`) và `#93C5FD` cho series phụ |
| Nhãn tier/Pro mua | `Members:223`, `Configuration:265` | → tone `vip` (khớp mobile: VIP = `#D97706`/`#FEF3C7`) |
| Icon/nhãn thông tin | `Overview:74`, `Intelligence:59`, `Campaigns:225`, `Configuration:193,295` | → `info-deep` |

## A.15 — Bổ sung cho checklist §9

- [ ] **1b.** Thêm bước sửa class vô hiệu **trước** khi migrate page (A.3) — nếu không, `bg-gray-105` và `text-gray-450` sẽ bị bỏ qua khi bạn đổi sang token vì chúng không hiện diện trực quan trong CSS.
- [ ] **5b.** Khi migrate `Members`, chốt luôn chuẩn bảng (A.2) và chuẩn badge tier (A.4 + A.14) vì `Members` + `Configuration` là nơi tập trung 4/7 tone badge.
- [ ] **5c.** Chốt thang màu Pro/Premium/Basic trước khi sửa `Configuration` (3 tier × 5 trường giá/quota, 15 input).
- [ ] **6b.** Xoá 6 thứ định nghĩa nhưng 0 chỗ dùng: `--color-success-subtle`, `--color-warning`, `--color-warning-subtle`, `--color-danger-subtle`, `@utility border-double-bezel`, `@utility shadow-premium-lg`.
- [ ] **9b.** Không có modal/dialog nào trong `src/` hiện tại ⇒ `ui/Modal.tsx` là **component mới hoàn toàn**, không phải refactor. Nếu chưa có nhu cầu, hạ ưu tiên xuống.

## A.16 — Sai sót đã phát hiện trong chính tài liệu này

| Chỗ | Đã ghi sai | Đúng |
| --- | --- | --- |
| §2.4 (bản trước) & §7 dòng 24 | "`font-extrabold`/`font-black` có dùng, nhiều chỗ" | **0 chỗ.** Admin không lạm dụng weight; mobile mới là bên vi phạm (125 chỗ). §4.3 giữ làm luật phòng ngừa |
| §7 dòng 4 (bản trước) | `#B3C5FF` xếp cùng nhóm "hex tím" | `#B3C5FF` là **xanh nhạt**, không phải tím. Đã tách đúng ở §2.4 |
| §8.1 dòng 1 (bản trước) | `AppHeader.tsx` → `ui/PageHeader.tsx` | **Sai.** `AppHeader` **không có tiêu đề trang** — nó là app bar (logo + user + chuông). `AppHeader` ≈ `TopNav`; `ui/PageHeader` map vào khối `h-10` tiêu đề nằm trong từng page |

---

# PHỤ LỤC B — Giải phẫu component mobile (để template web khớp thật)

## B.1 — `AppHeader.tsx` (396 dòng) — app bar duy nhất của app

Nguồn: đọc trực tiếp toàn file (`AppHeader.tsx:1-396`).

**Vai trò:** app bar render ở mọi screen. **Không chứa tiêu đề trang** — mỗi screen tự render tiêu đề riêng.

**Props** (`AppHeader.tsx:17-23`):
```ts
onNavigateToSettings?: () => void;
onNavigateToHistory?: () => void;
onNavigateToRecord?: () => void;   // ⚠️ KHAI BÁO NHƯNG KHÔNG DÙNG
onOpenAiChat?: () => void;
rightAction?: React.ReactNode;
```
⚠️ `onNavigateToRecord` có trong interface nhưng **không** được destructure ở `:25-31` và không xuất hiện ở đâu khác trong file ⇒ prop chết.

**Nguồn dữ liệu:** không qua props mà qua context — `useAuth()` (`:32`) lấy `user`; `useFinancial()` (`:33-39`) lấy `isVip, userName, alerts, markAlertAsRead, clearAlerts`.

**Cây JSX:**
```
View styles.header                                          :54
├ TouchableOpacity styles.headerLeftWithAvatar  (activeOpacity .75 → mở AvatarDropdownModal)  :56-60
│ ├ View styles.logoTouchBtn → <WiViLogo size={42} />       :61-63
│ └ View styles.headerLeftText                              :65
│   ├ View styles.nameRow                                   :66
│   │ ├ Text styles.greetingName            (tên đầy đủ)    :67-69
│   │ ├ isVip ? View styles.vipBadgePro (diamond 10 #D97706 + Text styles.vipBadgeProText "VIP PRO")
│   │ │        : View styles.freeBadge   (Text styles.freeBadgeText "Gói Miễn phí")   :70-79
│   │ └ Feather chevron-down 13 #94A3B8                     :80
│   └ Text styles.userEmailText             (email)         :82-84
└ View styles.headerRight                                  :89
  ├ {rightAction}                                           :90
  └ TouchableOpacity styles.bellButton → Feather bell 21 #0F172A
    + View styles.bellBadgeDot nếu unreadCount > 0          :92-99
+ Modal bottom-sheet "Thông báo & Cảnh báo"                 :103-170
  View styles.modalOverlay → View styles.modalContent
  ├ header: modalTitle + unreadCountBadge + "Đọc tất cả" + closeBtn   :106-125
  └ alerts.length === 0 ? empty state (:127-136)
                        : ScrollView maxHeight 360 → alertItem.map  :138-166
+ <AvatarDropdownModal />  :173-180
+ <UpgradeProModal />      :183-186
```

**Style thật (trích từ `StyleSheet.create`, `:191-396`):**

| key | Giá trị |
| --- | --- |
| `header` | row · space-between · `paddingHorizontal: 20` · paddingTop/Bottom `8` · **bg `#F8FAFC`** · **không có border-bottom** |
| `headerLeftWithAvatar` | row · `gap: 10` · `flex: 1` · `marginRight: 10` |
| `avatarCircle` | **44×44** · `radius 22` · bg `#2563EB` · shadowColor `#2563EB` · offset y3 · opacity **0.25** · radius 6 · elevation 3 |
| `avatarInitial` | 19 / **800** / `#FFFFFF` |
| `greetingName` | 15.5 / **800** / `#0F172A` / letterSpacing **−0.3** |
| `userEmailText` | 12 / 500 / `#64748B` |
| `vipBadgePro` | bg **`#FEF3C7`** · border 1 **`#FDE68A`** · radius **8** · px 6 py 2 · row gap 3 |
| `vipBadgeProText` | 10 / **800** / **`#D97706`** |
| `freeBadge` | bg **`#F1F5F9`** · border 1 **`#E2E8F0`** · radius 8 · px 6 py 2 |
| `freeBadgeText` | 10 / 700 / `#64748B` |
| `bellButton` | **42×42** · radius **21** · bg `#FFFFFF` · border 1 `#E2E8F0` · shadowColor `#0F172A` opacity **0.04** radius 4 offset y2 · elevation 2 |
| `bellBadgeDot` | **8×8** · radius 4 · bg `#EF4444` · absolute top 9 right 10 |
| `modalOverlay` | flex 1 · bg **`rgba(15,23,42,0.6)`** · justifyContent **flex-end** |
| `modalContent` | bg `#FFFFFF` · **borderTopLeft/RightRadius 24** · padding 20 · maxHeight **80%** · shadowColor `#000` offset y**−4** opacity 0.1 radius 12 · elevation 10 |
| `modalTitle` | 17 / 700 / `#0F172A` |
| `unreadCountBadge` | bg `#EF4444` · px 7 py 2 · radius 10 |
| `unreadCountBadgeText` | 11 / 800 / `#FFFFFF` |
| `markAllReadText` | 12.5 / 600 / **`#2563EB`** |
| `alertItem` | bg `#F8FAFC` · radius 14 · padding 14 · mb 10 · border 1 `#E2E8F0` |
| `alertItemUnread` | bg **`#EFF6FF`** · border **`#BFDBFE`** |
| `alertItemWarning` | bg **`#FFFBEB`** · border **`#FDE68A`** |
| `alertItemTitle` | 13.5 / 700 / `#0F172A` |
| `alertItemBody` | 12.5 / `#475569` / lineHeight 18 |

**Trạng thái:**

| Nhánh | Đổi gì |
| --- | --- |
| `isVip === true` (`:70`) | badge VIP: `#FEF3C7` / `#FDE68A` / chữ+diamond `#D97706` |
| `isVip === false` (`:76`) | badge "Gói Miễn phí": `#F1F5F9` / `#E2E8F0` / chữ `#64748B` |
| `unreadAlertsCount > 0` (`:98`) | hiện `bellBadgeDot` 8×8 `#EF4444` |
| `!a.read` (`:144`) | `alertItemUnread` — nền `#EFF6FF`, viền `#BFDBFE` |
| `a.type === 'warning'` (`:145`) | `alertItemWarning` — nền `#FFFBEB`, viền `#FDE68A`; icon đổi `notifications`→`warning`, màu `#2563EB`→`#D97706` (`:152-155`) |
| Áp dụng style | `[alertItem, !a.read && alertItemUnread, a.type==='warning' && alertItemWarning]` → **cảnh báo warning được ưu tiên hơn trạng thái chưa đọc** |
| `alerts.length === 0` (`:127`) | empty state: checkmark 44 `#10B981` + 14.5/600 `#0F172A` + 12.5 `#64748B` |

**Đối chiếu với admin:**

| Khía cạnh | Mobile `AppHeader` | Admin `TopNav` | Kết luận |
| --- | --- | --- | --- |
| Nền header | `#F8FAFC` = **đúng bằng nền app**, không viền | `bg-white border-b border-border-premium` | **Khác có chủ ý** — admin là shell dashboard (sidebar + topbar trắng). Giữ `bg-surface`, không copy mobile |
| Tên + phụ đề | tên 15.5/**800**, email 12/500 | tên 12/600, chức danh 10/mono | Map: tên `text-xs font-semibold text-ink`, chức danh `text-[10px] font-mono text-muted-light` |
| Badge gói | VIP PRO `#FEF3C7`/`#FDE68A`/`#D97706` 10/**800** | admin **chưa có** badge gói ở TopNav | Thêm `Badge tone="vip"` — đây là dữ liệu **đã kiểm chứng**, không phải suy luận |
| Badge gói miễn phí | `#F1F5F9`/`#E2E8F0`/`#64748B` | — | ⇒ `tone="neutral"` của `Badge` |
| Nút chuông | **42×42** radius 21, nền trắng, viền `#E2E8F0`, dot 8×8 `#EF4444` | `p-1.5 rounded-lg text-gray-400` + dot `w-1.5 h-1.5 bg-danger` | Đổi sang `w-9 h-9 rounded-pill bg-surface border border-hairline` + dot `w-2 h-2 bg-danger ring-2 ring-surface` |
| Ô search | **KHÔNG có trong AppHeader** (`TopNav:11,17` là của admin) | có | Search là thành phần **riêng của admin**, không có mẫu mobile để đồng bộ. Giữ `SearchInput`, ghi nhận là quyết định của admin |
| Modal | **bottom-sheet** kéo từ đáy: radius **24 trên**, overlay `rgba(15,23,42,0.6)`, `animationType="slide"` | admin **không có modal nào** | ⚠️ `ui/Modal.tsx` ở §8.5 là **dialog giữa màn** — không khớp paradigm của mobile. Nếu muốn khớp, cần thêm `ui/Sheet.tsx` (bottom-sheet). Xem §B.3 |

## B.2 — 3 component modal/nav còn lại

Nguồn: kiểm kê 3 file (`CustomAlertModal.tsx` 219 dòng, `FloatingTabBar.tsx` 158 dòng, `AvatarDropdownModal.tsx` 561 dòng), phạm vi hẹp sau khi lần chạy trước thất bại vì đọc cả `HomeScreen.tsx` 3.174 dòng.

### B.2.1 — `CustomAlertModal.tsx` (219 dòng) — dialog canh giữa, 4 tone

**Props** (`:11-21`, có `export CustomAlertProps`): `visible: boolean`, `type?: 'success'|'error'|'warning'|'info'`, `title: string`, `message: string`, `onClose: () => void`, `confirmText?: string`, `onConfirm?: () => void`, `cancelText?: string`, `onCancel?: () => void`. Default: `type='success'` (`:25`), `confirmText='Đồng ý'` (`:29`). Early-return `null` khi `!visible` (`:34`).

**`getTheme()` nguyên văn (`:36-72`) — đây là bảng tone đã kiểm chứng:**

| `type` | `color` (icon/chữ nút) | `bgColor` | `borderColor` | `btnBg` |
| --- | --- | --- | --- | --- |
| `error` | `#EF4444` | `#FEF2F2` | `#FECACA` | `#EF4444` |
| `warning` | `#F59E0B` | **`#FFFBEB`** | `#FDE68A` | `#F59E0B` |
| `info` | `#2563EB` | `#EFF6FF` | `#BFDBFE` | `#2563EB` |
| `success` / default | `#10B981` | `#ECFDF5` | `#A7F3D0` | `#10B981` |

**Đối chiếu với token của tài liệu này — khớp 100%, chỉ thiếu 1 token:**

| Mobile | Token cần | Trạng thái |
| --- | --- | --- |
| `#EF4444` / `#FEF2F2` / `#FECACA` | `danger` / `danger-soft` / `danger-soft-border` | ✅ có |
| `#F59E0B` / `#FFFBEB` / `#FDE68A` | `warning` / **`warning-soft-alt`** / `warning-soft-border` | ⚠️ `#FFFBEB` **đã thiếu** — đã bổ sung vào §3.3 + §8.2 |
| `#2563EB` / `#EFF6FF` / `#BFDBFE` | `primary` / `primary-soft` / `primary-soft-border-strong` | ✅ có |
| `#10B981` / `#ECFDF5` / `#A7F3D0` | `success` / `success-soft` / `success-soft-border` | ✅ có |

**Cây JSX:** `Modal transparent animationType="fade"` (`:91`) → `View styles.overlay` (`:92`) → `View styles.card` (`:93`) → [`View styles.iconContainer` + inline `{backgroundColor: theme.bgColor, borderColor: theme.borderColor}` (`:95-100`) → `Feather name={theme.icon} size={28} color={theme.color}` (`:101`)] → `Text styles.title` (`:105`) → `Text styles.message` (`:106`) → `View styles.actionsRow` (`:109`) → [`cancelText && TouchableOpacity styles.cancelBtn` (`:111-117`)] + `TouchableOpacity [styles.confirmBtn + inline {backgroundColor: theme.btnBg}]` (`:120-126`).

**Style thật (`:134-218`):**

| key | Giá trị |
| --- | --- |
| `overlay` | flex 1 · bg **`rgba(15,23,42,0.65)`** · center · `paddingHorizontal: 24` |
| `card` | `width:'100%'` · `maxWidth: **360**` · bg `#FFFFFF` · radius **24** · padding **24** · border 1 `#E2E8F0` · shadowColor `#000000` offset `{0,10}` opacity **0.15** radius 24 · elevation 8 |
| `iconContainer` | **60×60** · radius **30** · `borderWidth: 1.5` · `marginBottom: 16` |
| `title` | **18 / 800** · `#0F172A` · center · letterSpacing **−0.3** · mb 8 |
| `message` | **14 / 500** · `#475569` · center · lineHeight 20 · mb 20 |
| `actionsRow` | row · `gap: 10` · `width:'100%'` |
| `cancelBtn` | `flex:1` · **height 44** · radius **12** · border 1 `#CBD5E1` · bg `#F8FAFC` |
| `cancelBtnText` | 14 / 600 · `#475569` |
| `confirmBtn` | `flex:1` · height 44 · radius 12 · shadowColor `#000` `{0,2}` opacity 0.1 radius 4 · elevation 2 |
| `confirmBtnText` | 14 / 700 · `#FFFFFF` |

**Biến thể:** `type` **chỉ** đổi 4 thứ — `iconContainer.backgroundColor`, `iconContainer.borderColor`, `Feather.color`, `confirmBtn.backgroundColor`. Nền card luôn `#FFFFFF`, viền card luôn `#E2E8F0`. Khi không có `cancelText`, `confirmBtn` chiếm toàn bộ hàng nhờ `flex:1`.

**⇒ `ui/AlertModal.tsx` (bổ sung cho §8.5):**
```tsx
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

type Tone = 'success' | 'error' | 'warning' | 'info';

// Nguyên văn getTheme() của CustomAlertModal.tsx:36-72, map sang token
const TONE = {
  error:   { box: 'bg-danger-soft  border-danger-soft-border',            btn: 'danger'  },
  warning: { box: 'bg-warning-soft-alt border-warning-soft-border',       btn: 'primary' }, // mobile dùng #F59E0B
  info:    { box: 'bg-primary-soft border-primary-soft-border-strong',    btn: 'primary' },
  success: { box: 'bg-success-soft border-success-soft-border',           btn: 'primary' }, // mobile dùng #10B981
} as const;

export const AlertModal = ({ open, tone = 'success', title, message, icon,
  confirmText = 'Đồng ý', onConfirm, cancelText, onCancel, onClose }: {
  open: boolean; tone?: Tone; title: string; message: string; icon?: ReactNode;
  confirmText?: string; onConfirm?: () => void;
  cancelText?: string; onCancel?: () => void; onClose: () => void;
}) => (
  <Modal open={open} onClose={onClose} title={title} width="max-w-[360px]">
    <div className="flex flex-col items-center text-center">
      {icon && (
        <div className={`w-[60px] h-[60px] rounded-pill border-[1.5px] flex items-center justify-center mb-4 ${TONE[tone].box}`}>
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-body leading-5 mb-5">{message}</p>
      <div className="flex gap-2.5 w-full">
        {cancelText && (
          <button onClick={onCancel}
            className="flex-1 h-11 rounded-control border border-disabled bg-canvas text-sm font-semibold text-body">
            {cancelText}
          </button>
        )}
        <Button variant={TONE[tone].btn} className="flex-1 h-11 text-sm" onClick={onConfirm}>{confirmText}</Button>
      </div>
    </div>
  </Modal>
);
```
> Lưu ý: mobile dùng `title` 18/800 + `message` 14/500. Theo luật weight của tài liệu này, 18px dùng `font-bold` (700), không 800 — sai lệch có chủ ý. Web cũng hạ `height: 44` (touch target mobile) xuống `h-11` (44px) giữ nguyên vì đây là dialog, không phải control trong bảng.

### B.2.2 — `FloatingTabBar.tsx` (158 dòng) — tab bar nổi

**Props** (`:8-11`, không export): `activeTab: TabType`, `onTabPress: (tab: TabType) => void`. Export `type TabType = 'home'|'history'|'record'|'jars'|'discipline'` (`:6`).

**Cấu hình tab** (`:31-37`): `record` là tab **icon tự vẽ** (khung ngắm 4 góc), 4 tab còn lại dùng Feather/Ionicons.

**Style thật (`:78-158`):**

| key | Giá trị |
| --- | --- |
| `container` | absolute · `left/right: 0` · center · `zIndex: 100` · inline `bottom: Math.max(insets.bottom, 12)` |
| `tabRow` | row · `gap: 10` · `paddingHorizontal: 12` · `paddingVertical: 6` |
| `tabButton` | **height 48** · radius **24** · `borderWidth: 1.5` · shadowColor `#000` `{0,4}` opacity **0.12** radius 8 · elevation 4 |
| `activeTabButton` | **width 72** · bg **`#000000`** · border `rgba(255,255,255,0.2)` |
| `inactiveTabButton` | **width 48** · bg `#ffffff` · border `#f2f2f7` |
| `scannerIconWrapper` | 20×20 relative · 4× `corner` 6×6 `borderWidth: 1.5` (mỗi góc tắt 2 cạnh) · `Feather "plus" size={14}` `marginTop:-0.5` |

**Biến thể:** `isActive` đổi `width` 48→72, bg `#ffffff`→`#000000`, viền `#f2f2f7`→`rgba(255,255,255,0.2)`, màu icon `#1d1d1f`→`#ffffff`. `height/radius/borderWidth/shadow` **không đổi**.

**File này KHÔNG có `Text` nào** — tab chỉ có icon.

**Đối chiếu admin:** nav của admin là `Sidebar` (240px, dọc), không phải tab bar ngang ⇒ **không map trực tiếp**. Nhưng ghi lại 3 điểm tham chiếu:
1. Đây là **chỗ duy nhất** trong mobile dùng `#000000` làm nền surface (`:110`) — khớp tinh thần "global nav đen" của `DESIGN.md:498`.
2. Capsule active `width 72 / height 48 / radius 24` là biến thể pill của `rounded-pill`; nếu admin cần nav dạng pill ở breakpoint nhỏ thì dùng spec này.
3. `#f2f2f7` (viền tab inactive) là **mã iOS systemGray6**, chỉ xuất hiện ở file này; đã gộp vào `--color-hairline` (`#E2E8F0`) trong tài liệu — sai lệch nhỏ, có chủ ý.

### B.2.3 — `AvatarDropdownModal.tsx` (561 dòng) — dropdown neo góc trên-trái

**Props** (`:21-28`, không export): `visible`, `onClose`, `onNavigateToSettings?`, `onNavigateToHistory?`, `onOpenAiChat?`, `onOpenVipModal?`.
**Nguồn ngoài:** `useAuth()` → `user, logout, isAdmin` (`:38`); `useFinancial()` → `isVip, userName, resetSetup` (`:39`); `Dimensions.get('window').width` (`:19`).

**Style thật (trích `:281-560`):**

| key | Giá trị |
| --- | --- |
| `modalOverlay` | flex 1 · bg **`rgba(15,23,42,0.4)`** · `flex-start/flex-start` · `paddingTop: Platform.OS==='ios' ? 95 : 75` · `paddingLeft: 16` |
| `dropdownContainer` | `width: Math.min(windowWidth − 32, 310)` · bg `#FFFFFF` · radius **20** · padding **16** · border 1 **`#F1F5F9`** · shadowColor `#0F172A` `{0,10}` opacity **0.15** radius 20 · elevation 12 |
| `avatarGradient` | **46×46** · radius 23 · `LinearGradient colors={['#3B82F6','#1D4ED8']}` (`:125`) |
| `avatarLetter` | 20 / **800** · `#FFFFFF` |
| `profileName` | 16 / 700 · `#0F172A` |
| `profileEmail` | 12 · `#64748B` |
| `adminBadge` / `adminBadgeText` | bg **`#818CF8`** · px 6 py 2 · radius 10 · chữ 10 / 700 · `#FFFFFF` |
| `vipBadge` (active) / `vipActiveText` | bg `#FEF3C7` · px 7 py 2 · radius 10 · chữ 10 / **800** · **`#B45309`** |
| `vipBadge` (free) / `vipFreeText` | bg `#F1F5F9` · chữ `#64748B` |
| `divider` | `height: 1` · bg `#F1F5F9` · `marginVertical: 12` |
| `aiMenuItem` | bg **`#F0F7FF`** · border 1 `#DBEAFE` · padding 10 · radius **14** · gap 10 |
| `aiMenuIconBox` | **34×34** · radius **10** · bg `#FFFFFF` · shadowColor `#2563EB` `{0,2}` opacity **0.12** radius 4 |
| `aiMenuItemTitle` / `aiMenuSub` | 13.5 / 700 · `#1E40AF` — và 11 / 500 · `#3B82F6` |
| `aiTagBadge` / `aiTagText` | bg `#DBEAFE` · px 5 py 1.5 · radius **6** · chữ **9.5** / 800 · `#1D4ED8` |
| `vipPromoItem` | bg **`#FFFBEB`** · border 1 `#FDE68A` · padding 10 · radius 14 |
| `vipPromoIcon` | 32×32 · radius **16** · bg `#FEF3C7` |
| `vipPromoTitle` / `vipPromoSub` | 13 / 700 · `#92400E` — và 11 · `#B45309` |
| `menuItem` | `paddingVertical: 8` · `paddingHorizontal: 6` · radius **12** · gap 10 |
| `menuIconBox` | **32×32** · radius **10** · (nền set inline: `#EFF6FF` `:216`, `#F0FDF4` `:233`) |
| `menuItemText` | `flex:1` · 13 / 600 · `#334155` |
| `logoutBtn` / `logoutIconBox` | bg `#FEF2F2` · icon box 32×32 r10 bg `#FEE2E2` · chữ 13 / 700 · `#DC2626` |
| `resetBtn` / `resetIconBox` | bg `#FFFBEB` · border 1 `#FDE68A` · icon box bg `#FEF3C7` · chữ 13 / 700 · `#B45309` · phụ 10.5 / 500 · `#D97706` |

**Style khai báo nhưng KHÔNG dùng:** `freeBadge` (`:353-358`), `freeBadgeText` (`:359-363`), `menuSection` (`:380-382`) — badge "free" thực tế render bằng `vipFree`/`vipFreeText`.

**Biến thể:** `isVip` → nền/chữ badge + icon `star` (`#D97706`) vs `person-outline` (`#64748B`). `isAdmin` → thêm badge `ADMIN`. `!isVip && onOpenVipModal` → hiện khối promo. Callback `undefined` → **ẩn hẳn** item (không đổi style). `Platform.OS === 'ios'` → `paddingTop: 95` thay vì `75`; trên web dùng `window.confirm` thay `Alert.alert`.

### B.2.4 — Primitive rút ra, 2 phát hiện, và việc cần chốt

**Primitive có thật trong 3 file (dùng được cho web):**

| Primitive | Spec | file:line |
| --- | --- | --- |
| Khối icon nền nhạt | **32×32, radius 10** (nền set inline) | `AvatarDropdownModal:473-479,216,233`; `:495-502` (`#FEE2E2`); `:523-530` (`#FEF3C7`) |
| Khối icon AI | **34×34, radius 10**, nền trắng + shadow `#2563EB` 0.12 | `AvatarDropdownModal:394-406` |
| Icon tròn có viền theo tone | **60×60, radius 30, borderWidth 1.5** | `CustomAlertModal:157-165` |
| Avatar gradient | **46×46, radius 23**, `['#3B82F6','#1D4ED8']` | `AvatarDropdownModal:308-314` |
| Hàng "icon + label + chevron" | `paddingVertical 8 / paddingHorizontal 6 / radius 12 / gap 10` + chữ 13/600 `#334155` + chevron 16 `#CBD5E1` | `AvatarDropdownModal:465-485,220,237` |
| Hàng có nền semantic | logout `#FEF2F2` · reset `#FFFBEB`+`#FDE68A` · AI `#F0F7FF`+`#DBEAFE` · promo `#FFFBEB`+`#FDE68A` | `AvatarDropdownModal:486-494,512-522,383-393,437-447` |
| Chip/badge chữ nhỏ | `py 1.5–2 / px 5–7 / radius 6 hoặc 10 / 9.5–10px / 700–800` | `:364-374` (ADMIN), `:339-352` (VIP), `:417-430` (tag AI) |
| Nút CTA đầy bề rộng | hàng `gap 10`, mỗi nút `flex:1 / height 44 / radius 12` | `CustomAlertModal:182-218` |
| Divider ngang | `height 1 / #F1F5F9 / marginVertical 12` | `AvatarDropdownModal:375-379,157,242` |
| Overlay modal | `flex:1` + `rgba(15,23,42,α)` — **α khác nhau: 0.65 (dialog giữa), 0.6 (bottom-sheet), 0.4 (dropdown neo góc)** | `CustomAlertModal:137`; `AppHeader:311`; `AvatarDropdownModal:284` |

**Phát hiện 1 — mobile có 2 mã chữ VIP khác nhau:** `AppHeader.tsx:265` dùng `#D97706` (chữ "VIP PRO"), còn `AvatarDropdownModal.tsx:351,462,537` dùng `#B45309`. Cùng một khái niệm, 2 giá trị ⇒ tài liệu này thêm `--color-vip-deep: #B45309` để admin có đủ 2 bậc, và coi `#D97706` là bậc mặc định.

**Phát hiện 2 — `#818CF8` không phải hex lạ:** nó là nền badge `ADMIN` của mobile (`AvatarDropdownModal.tsx:365`), đồng thời admin dùng nó làm series chart (`Overview.tsx:122`). Xem §2.4.

**Phát hiện 3 — `warning` có 2 bậc nền:** `#FEF3C7` (amber-100) cho badge, `#FFFBEB` (amber-50) cho dialog/banner/promo. Tài liệu này đã tách thành `warning-soft` và `warning-soft-alt`. Bản trước của tài liệu chỉ có 1 bậc ⇒ sẽ làm banner cảnh báo đậm hơn mobile.

**Nên thêm vào §8.1 (tuỳ chọn):**

| Mobile | **Component** | Khi nào cần |
| --- | --- | --- |
| `AvatarDropdownModal.tsx` | `ui/UserMenu.tsx` — dropdown neo góc: `w-[310px] rounded-[20px] border-hairline p-4 shadow-float`, divider `h-px bg-surface-alt my-3`, item `py-2 px-1.5 rounded-control gap-2.5` + icon box `w-8 h-8 rounded-chip` | khi admin cần menu user ở `TopNav` (hiện là khối tĩnh) |
| `CustomAlertModal.tsx` | `ui/AlertModal.tsx` — code đầy đủ ở §B.2.1 | khi cần xác nhận/xoá |
| `FloatingTabBar.tsx` | không cần | admin dùng `Sidebar` |

## B.3 — Hệ quả cần bạn quyết (từ B.1)

Mobile dùng **bottom-sheet** làm paradigm modal (radius 24 trên, trượt từ đáy, overlay 60%), không dùng dialog giữa màn. `WIVI_fe` hiện **không có modal nào**. Vì vậy:

- Nếu admin cần form/hộp thoại thao tác → dùng `ui/Modal.tsx` (dialog giữa màn) như §8.5; **không** khớp mobile nhưng phù hợp màn hình rộng.
- Nếu muốn khớp mobile → cần thêm `ui/Sheet.tsx`: `fixed inset-x-0 bottom-0 rounded-t-[24px] bg-surface p-5 shadow-premium-lg` + overlay `bg-ink/60` + animation trượt.
- Tài liệu này **chưa** đưa `Sheet` vào vì admin chưa có nhu cầu nào dùng modal; thêm khi có màn cần.
