# Admin Portal Frontend — Implementation Brief

**Feature scope:** Admin portal frontend for user management, categories, broadcasts, dashboard, audit logs, AI settings, and subscription plans.

**Target repo:** `WIVI_fe/` (React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router 7)
**Backend authority:** `WVI/Personal_Finance_App/` (NestJS REST, prefix `/api/v1`)
**Brief status:** decision-complete for the in-scope capabilities listed in §3. Items that cannot be decided from supplied files are isolated in §15.

**Evidence labels used throughout**

| Label | Meaning |
| --- | --- |
| `FACT` | Verified directly in source code or documentation at the cited path |
| `INFERENCE` | Conclusion derived from cited evidence |
| `UNVERIFIED` | Requires confirmation; not decidable from supplied files |

### Reading notes

**Citation convention.** Backend paths are cited relative to the backend root (`WVI/Personal_Finance_App/`), so `docs/API V2.md:2813` means `WVI/Personal_Finance_App/docs/API V2.md:2813`; every backend citation uses the full `docs/...` or `temp/...` form with no bare filenames. Frontend paths are cited from the repository root including the owning folder, e.g. `WIVI_fe/src/App.tsx`; files under `WIVI_fe/src/components/` and `WIVI_fe/src/pages/` are abbreviated to their basename where the folder is unambiguous from context (e.g. `Sidebar.tsx:13`). Appendix A maps each authoritative document to its absolute location.

**UI language.** This brief is written in English, but **user-facing UI copy stays Vietnamese**, matching the existing admin pages (`FACT`: `WIVI_fe/src/pages/Overview.tsx:51`, `WIVI_fe/src/components/Sidebar.tsx:8-13`). Vietnamese strings quoted below are the required copy, not translations of English text.

**Field-level decisions.** §7.2 maps every response field of the in-scope endpoints to a UI element. Where a field's rendering is a product choice rather than a documented contract (column order, labels, formatting), §7.2 states the decision explicitly so no further judgement is required at implementation time.

---

## 1. Executive Summary

### What is being planned

A real, API-backed admin operations portal for the WIVI personal-finance product. Today `WIVI_fe/` is a **static mock UI shell**: six routes render hardcoded arrays, there is no HTTP client, no authentication, no global state, no loading/error handling and no tests (`FACT`: `WIVI_fe/src/App.tsx:22-29`; `WIVI_fe/src/pages/*.tsx` module-level constants; zero `fetch`/`axios`/`import.meta.env` hits in `WIVI_fe/src`; no `*.test.*` files).

This brief specifies how to convert that shell into a functioning admin client for the seven capabilities in scope, against the admin REST APIs that are actually implemented in the backend.

### Target users and roles

| Role | Who | Portal access |
| --- | --- | --- |
| `Admin` | WIVI operations staff | Full admin portal: users, categories, broadcasts, dashboard, audit logs, AI settings, subscription plans |
| `User` | End consumer of the mobile app | **No portal access**. Must be rejected at the portal boundary |
| Anonymous | No valid token | No portal access |

`FACT`: role model is `Admin` / `User` — `WVI/Personal_Finance_App/docs/conventions.md:119-121`, `docs/services/admin/change-role.md:17`.
`FACT`: there is no admin-specific login endpoint; admin signs in through the shared `POST /api/v1/auth/login` and is authorized by role — `docs/API V2.md:138` ("Không thêm endpoint riêng `POST /api/v1/admin/auth/login`").

### User problem being solved

Operations currently cannot act on production data at all: every table, filter, chart and modal in `WIVI_fe/` is decorative. Suspected-abuse accounts cannot be banned, default categories cannot be curated, announcements cannot be sent, AI cost controls cannot be changed, and subscription plans cannot be priced. All of those backend operations exist and are guarded, but no UI reaches them.

### Intended result

An authenticated, role-gated admin SPA where each in-scope screen reads and writes real backend state, with explicit loading/empty/error handling, pagination and filtering wired to the real query contracts, and no screen presenting a mock action as if it were a working backend operation.

### Current implementation status

| Layer | Status |
| --- | --- |
| Backend admin APIs | `FACT`: 16 admin endpoints are implemented and role-guarded (see §8) |
| Backend auth APIs | `FACT`: `login`, `logout`, `refresh` implemented — `docs/API V2.md:75,108,234` |
| Frontend design tokens | `FACT`: already applied — `WIVI_fe/src/index.css:3-70` contains the full `@theme` token set (primary `#2563EB`, ink/surface/semantic/dark families, 5 radii) |
| Frontend design rules | `FACT`: `WIVI_fe/AGENTS.md` exists and is the operative styling/architecture rule set |
| Frontend API layer | `FACT`: **absent**. `WIVI_fe/.env:1` defines `VITE_API_BASE_URL=http://127.0.0.1:3000` but **nothing reads it** |
| Frontend auth | `FACT`: **absent**. No login screen, no token storage, no guard |
| Frontend global state | `FACT`: **absent**. Only local `useState` in 4 pages |
| Frontend tests | `FACT`: **absent**. No test runner, no test script in `WIVI_fe/package.json:6-11` |

`INFERENCE`: roughly all product value of this feature is still to be built; the existing pages contribute layout and visual language, not behaviour.

---

## 2. Goals and Success Criteria

### Goals

| # | Goal | Success criterion (measurable) |
| --- | --- | --- |
| G1 | Authenticate and gate the portal | Logging in with an `Admin` account reaches `/`; logging in with a `User` account is rejected with an explicit message and no admin route renders; an unauthenticated visit to any route redirects to login |
| G2 | Users are operable | Admin can list users with server-side pagination, filter by `status`, search by `keyword`, open one user, and set `Active`/`Banned` with an optional reason — each mutation confirmed by a refetch reflecting the new state |
| G3 | Default categories are operable | Admin can list (filter `isActive`), create, update and delete default categories |
| G4 | Broadcasts are operable | Admin can list broadcast history with pagination and status filter, and create a broadcast (immediate or scheduled) |
| G5 | Dashboard is real | All nine `summary` counters and both recent-activity lists on `/` come from `GET /api/v1/admin/dashboard` — zero hardcoded metrics remain |
| G6 | Audit trail is readable | Admin can page and filter audit logs by `adminId`, `actionType`, `entityType`, `fromDate`, `toDate` |
| G7 | AI settings are editable | Admin can read current AI settings (with `apiKeyMasked`, never a raw key) and patch `modelName`, `systemPrompt`, `temperature`, `maxTokens`, `isEnabled` |
| G8 | Subscription plans are manageable | Admin can list all plans and create/update plans |
| G9 | No false affordance | Every interactive control either performs a real backend call or is removed/disabled with a visible reason. No `alert()`-only submit survives |
| G10 | Rules compliance | `pnpm lint` and `pnpm build` pass; no page introduces hex literals or off-token palette classes (per `WIVI_fe/AGENTS.md`) |

### Definition of done

A capability is done when: the request shape matches §8 exactly; loading, empty, success and error states are all rendered; a 401 and a 403 are handled distinctly; the action is verified against the running backend; and the corresponding row in §14 is checked.

---

## 3. Scope

### 3.1 In scope

| Capability | Backend support | Frontend work |
| --- | --- | --- |
| Admin authentication + session | `AVAILABLE` | Login screen, token storage, refresh, logout, route guard, role gate |
| Dashboard | `AVAILABLE` (basic metrics only) | Wire Overview to `GET /admin/dashboard`; replace 5 hardcoded constant blocks |
| User management | `AVAILABLE_WITH_DRIFT` | Users list (server pagination/filter/search), user detail, ban/unban with reason |
| Default categories | `AVAILABLE_WITH_DRIFT` | Category table, create/edit drawer or dialog, delete confirmation |
| Broadcasts | `AVAILABLE_WITH_DRIFT` | Broadcast history table + compose form (title, body, targetAudience, scheduledAt) |
| Audit logs | `AVAILABLE_WITH_DRIFT` | New log view with filter bar and pagination |
| AI settings | `AVAILABLE` | Settings form bound to GET/PATCH, masked-key display, enable toggle |
| Subscription plans | `AVAILABLE_WITH_DRIFT` | Plans table, create form, edit form |
| Shared data layer | n/a | API client, typed endpoint modules, auth context, query/loading conventions |
| Shared UI kit | n/a | Implement the components named in `WIVI_fe/AGENTS.md` and `WIVI_fe/DESIGN_SYSTEM.md` |
| Test infrastructure | n/a | Add a runner and cover the paths in §13 |

### 3.2 Out of scope

| Item | Reason |
| --- | --- |
| Role change (promote/demote an account) | `NOT_DEFINED` — see §8.4. No controller or handler exists |
| Admin transaction log (`/activity` capability) | No admin transaction list/detail endpoint exists in either API graph |
| Dashboard date-range filters, period comparison, growth/volume time series, top categories | `BACKLOG` — story-only, no route defined (`temp/admin-rest-api-backlog-graph.md:40-44`) |
| OCR/import job review, integration error rates | `BACKLOG` — `temp/admin-rest-api-backlog-graph.md:45-46` |
| DAU/WAU/MAU, retention/churn, report export, moderation analytics | `BACKLOG` — `temp/admin-rest-api-backlog-graph.md:47-52` |
| Jar template / insight-rule administration | `BACKLOG` — story-only, "do not invent CRUD routes" (`temp/admin-rest-api-backlog-graph.md:38-39`) |
| Backend behaviour changes of any kind | Backend is treated as read-only authority for this brief |
| Mobile app changes | Separate codebase (`WVI/WIVI`) |
| Redesign of the visual language | Tokens and rules already fixed by `WIVI_fe/src/index.css` and `WIVI_fe/AGENTS.md` |

### 3.3 Optional future work (only after §3.1 ships)

1. Promote backlog story capabilities to real screens **if and only if** a route appears in `docs/API V2.md` and an application handler exists.
2. Dashboard filtering/comparison once a grouped time-series contract exists.
3. Move audit-log browsing into its own top-level nav entry if usage justifies it (currently proposed as a section, see §7).

### 3.4 Dependencies and blockers

