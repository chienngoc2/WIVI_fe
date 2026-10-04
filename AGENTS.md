# WIVI Frontend Rules

## Design system

`DESIGN_SYSTEM.md` là tài liệu tham chiếu chi tiết. Các quy tắc dưới đây là bản vận hành bắt buộc khi tạo hoặc chỉnh sửa UI trong `src/`.

### Màu sắc

- Chỉ dùng token trong `src/index.css` hoặc utility được sinh từ `@theme`; không hard-code mã hex/rgba trong page, component hoặc chart.
- Accent duy nhất là `primary` (`#2563EB`). CTA, link, focus ring và trạng thái active phải dùng hệ `primary`.
- Dùng token semantic cho trạng thái: `success`, `warning`, `danger`, `info`, `vip` và các biến thể `*-soft`/`*-deep` tương ứng.
- Không thêm accent thứ hai cho AI/Sepay. Khối nền tối chỉ dùng nhóm `dark-*` và `primary-on-dark`.
- Không dùng trực tiếp các palette Tailwind rời rạc như `gray-*`, `slate-*`, `indigo-*`, `purple-*`, `emerald-*`, `amber-*`, `red-*` trong code mới; map chúng về token semantic.

### Typography

- `Inter` là font duy nhất cho body và heading; `font-display` cũng trỏ về Inter. Dùng `font-mono` cho mã, số tiền và số liệu cần căn cột.
- Chỉ cho phép weight `400`, `500` (chỉ cho text ≤ 13px), `600`, `700`. Không dùng `font-extrabold` hoặc `font-black`.
- Heading từ 20px trở lên dùng `font-bold`. Số tiền/phần trăm dùng `font-mono tabular-nums font-bold`.
- Giữ tracking và cỡ chữ theo các utility/token hiện có; không tạo một scale tùy ý nếu token tương ứng đã tồn tại.

### Shape, spacing và elevation

- Chỉ dùng năm radius: `rounded-chip` (10px), `rounded-control` (12px), `rounded-panel` (16px), `rounded-card` (22px), `rounded-pill` (9999px).
- Card/panel mặc định dùng shadow trung tính. `shadow-primary` và `shadow-primary-sm` chỉ dành cho hero/CTA chính và tối đa một lần trên mỗi màn hình.
- Layout desktop dùng padding ngoài 24px, gap 24px; card thường dùng padding 16px, card hero dùng 22px. Nav cao 56px, sidebar rộng 240px.
- Ưu tiên component dùng chung (`SectionCard`, `StatCard`, `HeroCard`, `DataTable`, `Badge`, `Button`...) thay vì lặp lại markup card/bảng trong page.

### Dữ liệu và kiểm tra

- Mọi tiền và số hiển thị phải đi qua `src/lib/format.ts`; không hard-code chuỗi như `642,8M đ` và không dùng `toLocaleString` rải rác trong page.
- Chart phải lấy màu từ theme/chart token, không hard-code màu trong props của Recharts.
- Mock data phải giữ đúng nhãn mock; không mô tả action mock như API thật.
- Sau thay đổi UI chạy `pnpm lint` và `pnpm build`.

### Drift đã biết

- Mobile còn tồn tại khác biệt `#0066cc` và `#2563EB`; admin giữ `#2563EB` theo quyết định hiện tại.
- Mobile còn lạm dụng weight 800/900 và một số font-stack React Native; không copy các drift này sang admin.
- Các page hiện hữu còn class palette Tailwind cũ và một số màu hard-code; khi chạm vào file đó phải migrate phần liên quan sang token mới.

