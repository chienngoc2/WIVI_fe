# TypeScript `strict` — trạng thái và cách bật đúng

> **Ghi chú kỹ thuật cho `WIVI_fe`.** Viết ngày sau khi chủ repo thêm `"strict": true` vào `tsconfig.json`.
> **Kết luận ngắn:** code **đã sẵn sàng** cho `strict` (0 lỗi), nhưng cờ hiện tại **chưa được áp dụng** cho `src/`. Cần thêm 2 dòng ở 2 file khác.

---

## 1. Vấn đề: `compilerOptions` trong `tsconfig.json` gốc không được áp dụng

`tsconfig.json` hiện tại:

```jsonc
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "strict": true          // ← dòng này KHÔNG ảnh hưởng gì
  }
}
```

Đây là **solution-style config** (giống `tsconfig.json` do Vite scaffold): `"files": []` nghĩa là file này **không compile file nào cả**. Nó chỉ là danh sách project reference. `tsc -b` build từng project được tham chiếu **bằng `compilerOptions` của chính project đó**, không kế thừa từ config gốc.

⇒ `strict` phải được khai báo trong **từng** project thực sự compile code.

### Bằng chứng đã kiểm chứng

```console
$ npx tsc -p tsconfig.app.json --showConfig | Select-String '"strict"'
(không có kết quả)          ← strict vắng mặt trong config hiệu lực
```

Đối chiếu `noUnusedLocals` (được khai báo **trong** `tsconfig.app.json`) thì `--showConfig` in ra bình thường ⇒ công cụ đọc đúng, chỉ là `strict` không có ở đó.

---

## 2. Tin tốt: codebase đã pass `strict` sạch

Đã chạy thử `strict` **thật** trên toàn bộ `src/` (bằng config tạm `extends: "./tsconfig.app.json"` + `"strict": true`, sau đó xoá):

```console
$ npx tsc -p <probe> --noEmit
EXIT=0        ← 0 lỗi
```

Và trên `vite.config.ts` (`tsconfig.node.json`):

```console
EXIT=0        ← 0 lỗi
```

**Hệ quả:** không cần sửa file `.ts`/`.tsx` nào. Đây thuần tuý là vấn đề wiring config. Có thể bật `strict` ngay mà không tạo diff trong `src/`.

> Ghi chú: repo hiện có **0** `any` (`grep 'as any|: any|<any>' src/` = 0) và mọi `interface`/`type` đã tường minh, nên việc pass là hợp lý chứ không phải may mắn.

---

## 3. Cách sửa

### Cách A — thêm trực tiếp vào từng project (khuyến nghị)

`tsconfig.app.json` và `tsconfig.node.json`, thêm `"strict": true` vào `compilerOptions`. Với `tsconfig.app.json`:

```jsonc
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    "strict": true,          // ← THÊM

    /* Bundler mode */
    "moduleResolution": "bundler",
    ...
```

Làm y hệt cho `tsconfig.node.json`.

Nhớ **xoá** `compilerOptions` khỏi `tsconfig.json` gốc sau đó, để không còn cờ chết gây hiểu nhầm cho người sau.

### Cách B — tách base config dùng chung

Tạo `tsconfig.base.json` chứa `"strict": true` (và các option chung), rồi để `tsconfig.app.json` / `tsconfig.node.json` `"extends": "./tsconfig.base.json"`.

⚠️ **Không** để chúng `extends` chính `tsconfig.json` gốc: config gốc có `"files": []` và `"references"`, `extends` sẽ kéo theo cả hai và gây rối. Base config phải là file riêng.

---

## 4. Sau khi bật — những gì `strict` sẽ bắt đầu chặn

`strict: true` bật một nhóm cờ. Những cái đáng lưu ý nhất cho codebase này:

| Cờ | Ảnh hưởng tới `WIVI_fe` |
| --- | --- |
| `strictNullChecks` | `null`/`undefined` không còn gán bừa. Quan trọng khi nối API: field nullable (`phone`, `avatarUrl`, `statusReason`, `lastLoginAt`, `scheduledAt`, `sentAt`, `apiKeyMasked`) phải khai `\| null` và render `—` |
| `noImplicitAny` | Tham số không annotate sẽ báo lỗi. `DataTable`/`Column<T>` phải khai generic tường minh |
| `strictFunctionTypes` | Callback truyền vào handler phải khớp signature chính xác |
| `strictBindCallApply` | Ít gặp trong React |
| `alwaysStrict` | Tự động; mọi file chạy `"use strict"` |
| `strictPropertyInitialization` | Chỉ ảnh hưởng `class` — repo hiện không dùng class component |

**Chưa được `strict` bao gồm** (vẫn cần bật riêng nếu muốn):
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noImplicitOverride`.
`noUncheckedIndexedAccess` là ứng viên đáng cân nhắc **sau này** khi có code truy cập mảng/record bằng index (`categoryIcons[tx.category]` ở `Activity.tsx:174` là ví dụ điển hình) — nhưng **không** nằm trong scope lần này.

---

## 5. Vì sao điều này quan trọng với agent

`AGENTS.md` của repo từng ghi `strict` **đang tắt**, và rule đó dẫn tới hướng dẫn "tự khai báo `| null` vì compiler không nhắc bạn". Hướng dẫn đó **vẫn đúng như một thói quen tốt**, nhưng lý do đã thay đổi:

- **Khi `strict` chưa có hiệu lực** (hiện tại): compiler không nhắc ⇒ sai `null` chỉ lộ ra lúc runtime.
- **Sau khi bật `strict`**: compiler nhắc ⇒ sai `null` lộ ra lúc `pnpm build`.

⇒ Không agent nào được phép dựa vào việc "`tsc` pass" để suy ra code an toàn null **cho tới khi** 2 dòng ở §3 được thêm.

---

## 6. Trạng thái hiện tại — cần cập nhật

| Việc | Trạng thái |
| --- | --- |
| `"strict": true` trong `tsconfig.json` gốc | ✅ đã thêm (nhưng chưa có tác dụng) |
| `"strict": true` trong `tsconfig.app.json` | ❌ **chưa** — đây là chỗ quyết định cho `src/` |
| `"strict": true` trong `tsconfig.node.json` | ❌ **chưa** — cho `vite.config.ts` |
| Code `src/` pass `strict` | ✅ đã kiểm chứng, 0 lỗi |
| `vite.config.ts` pass `strict` | ✅ đã kiểm chứng, 0 lỗi |

**Việc còn lại:** thêm 2 dòng (§3 Cách A) + xoá `compilerOptions` chết ở `tsconfig.json` gốc. Sau đó `pnpm build` sẽ thực sự type-check nghiêm.