| # | Dependency / blocker | Impact | Status |
| --- | --- | --- | --- |
| B1 | Backend reachable at `VITE_API_BASE_URL` with CORS allowing the Vite origin | All integration blocked without it | `UNVERIFIED` — nothing in `WIVI_fe/` configures a dev proxy |
| B2 | A seeded `Admin` account for local verification | Cannot verify G1 manually without it | `FACT`: the only seed logic found in backend source is `seedDefaultPlans()` (`src/modules/subscription/application/subscription.service.ts:27,42`) — **no admin-account seed exists in the supplied checkout**. Account provisioning is outside this brief. See Q9 |
| B3 | Pagination envelope drift `DRIFT-005` unresolved | FE must tolerate three shapes or freeze a per-endpoint decision (§8.5) | `FACT`: `docs/services/_meta/drift-register.md:11` |
| B4 | Status-code drift `DRIFT-011` unresolved | Create/delete success codes differ from convention | `FACT`: `docs/services/_meta/drift-register.md:17` |
| B5 | Navigation placement of audit logs and categories | A **default is assigned** in §7 (`/configuration` hosts categories; `/intelligence` hosts AI settings; audit logs get a section on `/intelligence`). The owner may override without rework because the API layer is identical either way | Default assigned — see Q1 for the override path |
| B6 | Test tooling must be added (no runner exists) | Blocks §13 | `FACT`: `WIVI_fe/package.json:6-11` |
| B7 | `username` vs `userName` casing mismatch in admin payloads | Field name must be decided or read tolerantly | `FACT`: `docs/services/admin/dashboard.md:50` vs `docs/services/admin/users-list.md:44` |
| B8 | `change-role` documentation conflict is unresolved | Blocks any role-management UI | `FACT`: `temp/admin-rest-api-implemented-graph.md:44` |
| B9 | `docs/services/_meta/drift-register.md` line 52 "Backlog các endpoint chưa tạo tài liệu" section is empty in the supplied file | Cannot confirm the backlog list is exhaustive | `UNVERIFIED` |
| B10 | `targetAudience` value domain is undefined | The broadcast compose input cannot be finalised (free text vs predefined audience) | `FACT`: required `string` with no enum documented (`docs/API V2.md:2737`). See §11.1 and Q16 |

---

## 4. Evidence and Source Map

| Area | Current Source | Intended Source | Status | Notes |
| --- | --- | --- | --- | --- |
| Admin endpoint availability | `src/modules/*/interface/http/*.controller.ts` | `docs/API V2.md` §6, §10 | `AVAILABLE_WITH_DRIFT` | Runtime and docs agree on paths; differ on status codes and pagination |
| Endpoint permission metadata | `@Roles('Admin')` on controllers (`FACT`: verified in `admin.controller.ts:18,64,77`, `admin-category.controller.ts:24`, `admin-ai.controller.ts:11`, `notification.controller.ts:105,120`, `admin-subscription.controller.ts:15`) | `docs/conventions.md:118-123` | `AVAILABLE` | Global `JwtAuthGuard` + `RolesGuard` |
| Subscription permission claim | Source **has** `@Roles('Admin')` | `temp/admin-rest-api-backlog-graph.md:32-34` says `SECURITY_GAP` | **Conflict** | Backlog graph is a pre-hardening snapshot. `docs/services/_meta/drift-register.md:45` marks `DRIFT-034` **Resolved**. Treat the graph row as stale — see §4.1 |
| Client/general API conventions | `docs/conventions.md` | `docs/conventions.md` | Authority | URL naming, camelCase, amount sign, pagination, error envelope, enums |
| Field-level request/response | — | `docs/API V2.md` + `docs/services/admin/*.md`, `docs/services/subscription/admin-*.md` | `AVAILABLE_WITH_DRIFT` | Per-endpoint drift recorded in §8.5 |
| Auth contract | `docs/API V2.md:75,108,234` | same | `AVAILABLE` | Shared login; no admin login route by design |
| Roles and permissions semantics | `docs/overview.md:213-221` | `docs/user story.md:108-143` | Authority | Admin operates the system, never touches user money |
| Admin priorities | — | `docs/user story.md:196` (P0), `docs/user story.md:108-143` | Authority | Admin Foundation is P0 |
| Admin screen IA | `WIVI_fe/src/components/Sidebar.tsx:7-14` | not defined beyond this | `PARTIAL` | Only the six existing labels are defined; no source defines an audit-log destination |
| Frontend behaviour | `WIVI_fe/src/**` | — | Authority (current behaviour) | Mock-only, see §5 |
| Visual language | `WIVI_fe/src/index.css:3-70` (tokens) | `WIVI_fe/AGENTS.md` + `WIVI_fe/DESIGN_SYSTEM.md` | Authority | Tokens already applied |
| Package manager | `WIVI_fe/pnpm-lock.yaml` exists; no npm/yarn lockfile | `WIVI_fe/AGENTS.md` says `pnpm lint` / `pnpm build` | Authority | Root `AGENTS.md` says `npm run …` for the admin web — conflict, follow the lockfile + local AGENTS.md |
| Startup files | `AGENTS.md` (root), `WVI/Personal_Finance_App/OUTPUT.md`, `WVI/README.md` | — | Authority | `OUTPUT.md` defines communication style, not product rules; `WVI/README.md` is project overview, explicitly not a business contract |
| Backend module map / enums | `WVI/Personal_Finance_App/AGENTS.md` | same | Authority | Enum list, status codes, error envelope |

### 4.1 Recorded conflicts (must not be silently resolved)

| # | Conflict | Evidence | Handling in this brief |
| --- | --- | --- | --- |
| C1 | Subscription endpoints described as unprotected (`SECURITY_GAP`) while source applies `@Roles('Admin')` | `temp/admin-rest-api-backlog-graph.md:32-34` vs `src/modules/subscription/interface/http/admin-subscription.controller.ts:15` | Treat as **available and Admin-guarded**. Backlog graph row is stale. Do not surface a warning in UI |
| C2 | `change-role` route claimed to exist at `/api/v1/admin/users/{id}/role` | `docs/services/_meta/drift-register.md:13` (`DRIFT-007`) vs `FACT`: no `change-role`/`role` route in `src/modules/**` (grep found none) and `temp/admin-rest-api-implemented-graph.md:44` says no controller/handler | **No role-change UI.** Keep in §3.2 out-of-scope |
| C3 | Pagination envelope | Request `page`+`pageSize` (`docs/services/admin/audit-logs.md:15`), request `pageIndex`+`pageSize` (`docs/services/admin/users-list.md:15`), response `pagination{page,…}` (`docs/services/admin/users-list.md:59`), response `pagination{pageIndex,…}` (`docs/services/admin/audit-logs.md:55`), response with **no** pagination (`docs/services/admin/categories-list.md:37-48`) | §8.5 defines per-endpoint handling. Open question Q2 |
| C4 | Create/delete status codes | `docs/services/admin/broadcasts-create.md:7` ("create nên cần chốt `201`; API V2 hiện `200`"), `docs/services/admin/categories-delete.md:7` ("convention ưu tiên `204`; API V2 hiện `200 + message`"), `docs/services/subscription/admin-plan-create.md:9-10` (contract `201`, current `200`) | §11.8: accept any 2xx as success; do not branch UI on 200 vs 201 |
| C5 | `categories-list` query contract | `docs/services/admin/categories-list.md:15` (`page,pageSize,keyword,includeDeleted`) vs `docs/services/admin/categories-list.md:26` (`isActive` only) | §8 sends only `isActive`; record as Q3 |
| C6 | `username` vs `userName` | `docs/services/admin/dashboard.md:50,68` (`username`) vs `docs/services/admin/users-list.md:44`, `docs/services/admin/users-detail.md:40` (`userName`) | §11.3: read `userName ?? username`; record as Q4 |
| C7 | Admin dashboard "active users" semantics | `summary.activeUsersLast30Days` (`docs/API V2.md:2829`) vs backlog story "recent active users" with no contract (`temp/admin-rest-api-backlog-graph.md:48`) | Only the implemented counter is in scope |
| C8 | Verify command differs between the two AGENTS files | root `AGENTS.md` §6 says `npm run lint` / `npm run build`; `WIVI_fe/AGENTS.md` says `pnpm lint` / `pnpm build`; `WIVI_fe/pnpm-lock.yaml` exists | Use **pnpm** |
| C9 | `change-role.md` states `role` may arrive as query **or** body | `docs/services/admin/change-role.md:15,29-31` | Irrelevant while C2 stands |
| C10 | Product docs promise AI **API-key management**, the contract exposes no write path | `docs/user story.md:143` ("API key management with secure storage") and `docs/overview.md:221` ("quản lý API key") vs PATCH body limited to `modelName, systemPrompt, temperature, maxTokens, isEnabled` (`docs/API V2.md:2957-2962`) — no `apiKey` field | **No key-editing UI.** Render `apiKeyMasked` read-only (`docs/API V2.md:2945,2979-2981`). Key rotation is `NOT_DEFINED` at the API layer — §8.3 and Q14. Do not add an `apiKey` field to the PATCH body |
| C11 | User-management list is scoped to `User`-role accounts only | `docs/API V2.md:2592` ("`GET /api/v1/admin/users` chỉ trả account role `User`") vs the generic name "users" | The screen is a **consumer directory**, not an account directory. Admin accounts are not listable. Stated in §5.1, §6.3 and §8.1; admin-account visibility is Q15 |

---

## 5. User Roles and Permissions

### 5.1 Permitted roles

| Portal area | `Admin` | `User` | Anonymous |
| --- | --- | --- | --- |
| Login screen | Yes | Yes (login succeeds, then rejected at the portal gate) | Yes |
| All six portal routes | Yes | **No** | **No** |
| Any `/api/v1/admin/**` call | Yes | No (403) | No (401) |

`FACT`: backend rejects by role via global guards (`docs/conventions.md:116-123`; `docs/API V2.md:3296`).

`FACT`: the user-management screen is **additionally scoped by the backend**. `GET /api/v1/admin/users` returns only accounts whose role is `User` (`docs/API V2.md:2592`), so admin accounts are not discoverable from any in-scope screen (C11). No in-scope endpoint exposes role editing (C2).

### 5.2 Protected routes and screens

Every route in §7 is protected **except** the login route. Enforcement is layered:

| Layer | Mechanism | Authority |
| --- | --- | --- |
| Backend | Global `JwtAuthGuard` (401) + `RolesGuard` against `@Roles('Admin')` (403) | **Authoritative** |
| Frontend | Route guard redirecting unauthenticated users to login; role gate blocking non-`Admin` from rendering the shell | **UX only** |

> Frontend role checks are UX controls. They must never be treated as a substitute for backend authorization: the client can be modified, so every admin call is re-authorized server-side. Do not gate anything on a value the client could forge — the gate is for navigation hygiene and honest error messaging.

### 5.3 Navigation visibility

| Element | `Admin` | `User` | Anonymous |
| --- | --- | --- | --- |
| Sidebar + TopNav shell | Rendered | Not rendered | Not rendered |
| Nav items | All | — | — |
| Logout control | Visible | — | — |

