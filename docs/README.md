# Tài liệu kỹ thuật `WIVI_fe`

Thư mục này chứa ghi chú kỹ thuật **về chính repo này** (khác với tài liệu nghiệp vụ/kế hoạch ở thư mục gốc).

## Nội dung

| File | Nội dung |
| --- | --- |
| [`struct/struct.md`](./struct/struct.md) | **Cấu trúc thư mục thật** của `WIVI_fe`: cây thư mục đầy đủ, vai trò từng file nguồn, danh sách thư mục **chưa tồn tại** dù tài liệu mô tả, file/dependency chết, nơi cấu hình thực sự nằm |
| [`graph.md`](./graph.md) | **Sơ đồ phụ thuộc & luồng dữ liệu**: đồ thị import module, cây render, luồng dữ liệu mock cục bộ, luồng design token, bảng route ↔ nav, điểm nối tương lai |
| [`typescript-strict.md`](./typescript-strict.md) | Trạng thái `strict` của TypeScript: vì sao cờ trong `tsconfig.json` gốc chưa có tác dụng, cách bật đúng, bằng chứng code đã pass |
| [`plan/admin_api.md`](./plan/admin_api.md) | **Kế hoạch nối admin FE ↔ BE theo stage** (Stage 0 → Stage 6): inventory user-flow, API mapping, acceptance criteria từng stage, state map, migration matrix, blockers/mismatches |
| [`spec/auth/`](./spec/auth/README.md) | **Spec + test plan cho Stage 1 (auth)** dưới dạng kiểm thử UI bằng Playwright: hợp đồng auth đã verify từ code, đặc tả UI từng màn, `AC-xx`, sổ drift `D-x`, câu hỏi `Q-x`, và catalogue test case `TC-AUTH-xx` |
| [`spec/members/`](./spec/members/README.md) | **Spec + test plan cho Stage 2 (Members)** dưới dạng kiểm thử UI bằng Playwright: hợp đồng `/admin/users` đã verify từ code + runtime, đặc tả UI từng khối, `AC-MEM-xx`, sổ drift `D-MEM-x`, câu hỏi `Q-MEM-x`, và catalogue test case `TC-MEM-xx` (12 case, có kết quả chạy thật) |

## Tài liệu ở thư mục gốc repo (không thuộc `docs/`)

Các file này nằm ở `WIVI_fe/` và có thẩm quyền riêng:

| File | Vai trò |
| --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | **Bộ rule vận hành bắt buộc cho coding agent** — đọc trước khi sửa bất cứ thứ gì |
| [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) | Hợp đồng design system mobile ⇄ admin; tài liệu tham chiếu chi tiết về token |
| [`../ADMIN_INTEGRATION_PLAN.md`](../ADMIN_INTEGRATION_PLAN.md) | Kế hoạch nối admin FE ↔ backend; **đã verify với code backend** |
| [`../ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md`](../ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md) | Brief thiết kế ban đầu cho admin portal |
| [`../README.md`](../README.md) | Template Vite mặc định — **không** chứa instruction dự án |

## Thứ tự ưu tiên nguồn sự thật

Khi các nguồn mâu thuẫn:

1. **Code đang chạy trong `src/`** — quyết định *hành vi hiện tại*.
2. `DESIGN_SYSTEM.md` — quyết định *token và hợp đồng hình thức*.
3. `ADMIN_INTEGRATION_PLAN.md` — quyết định *contract API* (bản đã verify với backend).
4. `ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md` — bối cảnh thiết kế; **đã lỗi thời ở một số điểm**, xem mục "drift" trong `AGENTS.md`.
5. `AGENTS.md` — cách vận hành.

Ghi chú trong `docs/` này **không** thay thế các nguồn trên; nó bổ sung chi tiết kỹ thuật cho những chỗ tài liệu gốc chưa nói tới.
