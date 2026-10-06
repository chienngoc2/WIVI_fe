# Spec — Admin Auth (Stage 1)

Thư mục này đặc tả **Stage 1 — API client và đăng nhập Admin** của kế hoạch
[`../../plan/admin_api.md`](../../plan/admin_api.md) (mục *Stage 1 — API client và đăng nhập Admin*)
dưới dạng **spec kiểm thử UI bằng Playwright**: mỗi yêu cầu phải diễn đạt được thành một kịch bản
thao tác trên giao diện với kết quả **quan sát được** (URL, phần tử hiển thị, giá trị trong
`localStorage`, request đã phát).

> **Đây là tài liệu spec + test plan. Không có thay đổi code trong `src/` hay backend.**
> Trạng thái "Stage 1 hoàn tất" trong `admin_api.md` là mô tả **code đã viết**, không phải
> "đã được kiểm chứng". Thư mục này bổ sung phần kiểm chứng còn thiếu.

## 1. Trạng thái

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Code Stage 1 trong `src/` | **đã có** | `src/lib/api/client.ts`, `src/lib/session.ts`, `src/services/auth.ts`, `src/types/admin.ts`, `src/context/*`, `src/hooks/useAuth.ts`, `src/pages/Login.tsx`, `src/pages/NotFound.tsx`, `src/components/AppLayout.tsx`, `src/App.tsx` |
| Xác thực login với backend đang chạy | **đã làm (2026-10-07)** | `pnpm run test:e2e:real` — `TC-AUTH-20/21/22/25` assert status thật (200/401/422) qua `page.waitForResponse` |
| Playwright runner trong repo | **đã có** | `playwright.config.ts`, `playwright.config.no-api-base.ts`, `e2e/**`, script `test:e2e*` trong `package.json` |
| `data-testid` trong `src/` | **đã có** | 11 attribute: `AppLayout.tsx:6`, `TopNav.tsx:50,53`, `Login.tsx:70,84,90,92,99,136,145`, `NotFound.tsx:4` |
| Chạy test bằng **dữ liệu thật** | **đã có** | `@real` (22 test) dùng account seed trong `.env.test`; `@stub` (8 test) cho nhánh backend không tạo được — xem test plan §6.7 và §11 |
| Tài liệu này | spec + test plan + hướng dẫn quan sát bằng UI mode | — |

## 2. Bản đồ file

| File | Nội dung |
| --- | --- |
| [`stage-1-auth-spec.md`](./stage-1-auth-spec.md) | Hợp đồng FE ↔ BE **đã verify từ code**, máy trạng thái auth, đặc tả UI từng màn, acceptance criteria có mã (`AC-xx`), sổ drift/khuyết điểm (`D-x`), câu hỏi cần owner quyết (`Q-x`) |
| [`playwright-ui-test-plan.md`](./playwright-ui-test-plan.md) | Test plan Playwright: quyết định stack, bố cục file, cấu hình, hợp đồng selector, catalogue test case (`TC-AUTH-xx`), phạm vi chưa phủ, kế hoạch CI. **Đọc §6.7 và §11 trước**: suite hiện chạy bằng dữ liệu thật (`@real`) + stub tối thiểu (`@stub`), kèm hướng dẫn quan sát snapshot trong UI mode |

## 3. Nguồn sự thật (thứ tự ưu tiên)

1. **Code đang chạy trong `src/`** — quyết định *hành vi hiện tại*. Mọi kết luận UI trong thư mục
   này đều kèm `file:line`.
2. **Controller / DTO / handler / exception filter backend** — quyết định *contract*.
   `../../../../WVI/Personal_Finance_App/src/modules/identity/` và
   `.../src/shared/interface/`.
3. [`../../plan/admin_api.md`](../../plan/admin_api.md) — kế hoạch Stage 1 và acceptance criteria gốc.
4. [`../../../AGENTS.md`](../../../AGENTS.md) — rule vận hành bắt buộc.
5. [`../../../ADMIN_INTEGRATION_PLAN.md`](../../../ADMIN_INTEGRATION_PLAN.md) — bản đồ contract đã verify
   với backend (dùng làm đối chiếu, không thay thế code).

Khi hai nguồn mâu thuẫn: **code thắng cho hành vi hiện tại**, và mâu thuẫn phải được ghi vào
sổ drift của `stage-1-auth-spec.md` §7 — không âm thầm chọn một bên.

## 4. Quy ước mã dùng trong thư mục này

| Mã | Nghĩa | Nơi định nghĩa |
| --- | --- | --- |
| `AC-xx` | Acceptance criterion của Stage 1 | `stage-1-auth-spec.md` §6 |
| `TC-AUTH-xx` | Playwright test case | `playwright-ui-test-plan.md` §6 |
| `D-x` | Drift hoặc khuyết điểm phát hiện khi đọc code | `stage-1-auth-spec.md` §7 |
| `Q-x` | Câu hỏi cần owner quyết | `stage-1-auth-spec.md` §8 |
| `G-x` | Khoảng trống hạ tầng test phải lấp trước khi chạy được | `playwright-ui-test-plan.md` §8 |

## 5. Ai dùng tài liệu này và dùng thế nào

| Vai | Dùng để |
| --- | --- |
| Người viết/sửa test | §5–§7 của test plan là đặc tả selector + catalogue case; §6.7 (phân loại `@real`/`@stub`) và §11 (quan sát bằng UI mode) là phần mới nhất |
| Người chạy test lần đầu | `docs/spec/auth/README.md` §1 để biết cái gì đã có; `.env.test` cần account seed; chạy `test:e2e:offline` (không cần backend) hoặc `test:e2e:real` (cần backend) |
| Reviewer PR Stage 1 | Traceability matrix `AC ↔ TC` ở `stage-1-auth-spec.md` §9 để biết acceptance nào thực sự được kiểm |
| Owner sản phẩm | §7 (drift) và §8 (câu hỏi) — có 5 quyết định đang chặn việc chốt hành vi đúng |
| Người sửa rule/tài liệu | §7 ghi rõ tài liệu nào đang lệch code, để không copy tiếp thông tin sai |