`FACT`: `Sidebar.tsx:7-14` hardcodes six items with no visibility logic — visibility logic must be added. `TopNav.tsx:38-46` hardcodes the operator identity ("Nicholas Gray") and must be replaced by the authenticated identity from the session.

### 5.4 Unauthorized and unauthenticated behaviour

| Situation | Required behaviour |
| --- | --- |
| No token / expired token → navigate to a portal route | Redirect to login, preserve the attempted path, show no error banner on first arrival |
| `401` from any admin call | Clear session, redirect to login, show "Phiên đăng nhập đã hết hạn" — attempt a single refresh first (§10.6) |
| `403` from any admin call | Do **not** log out. Render an explicit "Không có quyền truy cập" state, keep the session |
| `User` logs in successfully (login returns 200 with `role = User`) | Do not render the shell. Show "Tài khoản này không có quyền truy cập trang quản trị" and offer logout |
| Login returns `401` | Inline credential error, no redirect |

---

## 6. User Flows

### 6.1 Admin sign-in → portal

1. Entry: any portal URL while unauthenticated, or explicit "Đăng nhập".
2. `POST /api/v1/auth/login` with `{ email, password }` (`FACT`: `docs/API V2.md:79-87`).
3. On 200: response contains `id, username, firstName, lastName, email, role, isOnboardingCompleted, accessToken, refreshToken` (`FACT`: `docs/API V2.md:94-104`).
4. If `role !== 'Admin'` → reject (see 5.4). Else persist tokens + identity.
5. Redirect to the originally requested path, or `/`.

Failure paths:

| Condition | Handling |
| --- | --- |
| Empty email/password | Client-side validation, inline field errors, no request |
| 401 `UNAUTHORIZED` | Inline "Email hoặc mật khẩu không đúng" |
| 422 `VALIDATION_FAILED` | Map `field` from the error envelope to the field | 
| 400 `BAD_REQUEST` | Generic form error |
| 5xx | "Hệ thống đang lỗi, vui lòng thử lại" + retry affordance |
| Network failure | Distinct offline message, retry button, no token write |

### 6.2 Dashboard load

1. Entry: `/` after sign-in.
2. `GET /api/v1/admin/dashboard` → `summary` (9 counters) + `recentUsers[]` + `recentTransactions[]` (`FACT`: `docs/API V2.md:2820-2874`).
3. Render counters and both lists.
4. Empty: `recentUsers`/`recentTransactions` may be empty arrays → per-card empty text, counters still render.
5. 401 → §5.4. 403 → forbidden state. 5xx/network → error state with retry, counters show `—` rather than `0` (a failed load must not read as "zero users").

### 6.3 User list → filter/search → detail → ban/unban

1. Entry: `/members`.
2. `GET /api/v1/admin/users?pageIndex=&pageSize=&status=&keyword=` (`FACT`: `docs/services/admin/users-list.md:26-32`).
   `FACT`: this endpoint returns **only accounts with role `User`** (`docs/API V2.md:2592`). The screen is a consumer directory: do not add a role filter, an "Admin" badge, or an expectation of ever seeing an operator account (C11).
3. Row action "Chi tiết" → `GET /api/v1/admin/users/{id}` (`FACT`: `docs/API V2.md:2486-2521`).
4. "Khóa"/"Mở khóa" → confirmation dialog (reason optional) → `PATCH /api/v1/admin/users/{id}/status` with `{ status: 'Banned'|'Active', statusReason }` (`FACT`: `docs/API V2.md:2523-2560`).
5. On success: show confirmation, refetch the current page, and refetch the row's detail if the drawer is open.

Failure paths:

| Condition | Handling |
| --- | --- |
| `keyword` empty | Send no `keyword` param rather than an empty string |
| `status` = all | Send no `status` param |
| 404 on detail / on status update (record deleted) | "Không tìm thấy người dùng", refetch list, close drawer |
| `pageIndex` beyond last page after a mutation removed rows | Clamp to last available page and refetch |
| 422 | Field-level error on `statusReason` if echoed via `field` |
| 409 | "Trạng thái đã thay đổi, vui lòng tải lại" then refetch |
| Double-click on confirm | Submit disabled while in flight (§11.4) |

### 6.4 Default categories CRUD

1. Entry: the categories section of the portal (§7).
2. List: `GET /api/v1/admin/categories?isActive=` (`FACT`: `docs/API V2.md:2598-2630`).
3. Create: `POST` with `{ name, icon, color, order }` (`FACT`: `docs/API V2.md:2632-2646`).
4. Update: `PATCH /{id}` with any of `{ name, icon, color, order, isActive }` (`FACT`: `docs/API V2.md:2664-2698`).
5. Delete: `DELETE /{id}` (`FACT`: `docs/API V2.md:2700-2723`).

Failure paths: duplicate/invalid name → 422 (`field` mapping); delete of a category still referenced by user data → treat any 409 as "Không thể xoá: danh mục đang được sử dụng" and refetch; response body on delete may be `{message}` **or** empty — do not parse it as a resource.

### 6.5 Broadcast history and compose

1. Entry: the broadcasts screen.
2. List: `GET /api/v1/admin/broadcasts?pageIndex=&pageSize=&status=` (`FACT`: `docs/API V2.md:2762-2795`).
3. Compose: `POST` with `{ title, body, targetAudience, scheduledAt }` (`FACT`: `docs/API V2.md:2727-2760`).
4. Response includes `status`, `targetCount`, `deliveredCount` — those are **fan-out results**, so immediately after create they may be `0`/queued rather than final (`FACT`: `docs/services/admin/broadcasts-create.md:64-65`, `docs/conventions.md:174`).

Failure paths: `title`/`body` empty → blocked client-side; `scheduledAt` in the past → client-side rejection; 422 → field errors; success → confirmation plus a refetch of the history list; do **not** display `deliveredCount` as a final delivery guarantee.

### 6.6 Audit log review

1. Entry: audit-log view (§7).
2. `GET /api/v1/admin/audit-logs?adminId=&actionType=&entityType=&fromDate=&toDate=&page=&pageSize=` (`FACT`: `docs/API V2.md:2877-2895`).
3. Response `items[]` + `pagination{pageIndex,pageSize,totalCount,totalPages}` (`FACT`: `docs/API V2.md:2899-2921`).
4. Filters are optional; any subset may be sent. `fromDate`/`toDate` are inclusive datetimes.
5. Empty → "Không có bản ghi nào khớp bộ lọc" and a clear-filters action.

### 6.7 AI settings read → edit

1. Entry: AI settings screen.
2. `GET /api/v1/admin/ai-settings` → `modelName, systemPrompt, temperature, maxTokens, isEnabled, apiKeyMasked` (`FACT`: `docs/API V2.md:2936-2948`).
3. Edit and submit `PATCH` with any subset of `{ modelName, systemPrompt, temperature, maxTokens, isEnabled }` (`FACT`: `docs/API V2.md:2954-2965`).
4. Response is only `{ modelName, isEnabled }` (`FACT`: `docs/API V2.md:2969-2976`) → after a successful patch, **refetch** to display the authoritative full settings. Never patch the local form from the PATCH response.
5. `apiKeyMasked` is read-only in the UI and must never be sent in the request (`FACT`: `docs/API V2.md:2979-2981`).

### 6.8 Subscription plans list → create → edit

1. Entry: plans screen.
2. List: `GET /api/v1/admin/subscriptions/plans` (`FACT`: `docs/API V2.md:3298-3331`).
3. Create: `POST` with `{ code, name, description, price, billingCycle, features, isPopular }` (`FACT`: `docs/API V2.md:3339-3352`). `billingCycle` here is `monthly|yearly|lifetime` — **`free` is not allowed** (`FACT`: `docs/services/subscription/admin-plan-create.md:36,65`).
4. Edit: `PATCH /{id}` with `{ name, description, price, features, isActive, isPopular }` — `code` is not editable (`FACT`: `docs/API V2.md:3383-3391`).

Failure paths: duplicate `code` → 409 "Mã gói đã tồn tại" (also documented as 422 in `docs/services/subscription/admin-plan-create.md:75-76`, so treat both as a code-conflict message — C4-adjacent drift); invalid price → 422; the list endpoint is documented to return inactive plans too, but the doc's own checklist leaves that unchecked (`docs/services/subscription/admin-plans-list.md:80`) → do not assume inactive rows appear; render whatever is returned.

### 6.9 Logout

1. Action: logout control.
2. `POST /api/v1/auth/logout` — requires a valid Bearer token (`FACT`: `docs/API V2.md:108-137`).
3. Clear local session regardless of the response, then redirect to login.

Failure path: if logout returns 401 (token already dead), still clear locally and redirect. Never leave a stale token in storage because the server rejected the logout.

---

## 7. Screen and Route Plan

`FACT`: routes are declared inline at `WIVI_fe/src/App.tsx:22-29`; the sidebar list at `WIVI_fe/src/components/Sidebar.tsx:7-14` is exactly in sync with them. No 404 route and no route guard exist today.

The table below assigns every in-scope capability to a route or a section of an existing route. Placements for capabilities that had no source-defined home are **defaults assigned in this brief** (see the second table below); only `/activity` and the fallback route remain open because no admin API exists to back them (§15 Q5).

