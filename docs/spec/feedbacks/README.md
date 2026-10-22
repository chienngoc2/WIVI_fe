# Đánh giá người dùng

Route `/feedbacks`, menu “Đánh giá người dùng”, dùng guard Admin hiện hữu.

Contract backend: `WVI/Personal_Finance_App/docs/services/feedback/admin-list.md`, `admin-summary.md`.

- List đọc mọi lượt gửi qua `GET /api/v1/admin/feedbacks`; summary lấy phiếu mới nhất mỗi người trong khoảng ngày qua `/summary`.
- Bộ lọc sao/nguồn chỉ đổi list. Khoảng ngày áp dụng cả list và summary. Date-only hiểu ngày Việt Nam; formatter chung hiển thị `Asia/Ho_Chi_Minh`.
- URL giữ page/pageSize/filter để reload và back/forward. Đổi filter reset page 1. Không gửi filter trống.
- Abort khi đổi query/unmount, bỏ response trễ. Key của snapshot phải khớp query trước khi render.
- Loading skeleton; lỗi inline và Thử lại; empty phân biệt có/không filter; 403 giữ session; 401 dùng refresh chung.
- Average null hiển thị `—`; nhóm trống do backend trả 0; không tạo dữ liệu mock trong runtime.
- Nội dung nhận xét render text thuần, giữ xuống dòng; profile null hiện `—` + link userId. Không có xóa/trả lời.

Playwright: `npm run test:e2e -- e2e/feedbacks --project=chromium-desktop --grep @stub` cho trạng thái mô phỏng. `--grep @real` cần backend bản mới và account Admin/User trong `.env.test`; không tạo account hoặc gửi feedback thật trong suite này.

Các case: dữ liệu/UTC→VN, phân trang/filter bỏ chuỗi trống, pending/abort, stale response, lỗi+retry, empty, 403 giữ session, route guard, real API shape. Backend guards và SQL kiểm tra riêng trong Jest/PG integration.
