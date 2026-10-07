import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  Eye,
  Funnel,
  Prohibit,
  ShieldCheck,
  UserGear,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { SearchInput } from '../components/ui/SearchInput';
import { SectionCard } from '../components/ui/SectionCard';
import { ApiError, isAbortError } from '../lib/api/client';
import { formatDateTime } from '../lib/format';
import { getUserDetail, listUsers, updateUserStatus } from '../services/adminUsers';
import type { AdminUser, AdminUserStatus, ListPagination } from '../types/admin';

/**
 * Stage 2 — Members chạy bằng backend thật (`/api/v1/admin/users`).
 *
 * Quyết định đã chốt:
 * - URL search params là source of truth cho `keyword`, `status`, `pageIndex`, `pageSize`.
 * - Uỷ quyền HTTP cho `src/services/adminUsers.ts`; page không gọi `fetch`/`axios`.
 * - Nút "Cấm tài khoản" ⇒ `PATCH status=Banned`; "Bỏ cấm tài khoản" ⇒ `PATCH status=Active`.
 *   Backend KHÔNG có DELETE user, không có soft-delete và không có trạng thái
 *   `Inactive`/`Disabled` ⇒ không có nút "Xoá".
 * - Gói đăng ký / hạn ngạch AI / usage Sepay: backend chưa có API admin theo từng user
 *   (TokenQuotaService chỉ giữ usage trong memory, limit đọc từ env backend) ⇒ bỏ khỏi
 *   bảng, không map số mock thành dữ liệu thật.
 * - Backend chưa trả `role` và không lọc role ⇒ không dựng filter/role badge giả.
 */

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS: readonly number[] = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;
const ALL_STATUS = 'all';

type StatusFilter = AdminUserStatus | typeof ALL_STATUS;

const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: ALL_STATUS, label: 'Tất cả' },
  { value: 'Active', label: 'Hoạt động' },
  { value: 'Banned', label: 'Bị cấm' },
];

/** Enum backend dùng tiếng Anh (`Active`/`Banned`); nhãn hiển thị mới là tiếng Việt. */
const STATUS_LABEL: Record<AdminUserStatus, string> = {
  Active: 'Hoạt động',
  Banned: 'Bị cấm',
};

const STATUS_TONE: Record<AdminUserStatus, 'success' | 'danger'> = {
  Active: 'success',
  Banned: 'danger',
};

const SKELETON_ROWS: readonly number[] = [0, 1, 2, 3, 4];

const parsePageIndex = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parsePageSize = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
};

const parseStatus = (raw: string | null): StatusFilter =>
  raw === 'Active' || raw === 'Banned' ? raw : ALL_STATUS;

const userFullName = (user: Pick<AdminUser, 'firstName' | 'lastName' | 'userName'>): string => {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName.length > 0 ? fullName : user.userName;
};

const userInitials = (user: Pick<AdminUser, 'firstName' | 'lastName' | 'userName'>): string => {
  const parts = userFullName(user).split(/\s+/).filter((part) => part.length > 0);
  const first = parts.length > 0 ? parts[0].charAt(0) : '';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase() || '?';
};

const describeError = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
};

interface ListSnapshot {
  /** Key của query đã tạo ra dữ liệu này — dùng để biết dữ liệu còn khớp filter hiện tại không. */
  key: string;
  rows: AdminUser[];
  pagination: ListPagination;
}

interface DetailSnapshot {
  id: string;
  token: number;
  user: AdminUser | null;
  message: string | null;
}

interface Notice {
  tone: 'success' | 'warning';
  message: string;
}

const DetailRow = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <dt className="text-[10px] font-bold text-muted-light uppercase tracking-wider">{label}</dt>
    <dd className={mono ? 'text-xs text-ink-soft font-mono break-all' : 'text-xs text-ink-soft break-words'}>{value}</dd>
  </div>
);