| Route | Screen | Allowed Role | Purpose | Main Actions | Required Data | Current Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | `Login` | Anonymous (public) | Authenticate an operator and establish the session | Submit credentials, show auth errors | `POST /auth/login` | **Does not exist** (`App.tsx:22-29`). **Decision: create it** — required by G1 and Phase 2. Not an open question |
| `/` | `Overview` (existing) | Admin | Operational dashboard from real metrics | Refresh; navigate to recent users | `GET /admin/dashboard` | `EXISTS` (`App.tsx:23`) — content must be replaced; currently 5 hardcoded constant blocks (`Overview.tsx:5,14,23,30,37`) |
| `/members` | `Members` (existing) | Admin | User management: list, filter, search, detail, ban/unban | Search, status filter, paginate, open detail, change status | `GET /admin/users`, `GET /admin/users/{id}`, `PATCH /admin/users/{id}/status` | `EXISTS` (`App.tsx:24`) — currently mock `mockMembers` (`Members.tsx:20-126`); filters are client-side `useMemo` (`:134-145`) |
| `/activity` | `Activity` (existing) | Admin | Transaction/subscription log | Tabs, search | **None available** — no admin transaction endpoint exists | `EXISTS` but capability is `BACKLOG` → see §3.2. Recommend keeping the route but replacing mock content with an explicit "chưa có API" state, or hide the nav item. Decision in Q5 |
| `/intelligence` | `Intelligence` (existing) | Admin | AI system area: AI settings **+ audit logs** | Read/edit AI settings; browse audit logs | `GET/PATCH /admin/ai-settings`, `GET /admin/audit-logs` | `EXISTS` (`App.tsx:26`); currently shows unrelated mock analytics (`Intelligence.tsx:5-32`) → replace with the two decided sections |
| `/campaigns` | `Campaigns` (existing) | Admin | Broadcast compose + history | Compose, schedule, list, filter by status | `GET/POST /admin/broadcasts` | `EXISTS` (`App.tsx:27`) — currently mock campaigns + local-only rules engine (`Campaigns.tsx:24-62`) |
| `/configuration` | `Configuration` (existing) | Admin | System configuration: subscription plans **+ default categories** | Plan list/create/edit; category list/create/edit/delete | `GET/POST/PATCH /admin/subscriptions/plans`, `GET/POST/PATCH/DELETE /admin/categories` | `EXISTS` (`App.tsx:28`) — currently 19 local hooks with `alert`-only save (`Configuration.tsx:5-33`) |
| `/audit-logs` → **section on `/intelligence`** | `Intelligence` § audit-logs | Admin | Audit trail with filters | Filter by admin/action/entity/date, paginate | `GET /admin/audit-logs` | **Placement default assigned** (owner override via Q1). Route itself does not exist; implement as a section inside the AI/intelligence screen to avoid inventing a nav entry |
| `*` (fallback) | `NotFound` | Admin | Handle unknown paths | Return to `/` | none | `UNVERIFIED` — no fallback route exists; adding one is a non-breaking shell improvement |

**Navigation placement decisions (defaults assigned, owner may override — Q1).** No source defines where the categories and audit-log capabilities live, so this brief assigns defaults to keep the work decision-complete:

| Capability | Assigned placement | Rationale |
| --- | --- | --- |
| Default categories | **Section inside `/configuration`** | `/configuration` already means "system configuration" (`Sidebar.tsx:13`); categories are global defaults, not per-user data |
| AI settings | **`/intelligence`** (already the AI area) | `/intelligence` is labelled "Hệ thống AI & Sepay" (`Sidebar.tsx:11`) |
| Audit logs | **Section inside `/intelligence`** alongside AI settings | Avoids inventing a seventh nav entry; both are operator-facing system views |
| Subscription plans | **`/configuration`** | Pricing is configuration |

Override cost is low: each capability is a standalone screen block, so moving one between routes changes only the route table and the sidebar array. Only Q5 (`/activity`) remains genuinely blocking, because no admin transaction API exists at all.

### 7.1 Navigation changes required

| Item | Change | Note |
| --- | --- | --- |
| Sidebar | Add a nav entry only if the owner moves a capability to its own route (§15 Q1); add role-based visibility | `Sidebar.tsx:7-14` |
| Sidebar active state | Add `end` on the `/` NavLink so it does not match every child path | `Sidebar.tsx:34` — `end` is not set today (`INFERENCE`: with React Router 7 a bare `/` NavLink matches partially) |
| TopNav | Replace hardcoded identity with session identity; wire or remove the search box, the ticker and the bell | `TopNav.tsx:14-46` — search input is uncontrolled with no handler, bell has no handler |
| TopNav | Add a logout control | Not present today |

### 7.2 Data field mapping (response DTO → UI)

Decision-complete mapping of every response field of the in-scope endpoints to a UI element. Vietnamese strings are the required copy (see Reading notes). Where a field is absent from the UI it says so explicitly, so nothing is left to judgement.

**Users list** — `GET /admin/users` → `data[]` (`docs/API V2.md:2461-2474`)

| Field | UI element | Format / notes |
| --- | --- | --- |
| `userName` (tolerant: `username`) | Column "Tài khoản" | `font-mono`; `—` when empty |
| `firstName` + `lastName` | Column "Họ tên" (primary cell) | Joined with one space; if both empty fall back to `userName` |
| `email` | Secondary line under the name | — |
| `avatarUrl` | Leading 32px avatar | When null render initials from the name |
| `status` | Column "Trạng thái" | `Badge`: `Active` → `success` ("Hoạt động"), `Banned` → `danger` ("Đã khóa") |
| `statusReason` | Secondary text beside the status badge | Only when `status = Banned`; otherwise `—` |
| `isOnboardingCompleted` | Column "Onboarding" | `Badge`: `true` → `success` ("Xong"), `false` → `neutral` ("Chưa") |
| `createdAt` | Column "Ngày tạo" | `Asia/Ho_Chi_Minh`, `DD/MM/YYYY HH:mm` |
| `lastLoginAt` | Column "Đăng nhập gần nhất" | Same format; `—` when null |
| `preferredCurrency`, `phone` | **Not columns** | Displayed in the detail view only |
| `id` | Row key + detail link | Also shown in the detail header in `font-mono` |
| pagination | Footer "x–y / totalCount" | Reads `pagination.page ?? pagination.pageIndex` (§8.5) |

**User detail** — `GET /admin/users/{id}` (`docs/API V2.md:2500-2521`): same fields as a definition list, adding `phone`, `preferredCurrency` and full `statusReason`. Actions: "Khóa tài khoản" / "Mở khóa tài khoản". Reminder: this endpoint returns `User`-role accounts only (C11) — no role control belongs here.

**Categories** — `GET /admin/categories` → `data[]` (`docs/API V2.md:2619-2626`)

| Field | UI element | Format |
| --- | --- | --- |
| `name` | Column "Tên danh mục" | primary |
| `icon` | Leading glyph | Render the stored icon key as-is; do not map it to a local icon set |
| `color` | Swatch dot beside the name | Use the stored value directly; fall back to `muted-light` when null |
| `order` | Column "Thứ tự" | List sorted ascending by this value |
| `isActive` | Column "Kích hoạt" | `Badge`: `true` → `success`, `false` → `neutral`; editable inline via PATCH |
| `id` | Row key; used in update/delete calls | not displayed |

**Broadcasts** — `GET /admin/broadcasts` → `items[]` (`docs/API V2.md:2786-2794`)

| Field | UI element | Format |
| --- | --- | --- |
| `title` | Column "Tiêu đề" | primary, truncated with tooltip |
| `body` | Column "Nội dung" | clamped to 2 lines with tooltip |
| `targetAudience` | Column "Đối tượng" | raw string (value domain undefined — Q16) |
| `status` | Column "Trạng thái" | `Badge` on `Broadcast.status` (`docs/conventions.md:145`): `Queued` → neutral, `Sent` → success, `Failed` → danger, `Cancelled` → neutral |
| `scheduledAt` | Column "Hẹn gửi" | `—` when null (immediate send) |
| `sentAt` | Column "Đã gửi" | `—` when null |
| `targetCount` | Column "Đối tượng (số)" | mono, right-aligned |
| `deliveredCount` | Column "Đã nhận" | mono, right-aligned; render as `deliveredCount / targetCount` |
| `id` | Row key | not displayed |

**Audit logs** — `GET /admin/audit-logs` → `items[]` (`docs/API V2.md:2904-2911`)

| Field | UI element | Format |
| --- | --- | --- |
| `createdAt` | Column "Thời điểm" | `Asia/Ho_Chi_Minh` |
| `adminUsername` | Column "Quản trị viên" | `font-mono` |
| `actionType` | Column "Hành động" | `Badge tone="neutral"`; also a filter |
| `entityType` | Column "Đối tượng" | `Badge tone="info"`; also a filter |
| `description` | Column "Mô tả" | wraps, never truncated |
| `id` | Row key | not displayed |

**Subscription plans** — `GET /admin/subscriptions/plans` → `data[]` (`docs/API V2.md:3319-3327`)

| Field | UI element | Format |
| --- | --- | --- |
| `name` | Column "Tên gói" | primary |
| `code` | Column "Mã" | `font-mono`; read-only in create/edit forms |
| `price` | Column "Giá" | via `src/lib/format.ts`; `0` renders "Miễn phí" |
| `currency` | Suffix of the price | ISO-4217 exactly as returned |
| `billingCycle` | Column "Chu kỳ" | `free` → "Miễn phí", `monthly` → "Tháng", `yearly` → "Năm", `lifetime` → "Vĩnh viễn" |
| `features` | Column "Tính năng" | count plus first item inline; full list in the detail dialog |
| `isActive` | Column "Kích hoạt" | `Badge`: `true` → success, `false` → neutral |
| `id` | Row key + PATCH path | not displayed |

**Dashboard** — `GET /admin/dashboard` (`docs/API V2.md:2820-2874`). Nine `StatCard`s in this order, every value an `int` formatted by a shared compact-number helper:

| `summary` key | Label | Tone |
| --- | --- | --- |
| `totalUsers` | Tổng thành viên | primary |
| `newUsersThisMonth` | Mới trong tháng | primary |
| `activeUsersLast30Days` | Hoạt động 30 ngày | success |
| `bannedUsers` | Đang bị khóa | danger |
| `totalTransactions` | Tổng giao dịch | primary |
| `transactionsThisMonth` | Giao dịch tháng này | primary |
| `totalJars` | Tổng số hũ | info |
| `activeGoals` | Mục tiêu đang chạy | success |
| `pendingImportJobs` | Import đang chờ | warning |

`recentUsers[]` (`docs/API V2.md:2839-2847`): columns name (`firstName` + `lastName`), `email`, `status` badge, `lastLoginAt`. This nested payload uses `username` (lowercase `n`) while the users endpoints use `userName` — read tolerantly (C6).
`recentTransactions[]` (`docs/API V2.md:2851-2871`): columns `transactionDate`, `type` badge (`Income` → success, `Expense` → danger), `transactionsAmount` via the money formatter (field is spelled `transactionsAmount` verbatim — do not rename), `note`, `category.name`, `financialAccount.name`, and the user's name from the nested `user` object.

---

## 8. Backend Integration Matrix

All paths below are `/api/v1/...` and require `Authorization: Bearer <accessToken>` with an `Admin` role token unless marked Public (`FACT`: `docs/conventions.md:11,20,118-123`).

### 8.1 Core admin capabilities

