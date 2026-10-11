# Hồ sơ quản trị và đăng xuất

Route `/profile` nằm trong RequireAdmin + AppLayout. TopNav có menu tài khoản từ tên/avatar; không thêm mục nghiệp vụ trong Sidebar theo quyết định của plan.

Contract: `WVI/Personal_Finance_App/docs/services/admin/me.md` và `docs/services/auth/logout.md`.

- Service `adminProfile.ts` gọi `GET /admin/me` bằng API client chung, trả AdminProfile đủ 12 trường.
- Chỉ xem hồ sơ: họ tên, họ/tên riêng, username, email, phone, role/status, ngày tạo và lần đăng nhập gần nhất; avatar nếu có. Không form sửa, không mock runtime.
- Skeleton khi tải; abort khi unmount hoặc quá 15 giây và bỏ response trễ; lỗi mạng/5xx/timeout có Thử lại.
- 403 hiện “Tài khoản không còn quyền quản trị” và nút Đăng xuất, giữ session. 401 dùng refresh single-flight hiện hữu.
- null hoặc tên trống hiện `—`; datetime dùng formatter chung Asia/Ho_Chi_Minh. fullName giữ getter domain, không tự đổi thứ tự tên.
- Menu có Hồ sơ của tôi và Đăng xuất; đóng khi click ngoài, blur hoặc Escape, hỗ trợ mũi tên/Home/End, trả focus cho trigger khi Escape.
- Logout khoá nút khi pending; gọi useAuth.logout, luôn xoá session dù API lỗi. RequireAdmin chuyển về login; Back vẫn qua guard. Token server vẫn stateless, không thu hồi.
- Giữ test hook `topnav-identity-name`, `topnav-identity-initials`; thêm `topnav-account-menu`, `topnav-profile-link`, `topnav-logout`, `profile-page`.

Playwright: `e2e/profile/profile.spec.ts` (@stub + @real), `e2e/auth/logout.spec.ts` (TC-AUTH-53 logout từ shell). @real cần backend có endpoint mới và E2E_ADMIN/E2E_USER credentials local; không commit secret.

Áp dụng mặc định QĐ-1 đến QĐ-5 của plan: endpoint admin riêng, logout Bearer/stateless, profile chỉ đọc, menu TopNav. Chưa có xác nhận design riêng từ owner.
