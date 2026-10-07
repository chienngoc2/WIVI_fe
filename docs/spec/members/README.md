# Spec — Admin Members (Stage 2)

Thư mục này đặc tả **Stage 2 — Quản lý danh sách thành viên và trạng thái** của kế hoạch
[`../../plan/admin_api.md`](../../plan/admin_api.md) (mục *Stage 2 — Quản lý danh sách thành viên và trạng thái*)
dưới dạng **spec kiểm thử UI bằng Playwright**: mỗi yêu cầu phải diễn đạt được thành một kịch bản
thao tác trên giao diện với kết quả **quan sát được** (URL, phần tử hiển thị, request đã phát,
status code thật).

> **Khác Stage 1:** Stage 1 viết spec **trước** khi có test. Ở Stage 2, code và 12 test Playwright
> **đã có sẵn** (`e2e/members/*`); thư mục này ghi lại **hợp đồng thực tế đã chạy**, không phải kế hoạch.

## 1. Trạng thái

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Code Stage 2 trong `src/` | **đã có** | `src/pages/Members.tsx`, `src/services/adminUsers.ts`, `src/types/admin.ts` (§3.2–§3.4 của spec), `src/lib/format.ts`, `src/lib/api/client.ts`, `src/components/ui/*` |
| Playwright runner trong repo | **đã có** (từ Stage 1) | `playwright.config.ts`, `e2e/**`, script `test:e2e*` trong `package.json:11-16` |
| `data-testid` cho vùng Members | **đã có** | **22** attribute trong `src/pages/Members.tsx` (khai báo ở `playwright-ui-test-plan.md` §5); 11 attribute sẵn có của Stage 1 không bị đổi |
| Test `@stub` (không cần backend) | **đã chạy pass 2026-10-07** | 6 case: `TC-MEM-07..12` — `npx playwright test --grep-invert=@real` (21 passed, gồm 15 case auth cũ + 6 case Members) |
| Test `@real` chỉ đọc | **đã chạy pass 2026-10-07** | 5 case `TC-MEM-01..05` với backend thật + admin/user seed trong `.env.test` |
| Test `@real` cấm/bỏ cấm | **chạy một phần** | `TC-MEM-06`: nhánh **cấm** đã đi hết (PATCH + refetch + row `Bị cấm` + notice); nhánh **bỏ cấm** chưa xác thực trọn vẹn vì case đổi trạng thái account trên DB dùng chung — xem `Q-MEM-6` |
| `pnpm lint` / 2 lệnh `tsc --noEmit` / `pnpm build` | **pass** | baseline `AGENTS.md` §0; build còn cảnh báo bundle JS > 500 kB (có sẵn từ trước) |
| Tài liệu này | spec + test plan đã đối chiếu runtime | — |

## 2. Bản đồ file

| File | Nội dung |
| --- | --- |
| [`stage-2-members-spec.md`](./stage-2-members-spec.md) | Hợp đồng FE ↔ BE **đã verify từ code**, máy trạng thái list/detail/mutation, đặc tả UI từng khối, acceptance criteria có mã (`AC-MEM-xx`), sổ drift/khuyết điểm (`D-MEM-x`), câu hỏi cần owner quyết (`Q-MEM-x`) |
| [`playwright-ui-test-plan.md`](./playwright-ui-test-plan.md) | Test plan đã triển khai: fixture `e2e/fixtures/members.ts`, hợp đồng selector (`data-testid`), catalogue `TC-MEM-01..12` kèm kết quả chạy, phạm vi chưa phủ, khoảng trống còn lại (`G-MEM-x`), cách chạy/debug |

## 3. Nguồn sự thật (thứ tự ưu tiên)

1. **Code đang chạy trong `src/`** — quyết định *hành vi hiện tại*. Mọi kết luận UI đều kèm `file:line`.
2. **Controller / handler / entity / repository backend** — quyết định *contract*:
   `../../../../WVI/Personal_Finance_App/src/modules/admin/` và `.../src/modules/identity/`.