| UI Capability | Method | Endpoint | API Status | Request Source | Response Source | Frontend Handling |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard metrics | `GET` | `/admin/dashboard` | `AVAILABLE` | no params (`docs/API V2.md:2813-2818`) | `docs/API V2.md:2820-2874` | Fetch on mount + manual refresh; 9 counters + 2 lists per §7.2; per-card empty states |
| Users list — **role `User` accounts only** (C11) | `GET` | `/admin/users` | `AVAILABLE_WITH_DRIFT` | `pageIndex`, `pageSize`, `status`, `keyword` (`docs/services/admin/users-list.md:26-32`) | `{data[], pagination{page,pageSize,totalCount,totalPages}}` (`docs/services/admin/users-list.md:42-64`) | Server-side pagination/filter/search; debounce `keyword`; columns per §7.2; tolerant envelope reader (§8.5). Never expect admin accounts |
| User detail | `GET` | `/admin/users/{id}` | `AVAILABLE` | path `id` | `docs/API V2.md:2500-2521` | Drawer/detail view; fields per §7.2; tolerant `userName`/`username` read |
| User status | `PATCH` | `/admin/users/{id}/status` | `AVAILABLE` | `{status: 'Active'\|'Banned', statusReason}` (`docs/API V2.md:2533-2536`) | user DTO (`docs/API V2.md:2542-2560`) | Confirm dialog; refetch list; explicit target status (never a blind toggle) |
| Categories list | `GET` | `/admin/categories` | `AVAILABLE_WITH_DRIFT` | `isActive` only (§8.5, C5) | `{data[]}` — **no pagination** in the documented example (`docs/API V2.md:2612-2630`) | Render as a non-paginated table; do not render pagination controls |
| Category create | `POST` | `/admin/categories` | `AVAILABLE_WITH_DRIFT` | `{name, icon, color, order}` (`docs/API V2.md:2639-2644`) | created category (`docs/API V2.md:2650-2661`) | Accept any 2xx (C4) |
| Category update | `PATCH` | `/admin/categories/{id}` | `AVAILABLE` | `{name?,icon?,color?,order?,isActive?}` (`docs/API V2.md:2674-2680`) | updated category (`docs/API V2.md:2686-2697`) | Inline edit form |
| Category delete | `DELETE` | `/admin/categories/{id}` | `AVAILABLE_WITH_DRIFT` | path `id` | `{message}` or empty (`docs/API V2.md:2719-2722`) | Confirm dialog; accept any 2xx; never parse body as resource |
| Broadcasts list | `GET` | `/admin/broadcasts` | `AVAILABLE_WITH_DRIFT` | `pageIndex`, `pageSize`, `status` (`docs/API V2.md:2769-2773`) | `{items[], pagination{pageIndex,…}}` (`docs/API V2.md:2783-2795`) | Paginated table; status filter; columns per §7.2; tolerate envelope variants |
| Broadcast create | `POST` | `/admin/broadcasts` | `AVAILABLE_WITH_DRIFT` | `{title, body, targetAudience, scheduledAt}` (`docs/API V2.md:2734-2739`) | `{id,…,status,targetCount,deliveredCount}` (`docs/API V2.md:2745-2758`) | Accept any 2xx; present counts as provisional; `targetAudience` domain undefined (Q16) |
| Audit logs | `GET` | `/admin/audit-logs` | `AVAILABLE_WITH_DRIFT` | `adminId, actionType, entityType, fromDate, toDate, page, pageSize` (`docs/API V2.md:2884-2891`) | `{items[], pagination{pageIndex,…}}` (`docs/API V2.md:2903-2918`) | Filter bar + paginated list; columns per §7.2; request uses `page`, response uses `pageIndex` |
| AI settings read | `GET` | `/admin/ai-settings` | `AVAILABLE` | none (`docs/API V2.md:2928-2931`) | `docs/API V2.md:2936-2948` | Show `apiKeyMasked` read-only; no key write path exists (C10) |
| AI settings update | `PATCH` | `/admin/ai-settings` | `AVAILABLE` | subset of `modelName, systemPrompt, temperature, maxTokens, isEnabled` (`docs/API V2.md:2954-2963`) — **no `apiKey` field** | `{modelName, isEnabled}` only (`docs/API V2.md:2969-2976`) | Send only changed fields; **refetch** after success; never send a key |
| Plans list | `GET` | `/admin/subscriptions/plans` | `AVAILABLE` | none (`docs/API V2.md:3304-3308`) | `{data[], each with currency + isActive}` (`docs/API V2.md:3313-3330`) | Non-paginated table (no pagination documented); columns per §7.2 |
| Plan create | `POST` | `/admin/subscriptions/plans` | `AVAILABLE_WITH_DRIFT` | `docs/API V2.md:3342-3349` | `docs/API V2.md:3356-3367` | Reject `free` in the UI; accept any 2xx; surface 409/422 as duplicate code |
| Plan update | `PATCH` | `/admin/subscriptions/plans/{id}` | `AVAILABLE` | `docs/API V2.md:3383-3389` | `docs/API V2.md:3397-3407` | `code` read-only |

### 8.2 Authentication

| UI Capability | Method | Endpoint | API Status | Request Source | Response Source | Frontend Handling |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `POST` | `/auth/login` | `AVAILABLE` (Public) | `{email, password}` (`docs/API V2.md:79-87`) | `{…, role, accessToken, refreshToken}` (`docs/API V2.md:94-104`) | Persist session; gate on `role === 'Admin'` |
| Refresh | `POST` | `/auth/refresh` | `AVAILABLE` (Public) | `{refreshToken}` (`docs/API V2.md:238-244`) | `{accessToken, refreshToken}` — tokens only, **no identity** (`docs/API V2.md:249-256`) | Single-flight retry on 401 (§10.6); replace both tokens; keep the cached identity (§10.4) |
| Logout | `POST` | `/auth/logout` | `AVAILABLE` (Bearer) | none (`docs/API V2.md:110-117`) | `{message}` (`docs/API V2.md:121-127`) | Clear locally regardless of outcome |

### 8.3 Explicitly unavailable

| UI Capability | Status | Evidence | Consequence |
| --- | --- | --- | --- |
| Admin transaction log / list / detail | `NOT_DEFINED` | Absent from `docs/API V2.md` §6 and from both API graphs | `/activity` cannot be wired (Q5) |
| Change account role | `NOT_DEFINED` | `temp/admin-rest-api-implemented-graph.md:44`; no route in `src/modules/**` (C2) | No role-management UI |
| Dashboard date-range / comparison / time series / top categories | `BACKLOG` | `temp/admin-rest-api-backlog-graph.md:40-44` | Dashboard is a snapshot only |
| OCR/import job review, integration error rates | `BACKLOG` | `temp/admin-rest-api-backlog-graph.md:45-46` | Not in portal |
| Engagement, retention, export, moderation analytics | `BACKLOG` | `temp/admin-rest-api-backlog-graph.md:47-52` | Not in portal |
| Jar templates, insight rules | `BACKLOG` | `temp/admin-rest-api-backlog-graph.md:38-39` | Not in portal |
| Admin subscription permission hardening | `AVAILABLE` (not a gap) | Source has `@Roles('Admin')`; `DRIFT-034` Resolved | No UI warning needed (C1) |
| AI **API-key rotation** | `NOT_DEFINED` | `docs/API V2.md:2957-2962` (no `apiKey` in PATCH); story asks for it (`docs/user story.md:143`) | No key-editing control. `apiKeyMasked` read-only only (C10, Q14) |

### 8.4 Endpoint status classification summary

| Status | Endpoints |
| --- | --- |
| `AVAILABLE` | `GET /admin/dashboard`, `GET /admin/users/{id}`, `PATCH /admin/categories/{id}`, `GET /admin/ai-settings`, `PATCH /admin/ai-settings`, `GET /admin/subscriptions/plans`, `PATCH /admin/subscriptions/plans/{id}`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| `AVAILABLE_WITH_DRIFT` | `GET /admin/users` (envelope, casing), `PATCH /admin/users/{id}/status`, `GET /admin/categories` (query + no pagination), `POST /admin/categories` (status code), `DELETE /admin/categories/{id}` (status code), `GET /admin/broadcasts` (legacy envelope), `POST /admin/broadcasts` (status code), `GET /admin/audit-logs` (request `page` vs response `pageIndex`), `POST /admin/subscriptions/plans` (201 vs 200) |
| `PARTIAL` | Audit **writing** coverage — the read API exists but the docs explicitly leave it unverified that every sensitive action writes a record (`temp/admin-rest-api-implemented-graph.md:46`); broadcast `deliveredCount`/`status` consistency (`docs/services/admin/broadcasts-create.md:93`) |
| `BACKLOG` | All rows in `temp/admin-rest-api-backlog-graph.md:38-52` |
| `NOT_DEFINED` | `PATCH /api/v1/change-role/{accountId}` (docs-only, `docs/API V2.md:2563`); any admin transaction endpoint; any write path for the AI provider API key (C10) |

### 8.5 Pagination / envelope handling (mandatory, because of `DRIFT-005`)

Three response shapes are documented across in-scope endpoints. The client must not hardcode one.

| Endpoint | Request params | Response envelope | Client rule |
| --- | --- | --- | --- |
| `/admin/users` | `pageIndex`, `pageSize` | `data[]` + `pagination{page,…}` | Send `pageIndex`; read `pagination.page ?? pagination.pageIndex`; read `data ?? items` |
| `/admin/broadcasts` | `pageIndex`, `pageSize` | `items[]` + `pagination{pageIndex,…}` | Send `pageIndex`; read `items ?? data` |
| `/admin/audit-logs` | `page`, `pageSize` | `items[]` + `pagination{pageIndex,…}` | Send `page`; read `items ?? data` |
| `/admin/categories` | `isActive` | `data[]`, **no pagination** | No pagination UI |
| `/admin/subscriptions/plans` | none | `data[]`, **no pagination** | No pagination UI |

Implementation requirement: one shared list-response normaliser that accepts `items|data` and `page|pageIndex`, so a future doc fix does not require touching every screen. Log (dev-only) when the fallback branch is taken, so the drift is observable.

---

## 9. Component and Layout Plan

### 9.1 Composition

| Route | Composition |
| --- | --- |
| `/login` | Standalone centred card, no shell |
| All portal routes | Shell = `Sidebar` (240px, fixed) + right column = `TopNav` (56px) + scrollable `main` (24px padding). `FACT`: this shell already exists at `App.tsx:15-21` and is hardcoded for every path — refactor it into a layout element that conditionally wraps authenticated routes |
| `/` | `PageHeader` → 9 `StatCard`s → `SectionCard`(recent users) → `SectionCard`(recent transactions) |
| `/members` | `PageHeader` → `SectionCard`(filters + `DataTable` + pagination) → detail drawer |
| `/configuration` § categories | `PageHeader` → `SectionCard`(`DataTable` + create/edit dialog + delete confirm) — fields per §7.2 |
| `/campaigns` | `PageHeader` → `SectionCard`(compose form) → `SectionCard`(history `DataTable` + status filter + pagination) |
| `/intelligence` § audit logs | `PageHeader` → `SectionCard`(filter bar + `DataTable` + pagination) — fields per §7.2 |
| `/intelligence` § AI settings | `SectionCard`(settings form) with the masked-key field read-only; no key-write control (C10) |
| `/configuration` § plans | `SectionCard`(`DataTable`) + create/edit dialog — fields per §7.2 |