export const Members: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL là source of truth cho filter + pagination.
  const keyword = searchParams.get('keyword') ?? '';
  const status = parseStatus(searchParams.get('status'));
  const pageIndex = parsePageIndex(searchParams.get('pageIndex'));
  const pageSize = parsePageSize(searchParams.get('pageSize'));
  const requestKeyword = keyword.trim();
  const hasActiveFilter = requestKeyword !== '' || status !== ALL_STATUS;
  const [keywordInput, setKeywordInput] = useState(keyword);

  const applyQuery = useCallback(
    (
      changes: { keyword?: string; status?: StatusFilter; pageIndex?: number; pageSize?: number },
      options?: { replace?: boolean },
    ) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (changes.keyword !== undefined) {
            // Bỏ hẳn param khi rỗng; giữ nguyên chuỗi người dùng gõ để con trỏ không nhảy.
            if (changes.keyword.length > 0) next.set('keyword', changes.keyword);
            else next.delete('keyword');
          }
          if (changes.status !== undefined) {
            if (changes.status === ALL_STATUS) next.delete('status');
            else next.set('status', changes.status);
          }
          if (changes.pageIndex !== undefined) {
            if (changes.pageIndex > 1) next.set('pageIndex', String(changes.pageIndex));
            else next.delete('pageIndex');
          }
          if (changes.pageSize !== undefined) {
            if (changes.pageSize === DEFAULT_PAGE_SIZE) next.delete('pageSize');
            else next.set('pageSize', String(changes.pageSize));
          }

          return next;
        },
        { replace: options?.replace },
      );
    },
    [setSearchParams],
  );

  const [reloadToken, setReloadToken] = useState(0);
  const [snapshot, setSnapshot] = useState<ListSnapshot | null>(null);
  const [listError, setListError] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  useEffect(() => {
    if (keywordInput === keyword) return;

    const timer = window.setTimeout(() => {
      applyQuery({ keyword: keywordInput, pageIndex: 1 }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [applyQuery, keyword, keywordInput]);

  const queryKey = `${requestKeyword}|${status}|${pageIndex}|${pageSize}|${reloadToken}`;

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      listUsers({
        pageIndex,
        pageSize,
        status: status === ALL_STATUS ? null : status,
        keyword: requestKeyword === '' ? null : requestKeyword,
        signal: controller.signal,
      })
        .then((response) => {
          if (controller.signal.aborted) return;

          // Backend không clamp `pageIndex` theo `totalPages`: URL nhập tay hoặc dữ liệu
          // co lại sau mutation có thể vượt trang cuối ⇒ về trang cuối rồi refetch.
          const lastPage = Math.max(1, response.pagination.totalPages);
          if (pageIndex > lastPage) {
            applyQuery({ pageIndex: lastPage });
            return;
          }

          setSnapshot({ key: queryKey, rows: response.data, pagination: response.pagination });
          setListError(null);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || isAbortError(error)) return;
          setListError({ key: queryKey, message: describeError(error) });
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [applyQuery, pageIndex, pageSize, queryKey, requestKeyword, status]);

  const rows = snapshot?.rows ?? [];
  const pagination = snapshot?.pagination ?? null;
  const listErrorMessage = listError?.key === queryKey ? listError.message : null;
  const isInitialLoading = snapshot === null && listErrorMessage === null;
  // Refetch lỗi thì không giữ busy indicator (nếu không spinner sẽ quay mãi và nút "Tải lại" bị khoá).
  const isRefreshing = snapshot !== null && snapshot.key !== queryKey && listErrorMessage === null;

  const refetchList = useCallback(() => setReloadToken((prev) => prev + 1), []);

  /* ------------------------------ Detail ------------------------------ */

  const [detailRequest, setDetailRequest] = useState<{ id: string; token: number } | null>(null);
  const [detailSnapshot, setDetailSnapshot] = useState<DetailSnapshot | null>(null);

  const detailKey = detailRequest === null ? null : `${detailRequest.id}#${detailRequest.token}`;
  const detailMatchesCurrent =
    detailSnapshot !== null && detailKey === `${detailSnapshot.id}#${detailSnapshot.token}`;
  const detailUser = detailMatchesCurrent ? detailSnapshot.user : null;
  const detailErrorMessage = detailMatchesCurrent ? detailSnapshot.message : null;
  const isDetailLoading = detailRequest !== null && !detailMatchesCurrent;

  useEffect(() => {
    if (!detailRequest) return;
    const controller = new AbortController();
    const { id, token } = detailRequest;

    getUserDetail(id, controller.signal)
      .then((user) => {
        if (controller.signal.aborted) return;
        setDetailSnapshot({ id, token, user, message: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setDetailSnapshot({ id, token, user: null, message: describeError(error) });
        // 404 ⇒ bản ghi đã biến mất ở nơi khác, danh sách đang cũ nên tải lại.
        if (error instanceof ApiError && error.status === 404) refetchList();
      });

    return () => controller.abort();
  }, [detailRequest, refetchList]);

  const openDetail = (userId: string) => {
    // Luôn gọi API detail khi mở, không tin dữ liệu cũ trong row.
    setDetailSnapshot(null);
    setDetailRequest((prev) => ({ id: userId, token: (prev?.token ?? 0) + 1 }));
  };

  const closeDetail = () => setDetailRequest(null);

  const refetchDetail = useCallback(() => {
    setDetailRequest((prev) => (prev ? { ...prev, token: prev.token + 1 } : prev));
  }, []);

  /* --------------------------- Ban / unban ---------------------------- */

  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const nextStatus: AdminUserStatus = statusTarget?.status === 'Banned' ? 'Active' : 'Banned';
  const isBanAction = nextStatus === 'Banned';

  const openStatusDialog = (user: AdminUser) => {
    setStatusTarget(user);
    setStatusReason('');
    setMutationError(null);
    setNotice(null);
  };

  const closeStatusDialog = () => {
    // Confirm dialog khoá theo pending flag, không chỉ khoá ở nút submit.
    if (isMutating) return;
    setStatusTarget(null);
    setMutationError(null);
  };

  const handleStatusSubmit = async () => {
    if (!statusTarget || isMutating) return;

    const target = statusTarget;
    const targetStatus: AdminUserStatus = target.status === 'Banned' ? 'Active' : 'Banned';
    const reason = statusReason.trim();

    setIsMutating(true);
    setMutationError(null);
    setNotice(null);

    try {
      // "Cấm tài khoản" (UI) ⇒ PATCH status = 'Banned'; "Bỏ cấm tài khoản" ⇒ 'Active'.
      // Gửi status đích tường minh, không dùng toggle mù. Không retry tự động.
      await updateUserStatus(
        target.id,
        targetStatus,
        targetStatus === 'Banned' && reason !== '' ? reason : undefined,
      );

      setStatusTarget(null);
      setStatusReason('');
      setNotice({
        tone: 'success',
        message:
          targetStatus === 'Banned'
            ? `Đã cấm tài khoản ${userFullName(target)}. Người dùng sẽ bị chặn đăng nhập.`
            : `Đã bỏ cấm tài khoản ${userFullName(target)}.`,
      });
      // Response ban và unban khác shape ⇒ không patch row tại chỗ, luôn refetch.
      refetchList();
      refetchDetail();
    } catch (error) {
      if (isAbortError(error)) return;

      // Backend ném 500 (không phải 404) khi account không còn tồn tại ⇒ view đang cũ.
      if (error instanceof ApiError && error.status === 500) {
        setStatusTarget(null);
        setStatusReason('');
        setNotice({
          tone: 'warning',
          message:
            'Không xác nhận được thao tác: bản ghi có thể đã bị thay đổi ở nơi khác. Danh sách vừa được tải lại.',
        });
        refetchList();
        refetchDetail();
      } else {
        setMutationError(describeError(error));
      }
    } finally {
      setIsMutating(false);
    }
  };

  /* ------------------------------ Render ------------------------------ */

  const handleKeywordChange = (value: string) => {
    // Giữ text đang gõ cục bộ để router navigation không làm rơi ký tự;
    // sau debounce, URL được cập nhật và trở thành nguồn query cho request.
    setKeywordInput(value);
  };

  const clearFilters = () => {
    setKeywordInput('');
    applyQuery({ keyword: '', status: ALL_STATUS, pageIndex: 1 });
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'member',
      header: 'Thành viên',
      render: (user) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-pill bg-primary-soft border border-primary-soft-border flex items-center justify-center font-display font-bold text-xs text-primary shrink-0 overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              userInitials(user)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-ink truncate group-hover:text-primary transition-colors">
              {userFullName(user)}
            </span>
            <span className="text-[10px] text-muted-light font-mono truncate">
              @{user.userName} · {user.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (user) => (
        <div className="flex flex-col items-start gap-1">
          <Badge tone={STATUS_TONE[user.status]} dot>
            {STATUS_LABEL[user.status] ?? user.status}
          </Badge>
          {user.status === 'Banned' && (
            <span className="text-[10px] text-muted-light max-w-[150px] truncate" title={user.statusReason ?? undefined}>
              {user.statusReason ?? 'Không có lý do'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'onboarding',
      header: 'Onboarding',
      render: (user) => (
        <Badge tone={user.isOnboardingCompleted ? 'success' : 'neutral'}>
          {user.isOnboardingCompleted ? 'Đã xong' : 'Chưa xong'}
        </Badge>
      ),
    },
    {
      key: 'contact',
      header: 'Liên hệ',
      render: (user) => (
        <div className="flex flex-col">
          <span className="font-mono text-[10px] text-body">{user.phone ?? '—'}</span>
          <span className="text-[10px] text-muted-light">{user.preferredCurrency}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      render: (user) => <span className="font-mono text-[10px] text-muted">{formatDateTime(user.createdAt)}</span>,
    },
    {
      key: 'lastLoginAt',
      header: 'Đăng nhập gần nhất',
      render: (user) => <span className="font-mono text-[10px] text-muted">{formatDateTime(user.lastLoginAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: '176px',
      render: (user) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <Button
            variant="ghost"
            icon={<Eye size={12} />}
            data-testid="members-action-view"
            aria-label="Xem thành viên"
            title="Xem thành viên"
            onClick={() => openDetail(user.id)}
          >
            <span className="hidden xl:inline">Xem</span>
          </Button>
          {user.status === 'Banned' ? (
            <Button
              variant="secondary"
              icon={<ShieldCheck size={12} />}
              data-testid="members-action-unban"
              aria-label="Unban thành viên"
              title="Unban thành viên"
              disabled={isMutating}
              onClick={() => openStatusDialog(user)}
            >
              <span className="hidden xl:inline">Unban</span>
            </Button>
          ) : (
            <Button
              variant="danger"
              icon={<Prohibit size={12} />}
              data-testid="members-action-ban"
              aria-label="Ban thành viên"
              title="Ban thành viên"
              disabled={isMutating}
              onClick={() => openStatusDialog(user)}
            >
              <span className="hidden xl:inline">Ban</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  const emptyContent = hasActiveFilter ? (
    <EmptyState
      colSpan={columns.length}
      icon={<Funnel size={18} />}
      title="Không tìm thấy kết quả khớp bộ lọc"
      description="Thử từ khóa khác hoặc xoá bộ lọc để xem toàn bộ thành viên."
      action={
        <Button variant="secondary" data-testid="members-empty-clear" onClick={clearFilters}>
          Xoá bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState
      colSpan={columns.length}
      icon={<Users size={18} />}
      title="Chưa có thành viên nào"
      description="Backend chưa trả về account nào cho trang này."
    />
  );

  const pageInfo =
    pagination === null
      ? '—'
      : rows.length === 0
        ? `0 / ${pagination.totalCount} · Trang ${pagination.page}/${Math.max(1, pagination.totalPages)}`
        : `${(pagination.page - 1) * pagination.pageSize + 1}–${
            (pagination.page - 1) * pagination.pageSize + rows.length
          } / ${pagination.totalCount} · Trang ${pagination.page}/${Math.max(1, pagination.totalPages)}`;

  return (
    <div data-testid="members-page" className="h-full flex flex-col gap-6 select-none w-full text-xs max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex justify-between items-center gap-4 h-10 px-1 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl font-bold font-display text-ink tracking-tight">Thành Viên Hệ Thống</h1>
          <p className="text-[11px] text-muted font-medium truncate">
            Danh sách, tìm kiếm và trạng thái tài khoản lấy trực tiếp từ backend (server-side).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isRefreshing && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted" role="status">
              <ArrowClockwise size={12} className="animate-spin" />
              Đang cập nhật…
            </span>
          )}
          <Button variant="secondary" icon={<ArrowClockwise size={12} />} disabled={isRefreshing} onClick={refetchList}>
            Tải lại
          </Button>
        </div>
      </div>

      {notice && (
        <div
          data-testid="members-notice"
          role="status"
          className={`px-4 py-2 rounded-control border text-[11px] font-medium ${
            notice.tone === 'success'
              ? 'bg-success-soft border-success-soft-border text-success-deep'
              : 'bg-warning-soft border-warning-soft-border text-warning-deep'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Bảng thành viên */}
        <SectionCard
          className="lg:col-span-3 h-[550px]"
          bodyClassName="flex-1 flex flex-col min-h-0 overflow-hidden"
          padded={false}
          title="Danh sách thành viên WIVI"
          subtitle={pagination === null ? 'Đang tải…' : `${pagination.totalCount} tài khoản`}
          right={
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={keywordInput}
                placeholder="Tìm theo username, email, họ tên…"
                onChange={handleKeywordChange}
              />
            </div>
          }
        >
          {listErrorMessage && (
            <div
              data-testid="members-list-error"
              role="alert"
              className="shrink-0 px-4 py-2 border-b border-danger-soft-border bg-danger-soft flex items-center justify-between gap-3"
            >
              <span className="text-[11px] font-medium text-danger-deep">{listErrorMessage}</span>
              <Button variant="secondary" icon={<ArrowClockwise size={12} />} onClick={refetchList}>
                Thử lại
              </Button>
            </div>
          )}

          {isInitialLoading ? (
            <div data-testid="members-loading" role="status" className="flex-1 p-4 space-y-2">
              <span className="sr-only">Đang tải danh sách thành viên…</span>
              {SKELETON_ROWS.map((row) => (
                <div key={row} className="h-9 rounded-control bg-surface-alt animate-pulse" />
              ))}
            </div>
          ) : snapshot === null ? (
            <div
              data-testid="members-error"
              role="alert"
              className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center"
            >
              <WarningCircle size={22} className="text-danger" />
              <p className="text-xs font-semibold text-ink-soft">Không tải được danh sách thành viên</p>
              <p className="text-[11px] text-muted-light max-w-sm">{listErrorMessage}</p>
              <Button variant="primary" icon={<ArrowClockwise size={12} />} data-testid="members-retry" onClick={refetchList}>
                Thử lại
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(user) => user.id}
              empty={emptyContent}
              className={isRefreshing ? 'opacity-60 transition-opacity' : undefined}
            />
          )}

          {/* Pagination lấy từ envelope `pagination` của backend, không tự tính từ mảng hiện tại. */}
          <div
            data-testid="members-pagination"
            className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border-premium bg-surface-alt/40"
          >
            <p className="text-[10px] font-mono text-muted" data-testid="members-page-info">
              {pageInfo}
            </p>
            <div className="flex items-center gap-2">
              <label
                htmlFor="members-page-size"
                className="text-[10px] font-bold text-muted-light uppercase tracking-wider"
              >
                Số dòng
              </label>
              <select
                id="members-page-size"
                data-testid="members-page-size"
                value={pageSize}
                onChange={(event) => applyQuery({ pageSize: Number(event.target.value), pageIndex: 1 })}
                className="bg-surface border border-hairline rounded-control py-1 px-2 text-xs text-ink outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                icon={<CaretLeft size={12} />}
                data-testid="members-prev"
                disabled={pageIndex <= 1}
                onClick={() => applyQuery({ pageIndex: pageIndex - 1 })}
              >
                Trước
              </Button>
              <Button
                variant="secondary"
                icon={<CaretRight size={12} />}
                data-testid="members-next"
                disabled={pagination === null || pageIndex >= Math.max(1, pagination.totalPages)}
                onClick={() => applyQuery({ pageIndex: pageIndex + 1 })}
              >
                Sau
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Bộ lọc + ghi chú giới hạn API */}
        <SectionCard
          className="lg:col-span-1 h-[550px]"
          bodyClassName="flex-1 flex flex-col justify-between"
          title="Lọc nâng cao"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-light uppercase tracking-wider">
                Trạng thái tài khoản
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    data-testid={`members-status-${option.value}`}
                    aria-pressed={status === option.value}
                    onClick={() => applyQuery({ status: option.value, pageIndex: 1 })}
                    className={`text-[11px] py-1.5 px-2.5 rounded-control border font-medium text-left transition-all ${
                      status === option.value
                        ? 'bg-primary-soft text-primary border-primary-soft-border font-semibold'
                        : 'bg-surface border-hairline text-muted hover:bg-surface-alt'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-control border border-hairline bg-surface-alt/60 p-3 space-y-2 text-[10px] text-muted leading-snug">
              <p className="flex items-start gap-2">
                <UserGear size={14} className="text-primary shrink-0 mt-0.5" />
                <span>
                  Gói đăng ký, hạn ngạch AI và usage Sepay theo từng user chưa có API admin ⇒ đã bỏ khỏi
                  bảng thay vì hiển thị số mock.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <WarningCircle size={14} className="text-warning shrink-0 mt-0.5" />
                <span>
                  <span className="font-mono">/admin/users</span> hiện không lọc và không trả{' '}
                  <span className="font-mono">role</span>, nên danh sách có thể chứa cả tài khoản Admin.
                  Filter role là follow-up backend.
                </span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border-premium space-y-2">
            <Button
              variant="secondary"
              className="w-full"
              data-testid="members-clear-filters"
              disabled={!hasActiveFilter}
              onClick={clearFilters}
            >
              Xoá bộ lọc
            </Button>
            <p className="text-[10px] text-muted-light leading-snug">
              <span className="font-semibold">Ban tài khoản</span> gửi{' '}
              <span className="font-mono">PATCH status=Banned</span> (chặn đăng nhập). Đây không phải
              thao tác xoá tài khoản.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Chi tiết thành viên — luôn fetch lại khi mở, không tin row trong list */}
      <Modal
        open={detailRequest !== null}
        onClose={closeDetail}
        title="Chi tiết thành viên"
        description={detailUser ? detailUser.id : 'Đang tải dữ liệu từ backend…'}
        width="max-w-2xl"
        footer={
          <Button variant="secondary" onClick={closeDetail}>
            Đóng
          </Button>
        }
      >
        <div data-testid="members-detail">
          {isDetailLoading && (
            <div role="status" className="space-y-2">
              <span className="sr-only">Đang tải chi tiết thành viên…</span>
              {SKELETON_ROWS.map((row) => (
                <div key={row} className="h-7 rounded-control bg-surface-alt animate-pulse" />
              ))}
            </div>
          )}

          {!isDetailLoading && detailErrorMessage !== null && (
            <div role="alert" className="flex flex-col items-center gap-2 py-6 text-center">
              <WarningCircle size={20} className="text-danger" />
              <p className="text-xs font-semibold text-ink-soft">Không tải được chi tiết thành viên</p>
              <p className="text-[11px] text-muted-light">{detailErrorMessage}</p>
              <Button variant="secondary" icon={<ArrowClockwise size={12} />} onClick={refetchDetail}>
                Thử lại
              </Button>
            </div>
          )}

          {!isDetailLoading && detailErrorMessage === null && detailUser !== null && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <DetailRow label="ID" value={detailUser.id} mono />
              <DetailRow label="Tên đăng nhập" value={detailUser.userName} />
              <DetailRow label="Họ tên" value={userFullName(detailUser)} />
              <DetailRow label="Email" value={detailUser.email} />
              <DetailRow label="Điện thoại" value={detailUser.phone ?? '—'} mono />
              <DetailRow label="Tiền tệ ưu tiên" value={detailUser.preferredCurrency} mono />
              <DetailRow
                label="Trạng thái"
                value={
                  <span className="flex flex-col items-start gap-1">
                    <Badge tone={STATUS_TONE[detailUser.status]} dot>
                      {STATUS_LABEL[detailUser.status] ?? detailUser.status}
                    </Badge>
                    {detailUser.status === 'Banned' && (
                      <span className="text-[10px] text-muted-light">
                        Lý do: {detailUser.statusReason ?? 'Không có'}
                      </span>
                    )}
                  </span>
                }
              />
              <DetailRow
                label="Onboarding"
                value={
                  <Badge tone={detailUser.isOnboardingCompleted ? 'success' : 'neutral'}>
                    {detailUser.isOnboardingCompleted ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
                  </Badge>
                }
              />
              <DetailRow label="Ngày tạo" value={formatDateTime(detailUser.createdAt)} mono />
              <DetailRow label="Đăng nhập gần nhất" value={formatDateTime(detailUser.lastLoginAt)} mono />
            </dl>
          )}
        </div>
      </Modal>

      {/* Confirm cấm / bỏ cấm — status đích tường minh, khoá theo pending flag */}
      <Modal
        open={statusTarget !== null}
        onClose={closeStatusDialog}
        title={isBanAction ? 'Ban tài khoản' : 'Unban tài khoản'}
        description={statusTarget ? `${userFullName(statusTarget)} · ${statusTarget.email}` : undefined}
        footer={
          <>
            <Button variant="secondary" disabled={isMutating} onClick={closeStatusDialog}>
              Huỷ
            </Button>
            <Button
              variant={isBanAction ? 'danger' : 'primary'}
              data-testid="members-confirm-submit"
              disabled={isMutating}
              onClick={() => {
                void handleStatusSubmit();
              }}
            >
              {isMutating ? 'Đang xử lý…' : isBanAction ? 'Ban tài khoản' : 'Unban tài khoản'}
            </Button>
          </>
        }
      >
        <div data-testid="members-confirm" className="space-y-3">
          <p className="text-[11px] text-body leading-relaxed">
            {statusTarget !== null &&
              (isBanAction ? (
                <>
                  Tài khoản <span className="font-semibold text-ink">{userFullName(statusTarget)}</span> (
                  {statusTarget.email}) sẽ chuyển sang trạng thái <Badge tone="danger">Bị cấm</Badge> và bị chặn
                  đăng nhập.
                </>
              ) : (
                <>
                  Tài khoản <span className="font-semibold text-ink">{userFullName(statusTarget)}</span> (
                  {statusTarget.email}) sẽ chuyển về trạng thái <Badge tone="success">Hoạt động</Badge>.
                </>
              ))}
          </p>

          {isBanAction && (
            <div className="space-y-1.5">
              <label
                htmlFor="members-status-reason"
                className="text-[10px] font-bold text-muted-light uppercase tracking-wider"
              >
                Lý do ban (không bắt buộc)
              </label>
              <textarea
                id="members-status-reason"
                data-testid="members-confirm-reason"
                rows={3}
                value={statusReason}
                disabled={isMutating}
                onChange={(event) => setStatusReason(event.target.value)}
                placeholder="Ví dụ: vi phạm điều khoản sử dụng"
                className="w-full bg-surface border border-hairline rounded-control px-3 py-2 text-xs text-ink placeholder-muted-light outline-none transition-all focus:border-primary/30 focus:ring-2 focus:ring-primary-ring"
              />
            </div>
          )}

          {mutationError !== null && (
            <p role="alert" data-testid="members-mutation-error" className="text-[11px] font-medium text-danger-deep">
              {mutationError}
            </p>
          )}

          <p className="text-[10px] text-muted-light leading-snug">
            Gửi <span className="font-mono">PATCH /api/v1/admin/users/{statusTarget?.id ?? ':id'}/status</span> với
            status đích tường minh. Thành công thì danh sách và chi tiết đang mở được tải lại.
          </p>
        </div>
      </Modal>
    </div>
  );
};
