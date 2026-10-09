# Feedback — Playwright UI test plan

Spec và hành vi: [README](README.md). Test: `e2e/feedbacks/feedbacks.spec.ts`.

| Case | Tag | Kiểm tra |
| --- | --- | --- |
| FB-01 | @stub | API shape phẳng, giờ Việt Nam, star/source filters, reset page, bỏ filter trống |
| FB-02 | @stub | Lỗi 500, retry, empty có filter và empty tự nhiên |
| FB-03 | @stub | Average null, profile null, comment HTML render text, không chạy script |
| FB-04 | @stub | 403 hiện inline và giữ session |
| FB-05 | @stub | Đổi filter hủy request cũ, bỏ kết quả trễ |
| FB-06 | @stub | Làm mới giữ nội dung cũ, báo đang cập nhật, thay bằng kết quả mới |
| FB-07 | @stub | Chưa login / session User bị redirect về login |
| FB-08 | @real | Admin login thật, gọi list/summary thật, kiểm tra đủ nhóm và page info |
| FB-09 | @real | User login thật không vào được route admin |

Chạy `npm run test:e2e -- e2e/feedbacks --project=chromium-desktop --grep '@stub' --reporter=list --workers=2`.

Với `@real`, cấu hình E2E_API_BASE_URL, E2E_ADMIN_EMAIL/PASSWORD, E2E_USER_EMAIL/PASSWORD qua `.env.test` local. Đảm bảo Vite test server khởi động với API base này; server cũ được reuse có thể giữ API base của lượt trước. Không ghi credential vào repo. Suite không tạo phiếu hoặc thay quyền account.

Kết quả 2026-10-10: 7/7 stub và 2/2 real pass, Chromium desktop. SQL/migration/HTTP permission test nằm ở backend; không coi stub UI là bằng chứng kết nối production.