### 9.2 Reusable components

`FACT`: `WIVI_fe/src/components/` currently contains only `Sidebar.tsx` and `TopNav.tsx`, both zero-prop and each used exactly once. The kit named in `WIVI_fe/AGENTS.md` / `WIVI_fe/DESIGN_SYSTEM.md` does not exist. Build it.

| Component | Purpose | Ownership | Notes |
| --- | --- | --- | --- |
| `SectionCard` | Standard white panel with optional dot + uppercase title header | Shared | Replaces 27 hand-written card class strings |
| `StatCard` | Dashboard counter with label, value, delta tone | Shared | Bind to `summary` keys |
| `PageHeader` | Route title + subtitle + actions slot | Shared | Replaces the repeated `h-10` title block |
| `DataTable` | Generic table: columns, rows, sticky header, empty state | Shared | Server-driven pagination is a sibling, not built in |
| `Pagination` | Page/pageSize control with total count | Shared | Must adapt to §8.5 naming |
| `Badge` | Status/tone chip | Shared | Tones: neutral/primary/success/warning/danger/info/vip. Map `Active`→success, `Banned`→danger, broadcast `Queued`→neutral, `Sent`→success, `Failed`→danger, `Cancelled`→neutral |
| `Button` | primary/secondary/ghost/danger, sm/md, loading state | Shared | Loading state is required for all mutations |
| `SearchInput` | Debounced text input | Shared | Replaces the dead TopNav input |
| `Modal` / dialog | Compose + edit forms, confirmations | Shared | None exists today |
| `AlertModal` / `ConfirmDialog` | Destructive confirmations (ban, delete category) | Shared | Use the tone set from the design system |
| `Field` + `FormError` | Label, control, inline error | Shared | Needed for §11 |
| `EmptyState` | Icon + title + description + action | Shared | Four ad-hoc empty states exist today |
| `ErrorState` | Message + retry | Shared | Does not exist today |
| `LoadingState` | Skeleton/spinner | Shared | Does not exist today |
| `ForbiddenState` | 403 message | Shared | Distinct from auth failure |
| `AsyncBoundary` | Renders loading/error/empty/content for a request | Shared | Keeps pages declarative |
| `Toast` | Success/failure feedback replacing `alert()` | Shared | Today every mutation ends in `alert`/`confirm` |

### 9.3 Forms, tables, cards, filters, dialogs, pagination

| Concern | Decision |
| --- | --- |
| Forms | Controlled inputs with a single `useForm`-style local hook per form; no form library is added (nothing in the repo justifies one, and `WIVI_fe/AGENTS.md` does not name one) |
| Validation | Client-side for required fields and obvious ranges; server `422` `field` is authoritative and mapped back to the field |
| Tables | One `DataTable`; column definitions live in each screen |
| Filters | Local UI state → serialised into query params; the URL is the source of truth for list state (§10.5) |
| Dialogs | For compose/edit/confirm only; destructive actions require explicit confirmation with the target's identifier in the text |
| Pagination | Server-side everywhere except `/admin/categories` and `/admin/subscriptions/plans`, which are documented as non-paginated |

### 9.4 Local vs shared ownership

| Kind | Location | Rule |
| --- | --- | --- |
| Shared primitives | `src/components/ui/` | No business knowledge, no direct API calls |
| Layout/shell | `src/components/` (`Sidebar`, `TopNav`, new `AppLayout`) | Reads auth/session only |
| Screen-specific blocks | Inside the page file or `src/pages/<page>/` | May call hooks, never raw HTTP |
| Formatters | `src/lib/format.ts` | Single source for money/number/date display (`WIVI_fe/AGENTS.md` mandates this path) |

### 9.5 Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| `>= 1024px` | Sidebar visible, 24px page padding, 24px grid gap, multi-column KPI grid (3–4 per row) |
| `768–1023px` | Sidebar collapsible; KPI grid 2 per row; tables keep the first identifier column and allow horizontal scroll |
| `< 768px` | Sidebar becomes an overlay drawer; KPI grid 1 per row; tables scroll horizontally; dialogs become full-width sheets |

`FACT`: no responsive behaviour was verified in the existing pages beyond Tailwind's grid prefixes (e.g. `Members.tsx:158`); the above is the target, not the current state.

### 9.6 Accessibility requirements

1. Every form control has a programmatically associated label.
2. Dialog: focus moves in on open, is trapped, returns to the trigger on close; `Escape` closes non-destructive dialogs only.
3. Icon-only controls (bell, close, row actions) require `aria-label`.
4. Status is never conveyed by colour alone — pair the badge with text.
5. Table headers are real `<th>` with scope; sortable headers expose the sort state.
6. Loading and error regions use `role="status"` / `role="alert"` so screen readers announce state changes.
7. Keyboard: all mutations reachable without a pointer; visible focus ring using the `primary-ring` token.
8. Contrast: body text uses the `ink`/`body` tokens; do not place `muted-light` text on `surface-alt` for anything longer than a caption.

---

## 10. State and Data Flow

### 10.1 Server state

| Concern | Decision |
| --- | --- |
| Transport | One `fetch`-based client in `src/lib/api/` reading `import.meta.env.VITE_API_BASE_URL` (`FACT`: the variable exists at `WIVI_fe/.env:1` and is currently dead) |
| Base URL failure | If the variable is missing, fail fast with a clear startup error rather than defaulting silently |
| Typing | One `src/types/` module of endpoint DTOs derived from §8 shapes; no `any` |
| Query ownership | Thin per-domain modules (`adminUsers`, `adminCategories`, `adminBroadcasts`, `adminDashboard`, `adminAuditLogs`, `adminAiSettings`, `adminPlans`, `auth`) — no fetch calls inside components |
| Caching | No cache library. Each screen owns its request lifecycle via a small `useAsync`/`useResource` hook (loading, error, data, refetch). Justification: nothing in the repo establishes server-cache semantics, and the portal's data is operational (must be fresh), so refetch-on-action is preferred over caching |
| Refresh policy | Fetch on mount; explicit refetch after every successful mutation; manual refresh control on the dashboard |

### 10.2 Local UI state

Filters, pagination cursor, dialog open/close, form drafts, selected row. Owned by the screen. `FACT`: this matches current practice (`Members.tsx:129-131`, `Activity.tsx:43-44`, `Configuration.tsx:5-29`).

### 10.3 Shared application state

| Store | Contents | Justification |
| --- | --- | --- |
| `AuthContext` | session (identity, role), tokens, login/logout/refresh actions | Needed by the guard, the shell and the API client. Matches the mobile app's `AuthContext` pattern (`WVI/WIVI/src/context/AuthContext.tsx`), so the product keeps one mental model. No store library is added |

`FACT`: there is no global store today and no store dependency in `WIVI_fe/package.json:12-37`. `INFERENCE`: a single context is sufficient because the only cross-cutting state is the session; everything else is per-screen.

### 10.4 Token storage and session

| Concern | Decision |
| --- | --- |
| Storage | `localStorage` under one namespaced key, accessed only through a single `session` module (no scattered `localStorage` calls) |
| Threat note | `localStorage` is readable by any script on the origin; the XSS risk is accepted for this internal operations tool and must be recorded. If the owner requires stronger protection, move to httpOnly cookies — that is a backend-contract change and therefore an owner decision (Q8) |
| Contents | `accessToken`, `refreshToken`, minimal identity (`id`, `fullName`, `email`, `role`). Never store the password or any raw API key |
| Identity rebuild | `FACT`: there is **no admin `/me` endpoint** and `POST /api/v1/auth/refresh` returns only `accessToken` + `refreshToken` (`docs/API V2.md:249-256`). The login response is the **only** source of identity and role (`docs/API V2.md:94-104`), so the cached identity must persist across refreshes and app reloads. Do **not** rebuild it from `GET /api/v1/user/me`: that endpoint is `User`-policy, and its behaviour when called with an `Admin` token is `UNVERIFIED` |
| Expiry | No client-side expiry arithmetic. Treat every `401` as "try refresh once, else log out" |

### 10.5 Pagination and filter synchronisation

- List state (`page`, `pageSize`, `status`, `keyword`, date filters) is written to the URL search params, and the URL is the source of truth. Rationale: it makes filters shareable and survives refresh.
- Changing a filter resets to page 1.
- `keyword` is debounced (~350 ms); an in-flight request is aborted when a newer one starts.
- Unknown/invalid query params are ignored rather than throwing.
- Page size options: 20 (default), 50, 100 — 100 is the documented maximum (`docs/conventions.md:55`).

### 10.6 Loading, empty, success, error

| State | Rule |
| --- | --- |
| Loading | First load shows a skeleton sized to the expected content; subsequent refetches keep the previous content and show a subtle busy indicator (no layout jump) |
| Empty | Distinct from error: "Không có dữ liệu" for a naturally empty list; "Không tìm thấy kết quả khớp bộ lọc" when filters are active, with a clear-filters action |
| Success | Toast for mutations; silent for fetches; counters never flash `0` while unresolved |
| Error | Inline error region with the server's `message` when present, a friendly fallback otherwise, and a retry action |
| 401 | Refresh once → retry → on failure clear session and redirect (single-flight, so concurrent 401s trigger one refresh) |
| 403 | Forbidden state, session preserved |

### 10.7 Stale data

- After any mutation, refetch the affected list; do not patch the list from the mutation response, because response shapes differ from list shapes (e.g. AI settings PATCH returns only two fields).
- Detail drawers refetch on open rather than trusting the list row.
- Dashboard refetches on navigation to `/` (no cache), so operators do not act on a stale snapshot.
- If a mutation returns `404`/`409`, treat the local view as stale: refetch, then report.

### 10.8 Logout / expired session

1. Logout: call `POST /auth/logout`, clear the session, redirect to login, drop all in-memory screen state (unmount clears it).
2. Expired refresh: clear the session, redirect with a session-expired notice.
3. Role downgraded mid-session (owner flipped the account): the next admin call returns `403` → forbidden state; the client must not silently retry or re-login, and must not assume the role it saw at login.

---

## 11. Validation and Edge Cases

### 11.1 Invalid input

