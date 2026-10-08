# Tài liệu kỹ thuật `WIVI_fe`

Thư mục này chứa ghi chú kỹ thuật **về chính repo này**. Trạng thái source được đối chiếu ngày 2026-10-07: Stage 1–2 có code/test, Stage 3–6 đã có code FE trong working tree nhưng còn lỗi contract/hành vi và chưa có test UI riêng. Xem [`plan/admin_api.md`](./plan/admin_api.md) §4, §7 để biết trạng thái từng stage; không suy ra một stage hoàn tất chỉ từ lint/typecheck/build pass.

## Nội dung

| File | Nội dung |
| --- | --- |
| [`struct/struct.md`](./struct/struct.md) | **Cấu trúc source hiện tại**: entrypoint, route/page, context, service, primitive UI, thư mục chưa có và vị trí config |
| [`graph.md`](./graph.md) | **Sơ đồ phụ thuộc & luồng dữ liệu hiện tại**: auth guard, các request đã nối, mock còn lại, route ↔ nav và contract drift |
| [`typescript-strict.md`](./typescript-strict.md) | Trạng thái `strict` của TypeScript: vì sao cờ trong `tsconfig.json` gốc chưa có tác dụng, cách bật đúng, bằng chứng code đã pass |
| [`plan/admin_api.md`](./plan/admin_api.md) | **Kế hoạch và sổ trạng thái nối admin FE ↔ BE** (Stage 0 → Stage 6): việc đã có code, acceptance còn mở, drift và việc tiếp theo |
| [`spec/auth/`](./spec/auth/README.md) | **Spec + test plan cho Stage 1 (auth)** dưới dạng kiểm thử UI bằng Playwright: hợp đồng auth đã verify từ code, đặc tả UI từng màn, `AC-xx`, sổ drift `D-x`, câu hỏi `Q-x`, và catalogue test case `TC-AUTH-xx` |
| [`spec/members/`](./spec/members/README.md) | **Spec + test plan cho Stage 2 (Members)** dưới dạng kiểm thử UI bằng Playwright: hợp đồng `/admin/users` đã verify từ code + runtime, đặc tả UI từng khối, `AC-MEM-xx`, sổ drift `D-MEM-x`, câu hỏi `Q-MEM-x`, và catalogue test case `TC-MEM-xx` (12 case, có kết quả chạy thật) |

## Tài liệu ở thư mục gốc repo (không thuộc `docs/`)

Các file này nằm ở `WIVI_fe/` và có thẩm quyền riêng:

| File | Vai trò |
| --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | **Bộ rule vận hành bắt buộc cho coding agent** — đọc trước khi sửa bất cứ thứ gì |
| [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) | Hợp đồng design system mobile ⇄ admin; tài liệu tham chiếu chi tiết về token |
| [`../ADMIN_INTEGRATION_PLAN.md`](../ADMIN_INTEGRATION_PLAN.md) | Bản đồ contract được verify tại thời điểm viết; các câu về **mức triển khai FE** là snapshot cũ, đọc `plan/admin_api.md` và source để biết hiện trạng |
| [`../ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md`](../ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md) | Brief thiết kế ban đầu; không phải bằng chứng runtime hoặc contract mới nhất |
| [`../README.md`](../README.md) | Template Vite mặc định — **không** chứa instruction dự án |

## Thứ tự ưu tiên nguồn sự thật

Khi các nguồn mâu thuẫn:

1. **Code đang chạy trong `src/`** — quyết định *hành vi hiện tại*.
2. `DESIGN_SYSTEM.md` — quyết định *token và hợp đồng hình thức*.
3. Controller/DTO/handler backend — quyết định *contract API runtime*; `ADMIN_INTEGRATION_PLAN.md` là bản đồ tham khảo có thể cũ.
4. `ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md` — bối cảnh thiết kế; **đã lỗi thời ở một số điểm**, xem mục "drift" trong `AGENTS.md`.
5. `AGENTS.md` — cách vận hành.

Ghi chú trong `docs/` này **không** thay thế các nguồn trên; nó bổ sung chi tiết kỹ thuật cho những chỗ tài liệu gốc chưa nói tới.
