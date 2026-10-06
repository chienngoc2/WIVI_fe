# Admin Frontend ↔ Backend Integration Plan

> **Status:** Analysis & planning only — no code implemented.
> **Scope:** Synchronize the already-implemented Admin backend flows with the existing mock Admin frontend (`WIVI_fe`), one user flow at a time.
> **Method:** Documentation was read first, then **every** admin endpoint was verified against the actual backend source. Where docs and runtime differ, the runtime (code) is authoritative and the drift is recorded explicitly.
> **Related:** `ADMIN_PORTAL_IMPLEMENTATION_BRIEF.md` (same repo) is the prior planning artifact; this plan re-verifies it against the code and **corrects** it where the code contradicts its assumptions.

---

## 1. Admin Architecture Summary

### Backend (`WVI/Personal_Finance_App`) — NestJS modular monolith, DDD/CQRS

- **16 admin endpoints** exist across 6 controllers, all under `/api/v1/admin/...`, all guarded by `@Roles('Admin')`. No admin route is `@Public()`.
- Global wiring (`app.module.ts`): `APP_GUARD JwtAuthGuard` → `APP_GUARD RolesGuard` → `APP_FILTER GlobalExceptionFilter` → `APP_PIPE ValidationPipe` (whitelist + forbidNonWhitelisted, **no transform**).
  - `JwtAuthGuard` requires `Authorization: Bearer <accessToken>`; rejects any token whose `type !== 'access'` (so refresh tokens can't be used as bearer).
  - `RolesGuard` compares the JWT `role` claim (`account.roleCode` = `'Admin'` | `'User'`, PascalCase) against `@Roles('Admin')`.
- **Admin module is a "delegating" module**: it owns `AuditLog` and the user-management/dashboard/audit query+command handlers, and delegates to `identity` (ban/unban → `Account.ban()/unban()` + `UserBannedEvent`), `notification` (broadcasts), `category` (default-category CRUD), `ai` (AI settings), and `subscription` (plans).
- **Auth is shared**: `POST /api/v1/auth/login` is used for both User and Admin (no separate admin login endpoint by design). Login returns the `role`; the portal gates on it.
- **Error envelope** (every 4xx/5xx): `{ code, message, field, details }`. `DomainError` → status mapped by code; a plain thrown `Error` → `500 INTERNAL_ERROR` (this matters — see the ban/unban bug in §6).

### Frontend (`WIVI_fe`) — React 19 + Vite + TS + Tailwind v4 + React Router 7 + Recharts

- **Entry**: `src/main.tsx` → `src/App.tsx` (BrowserRouter, 6 flat routes, a hardcoded shell of `Sidebar` + `TopNav` + `main`). No 404 route, no guard, no lazy loading.
- **6 pages, all mock**: `Overview`, `Members`, `Activity`, `Intelligence`, `Campaigns`, `Configuration`. Data are module-level constants; the only mutations end in `alert()`/`confirm()`.
- **Zero integration today** (verified by grep): no `fetch`/`axios`, no `import.meta.env` read, no `localStorage`, no context/store, no test runner. `.env` defines `VITE_API_BASE_URL=http://127.0.0.1:3000` but nothing reads it.
- **Design tokens already applied** in `src/index.css` (full `@theme`); the shared component kit named in `WIVI_fe/AGENTS.md` and `DESIGN_SYSTEM.md` (`SectionCard`, `DataTable`, `Badge`, `src/lib/format.ts`, …) **does not exist yet**.
- **Known frontend defects** (from the previous lint-fix turn): off-token palette classes (294), hardcoded hex in charts/classes, `text-gray-450`/`bg-gray-105`/`py-0.2`/`py-0.8` invalid classes, 4 `as any` (already removed), dead `src/App.css`.

### Current integration status

| Layer                                             | Status                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Backend admin APIs                                | **Implemented & role-guarded** (16 endpoints), with several correctness gaps (§6) |
| Backend auth APIs                                 | Implemented (login/logout/refresh)                                                |
| Frontend design tokens                            | Applied                                                                           |
| Frontend API layer / auth / types / state / tests | **Absent**                                                                        |
| Frontend pages                                    | Mock UI shell only; layout/visual language reusable, behavior decorative          |

---

## 2. Discovered Admin User Flows

Reconstructed from docs + verified code. Grouped by capability.

**A. Authentication & session**

1. **Admin sign-in** — `POST /auth/login`, gate on `role === 'Admin'` (case-insensitive), persist tokens + identity, redirect.
2. **Token refresh** — `POST /auth/refresh` returns only new tokens; single-flight retry on `401`.
3. **Logout** — `POST /auth/logout` (Bearer), clear local session regardless of outcome.

**B. Dashboard** 4. **Dashboard view** — `GET /admin/dashboard` → 9 `summary` counters + `recentUsers[]` + `recentTransactions[]` (note: backend currently stubs 6/9 counters and both lists — §6).

**C. User management** 5. **Users list** — `GET /admin/users` with `pageIndex/pageSize/status/keyword`; server pagination + filter + search. 6. **User detail** — `GET /admin/users/:id`. 7. **Ban / unban** — `PATCH /admin/users/:id/status` with `{status:'Active'|'Banned', statusReason?}`; confirm dialog; refetch.

**D. Default categories** 8. **Categories list** — `GET /admin/categories` with `page/pageSize/keyword/includeDeleted`. 9. **Category create** — `POST /admin/categories` `{name, icon?, color?, isDefault?, displayOrder?}`. 10. **Category update** — `PATCH /admin/categories/:id` `{name?, icon?, color?, isActive?, displayOrder?}`. 11. **Category delete** — `DELETE /admin/categories/:id` (soft delete; returns 200 + empty body).

**E. Broadcasts** 12. **Broadcasts list** — `GET /admin/broadcasts` with `pageIndex/pageSize/status`. 13. **Broadcast compose** — `POST /admin/broadcasts` `{title, body, targetAudience?, scheduledAt?}` (immediate or scheduled).

**F. Audit trail** 14. **Audit-log review** — `GET /admin/audit-logs` with `adminId/actionType/entityType/fromDate/toDate/page/pageSize`.

**G. AI settings** 15. **AI settings read** — `GET /admin/ai-settings`. 16. **AI settings update** — `PATCH /admin/ai-settings` (incl. `apiKeyEncrypted` + `rebalanceThresholdPercent` — see §6).

**H. Subscription plans** 17. **Plans list** — `GET /admin/subscriptions/plans` (active plans only). 18. **Plan create** — `POST /admin/subscriptions/plans` `{code, name, description?, price, billingCycle, features?, isPopular?}`. 19. **Plan update** — `PATCH /admin/subscriptions/plans/:id` (only `price/name/features/isActive` take effect).

**Not implemented (do not build UI for):**

- **Change role** — docs mention it, but **no controller/handler/command exists** in code (grep = 0). Flag as Case D.
- **Admin transaction log** (`/activity` screen) — **no admin transaction endpoint exists**. Flag as Case D (see §5 note).
- Backlog/optional admin capabilities (dashboard time-series, DAU/WAU/MAU, export, OCR review, jar templates, etc.) — story-only, no endpoints.

---

## 3. Backend API Coverage

| #   | Method | Path                             | Role        | Request                                                                                                                          | Response (runtime)                                                                                                 | Notes                                                |
| --- | ------ | -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 1   | GET    | `/admin/users`                   | Admin       | `pageIndex? pageSize? status? keyword?`                                                                                          | `{data[], pagination{page,pageSize,totalCount,totalPages}}`                                                        | ⚠️ returns **all** accounts (no role filter)         |
| 2   | GET    | `/admin/users/:id`               | Admin       | `:id`                                                                                                                            | flat user object (`userName`, …)                                                                                   | 404 via NotFoundException                            |
| 3   | PATCH  | `/admin/users/:id/status`        | Admin       | `{status, statusReason?}` (untyped)                                                                                              | ban: `{id,username,…}`; unban: `{id,username,status,statusReason}`                                                 | ⚠️ missing user → **500** (plain Error)              |
| 4   | GET    | `/admin/dashboard`               | Admin       | —                                                                                                                                | `{summary{9 keys}, recentUsers:[], recentTransactions:[]}`                                                         | ⚠️ 6/9 counters = 0, lists = []                      |
| 5   | GET    | `/admin/audit-logs`              | Admin       | `adminId? actionType? entityType? fromDate? toDate? page? pageSize?`                                                             | `{items[], pagination{page,pageSize,totalCount,totalPages}}`                                                       | ⚠️ `adminUsername` = actorAccountId (UUID)           |
| 6   | GET    | `/admin/ai-settings`             | Admin       | —                                                                                                                                | `{id,modelName,systemPrompt,temperature,maxTokens,isEnabled,rebalanceThresholdPercent,updatedByAdminId,updatedAt}` | ⚠️ no `apiKeyMasked` (docs claim it); 404 if none    |
| 7   | PATCH  | `/admin/ai-settings`             | Admin       | `{modelName?,systemPrompt?,temperature?[0-2],maxTokens?[1-32768],apiKeyEncrypted?,isEnabled?,rebalanceThresholdPercent?[1-100]}` | full settings object                                                                                               | upsert; ⚠️ accepts raw `apiKeyEncrypted`             |
| 8   | GET    | `/admin/categories`              | Admin       | `page? pageSize? keyword? includeDeleted?`                                                                                       | flat `{items[],totalCount,page,pageSize,totalPages}`                                                               | fields use `displayOrder`, not `order`               |
| 9   | POST   | `/admin/categories`              | Admin (201) | `{name,icon?,color?,isDefault?,displayOrder?}`                                                                                   | created category                                                                                                   | duplicate → 422                                      |
| 10  | PATCH  | `/admin/categories/:id`          | Admin       | `{name?,icon?,color?,isActive?,displayOrder?}`                                                                                   | updated category                                                                                                   | 404/422 handled                                      |
| 11  | DELETE | `/admin/categories/:id`          | Admin (200) | `:id`                                                                                                                            | **empty body** (soft delete)                                                                                       | 404 handled                                          |
| 12  | GET    | `/admin/broadcasts`              | Admin       | `status? pageIndex? pageSize?`                                                                                                   | flat `{items[],totalCount,page,pageSize,totalPages}`                                                               |                                                      |
| 13  | POST   | `/admin/broadcasts`              | Admin (201) | `{title,body,targetAudience?,scheduledAt?}` (untyped)                                                                            | `{…,status:'Queued',targetCount:0,deliveredCount:0}`                                                               | fan-out is async                                     |
| 14  | GET    | `/admin/subscriptions/plans`     | Admin       | —                                                                                                                                | raw entity array (isActive=true, price ASC)                                                                        | ⚠️ active only, not "all"                            |
| 15  | POST   | `/admin/subscriptions/plans`     | Admin (201) | `{code,name,description?,price,billingCycle,features?,isPopular?}` (untyped)                                                     | raw entity                                                                                                         | ⚠️ `description`/`isPopular` dropped; dup code → 500 |
| 16  | PATCH  | `/admin/subscriptions/plans/:id` | Admin       | `{name?,description?,price?,features?,isActive?,isPopular?}` (untyped)                                                           | `{message, plan}`                                                                                                  | ⚠️ only `price/name/features/isActive` applied       |

**Auth (shared, not under `/admin`):**

| Method | Path            | Role   | Request             | Response                                                                                                          |
| ------ | --------------- | ------ | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`   | Public | `{email, password}` | `{id,username,firstName,lastName,fullName,email,role,isOnboardingCompleted,isOnboarded,accessToken,refreshToken}` |
| POST   | `/auth/refresh` | Public | `{refreshToken}`    | `{accessToken, refreshToken}` (tokens only)                                                                       |
| POST   | `/auth/logout`  | Bearer | —                   | `{message}` (no server-side invalidation)                                                                         |

---

## 4. Current Frontend Coverage

| Route            | Page                | Current content                                          | Integration status                                                               |
| ---------------- | ------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `/`              | `Overview`          | 6 KPI cards + 2 charts + 3 widget lists (all mock)       | **Mock only** — must be replaced by `GET /admin/dashboard`                       |
| `/members`       | `Members`           | mock `mockMembers` table + client-side search/filter     | **Mock only** — maps to users list/detail/status                                 |
| `/activity`      | `Activity`          | mock "transaction ledger" (spending + subscription tabs) | **No backend exists** (Case D) — see §5                                          |
| `/intelligence`  | `Intelligence`      | mock AI quota + Sepay + risk/radar widgets               | **Mock only** — maps to AI settings + audit logs (brief default placement)       |
| `/campaigns`     | `Campaigns`         | mock campaign composer + local "auto rules" engine       | **Mock only** — maps to broadcasts list/compose (auto-rules have **no backend**) |
| `/configuration` | `Configuration`     | mock AI model + bank-sync toggles + plan price inputs    | **Mock only** — maps to categories + plans (brief default placement)             |
| shell            | `Sidebar`, `TopNav` | static nav + hardcoded identity "Nicholas Gray"          | **Mock only** — must become session-aware + role-gated                           |

**Shared UI kit:** none of `SectionCard`/`StatCard`/`DataTable`/`Badge`/`Button`/`Pagination`/`Modal`/`Toast`/`src/lib/format.ts` exists yet.

**Per-screen classification:**

- `Overview`, `Intelligence` — purely static (no `useState`).
- `Members`, `Activity`, `Campaigns`, `Configuration` — local `useState` only; mutations are `alert()`/`confirm()`.
- All six — UI only; no HTTP, no loading/empty/error states, no auth.

---

## 5. Backend ↔ Frontend Mapping

| Admin Flow                        | Frontend                            | Backend                                | Current Status         | Gap                                                                                      |
| --------------------------------- | ----------------------------------- | -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| Admin sign-in                     | **none** (must add `/login`)        | `POST /auth/login`                     | Missing (Case C)       | login screen, session, role gate, redirect                                               |
| Token refresh                     | —                                   | `POST /auth/refresh`                   | Missing                | single-flight refresh on 401                                                             |
| Logout                            | `TopNav` (no control)               | `POST /auth/logout`                    | Missing                | logout control + clear session                                                           |
| Dashboard view                    | `Overview` (mock)                   | `GET /admin/dashboard`                 | Mock → wire            | API client, map `summary`→StatCards; handle stubbed counters honestly                    |
| Users list                        | `Members` (mock table)              | `GET /admin/users`                     | Mock → wire (Case A)   | types, server pagination (`pageIndex`), `keyword` debounce, `status` filter              |
| User detail                       | `Members` "Xem" (no-op)             | `GET /admin/users/:id`                 | Mock → wire            | detail drawer + fetch-on-open                                                            |
| Ban / unban                       | `Members` "Xóa" (no-op)             | `PATCH /admin/users/:id/status`        | Mock → wire (Case B)   | confirm dialog, explicit target status + reason, refetch                                 |
| Categories list                   | **none**                            | `GET /admin/categories`                | Missing (Case C)       | new section in `/configuration`                                                          |
| Category create                   | **none**                            | `POST /admin/categories`               | Missing (Case C)       | create dialog, `displayOrder` field                                                      |
| Category update                   | **none**                            | `PATCH /admin/categories/:id`          | Missing (Case C)       | inline edit                                                                              |
| Category delete                   | **none**                            | `DELETE /admin/categories/:id`         | Missing (Case C)       | confirm + refetch                                                                        |
| Broadcasts list                   | `Campaigns` (mock log)              | `GET /admin/broadcasts`                | Mock → wire            | replace "Nhật ký chiến dịch" table                                                       |
| Broadcast compose                 | `Campaigns` (mock form)             | `POST /admin/broadcasts`               | Mock → wire (Case B)   | `targetAudience` free-text, `scheduledAt`; drop local "auto rules" (no backend)          |
| Audit logs                        | **none**                            | `GET /admin/audit-logs`                | Missing (Case C)       | new section in `/intelligence`                                                           |
| AI settings read                  | `Configuration` (mock toggles)      | `GET /admin/ai-settings`               | Mock → wire            | settings form                                                                            |
| AI settings update                | `Configuration` (alert-only)        | `PATCH /admin/ai-settings`             | Mock → wire            | PATCH + refetch; `apiKeyEncrypted` decision (§6)                                         |
| Plans list                        | `Configuration` (mock price inputs) | `GET /admin/subscriptions/plans`       | Mock → wire            | replace hardcoded tier inputs with table                                                 |
| Plan create                       | **none**                            | `POST /admin/subscriptions/plans`      | Missing (Case C)       | create dialog                                                                            |
| Plan update                       | `Configuration` (mock inputs)       | `PATCH /admin/subscriptions/plans/:id` | Mock → wire            | edit dialog; `code`/`billingCycle` read-only                                             |
| **Change role**                   | —                                   | **none**                               | **Case D** (docs-only) | do not build; flag                                                                       |
| **Transaction log** (`/activity`) | `Activity` (mock)                   | **none**                               | **Case D**             | no endpoint; replace mock with explicit "chưa có API" state or hide nav (owner decision) |

---

## 6. Contract Mismatches

These are **code-verified**; the earlier brief made several assumptions that the code contradicts. The frontend must be written against the runtime, not the docs.

### 6.1 Request/response shape mismatches (must be handled in the API layer)

| #   | Issue                                            | Docs claim                                     | Runtime (code)                                                                                                                        | Frontend rule                                                                                        |
| --- | ------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| M1  | **Pagination: 4 shapes**                         | conventions `{items,totalCount,page,pageSize}` | users `{data,pagination}` · audit `{items,pagination}` · categories/broadcasts **flat** `{items,totalCount,page,pageSize,totalPages}` | One list normalizer accepting `data\|items` and flat-vs-nested `pagination`; log when fallback taken |
| M2  | **`page` vs `pageIndex`**                        | conventions `page`                             | users & broadcasts request `pageIndex`; audit & categories request `page`                                                             | Per-endpoint param name in the typed API modules                                                     |
| M3  | **`userName` vs `username`**                     | mixed                                          | admin list/detail/get-me use `userName`; login/ban/unban use `username`                                                               | Type per endpoint; read `userName ?? username` where a user object is rendered                       |
| M4  | **Category field `order` vs `displayOrder`**     | docs `order`                                   | DTO + entity use `displayOrder`                                                                                                       | Use `displayOrder`                                                                                   |
| M5  | **Category list query**                          | brief said `isActive` only, no pagination      | code uses `page/pageSize/keyword/includeDeleted`                                                                                      | Build paginated category list with keyword search, no `isActive` filter                              |
| M6  | **AI settings GET**                              | `apiKeyMasked` field                           | **no `apiKeyMasked`**; returns `rebalanceThresholdPercent`, `updatedByAdminId`, `updatedAt`                                           | Do not render a masked key (it is not returned)                                                      |
| M7  | **AI settings PATCH**                            | no apiKey field                                | accepts `apiKeyEncrypted` + `rebalanceThresholdPercent`                                                                               | See §6.2 #3 — a key-write path exists                                                                |
| M8  | **AI settings PATCH response**                   | `{modelName,isEnabled}` (partial)              | full settings object (8 fields)                                                                                                       | Still refetch after PATCH (safe)                                                                     |
| M9  | **Plans list**                                   | "includes inactive"                            | `isActive:true` only                                                                                                                  | Do not assume inactive rows appear                                                                   |
| M10 | **Plan create/update `description`/`isPopular`** | accepted                                       | silently dropped (not persisted)                                                                                                      | Do not send them, or send and ignore; do not surface them as editable state                          |
| M11 | **Broadcast create body**                        | `targetAudience` required                      | optional, defaults `'All'`                                                                                                            | `targetAudience` free-text; omitted → `'All'`                                                        |

### 6.2 Backend bugs / gaps to flag (owner decision; not silently worked around)

1. **Dashboard is partially stubbed.** `GET /admin/dashboard` returns 3 real counters (`totalUsers`, `activeUsersLast30Days`, `bannedUsers`) but `newUsersThisMonth`, `totalTransactions`, `transactionsThisMonth`, `totalJars`, `activeGoals`, `pendingImportJobs` are hardcoded `0`, and `recentUsers`/`recentTransactions` are always `[]`. → The dashboard flow cannot be "done" end-to-end until the backend handler is completed. Frontend should wire it and render `—` (not `0`) for counters known to be stubbed, and empty states for the lists. **This changes the "recommended first flow" away from Dashboard.**
2. **`GET /admin/users` does not filter by role.** The repository `findAll` has no `role.code = 'User'` predicate, so admin accounts also appear (contradicts docs API V2:2592). → Do not add an "Admin" role expectation in UI; flag to owner whether the backend should scope to `User` only.
3. **AI key-write path exists.** `PATCH /admin/ai-settings` accepts `apiKeyEncrypted` (raw, though "encrypted" by name). The prior brief (C10) assumed no key field. → UI decision: expose a "provider API key" field only if the owner confirms it is safe/desired; otherwise omit it from the form (the field is optional).
4. **ban/unban returns 500 on missing user.** Handlers throw plain `Error('Account not found')` → GlobalExceptionFilter 500 branch. → Frontend must treat a 500 on ban/unban as "record not found / stale" and refetch, not as a server crash.
5. **Audit-log `adminUsername` is a UUID.** `get-audit-logs.handler.ts` maps `adminUsername: log.actorAccountId`. → Render it, but label the column "Admin ID" or display `—`; do not claim it is a human username. (Backend fix is preferable; flag.)
6. **Duplicate plan `code` → 500.** `subscription.service.createPlan` relies on the DB unique constraint with no catch; TypeORM violation → 500. → Surface a friendly "mã gói đã tồn tại" on 500 for this specific call, or (better) fix the backend to return 409.
7. **Role casing inconsistent** between `/auth/login` (`'Admin'`/`'User'`) and `/auth/google` (`'admin'`/`'user'`). → The portal gate must compare `role.toLowerCase() === 'admin'`.
8. **`subscription_plans.price` is `numeric(18,2)`** and may serialize as a string under Postgres. → Coerce to number in the plan types/mapper.
9. **`includeDeleted` is a raw string** (`"false"` is truthy) in the category repository. → Frontend should omit `includeDeleted` unless an explicit include-deleted control is requested.

### 6.3 Status-code mismatches (rule: treat any 2xx as success)

- `DELETE /admin/categories` → runtime **200 + empty body** (convention says 204). Do not parse the body as a resource.
- `POST` create endpoints: categories/broadcasts/plans return **201**; some docs said 200. Accept any 2xx.
- `PATCH /admin/users/:id/status` success returns a **different shape** for ban vs unban (ban has more fields). Normalize.

### 6.4 Frontend mock models vs backend models

| Frontend mock                                     | Backend (runtime)                                                            | Action                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| `Members`: `plan: 'Miễn phí'\|'Basic (29k)'\|…`   | no plan field on user; `status: 'Active'\|'Banned'`, `isOnboardingCompleted` | rewrite columns to backend fields       |
| `Activity`: spending + "Sổ cái mua gói" tabs      | no admin transaction endpoint                                                | replace with unavailable state          |
| `Campaigns`: "auto rules" engine                  | no automation endpoint                                                       | delete the auto-rules UI (out of scope) |
| `Configuration`: AI model/learning-rate/bank-sync | `GET/PATCH /admin/ai-settings` fields                                        | rewrite form to real fields             |
| `Configuration`: 3 hardcoded tier price inputs    | `/admin/subscriptions/plans` table                                           | replace with plans table                |

---

## 7. Proposed Integration Architecture

Follows existing project conventions (mirrors the mobile `AuthContext` + service-layer pattern; no new state library, no cache library, no form library).

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts          # fetch wrapper: base URL, auth header, 401 hook, error normalization, timeout/abort
│   │   └── normalize.ts       # list-response normalizer (data|items, flat|nested pagination, page|pageIndex)
│   ├── session.ts             # single localStorage namespace: accessToken, refreshToken, identity{id,fullName,email,role}
│   └── format.ts              # money/number/date formatters (per WIVI_fe/AGENTS.md)
├── types/
│   └── admin.ts               # DTO types per §3/§6 (no `any`)
├── services/                  # thin per-domain modules, NO fetch inside components
│   ├── auth.ts                # login/refresh/logout
│   ├── adminUsers.ts          # list/detail/status
│   ├── adminDashboard.ts
│   ├── adminCategories.ts
│   ├── adminBroadcasts.ts
│   ├── adminAuditLogs.ts
│   ├── adminAiSettings.ts
│   └── adminPlans.ts
├── hooks/
│   ├── useAsync.ts            # {status,data,error,refetch}; loading/empty/error
│   ├── useAuth.ts             # AuthContext consumer
│   └── useDebouncedValue.ts
├── context/
│   └── AuthContext.tsx        # session + login/logout/refresh; single source for identity+role
├── components/
│   ├── AppLayout.tsx          # extracted shell (Sidebar + TopNav + main), role-gated
│   ├── Sidebar.tsx / TopNav.tsx   # session-aware, role-aware, logout
│   └── ui/                    # SectionCard, StatCard, PageHeader, DataTable, Pagination, Badge, Button,
│                              #   SearchInput, Modal, ConfirmDialog, Field+FormError, EmptyState, ErrorState,
│                              #   LoadingState, ForbiddenState, Toast, AsyncBoundary
└── pages/
    ├── Login.tsx              # new
    ├── Overview.tsx / Members.tsx / … (rewired to services)
    └── NotFound.tsx           # new fallback route
```

**Ownership rules (from `WIVI_fe/AGENTS.md` + brief):**

- `src/components/ui/*` — no business knowledge, no direct HTTP.
- `src/services/*` + `src/lib/api/*` — the only place HTTP lives; typed.
- Pages — call hooks only, never raw fetch.
- URL is the source of truth for list state (page/filter/search) → survives refresh, shareable.
- No server-cache library; refetch-on-action. `401` → single-flight refresh → retry → logout on failure. `403` → forbidden state (no logout).
- Money/date/number display only via `src/lib/format.ts`; chart colors from theme tokens.

---

## 8. Implementation Roadmap

Dependency-aware phasing. `pnpm lint && pnpm build` must pass at the end of every phase.

```
Phase 0 — Shared infrastructure (foundation)
   API client + error normalization + list normalizer + types + format.ts + AuthContext/session + AppLayout + test tooling

Phase 1 — Authentication & shell (unblocks everything)
   Login screen · route guard · role gate · session persistence · refresh-on-401 · logout · TopNav identity · 404 fallback

Phase 2 — Read-only flows
   Users list · User detail · Dashboard · Audit logs · Categories list · Broadcasts list · Plans list · AI settings read

Phase 3 — Mutation flows
   Ban/unban · Category create/update/delete · Broadcast compose · AI settings update · Plan create/update

Phase 4 — Cross-flow synchronization & polish
   Refetch-after-mutation · loading/empty/error/forbidden states · Toast (replace alert/confirm) · dead-code + invalid-class cleanup

Phase 5 — Validation
   Tests (§13 of the brief) · permission matrix · edge cases · end-to-end manual verification against a seeded Admin account
```

> **Ordering note:** Auth (Phase 1) is placed before read-only flows because every admin endpoint requires a Bearer `Admin` token; a read-only flow cannot be exercised or verified without it.

---

## 9. Detailed Flow-by-Flow Implementation Plan

> "Frontend files" are the current mock files; "Backend files" are the runtime source. Field names below are the **code-verified** ones.

### Flow 1: Admin sign-in

- **Goal:** authenticate an operator and enter the portal (reject non-Admin).
- **Frontend files:** new `src/pages/Login.tsx`, `src/services/auth.ts`, `src/lib/api/client.ts`, `src/lib/session.ts`, `src/context/AuthContext.tsx`, `src/App.tsx` (route + guard).
- **Backend endpoints:** `POST /api/v1/auth/login` (`identity.controller.ts`, `login.handler.ts`, `dto/login.dto.ts`).
- **Backend response:** `{id, username, firstName, lastName, fullName, email, role, isOnboardingCompleted, isOnboarded, accessToken, refreshToken}`.
- **Current state:** no login screen, no auth.
- **Missing pieces:** login form, session persistence, role gate, redirect-back.
- **Implementation tasks:**
  1. `session.ts` (single `localStorage` key; store `accessToken`, `refreshToken`, `{id, fullName, email, role}`).
  2. `api/client.ts` (base URL from `VITE_API_BASE_URL`, fail fast if missing; inject `Authorization: Bearer`; normalize errors to `{code,message,field}`; 401 hook).
  3. `auth.login(email, password)`.
  4. `AuthContext` (login/logout/refresh actions + identity).
  5. `Login.tsx` (email/password, inline errors; map 401 → "Email hoặc mật khẩu không đúng", 422 → field).
  6. Route guard in `App.tsx`: unauthenticated → `/login`; authenticated non-Admin → reject with message + logout offer.
- **Acceptance criteria:**
  - `Admin` login reaches `/`; `User` login is rejected with an explicit message and no shell renders.
  - Anonymous deep link redirects to login and returns to the original path after login.
  - `role` is compared case-insensitively (`role.toLowerCase() === 'admin'`) — handles the login vs google casing drift (§6.2 #7).

### Flow 2: Token refresh (cross-cutting)

- **Goal:** keep the session alive without re-login.
- **Backend endpoints:** `POST /api/v1/auth/refresh` (`identity.controller.ts`, `dto/refresh-token.dto.ts`).
- **Backend response:** `{accessToken, refreshToken}` (tokens only — **no identity**; the login response is the only identity source).
- **Current state:** none.
- **Missing pieces:** single-flight refresh, token rotation, identity persistence.
- **Implementation tasks:**
  1. `auth.refresh(refreshToken)`.
  2. In `api/client.ts`, on `401` attempt one refresh, retry once, else clear session + redirect (single-flight across concurrent 401s).
  3. Persist the cached identity across refresh/reload (never rebuild from `/user/me`).
- **Acceptance criteria:** expired access token triggers exactly one refresh; failed refresh → clean logout; identity survives reload.

### Flow 3: Logout

- **Goal:** end the session.
- **Backend endpoints:** `POST /api/v1/auth/logout` (Bearer; `identity.controller.ts`).
- **Current state:** no logout control.
- **Missing pieces:** control + session clear.
- **Implementation tasks:**
  1. `auth.logout()`; `TopNav` logout control (session-aware).
  2. Clear local session regardless of server outcome; redirect to `/login`.
- **Acceptance criteria:** logout always clears the session (even if the server returns 401).

### Flow 4: Dashboard view

- **Goal:** show real operations metrics.
- **Frontend files:** `src/pages/Overview.tsx`; new `src/services/adminDashboard.ts`, `src/hooks/useAsync.ts`, `ui/StatCard`, `ui/SectionCard`.
- **Backend endpoints:** `GET /api/v1/admin/dashboard` (`admin.controller.ts`, `get-admin-dashboard.handler.ts`).
- **Backend response:** `{summary{totalUsers,newUsersThisMonth,activeUsersLast30Days,bannedUsers,totalTransactions,transactionsThisMonth,totalJars,activeGoals,pendingImportJobs}, recentUsers[], recentTransactions[]}`.
- **Current state:** mock KPI cards/charts/lists.
- **Missing pieces:** API wiring, counter mapping, empty states, honest stub rendering.
- **Implementation tasks:**
  1. `adminDashboard.get()` + types.
  2. Replace the 6 mock KPI cards + charts/lists with 9 `StatCard`s bound to `summary` + 2 `SectionCard` lists.
  3. Per-card empty state; render `—` (not `0`) on load failure and for the 6 known-stubbed counters (document the stub).
  4. Manual refresh control.
- **Acceptance criteria:** no hardcoded metric remains; load failure shows `—` not `0`. **Blocked-for-full-value:** 6 counters + 2 lists are backend stubs (§6.2 #1); wire anyway and flag.

### Flow 5: Users list (search/filter/paginate)

- **Goal:** browse consumer accounts.
- **Frontend files:** `src/pages/Members.tsx`; `src/services/adminUsers.ts`; `ui/DataTable`, `ui/Pagination`, `ui/SearchInput`, `ui/Badge`.
- **Backend endpoints:** `GET /api/v1/admin/users` (`admin.controller.ts`, `get-users.handler.ts`, `get-users.query.ts`).
- **Backend request:** `pageIndex? pageSize? status? keyword?`; **response:** `{data[], pagination{page,pageSize,totalCount,totalPages}}` (fields `userName`, `firstName`, `lastName`, `email`, `phone`, `avatarUrl`, `preferredCurrency`, `isOnboardingCompleted`, `status`, `statusReason`, `createdAt`, `lastLoginAt`).
- **Current state:** mock `mockMembers` + client-side `useMemo` filter.
- **Missing pieces:** server pagination, debounced keyword, status filter, columns per backend fields.
- **Implementation tasks:**
  1. `adminUsers.list({pageIndex,pageSize,status,keyword})` + types (`userName`).
  2. Replace `mockMembers` with the API; columns → name (`firstName lastName`), email, status badge (`Active`→success, `Banned`→danger), onboarding badge, `createdAt`/`lastLoginAt` (Asia/Ho_Chi_Minh).
  3. URL-driven state; `keyword` debounced (~350 ms); omit `status`/`keyword` when "all"/empty.
  4. Server pagination footer reading `pagination.page` (tolerant).
  5. Loading / empty / error states.
- **Acceptance criteria:** server-side pagination/filter/search work; URL reflects state and survives refresh; empty vs error distinguishable.

### Flow 6: User detail

- **Goal:** inspect one account.
- **Frontend files:** `src/pages/Members.tsx` (drawer); `src/services/adminUsers.ts`.
- **Backend endpoints:** `GET /api/v1/admin/users/:id` (`get-user-detail.handler.ts`).
- **Backend response:** flat user object (`userName`, …, `phone`, `preferredCurrency`).
- **Current state:** "Xem" button is a no-op.
- **Missing pieces:** detail drawer + fetch-on-open.
- **Implementation tasks:**
  1. `adminUsers.detail(id)`.
  2. Drawer with a definition list; fetch on open (not from the list row); `avatarUrl` → initials fallback.
  3. Surface `statusReason` when `Banned`.
- **Acceptance criteria:** detail opens from the row, shows backend fields, handles 404 ("Không tìm thấy người dùng") by closing + refetching.

### Flow 7: Ban / unban

- **Goal:** lock/unlock an account with an optional reason.
- **Frontend files:** `src/pages/Members.tsx`; `src/services/adminUsers.ts`; `ui/ConfirmDialog`, `ui/Toast`.
- **Backend endpoints:** `PATCH /api/v1/admin/users/:id/status` (`admin.controller.ts`, `ban-user.handler.ts`, `unban-user.handler.ts`).
- **Backend request:** `{status:'Active'|'Banned', statusReason?}`; **response:** ban `{id,username,firstName,lastName,email,phone,status,statusReason}`, unban `{id,username,status,statusReason}` (note: `username`, not `userName`).
- **Current state:** "Xóa" button is a no-op.
- **Missing pieces:** confirm dialog, explicit target status, reason input, refetch.
- **Implementation tasks:**
  1. `adminUsers.updateStatus(id, {status, statusReason})`.
  2. Replace "Xóa" with "Khóa"/"Mở khóa" (explicit target status, never a blind toggle); confirm dialog includes the user's name.
  3. On success: toast + refetch list + refetch detail if open.
  4. **Handle 500 as stale-record** (§6.2 #4): show "không tìm thấy / đã thay đổi", refetch, close drawer.
- **Acceptance criteria:** ban/unban sends explicit status + optional reason; refetches; duplicate-submit disabled while in flight; 500 handled gracefully.

### Flow 8: Categories list

- **Goal:** view default categories.
- **Frontend files:** new categories section in `src/pages/Configuration.tsx` (or `src/pages/Configuration/`); `src/services/adminCategories.ts`.
- **Backend endpoints:** `GET /api/v1/admin/categories` (`admin-category.controller.ts`, `get-admin-categories.handler.ts`, `category.mapper.ts`).
- **Backend request:** `page? pageSize? keyword? includeDeleted?`; **response (flat):** `{items[], totalCount, page, pageSize, totalPages}` with fields `{id,name,icon,color,isDefault,ownerUserId,displayOrder,isActive,deletedAt,createdAt,updatedAt}`.
- **Current state:** none.
- **Missing pieces:** whole section.
- **Implementation tasks:**
  1. `adminCategories.list({page,pageSize,keyword})` + types (`displayOrder`).
  2. `DataTable` + `Pagination` (server, param `page`); columns → name, icon glyph (as-is), color swatch, `displayOrder`, `isActive` badge.
  3. Keyword search; omit `includeDeleted` unless an include-deleted toggle is requested.
- **Acceptance criteria:** paginated list with keyword search renders backend fields; no `isActive` filter; no pagination-control bug (flat envelope is normalized).

### Flow 9: Category create

- **Goal:** add a default category.
- **Backend endpoints:** `POST /api/v1/admin/categories` (`create-category.dto.ts`, `create-category.handler.ts`).
- **Backend request:** `{name, icon?, color?, isDefault?, displayOrder?}`; **response:** created category (201).
- **Current state:** none.
- **Missing pieces:** create dialog + validation.
- **Implementation tasks:**
  1. `adminCategories.create({...})`; create dialog with `name` (required), `icon`, `color` (hex), `displayOrder` (int ≥ 0).
  2. On success: toast + refetch; on 422 map `field`.
- **Acceptance criteria:** create works; empty name blocked client-side; `displayOrder` sent (not `order`); any 2xx accepted.

### Flow 10: Category update

- **Goal:** edit a category (incl. activate/deactivate).
- **Backend endpoints:** `PATCH /api/v1/admin/categories/:id` (`update-category.dto.ts`, `update-category.handler.ts`).
- **Backend request:** `{name?, icon?, color?, isActive?, displayOrder?}`; **response:** updated category (200).
- **Current state:** none.
- **Missing pieces:** inline edit form.
- **Implementation tasks:**
  1. `adminCategories.update(id, {...})`; inline edit (name/icon/color/displayOrder/isActive toggle).
  2. Refetch on success.
- **Acceptance criteria:** update works; `isActive` toggle round-trips; 404 → "không còn tồn tại" + refetch.

### Flow 11: Category delete

- **Goal:** soft-delete a category.
- **Backend endpoints:** `DELETE /api/v1/admin/categories/:id` (200, **empty body**; `delete-category.handler.ts`).
- **Current state:** none.
- **Missing pieces:** confirm dialog.
- **Implementation tasks:**
  1. `adminCategories.remove(id)`; confirm dialog with the category name.
  2. On success: toast + refetch; **do not parse the empty body**; any 2xx = success.
- **Acceptance criteria:** delete confirms, refetches, tolerates empty body.

### Flow 12: Broadcasts list

- **Goal:** view broadcast history + fan-out status.
- **Frontend files:** `src/pages/Campaigns.tsx` (history table); `src/services/adminBroadcasts.ts`.
- **Backend endpoints:** `GET /api/v1/admin/broadcasts` (`notification.controller.ts`, `get-broadcasts.handler.ts`).
- **Backend request:** `status? pageIndex? pageSize?`; **response (flat):** `{items[], totalCount, page, pageSize, totalPages}` with `{id,title,body,targetAudience,status,scheduledAt,sentAt,targetCount,deliveredCount}`.
- **Current state:** mock "Nhật ký chiến dịch".
- **Missing pieces:** wire the table; status filter; pagination (`pageIndex`).
- **Implementation tasks:**
  1. `adminBroadcasts.list({status,pageIndex,pageSize})` + types.
  2. Replace the mock log with a paginated table; status `Badge` (`Queued`→neutral, `Sent`→success, `Failed`→danger, `Cancelled`→neutral); `deliveredCount/targetCount` as provisional.
  3. Status filter (omitted when "all").
- **Acceptance criteria:** paginated + filterable history; counts not presented as final guarantees.

### Flow 13: Broadcast compose

- **Goal:** send an immediate or scheduled broadcast.
- **Backend endpoints:** `POST /api/v1/admin/broadcasts` (`notification.controller.ts`, `create-broadcast.handler.ts`).
- **Backend request:** `{title, body, targetAudience?, scheduledAt?}` (untyped; `targetAudience` defaults `'All'`); **response:** `{…,status:'Queued',targetCount:0,deliveredCount:0}` (201).
- **Current state:** mock composer + **local "auto rules" engine (no backend)**.
- **Missing pieces:** real compose; **remove the auto-rules tab** (no automation endpoint exists).
- **Implementation tasks:**
  1. `adminBroadcasts.create({...})`; compose form: `title` (required), `body` (required), `targetAudience` (free-text; omit → `'All'`), `scheduledAt` (future instant; omit for immediate).
  2. Delete the "Gửi tự động (Automation)" tab and its `autoRules` state — it has no backend.
  3. On success: toast + refetch history; show the returned `status:'Queued'` + counts as provisional.
- **Acceptance criteria:** compose sends to backend; scheduled-in-past rejected client-side; auto-rules UI removed (no false affordance).

### Flow 14: Audit-log review

- **Goal:** browse the audit trail with filters.
- **Frontend files:** new audit section in `src/pages/Intelligence.tsx`; `src/services/adminAuditLogs.ts`.
- **Backend endpoints:** `GET /api/v1/admin/audit-logs` (`admin.controller.ts`, `get-audit-logs.handler.ts`).
- **Backend request:** `adminId? actionType? entityType? fromDate? toDate? page? pageSize?`; **response:** `{items[], pagination{page,pageSize,totalCount,totalPages}}` with `{id,adminUsername,actionType,entityType,description,createdAt}`.
- **Current state:** none.
- **Missing pieces:** whole section.
- **Implementation tasks:**
  1. `adminAuditLogs.list({...})` + types.
  2. Filter bar (5 filters) + paginated table; request uses `page` (not `pageIndex`).
  3. Label the `adminUsername` column "Admin" but be aware it currently holds a UUID (§6.2 #5); do not format it as a human name.
  4. Empty-with-filters message + clear-filters action.
- **Acceptance criteria:** all five filters serialize correctly; `page` param used; envelope read tolerantly.

### Flow 15: AI settings read

- **Goal:** view current AI settings.
- **Frontend files:** `src/pages/Configuration.tsx` (AI section); `src/services/adminAiSettings.ts`.
- **Backend endpoints:** `GET /api/v1/admin/ai-settings` (`admin-ai.controller.ts`, `get-ai-settings.handler.ts`).
- **Backend response:** `{id,modelName,systemPrompt,temperature,maxTokens,isEnabled,rebalanceThresholdPercent,updatedByAdminId,updatedAt}` — **no `apiKeyMasked`**.
- **Current state:** mock AI model select + sliders.
- **Missing pieces:** wire the form.
- **Implementation tasks:**
  1. `adminAiSettings.get()` + types.
  2. Form fields → `modelName`, `systemPrompt`, `temperature`, `maxTokens`, `isEnabled`, `rebalanceThresholdPercent`.
  3. Handle 404 (not configured yet) with a "chưa cấu hình" state.
- **Acceptance criteria:** form shows backend values; no masked-key field is rendered (it is not returned).

### Flow 16: AI settings update

- **Goal:** edit AI settings.
- **Backend endpoints:** `PATCH /api/v1/admin/ai-settings` (`admin-ai.controller.ts`, `update-ai-settings.dto.ts`, `update-ai-settings.handler.ts`).
- **Backend request:** optional `{modelName, systemPrompt, temperature[0-2], maxTokens[1-32768], apiKeyEncrypted, isEnabled, rebalanceThresholdPercent[1-100]}`; **response:** full settings object (200).
- **Current state:** alert-only save.
- **Missing pieces:** PATCH + refetch; key-field decision.
- **Implementation tasks:**
  1. `adminAiSettings.update({...})`; submit only changed fields.
  2. **Decision point (§6.2 #3):** expose `apiKeyEncrypted` as a "provider API key" field **only** if owner confirms; otherwise omit it from the form.
  3. On success: toast + **refetch** (authoritative full state).
  4. Client-side: temperature 0–2, maxTokens 1–32768, rebalanceThresholdPercent 1–100 (mirror DTO).
- **Acceptance criteria:** update round-trips; refetch after PATCH; key-field behavior matches owner decision.

### Flow 17: Plans list

- **Goal:** view subscription plans.
- **Frontend files:** `src/pages/Configuration.tsx` (plans section); `src/services/adminPlans.ts`.
- **Backend endpoints:** `GET /api/v1/admin/subscriptions/plans` (`admin-subscription.controller.ts`, `subscription.service.ts`).
- **Backend response:** raw entity array (isActive=true, price ASC): `{id,name,code,price,currency,billingCycle,features,isActive,createdAt,updatedAt}`.
- **Current state:** 3 hardcoded tier price input blocks.
- **Missing pieces:** table replacing hardcoded inputs.
- **Implementation tasks:**
  1. `adminPlans.list()` + types (coerce `price` to number).
  2. `DataTable` (no pagination — flat array); columns → name, code (mono, read-only), price (format.ts), currency, `billingCycle` (free/monthly/yearly/lifetime), features count, `isActive` badge.
- **Acceptance criteria:** table renders backend plans; no hardcoded tier inputs remain.

### Flow 18: Plan create

- **Goal:** create a plan.
- **Backend endpoints:** `POST /api/v1/admin/subscriptions/plans` (`admin-subscription.controller.ts`, `subscription.service.createPlan`).
- **Backend request:** `{code, name, description?, price, billingCycle:'monthly'|'yearly'|'lifetime', features?, isPopular?}` (201); `description`/`isPopular` dropped.
- **Current state:** none.
- **Missing pieces:** create dialog.
- **Implementation tasks:**
  1. `adminPlans.create({...})`; dialog: `code` (required), `name` (required), `price` (≥0), `billingCycle` (dropdown, no `free`), `features`.
  2. **Do not send `description`/`isPopular`** (dropped server-side); treat 500 on duplicate code as "mã gói đã tồn tại" (§6.2 #6) or flag a backend fix.
- **Acceptance criteria:** create works; `billingCycle` constrained to 3 values; duplicate-code handled with a clear message.

### Flow 19: Plan update

- **Goal:** edit a plan's price/name/features/active state.
- **Backend endpoints:** `PATCH /api/v1/admin/subscriptions/plans/:id` (`admin-subscription.controller.ts`, `subscription.service.updatePlan`).
- **Backend request:** `{name?, description?, price?, features?, isActive?, isPopular?}` (only `price/name/features/isActive` applied); **response:** `{message, plan}` (200).
- **Current state:** mock inputs.
- **Missing pieces:** edit dialog.
- **Implementation tasks:**
  1. `adminPlans.update(id, {...})`; edit dialog exposing **only** `name/price/features/isActive` (`code`/`billingCycle` read-only; do not expose `description`/`isPopular`).
  2. On success: toast + refetch; 404 → "Gói không còn tồn tại" + refetch.
- **Acceptance criteria:** update applies the 4 supported fields; read-only fields stay read-only.

### Flows NOT implemented (Case D — do not build)

- **Change role** — no backend route/handler/command exists. No UI.
- **Transaction log (`/activity`)** — no admin transaction endpoint. Replace the mock content with an explicit "chưa có API" state (or hide the nav item) — owner decision. **Blocking for Phase 2.**
- **Campaign automation ("auto rules")** — no backend. Remove the UI.

---

## 10. Recommended First Flow

**Recommendation: Phase 0 (shared infra) + Phase 1 (auth) + Flow 5 (Users list, read-only), as one vertical slice.**

**Why this first:**

- **Dependency:** no admin flow is exercisable without a Bearer `Admin` token, so auth must land first; the Users list is the natural first _data_ flow to prove the whole stack end-to-end.
- **Risk:** Users list is **read-only** and its backend is **fully implemented** (real list, pagination, `keyword` search, `status` filter — unlike the dashboard, which is 6/9 stubbed). Lowest risk to validate integration.
- **Reuse:** the pieces it forces (`api/client.ts`, list normalizer, `DataTable`, `Pagination`, `SearchInput`, `Badge`, `useAsync`, URL-driven state) are reused by _every_ other list flow (broadcasts, categories, audit logs, plans). It de-risks the whole program.
- **Validation of architecture:** it exercises auth header injection, error normalization, the `data`+`pagination` envelope (the trickiest of the four shapes), server pagination with `pageIndex`, debounced `keyword`, and the `status` filter — i.e., the core integration contract.

**Exactly what to build in the first slice:**

1. `src/lib/session.ts`, `src/lib/api/client.ts`, `src/lib/api/normalize.ts`, `src/lib/format.ts`.
2. `src/types/admin.ts` (at minimum the auth + user types).
3. `src/services/auth.ts` + `src/services/adminUsers.ts`.
4. `src/context/AuthContext.tsx` + `src/pages/Login.tsx` + route guard + 404 fallback + session-aware `TopNav` (identity + logout).
5. `src/components/ui/` minimal kit: `DataTable`, `Pagination`, `SearchInput`, `Badge`, `StatCard`/`SectionCard` (as needed), `LoadingState`, `EmptyState`, `ErrorState`, `Toast`.
6. Rewire `Members.tsx` to `adminUsers.list` (server pagination, debounced keyword, status filter) and add the detail drawer (`adminUsers.detail`).
7. Add Vitest + a few unit tests for the normalizer, error mapper, and `adminUsers` query serialization.

**Definition of done for the slice:** `pnpm lint && pnpm build` pass; an `Admin` can log in and page/search/filter the real user list at `/members`; anonymous and non-Admin are blocked; list state lives in the URL and survives refresh; loading/empty/error states are distinguishable.

---

## Appendix — Key code-verified drift register (quick reference)

| Drift                                                                                  | Where                                                       | Impact                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Dashboard 6/9 counters + 2 lists stubbed                                               | `get-admin-dashboard.handler.ts:21-35`                      | dashboard not fully real yet                |
| `GET /admin/users` no role filter                                                      | `account.repository.impl.ts:38-82`                          | admin accounts appear in user list          |
| ban/unban 500 on missing user                                                          | `ban-user.handler.ts:29`, `unban-user.handler.ts:15`        | wrong status for not-found                  |
| audit `adminUsername` = `actorAccountId`                                               | `get-audit-logs.handler.ts:28`                              | column shows a UUID                         |
| AI GET has no `apiKeyMasked`                                                           | `get-ai-settings.handler.ts:40-50`                          | masked-key UI is impossible                 |
| AI PATCH accepts `apiKeyEncrypted`                                                     | `update-ai-settings.dto.ts:35`, `admin-ai.controller.ts:35` | key-write path exists                       |
| Categories uses `displayOrder` + `page/pageSize/keyword/includeDeleted`                | `admin-category.controller.ts:34-47`, DTOs                  | brief's `isActive`/`order` assumption wrong |
| Plans list = active only; create/update drop `description`/`isPopular`; dup code → 500 | `subscription.service.ts:86-91,266-298`                     | plan UI scope + error handling              |
| Role casing `Admin` vs `admin` (login vs google)                                       | `login.handler.ts:74` vs `identity.controller.ts:279`       | gate must normalize                         |