| Field | Rule | On failure |
| --- | --- | --- |
| Login email | Required. `Decision`: enforce an email shape client-side although the contract only says `string` (`docs/API V2.md:83`) | Inline error, no request |
| Login password | Required, non-empty | Inline error |
| User status reason | Optional; trim; cap at a documented maximum — `UNVERIFIED`: no max length is documented in the supplied files, so enforce a conservative client limit and surface server `422` | Inline error or server message |
| Category name | Required, non-empty after trim | Inline error |
| Category order | Integer `>= 0`; empty input must not silently become `0` | Inline error. `FACT`: today `Configuration.tsx` number inputs coerce with `Number(e.target.value)` and accept negatives/blank→0 |
| Category colour | `Decision`: validate as hex (`#RRGGBB`) because the contract only says `string \| null` (`docs/API V2.md:2641`), while the consuming app treats it as a colour (`INFERENCE`: `WVI/WIVI/src/screens/JarsScreen.tsx:525-534` curates hex values). `UNVERIFIED`: whether the backend stores an arbitrary string | Inline error |
| Broadcast title/body | Required after trim | Inline error |
| Broadcast `scheduledAt` | Must be a future instant; send ISO-8601 UTC | Inline error |
| Broadcast `targetAudience` | Required (`docs/API V2.md:2737`) but its **value domain is not documented anywhere** — `UNVERIFIED` | Until Q16 is answered: render a required free-text input, send the value verbatim, and do **not** invent an enum or a fixed audience list |
| AI `temperature` | Numeric within the provider's accepted range — `UNVERIFIED`: range not documented in supplied files | Clamp to the documented-by-provider range only after owner confirmation (Q6) |
| AI `maxTokens` | Positive integer | Inline error |
| Plan `code` | Required; format is only constrained to "unique" (`docs/services/subscription/admin-plan-create.md:32,64`) — do not invent a stricter pattern | Server `409`/`422` is authoritative |
| Plan `price` | Required decimal `>= 0`; integer VND presented without decimals for readability, but sent as a number | Inline error |
| Plan `billingCycle` | Required, one of `monthly`,`yearly`,`lifetime` — **never** `free` | Dropdown constrained |

### 11.2 Missing data

- Nullable list fields (`phone`, `avatarUrl`, `statusReason`, `lastLoginAt`, `scheduledAt`, `sentAt`, `apiKeyMasked`) render an explicit placeholder (`—`), never `null`/`undefined`.
- `avatarUrl` absent → initials fallback.
- Sub-objects on dashboard `recentTransactions` (`user`, `financialAccount`, `category`) may be null in principle — render defensively and never crash the row.

### 11.3 Partial API responses

- Read `userName ?? username` (C6) until Q4 is answered.
- Accept `items` or `data`; accept `pagination.page` or `pagination.pageIndex` (§8.5).
- If a counter key is missing from `summary`, render `—` rather than `0`.
- The AI-settings PATCH response is intentionally partial: do not treat it as the new state (§6.7).

### 11.4 Duplicate submissions

- Every mutating control disables itself while in flight and shows a busy state.
- Confirm dialogs cannot be confirmed twice (guard on the pending flag, not just the button).
- After success the dialog closes; the list refetch is the single source of truth.
- No client-side retry of non-idempotent POSTs. `FACT`: none of the in-scope admin endpoints documents an idempotency contract (`docs/conventions.md:188-192` covers jar allocate, import confirm and SePay only), so an automatic retry could double-create a broadcast or a category. A failed create must be retried **by the operator**, with the form preserved.

### 11.5 Slow requests

- Show the loading state after a short delay (~150–200 ms) to avoid flashing on fast responses.
- Requests have no client timeout by default; add a generous timeout so a hung request eventually surfaces as an error rather than an infinite spinner.
- Abort in-flight list requests when filters change or the screen unmounts.

### 11.6 Permission changes during a session

- On `403`: forbidden state, no logout, no automatic retry loop.
- On `401`: one refresh attempt, then logout.
- Reason text must distinguish "not allowed" from "session expired" — operators must know which happened.

### 11.7 Deleted or unavailable records

| Case | Handling |
| --- | --- |
| Detail `404` | "Không tìm thấy người dùng", close drawer, refetch list |
| Status update `404` | Same, then refetch |
| Category delete `404` | "Danh mục không còn tồn tại", refetch |
| Plan update `404` | "Gói không còn tồn tại", refetch |
| Record vanished between list and action | Never assume the list is current; the refetch is mandatory |

### 11.8 Unexpected backend errors