3. **Docs service backend** `.../docs/services/admin/users-*.md` — contract mong muốn; đối chiếu với code.
4. [`../../plan/admin_api.md`](../../plan/admin_api.md) — kế hoạch Stage 2 và acceptance criteria gốc.
5. [`../../../AGENTS.md`](../../../AGENTS.md) §4.5/§4.6/§5/§11 — rule bắt buộc cho admin web.
6. [`../../../DESIGN_SYSTEM.md`](../../../DESIGN_SYSTEM.md) §8.5 — đặc tả component dùng chung.

Khi hai nguồn mâu thuẫn: **code thắng cho hành vi hiện tại**, và mâu thuẫn phải được ghi vào sổ drift
`stage-2-members-spec.md` §7 — không âm thầm chọn một bên. Sổ drift backend
(`.../docs/services/_meta/drift-register.md`) được tham chiếu khi liên quan.

## 4. Quy ước mã dùng trong thư mục này

| Mã | Nghĩa | Nơi định nghĩa |
| --- | --- | --- |
| `AC-MEM-xx` | Acceptance criterion của Stage 2 | `stage-2-members-spec.md` §6 |
| `TC-MEM-xx` | Playwright test case (khớp **tên test thật** trong `e2e/members/*`) | `playwright-ui-test-plan.md` §6 |
| `D-MEM-x` | Drift hoặc khuyết điểm phát hiện khi đọc code | `stage-2-members-spec.md` §7 |
| `Q-MEM-x` | Câu hỏi cần owner quyết | `stage-2-members-spec.md` §8 |
| `P-MEM-x` | Quyết định thiết kế test | `playwright-ui-test-plan.md` §1 |
| `G-MEM-x` | Khoảng trống còn lại của hạ tầng/coverage test | `playwright-ui-test-plan.md` §8 |

Mã `AC-xx`/`TC-AUTH-xx`/`D-x`/`Q-x`/`G-x` **thuộc** [`../auth/`](../auth/README.md) — không tái sử dụng
ở đây để tránh trùng nghĩa.

## 5. Ai dùng tài liệu này và dùng thế nào

| Vai | Dùng để |
| --- | --- |
| Người viết/sửa test | Test plan §5 (selector contract) + §6 (catalogue) là đặc tả trực tiếp của `e2e/members/*` |
| Người chạy test lần đầu | Test plan §3.2 (env `.env.test`) + §7 (cái gì cần backend, cái gì không) + §11 (lệnh chạy & debug) |
| Reviewer PR Stage 2 | Traceability `AC-MEM ↔ TC-MEM` ở spec §9 để biết acceptance nào thực sự được kiểm, và §7 để biết chỗ chưa đạt |
| Owner sản phẩm | Spec §7 (drift) + §8 (câu hỏi) — có 6 quyết định đang mở, trong đó 3 cái cần backend |
| Stage 3+ | Spec §3 (contract) + §7 để không lặp lại việc đã chốt; `D-MEM-11`/`D-MEM-12` cho biết component dùng chung nào còn thiếu |

## 6. Liên hệ với Stage 1

Stage 2 **kế thừa** nguyên trạng các phần nền của Stage 1 và chỉ bổ sung một thay đổi:

| Hạng mục Stage 1 | Stage 2 dùng thế nào |
| --- | --- |
| `src/lib/api/client.ts` (base URL, Bearer, refresh single-flight, chuẩn hoá lỗi) | Dùng nguyên; **thêm** nhận diện `AbortError` (`client.ts:27`, `:157`) để request bị huỷ không hoá thành `NETWORK_ERROR` |
| `src/lib/session.ts` + `AuthContext` + guard | Dùng nguyên; `Members` chỉ đọc session gián tiếp qua shell |
| `e2e/fixtures/{accounts,session,api-traffic}.ts` | Dùng nguyên; **thêm** `e2e/fixtures/members.ts` |
| `AC-07` (refresh-on-401) treo ở Stage 1 vì không có request xác thực nào | **Vẫn chưa phủ**: `Members` gọi request xác thực nhưng test không kích hoạt được 401 thật ⇒ giữ nguyên trạng thái treo, xem `G-MEM-5` |