- Map `code` from the error envelope (`VALIDATION_FAILED`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR` — `docs/conventions.md:104-112`) to a message; fall back to `message`, then to a generic string.
- Success is **any 2xx**: because of C4/`DRIFT-011`, do not branch on `200` vs `201`, and treat `200` or `204` as success for deletes.
- Non-JSON error bodies (proxy/gateway failures) must not throw; degrade to a generic error with the status code shown.
- Never surface a raw stack trace, token or provider secret in the UI.

---

## 12. Delivery Plan

Each phase is independently mergeable and ends in a verifiable state. `pnpm lint && pnpm build` must pass at the end of every phase.

**Mapping to the mandated seven-phase sequence.** This plan keeps the same seven required stages and adds one extra stage (Phase 2, authentication) because the portal currently has no session at all, which the required sequence implicitly assumes:

| Mandated stage | This plan |
| --- | --- |
| 1. Foundation and types | **Phase 0** |
| 2. API integration | **Phase 1** |
| — (not in the mandated list) | **Phase 2** — authentication and the shell, required because no auth exists today |
| 3. Core screens and navigation | **Phase 3** |
| 4. Forms and user actions | **Phase 4** |
| 5. Error, loading, and empty states | **Phase 5** |
| 6. Permission handling | **Phase 6** |
| 7. Tests and final verification | **Phase 7** |

No mandated stage is dropped; Phase 2 is an addition, not a renumbering of the others.

### Phase 0 — Foundation and types

**Deliverables:** `src/lib/api/` client (base URL, auth header injection, error normalisation, 401 hook), `src/types/` DTOs for §8, `src/lib/format.ts` (money/number/date), list-response normaliser (§8.5), `AuthContext` + session module, `AppLayout` split out of `App.tsx`, test tooling installed.
**Dependencies:** none. **Acceptance:** `pnpm build` passes; unit tests cover the normaliser, the error mapper and the money formatter; no page imports HTTP directly.

### Phase 1 — API integration

**Deliverables:** one typed module per domain with functions matching §8 exactly; unit tests asserting method, path, query serialisation and body shape for each in-scope endpoint.
**Dependencies:** Phase 0. **Acceptance:** every §8.1–8.2 row has a module function; query-param omissions behave as specified (no empty `keyword`, no `status` when "all").

### Phase 2 — Authentication and the shell

**Deliverables:** login screen, route guard, role gate, session persistence, refresh-on-401, logout, TopNav identity from session, 404 fallback.
**Dependencies:** Phase 1. **Acceptance:** G1 satisfied; a `User` login cannot reach any portal route; anonymous deep links redirect and return after login; expired token produces one refresh then a clean logout.

### Phase 3 — Core screens and navigation

**Deliverables:** Dashboard wired to real metrics; Users list with server pagination/filter/search; User detail; Audit-logs view; navigation entries for any route approved in Q1.
**Dependencies:** Phase 2. **Acceptance:** G2, G5, G6 satisfied; zero hardcoded metrics remain on `/`; URL reflects list state and survives refresh.

### Phase 4 — Forms and user actions

**Deliverables:** ban/unban with reason; category create/update/delete; broadcast compose + history; AI settings form; plan create/update; toasts replacing `alert`/`confirm`.
**Dependencies:** Phase 3. **Acceptance:** G3, G4, G7, G8 satisfied; every mutation refetches its list; duplicate-submit protection demonstrable.

### Phase 5 — Error, loading and empty states

**Deliverables:** `AsyncBoundary`, skeletons, empty states for every list, error regions with retry, forbidden state, offline/network messaging.
**Dependencies:** Phase 4. **Acceptance:** no screen can render a blank or infinitely spinning state; each list has a distinguishable empty vs error vs loading state.

### Phase 6 — Permission handling

**Deliverables:** consistent 401/403 handling across the client, role-change-mid-session behaviour, sidebar visibility rules, removal of any UI the role cannot use.
**Dependencies:** Phase 5. **Acceptance:** §5.4 table is executable as a manual test matrix and passes.

### Phase 7 — Tests and final verification

**Deliverables:** the §13 test suite; removal of confirmed dead code (`src/App.css`, unused assets, `motion`, `tailwind-merge` — `FACT`: all unused); cleanup of invalid Tailwind classes (`text-gray-450`, `bg-gray-105`, `py-0.2`, `py-0.8`) and the four `as any` casts at `Campaigns.tsx:264,427,496,531` that conflict with the lint config.
**Dependencies:** Phases 0–6. **Acceptance:** §14 fully checked; `pnpm lint` and `pnpm build` pass; no page-level hex literals or off-token palette classes remain.

---

## 13. Test Plan

`FACT`: no test runner exists (`WIVI_fe/package.json:6-11`; no `*.test.*`/`*.spec.*` files; no testing dependency). **Decision:** add Vitest + React Testing Library + a DOM environment, exposed as a `test` script. Justification: there is no existing testing approach to preserve, and Phases 0–7 change authentication, authorization and every mutation path — shipping that untested in an internal ops tool is not acceptable. This is the only new-dependency decision in the brief and it is recorded in §15 (Q7).

| Suite | Covers | Key cases |
| --- | --- | --- |
| Normaliser / formatter unit | §8.5, `format.ts` | `items`/`data` variants; `page`/`pageIndex` variants; missing pagination; null money; VND formatting |
| API client unit | Auth header injection, error normalisation | 401 → refresh once; refresh failure → logout; 403 → forbidden, no logout; non-JSON error body; 5xx |
| Endpoint module unit | §8 request shapes | Path/query/body per endpoint; omitted params for "all" filters; `billingCycle` never `free` |
| Login component | G1 | Empty fields blocked; 401 message; `role=User` rejected; success stores session and redirects to the original path |
| Route guard / navigation | §5 | Anonymous redirect; authenticated render; `User` blocked; unknown path → fallback |
| Dashboard screen | G5 | Renders nine counters from fixture; empty recent lists; load failure shows `—` not `0` |
| Users screen | G2 | Server pagination params; debounced keyword; status filter; detail open; ban confirm → PATCH → refetch; 404 on update; clamping when the last row on a page disappears |
| Categories screen | G3 | Create/update/delete happy paths; empty state; delete confirm; `{message}` body tolerated; no pagination controls |
| Broadcasts screen | G4 | Compose validation; scheduled-in-past rejected; history filter; provisional counts not presented as final |
| Audit-logs screen | G6 | Filter serialisation (`page` not `pageIndex`); envelope read; empty-with-filters message and clear action |
| AI-settings screen | G7 | Masked key readonly and never sent; partial PATCH response triggers refetch; enable toggle |
| Plans screen | G8 | Table render; create rejects `free`; duplicate code surfaces 409/422 message; `code` readonly on edit |
| Role-based visibility | §5.3 | Sidebar items and logout visible only when authenticated as `Admin` |
| Unauthenticated / non-admin | §5.4 | Deep link while anonymous; direct call after logout; `User` login attempt |
| Loading / empty / error | Phase 5 | Each list renders three distinguishable states; retry re-issues the request |
| Responsive | §9.5 | Shell collapse at `768–1023`, table horizontal scroll on small viewports (smoke) |
| Regression | All | After every mutation the list refetches; no `alert`/`confirm` remains; no hardcoded metric remains on `/` |

Manual verification is required for anything needing live backend state (real ban, real broadcast, real plan create) because no seeded admin fixture is documented (§3.4 B2).

---

## 14. Acceptance Checklist

**Foundation**
- [ ] API client reads `VITE_API_BASE_URL`; a missing value fails fast with a clear message
- [ ] No component performs raw HTTP
- [ ] `src/lib/format.ts` exists and all money/number display goes through it
- [ ] List-response normaliser handles `items`/`data` and `page`/`pageIndex`

**Auth and permission**
- [ ] Login works against `/auth/login`; `Admin` reaches the portal
- [ ] `User` login is rejected with an explicit message and no shell renders
- [ ] Anonymous deep link redirects to login and returns to the original path after login
- [ ] `401` triggers exactly one refresh attempt
- [ ] `403` renders a forbidden state and does **not** log out
- [ ] Logout clears the session even when the server call fails
- [ ] Sidebar/TopNav render only for an authenticated `Admin`

**Capabilities**
- [ ] Dashboard: all nine counters and both lists come from `GET /admin/dashboard`
- [ ] Users: server pagination, `status` filter and `keyword` search; detail view works
- [ ] Users: ban/unban sends an explicit target status plus optional reason, then refetches
- [ ] Categories: list with `isActive`, create, update, delete — each refetches
- [ ] Broadcasts: history paginated and filterable; compose supports immediate and scheduled
- [ ] Audit logs: all five filters work; pagination uses `page` in the request
- [ ] AI settings: masked key is read-only and never sent; PATCH refetches full settings
- [ ] Plans: list, create (no `free`), update with `code` read-only

**Quality**
- [ ] Every list has distinguishable loading / empty / error / success states
- [ ] Every mutation disables its trigger while in flight
- [ ] No `alert()` or `confirm()` remains in `src/`
- [ ] Any 2xx is treated as success (no `200` vs `201` branching)
- [ ] `userName`/`username` read tolerantly
- [ ] No page contains a hex literal or an off-token palette class
- [ ] No control claims a capability that has no endpoint (audit logs aside, `/activity` is either wired or explicitly marked unavailable)
- [ ] `text-gray-450`, `bg-gray-105`, `py-0.2`, `py-0.8` are gone
- [ ] `as any` casts at `Campaigns.tsx:264,427,496,531` are gone
- [ ] Every list renders its fields exactly as mapped in §7.2 (columns, labels, formats, `—` placeholders)
- [ ] The Users screen exposes **no** role filter or admin-account expectation (C11)
- [ ] The AI settings screen has **no** control that writes an API key; `apiKeyMasked` is read-only (C10)
- [ ] `targetAudience` is a required free-text field and is sent verbatim (until Q16 is answered)
- [ ] Identity survives a token refresh and a page reload without calling `/user/me` (§10.4)
- [ ] Unused deps `motion`, `tailwind-merge` and unused files `src/App.css`, `src/assets/{hero.png,react.svg,vite.svg}`, `public/icons.svg` are removed
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] Test suite from §13 present and passing

---

## 15. Open Questions

Every item below changes implementation. Items marked **BLOCKING** must be answered before the named phase; every other item already has a **default assigned inside this brief**, so implementation can proceed and an answer only refines behaviour.

**Blocking count: 1** (Q5 only). Q1, Q7, Q8 and Q9 previously blocked Phases 0–3; each now carries an explicit default and has been demoted, because in all four cases a defensible choice exists and the alternative is a low-cost change.

| # | Question | Why the answer changes implementation | Blocking? |
| --- | --- | --- | --- |
| Q1 | Where do **categories** and **audit logs** live in navigation? | **Default assigned in §7**: categories and plans → sections of `/configuration`; AI settings and audit logs → sections of `/intelligence`. The API layer is identical under any placement, so an override changes only the route table and the sidebar array | No — default assigned; override cost low |
| Q2 | `DRIFT-005` is open. Should the frontend freeze per-endpoint envelope behaviour (the §8.5 table) or wait for the backend to unify? | If the backend unifies to `{items,totalCount,page,pageSize}` (`docs/conventions.md:56-65`), the normaliser's fallback branches and per-endpoint param naming (`page` vs `pageIndex`) become dead code and the client can be simplified. Proceeding with §8.5 is safe either way | No — §8.5 is the recommended default |
| Q3 | `categories-list` query contract conflict (C5): is the supported filter set `{page,pageSize,keyword,includeDeleted}` or `{isActive}`? | Determines whether the categories screen gets a search box and pagination or a simple `isActive` toggle. §8.5 assumes `isActive` only | No |
| Q4 | Which casing is authoritative for the admin username field — `userName` or `username`? (C6) | If one is a bug that will be fixed, the tolerant read is temporary; if both are legitimate per endpoint, the mapping must stay documented in the types | No — read tolerantly meanwhile |
| Q5 | What happens to `/activity` (transaction log), which has **no** admin endpoint? Options: keep the route with an explicit unavailable state, hide the nav item, or repurpose the route | Affects IA, the sidebar and whether the portal shows a visible gap. Any of the three is implementable; leaving it as today (mock data pretending to be real) is excluded by G9 | **BLOCKING** for Phase 3 |
| Q6 | What are the accepted ranges for AI `temperature` and `maxTokens`? | Client-side clamping cannot be written without a range, and the supplied docs state neither. Default: accept any number and rely on server `422` | No — default: no clamping |
| Q7 | Approval to add test tooling (Vitest + React Testing Library) and to remove the unused `motion` + `tailwind-merge` deps | **Decision taken**: add Vitest + RTL, remove the two unused dependencies (§13, Phase 7). Only a policy objection would change this | No — decision taken; owner may object |
| Q8 | Is `localStorage` acceptable for the access/refresh tokens? | **Decision taken**: `localStorage` behind a single session module, with the XSS exposure recorded (§10.4). Choosing httpOnly cookies instead requires backend + CORS/credentials changes and alters the whole client contract | No — default taken; the alternative is a backend change |
| Q9 | Is a seeded `Admin` account available for local verification? | Blocks **manual verification only**, never implementation. `FACT`: no admin-account seed exists in the supplied backend checkout (B2) | No — verification prerequisite |
| Q10 | Should subscription plans get their own route instead of a `/configuration` section? | **Default assigned**: `/configuration` (§7). Splitting changes the sidebar and route table only | No — default assigned |
| Q11 | `docs/services/_meta/drift-register.md:52` introduces a "Backlog các endpoint chưa tạo tài liệu hoạt động" section that is empty in the supplied file. Is the backlog list complete? | If undocumented admin endpoints exist, this brief may have misclassified a capability as `NOT_DEFINED` or omitted an in-scope screen | No — but it caps confidence in §8.3 |
| Q12 | `WIVI_fe/README.md` is an unreadable binary file. Does it contain project-specific instructions that override the above? | It is one of the repo's declared startup files; unknown content cannot be assumed empty | No — flagged as `UNVERIFIED` |
| Q13 | Which verify command is authoritative — root `AGENTS.md` (`npm run …`) or `WIVI_fe/AGENTS.md` (`pnpm …`)? (C8) | Determines the command in CI and in the phase acceptance criteria. The lockfile is pnpm, so pnpm is used throughout this brief; the conflicting root instruction should be corrected in the same change | No — pnpm used |
| Q14 | Is AI provider **API-key rotation** required in the portal, and if so what is the contract? | The story asks for "API key management with secure storage" (`docs/user story.md:143`) and the overview lists "quản lý API key" (`docs/overview.md:221`), but the PATCH body has no key field (`docs/API V2.md:2957-2962`). A "yes" requires a new backend endpoint plus write-only handling, so it cannot be delivered by this brief | No — ship read-only on `apiKeyMasked` (C10) |
| Q15 | How are admin/operator accounts listed and managed? | `GET /admin/users` returns only role `User` accounts (`docs/API V2.md:2592`) and no role-change endpoint exists (`temp/admin-rest-api-implemented-graph.md:44`). If operators must be manageable here, a new backend capability is required | No — out of scope (§3.2); recorded so the gap is not mistaken for a bug |
| Q16 | What values are valid for `targetAudience`? | Required `string` with no documented enum (`docs/API V2.md:2737`). A defined set would let the compose field become a closed dropdown; without it the field stays free text, where a typo can produce a silently empty fan-out | No — free text meanwhile (§11.1, B10) |

---

## Appendix A — File and path conventions for this brief

| Purpose | Path |
| --- | --- |
| Brief output | `WIVI_fe/ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md` |
| Frontend rules (operative) | `WIVI_fe/AGENTS.md` |
| Frontend design reference | `WIVI_fe/DESIGN_SYSTEM.md` |
| Backend conventions (authority) | `WVI/Personal_Finance_App/docs/conventions.md` |
| Endpoint contracts (authority) | `WVI/Personal_Finance_App/docs/API V2.md` |
| Implemented admin graph | `WVI/Personal_Finance_App/temp/admin-rest-api-implemented-graph.md` |
| Backlog admin graph | `WVI/Personal_Finance_App/temp/admin-rest-api-backlog-graph.md` |
| Drift register | `WVI/Personal_Finance_App/docs/services/_meta/drift-register.md` |
| Backend knowledge graph | `WVI/Personal_Finance_App/AGENTS.md` |
| Communication style | `WVI/Personal_Finance_App/OUTPUT.md` |

Non-authoritative sources, per `WVI/Personal_Finance_App/docs/README.md:54-59`: `docs/note/*`, `docs/output/technical.md`, `temp/plan/`, and the root `README.md` (setup guidance only, no business contract).
