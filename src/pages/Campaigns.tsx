import React, { useCallback, useEffect, useState } from 'react';
import {
  Megaphone,
  PaperPlaneTilt,
  ChatCircleText,
  BellSimple,
  Envelope,
  CheckCircle,
  Trash,
  PencilSimple,
  Plus,
  Sparkle,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  Funnel,
  WarningCircle,
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { ApiError, isAbortError } from '../lib/api/client';
import { formatDateTime } from '../lib/format';
import { createBroadcast, listBroadcasts, type ListBroadcastsParams } from '../services/adminBroadcasts';
import type {
  AdminBroadcast,
  BroadcastStatus,
  CreateBroadcastRequest,
} from '../types/admin';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS: readonly number[] = [20, 50, 100];
const ALL_STATUS = 'all';

type StatusFilter = BroadcastStatus | typeof ALL_STATUS;

const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: ALL_STATUS, label: 'Tất cả' },
  { value: 'Queued', label: 'Đang chờ' },
  { value: 'Sent', label: 'Đã gửi' },
  { value: 'Failed', label: 'Thất bại' },
  { value: 'Cancelled', label: 'Đã huỷ' },
];

const STATUS_LABEL: Record<BroadcastStatus, string> = {
  Queued: 'Đang chờ',
  Sent: 'Đã gửi',
  Failed: 'Thất bại',
  Cancelled: 'Đã huỷ',
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
  raw === 'Queued' || raw === 'Sent' || raw === 'Failed' || raw === 'Cancelled' ? raw : ALL_STATUS;

const describeError = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
};

interface ListSnapshot {
  key: string;
  rows: AdminBroadcast[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

export const Campaigns: React.FC = () => {
  // Manual broadcasts state
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Broadcast list state (URL-based pagination/filter)
  const [reloadToken, setReloadToken] = useState(0);
  const [pageIndex, setPageIndex] = useState(() => parsePageIndex(new URLSearchParams(window.location.search).get('pageIndex')));
  const [pageSize, setPageSize] = useState(() => parsePageSize(new URLSearchParams(window.location.search).get('pageSize')));
  const [statusFilter, setStatusFilter] = useState(() => parseStatus(new URLSearchParams(window.location.search).get('status')));
  const [snapshot, setSnapshot] = useState<ListSnapshot | null>(null);
  const [listError, setListError] = useState<{ key: string; message: string } | null>(null);

  // Auto rules - KEEP LOCAL MOCK (blocked/no backend API)
  type TriggerType = 'risk_over' | 'goal_achieved' | 'app_churn';
  type RuleStatus = 'Hoạt động' | 'Tạm dừng';

  interface AutoRule {
    id: string;
    triggerType: TriggerType;
    channel: 'Push' | 'In-App' | 'Email';
    thresholds: number[];
    messageTemplate: string;
    status: RuleStatus;
  }

  const [autoRules, setAutoRules] = useState<AutoRule[]>([
    { id: 'AR-001', triggerType: 'risk_over', channel: 'In-App', thresholds: [70, 85, 95], messageTemplate: 'Cảnh báo: Chỉ số rủi ro chi tiêu của bạn đã vượt quá {threshold}%. Hãy kiểm tra lại ngân sách cá nhân nhé.', status: 'Hoạt động' },
    { id: 'AR-002', triggerType: 'goal_achieved', channel: 'Push', thresholds: [50, 80, 100], messageTemplate: 'Tuyệt vời! Bạn đã hoàn thành {threshold}% mục tiêu tài chính đề ra. WIVI chúc mừng bạn!', status: 'Hoạt động' },
    { id: 'AR-003', triggerType: 'app_churn', channel: 'Email', thresholds: [3, 7, 14], messageTemplate: 'Đã {threshold} ngày bạn chưa cập nhật WIVI. Đừng quên kiểm tra các báo cáo tài chính tuần này của bạn.', status: 'Tạm dừng' },
  ]);

  const [ruleTrigger, setRuleTrigger] = useState<TriggerType>('risk_over');
  const [ruleChannel, setRuleChannel] = useState<'Push' | 'In-App' | 'Email'>('Push');
  const [ruleThresholdsText, setRuleThresholdsText] = useState('70, 85, 95');
  const [ruleTemplate, setRuleTemplate] = useState('');
  const [ruleStatus, setRuleStatus] = useState<RuleStatus>('Hoạt động');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');

  // ---- Broadcast List Data Fetching ----
  const queryKey = `${pageIndex}|${pageSize}|${statusFilter}|${reloadToken}`;

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      const params: ListBroadcastsParams = {
        pageIndex,
        pageSize,
        status: statusFilter === ALL_STATUS ? null : statusFilter,
        signal: controller.signal,
      };

      listBroadcasts(params)
        .then((response) => {
          if (controller.signal.aborted) return;

          // Backend không clamp pageIndex theo totalPages ⇒ clamp về trang cuối rồi refetch
          const lastPage = Math.max(1, response.pagination.totalPages);
          if (pageIndex > lastPage) {
            setPageIndex(lastPage);
            return;
          }

          setSnapshot({ key: queryKey, rows: response.items, pagination: response.pagination });
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
  }, [pageIndex, pageSize, statusFilter, queryKey, reloadToken]);

  const rows = snapshot?.rows ?? [];
  const pagination = snapshot?.pagination ?? null;
  const listErrorMessage = listError?.key === queryKey ? listError.message : null;
  const isInitialLoading = snapshot === null && listErrorMessage === null;
  const isRefreshing = snapshot !== null && snapshot.key !== queryKey && listErrorMessage === null;

  const refetchList = useCallback(() => setReloadToken((prev) => prev + 1), []);

  // ---- Manual Broadcast Form Handlers ----
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      // Chỉ gửi targetAudience: "All" theo contract hiện tại
      const payload: CreateBroadcastRequest = {
        title: campaignName.trim(),
        body: message.trim(),
        targetAudience: 'All',
        scheduledAt: null,
      };

      await createBroadcast(payload);

      setSubmitSuccess(`Đã tạo broadcast "${campaignName.trim()}" với trạng thái Queued.`);
      setCampaignName('');
      setMessage('');
      refetchList();
    } catch (error) {
      if (isAbortError(error)) return;
      setSubmitError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Auto Rules Handlers (LOCAL MOCK - BLOCKED) ----
  const getTriggerLabel = (type: TriggerType) => {
    switch (type) {
      case 'risk_over': return 'Rủi ro vượt mức';
      case 'goal_achieved': return 'Hoàn thành mục tiêu';
      case 'app_churn': return 'Rời bỏ ứng dụng';
    }
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTemplate.trim()) return;

    const parsedThresholds = ruleThresholdsText
      .split(',')
      .map((val) => parseInt(val.trim(), 10))
      .filter((val) => !isNaN(val))
      .sort((a, b) => a - b);

    if (parsedThresholds.length === 0) {
      alert('Vui lòng nhập ít nhất một mốc kích hoạt hợp lệ (ví dụ: 50, 80, 100)!');
      return;
    }

    if (editingRuleId) {
      setAutoRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? { ...r, triggerType: ruleTrigger, channel: ruleChannel, thresholds: parsedThresholds, messageTemplate: ruleTemplate, status: ruleStatus }
            : r,
        ),
      );
      alert('[LOCAL MOCK] Đã cập nhật quy tắc gửi tự động (backend API chưa có).');
      setEditingRuleId(null);
    } else {
      const newRule: AutoRule = {
        id: `AR-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        triggerType: ruleTrigger,
        channel: ruleChannel,
        thresholds: parsedThresholds,
        messageTemplate: ruleTemplate,
        status: ruleStatus,
      };
      setAutoRules((prev) => [...prev, newRule]);
      alert('[LOCAL MOCK] Đã thêm quy tắc gửi tự động mới (backend API chưa có).');
    }

    // Reset Form
    setRuleTemplate('');
    setRuleThresholdsText('70, 85, 95');
    setRuleTrigger('risk_over');
    setRuleChannel('Push');
    setRuleStatus('Hoạt động');
  };

  const handleEditRule = (rule: AutoRule) => {
    setEditingRuleId(rule.id);
    setRuleTrigger(rule.triggerType);
    setRuleChannel(rule.channel);
    setRuleThresholdsText(rule.thresholds.join(', '));
    setRuleTemplate(rule.messageTemplate);
    setRuleStatus(rule.status);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa quy tắc gửi tự động này? (Chỉ xóa local, backend API chưa có)')) {
      setAutoRules((prev) => prev.filter((r) => r.id !== id));
      if (editingRuleId === id) {
        handleCancelEdit();
      }
    }
  };

  const handleToggleStatus = (id: string) => {
    setAutoRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === 'Hoạt động' ? 'Tạm dừng' : 'Hoạt động' } : r,
      ),
    );
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setRuleTemplate('');
    setRuleThresholdsText('70, 85, 95');
    setRuleTrigger('risk_over');
    setRuleChannel('Push');
    setRuleStatus('Hoạt động');
  };

  // ---- Render Helpers ----
  const emptyContent = (
    <EmptyState
      colSpan={5}
      icon={<Funnel size={18} />}
      title="Không tìm thấy broadcast nào"
      description="Thử thay đổi bộ lọc trạng thái hoặc tải lại danh sách."
      action={
        <Button variant="secondary" data-testid="campaigns-empty-retry" onClick={refetchList}>
          <ArrowClockwise size={12} />
          Tải lại
        </Button>
      }
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

  const columns: Column<AdminBroadcast>[] = [
    {
      key: 'title',
      header: 'Tiêu đề',
      render: (broadcast) => (
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-ink truncate" title={broadcast.title}>
            {broadcast.title}
          </span>
          <span className="text-[8px] font-mono text-muted-light">ID: {broadcast.id.slice(0, 8)}…</span>
        </div>
      ),
    },
    {
      key: 'targetAudience',
      header: 'Đối tượng',
      render: (broadcast) => (
        <span className="px-1.5 py-0.2 rounded bg-surface-alt text-muted font-medium text-[9px] max-w-[150px] truncate block">
          {broadcast.targetAudience}
        </span>
      ),
    },
    {
      key: 'scheduledAt',
      header: 'Lên lịch',
      render: (broadcast) => (
        <span className="font-mono text-[10px] text-muted">{formatDateTime(broadcast.scheduledAt)}</span>
      ),
    },
    {
      key: 'sentAt',
      header: 'Đã gửi lúc',
      render: (broadcast) => (
        <span className="font-mono text-[10px] text-muted">{formatDateTime(broadcast.sentAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'right',
      render: (broadcast) => (
        <span className="inline-flex items-center gap-1">
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
            broadcast.status === 'Queued' ? 'bg-info-soft text-info border info-soft-border' :
            broadcast.status === 'Sent' ? 'bg-success-soft text-success-deep border success-soft-border' :
            broadcast.status === 'Failed' ? 'bg-danger-soft text-danger-deep border danger-soft-border' :
            'bg-warning-soft text-warning-deep border warning-soft-border'
          }`}>
            {STATUS_LABEL[broadcast.status] ?? broadcast.status}
          </span>
          {broadcast.status === 'Queued' && (
            <span className="text-[8px] text-muted-light font-medium">(chỉ đã queue)</span>
          )}
        </span>
      ),
    },
  ];

  // ---- Render ----
  return (
    <div className="h-full flex flex-col gap-5 max-w-7xl mx-auto select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-ink tracking-tight">Chiến Dịch Gửi Tin Nhắn</h1>
          <p className="text-[11px] text-muted font-medium">Trung tâm thiết lập thông báo tương tác người dùng và phân tích phễu chuyển đổi.</p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-surface-alt p-0.5 rounded-control border border-hairline shrink-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-chip text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-surface text-ink shadow-premium-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Megaphone size={14} />
            Chiến dịch thủ công
          </button>
          <button
            onClick={() => {
              setActiveTab('auto');
              handleCancelEdit();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-chip text-xs font-semibold transition-all ${
              activeTab === 'auto'
                ? 'bg-surface text-ink shadow-premium-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <PaperPlaneTilt size={14} />
            Gửi tự động (Automation)
          </button>
        </div>
      </div>

      {/* Top KPI Row - Show stub placeholders */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Tổng tin nhắn đã gửi', val: '—', note: 'Backend stub', icon: <PaperPlaneTilt size={18} className="text-primary" /> },
          { label: 'Tỷ lệ mở trung bình', val: '—', note: 'Backend stub', icon: <Envelope size={18} className="text-emerald-500" /> },
          { label: 'Tỷ lệ click liên kết', val: '—', note: 'Backend stub', icon: <ChatCircleText size={18} className="text-indigo-500" /> },
          { label: 'Tỷ lệ nâng cấp gói', val: '—', note: 'Backend stub', icon: <CheckCircle size={18} className="text-success" /> },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-surface rounded-panel border border-border-premium shadow-premium-sm p-3.5 flex justify-between items-center h-[75px]">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-light uppercase tracking-wider">{kpi.label}</span>
              <span className="text-base font-bold text-ink mt-1">{kpi.val}</span>
              <span className="text-[9px] font-mono text-muted mt-0.5">{kpi.note}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center border border-border-premium">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Split Main Content Area */}
      {activeTab === 'manual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Left Side: Create Campaign Form (5 Cols) */}
          <form onSubmit={handleDispatch} className="lg:col-span-5 bg-surface rounded-panel border border-border-premium shadow-premium p-4 flex flex-col justify-between h-[450px]">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
                <Megaphone size={14} className="text-primary" />
                Thiết lập chiến dịch thông báo mới
              </h3>

              {/* Campaign Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Tên chiến dịch gửi tin</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Động viên tiết kiệm tuần mới..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Nội dung thông điệp chi tiết</label>
                <textarea
                  placeholder="Nhập nội dung tin nhắn gửi đi..."
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring resize-none font-sans"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Note about targetAudience */}
              <div className="space-y-1 bg-info-soft/30 border border-info-soft-border rounded-control p-2">
                <p className="text-[10px] text-info-deep font-medium flex items-center gap-1">
                  <WarningCircle size={12} />
                  <span>Đối tượng nhận mặc định: <span className="font-mono">All</span> (tất cả thành viên). Backend hiện chưa hỗ trợ segment/channel.</span>
                </p>
              </div>

              {/* Submit Status/Error */}
              {submitError && (
                <div role="alert" className="px-2 py-1.5 rounded-control bg-danger-soft border border-danger-soft-border text-danger-deep text-[10px]">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div role="status" className="px-2 py-1.5 rounded-control bg-success-soft border border-success-soft-border text-success-deep text-[10px]">
                  {submitSuccess}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !campaignName.trim() || !message.trim()}
              className="w-full bg-primary hover:bg-primary-hover text-on-accent text-[11px] font-semibold py-2 rounded-control transition-all shadow-premium-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isSubmitting ? (
                <>
                  <ArrowClockwise size={14} className="animate-spin" />
                  Đang tạo broadcast…
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={14} weight="bold" />
                  Bắt đầu gửi chiến dịch tin nhắn
                </>
              )}
            </button>
          </form>

          {/* Right Side: Broadcast History List (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5 h-[450px]">
            <SectionCard
              className="flex-1 flex flex-col min-h-0"
              title="Lịch sử Broadcast"
              subtitle={pagination === null ? 'Đang tải…' : `${pagination.totalCount} bản ghi`}
              right={
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="bg-surface border border-hairline rounded-control py-1 px-2 text-xs text-ink outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary" icon={<ArrowClockwise size={12} />} disabled={isRefreshing} onClick={refetchList}>
                    Tải lại
                  </Button>
                </div>
              }
            >
              {listErrorMessage && (
                <div role="alert" className="shrink-0 px-4 py-2 border-b border-danger-soft-border bg-danger-soft flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-danger-deep">{listErrorMessage}</span>
                  <Button variant="secondary" icon={<ArrowClockwise size={12} />} onClick={refetchList}>
                    Thử lại
                  </Button>
                </div>
              )}

              {isInitialLoading ? (
                <div role="status" className="flex-1 p-4 space-y-2">
                  <span className="sr-only">Đang tải danh sách broadcast…</span>
                  {SKELETON_ROWS.map((row) => (
                    <div key={row} className="h-9 rounded-control bg-surface-alt animate-pulse" />
                  ))}
                </div>
              ) : snapshot === null ? (
                <div role="alert" className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <WarningCircle size={22} className="text-danger" />
                  <p className="text-xs font-semibold text-ink-soft">Không tải được danh sách broadcast</p>
                  <p className="text-[11px] text-muted-light max-w-sm">{listErrorMessage}</p>
                  <Button variant="primary" icon={<ArrowClockwise size={12} />} onClick={refetchList}>
                    Thử lại
                  </Button>
                </div>
              ) : (
                <>
                  <DataTable
                    columns={columns}
                    rows={rows}
                    rowKey={(broadcast) => broadcast.id}
                    empty={emptyContent}
                    className={isRefreshing ? 'opacity-60 transition-opacity' : undefined}
                  />

                  {/* Pagination */}
                  <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border-premium bg-surface-alt/40">
                    <p className="text-[10px] font-mono text-muted">{pageInfo}</p>
                    <div className="flex items-center gap-2">
                      <label htmlFor="campaigns-page-size" className="text-[10px] font-bold text-muted-light uppercase tracking-wider">
                        Số dòng
                      </label>
                      <select
                        id="campaigns-page-size"
                        value={pageSize}
                        onChange={(event) => {
                          setPageSize(Number(event.target.value));
                          setPageIndex(1);
                        }}
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
                        disabled={pageIndex <= 1}
                        onClick={() => setPageIndex(pageIndex - 1)}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<CaretRight size={12} />}
                        disabled={pagination === null || pageIndex >= Math.max(1, pagination.totalPages)}
                        onClick={() => setPageIndex(pageIndex + 1)}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </SectionCard>
          </div>
        </div>
      ) : (
        /* AUTOMATION TAB VIEW - BLOCKED (no backend API) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <SectionCard className="lg:col-span-5 h-[450px] flex flex-col" title="Gửi tự động (Automation) — CHƯA KHẢ DỤNG">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6">
                <WarningCircle size={32} className="text-warning mx-auto mb-3" />
                <h3 className="text-sm font-bold text-ink-soft mb-1">Chức năng này chưa khả dụng</h3>
                <p className="text-[11px] text-muted max-w-sm mx-auto">
                  Backend hiện chưa cung cấp API cho quy tắc gửi tự động (auto rules).
                  Dữ liệu dưới đây chỉ là mock cục bộ, không lưu lên server.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="lg:col-span-7 h-[450px] flex flex-col" title="Quy tắc gửi tự động (Local Mock)">
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div className="flex justify-between items-center pb-2 border-b border-border-premium">
                <div>
                  <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Quy tắc gửi tự động đang chạy (Mock)</h3>
                  <p className="text-[9px] text-muted">Hệ thống quét cron-job liên tục để kích hoạt gửi thông báo — <span className="font-bold text-warning">chưa có backend API</span></p>
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {autoRules.filter((r) => r.status === 'Hoạt động').length} Đang chạy
                </span>
              </div>

              <div className="space-y-3">
                {autoRules.length === 0 ? (
                  <div className="text-center py-10 text-muted">
                    Chưa thiết lập quy tắc tự động nào.
                  </div>
                ) : (
                  autoRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                        editingRuleId === rule.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border-premium bg-surface-alt/30 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            rule.triggerType === 'risk_over' ? 'bg-red-50 text-red-600 border border-red-100' :
                            rule.triggerType === 'goal_achieved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {getTriggerLabel(rule.triggerType)}
                          </span>

                          <span className="px-1.5 py-0.2 rounded bg-surface text-muted font-mono text-[9px] flex items-center gap-1">
                            {rule.channel === 'Push' ? <BellSimple size={10} /> :
                             rule.channel === 'In-App' ? <ChatCircleText size={10} /> : <Envelope size={10} />}
                            {rule.channel}
                          </span>

                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[8px] font-bold text-muted-light uppercase tracking-wider mr-0.5">Mốc gửi:</span>
                            {rule.thresholds.map((val, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[9px] font-mono font-bold">
                                {val}{rule.triggerType === 'app_churn' ? ' ngày' : '%'}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(rule.id)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-colors ${
                              rule.status === 'Hoạt động'
                                ? 'bg-emerald-500/10 text-success hover:bg-emerald-500/20'
                                : 'bg-surface-alt text-muted hover:bg-surface-alt/80'
                            }`}>
                            {rule.status}
                          </button>

                          <div className="flex items-center border-l border-hairline pl-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditRule(rule)}
                              className="text-muted hover:text-primary p-0.5 rounded transition-colors"
                              title="Chỉnh sửa quy tắc (local)"
                            >
                              <PencilSimple size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-muted hover:text-danger p-0.5 rounded transition-colors"
                              title="Xóa quy tắc (local)"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-surface/70 p-2 rounded-lg border border-border-premium/50 space-y-1">
                        <span className="text-[8px] font-bold text-muted-light uppercase tracking-wider block">Xem trước (Mốc kích hoạt đầu tiên):</span>
                        <p className="text-[10.5px] text-body font-sans leading-relaxed">
                          {rule.messageTemplate.replace('{threshold}', String(rule.thresholds[0] || 'X'))}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-2.5 bg-surface-alt rounded-xl border border-border-premium flex items-center gap-2.5 shrink-0 mt-3">
              <Sparkle size={16} className="text-primary shrink-0 animate-pulse" />
              <p className="text-[10px] text-muted leading-snug font-medium">Phần Automation hiện dùng mock local. Cần backend API mới có thể lưu và thực thi quy tắc tự động.</p>
            </div>
          </SectionCard>

          {/* Auto Rule Form - kept but disabled */}
          <SectionCard className="lg:col-span-5 h-[450px] flex flex-col" title="Thiết lập luật gửi tự động mới (Mock — không lưu backend)">
            <form onSubmit={handleSaveRule} className="flex-1 space-y-3 overflow-y-auto">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
                  <PaperPlaneTilt size={14} className="text-primary" />
                  {editingRuleId ? 'Cập nhật quy tắc gửi tự động' : 'Thiết lập luật gửi tự động mới'}
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Sự kiện kích hoạt gửi tin</label>
                  <select
                    value={ruleTrigger}
                    onChange={(e) => {
                      const newTrigger = e.target.value as TriggerType;
                      setRuleTrigger(newTrigger);
                      if (newTrigger === 'risk_over') setRuleThresholdsText('70, 85, 95');
                      else if (newTrigger === 'goal_achieved') setRuleThresholdsText('50, 80, 100');
                      else if (newTrigger === 'app_churn') setRuleThresholdsText('3, 7, 14');
                    }}
                    disabled={!!editingRuleId}
                    className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring text-body"
                  >
                    <option value="risk_over">Người rủi ro (Rủi ro chi tiêu vượt mức)</option>
                    <option value="goal_achieved">Người hoàn thành mục tiêu tài chính</option>
                    <option value="app_churn">Người rời bỏ ứng dụng (Không hoạt động)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Thiết lập các mốc gửi tin (phân tách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder={
                      ruleTrigger === 'risk_over' ? 'Ví dụ: 70, 85, 95' :
                      ruleTrigger === 'goal_achieved' ? 'Ví dụ: 50, 80, 100' :
                      'Ví dụ: 3, 7, 14'
                    }
                    value={ruleThresholdsText}
                    onChange={(e) => setRuleThresholdsText(e.target.value)}
                    className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring text-body font-mono"
                    required
                  />

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[8px] text-muted-light font-medium">Gợi ý mốc nhanh:</span>
                    {ruleTrigger === 'risk_over' && (
                      <>
                        <button type="button" onClick={() => setRuleThresholdsText('70, 85, 95')} className="px-1.5 py-0.5 rounded bg-surface-alt hover:bg-surface-alt/80 text-[8px] font-mono text-muted">70, 85, 95 (%)</button>
                        <button type="button" onClick={() => setRuleThresholdsText('80, 90, 100')} className="px-1.5 py-0.5 rounded bg-surface-alt hover:bg-surface-alt/80 text-[8px] font-mono text-muted">80, 90, 100 (%)</button>
                      </>
                    )}
                    {ruleTrigger === 'goal_achieved' && (
                      <>
                        <button type="button" onClick={() => setRuleThresholdsText('50, 80, 100')} className="px-1.5 py-0.5 rounded bg-surface-alt hover:bg-surface-alt/80 text-[8px] font-mono text-muted">50, 80, 100 (%)</button>
                        <button type="button" onClick={() => setRuleThresholdsText('25, 50, 75, 100')} className="px-1.5 py-0.5 rounded bg-surface-alt hover:bg-surface-alt/80 text-[8px] font-mono text-muted">25, 50, 75, 100 (%)</button>
                      </>
                    )}
                    {ruleTrigger === 'app_churn' && (
                      <>
                        <button type="button" onClick={() => setRuleThresholdsText('3, 7, 14')} className="px-1.5 py-0.5 rounded bg-surface-alt hover:bg-surface-alt/80 text-[8px] font-mono text-muted">3, 7, 14 (ngày)</button>
                        <button type="button" onClick={() => setRuleThresholdsText('7, 14, 30')} className="px-1.5 py-0.5 rounded bg-surface-alt hover:bg-surface-alt/80 text-[8px] font-mono text-muted">7, 14, 30 (ngày)</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Kênh gửi tự động</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'Push', label: 'Push Alert', icon: <BellSimple size={14} /> },
                      { value: 'In-App', label: 'In-App Feed', icon: <ChatCircleText size={14} /> },
                      { value: 'Email', label: 'Email Auto', icon: <Envelope size={14} /> },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setRuleChannel(item.value as 'Push' | 'In-App' | 'Email')}
                        className={`py-1.5 rounded-control border text-[10px] font-medium flex flex-col items-center gap-1 transition-all ${
                          ruleChannel === item.value
                            ? 'bg-primary/5 text-primary border-primary/30 font-semibold shadow-premium-sm'
                            : 'bg-surface border-hairline text-muted hover:bg-surface-alt'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Mẫu nội dung tin nhắn</label>
                    <span className="text-[8px] text-muted font-mono">Dùng biến: &#123;threshold&#125;</span>
                  </div>
                  <textarea
                    placeholder="Nhập nội dung mẫu. Ví dụ: WIVI nhận thấy chỉ số chi tiêu rủi ro của bạn đã vượt quá {threshold}%..."
                    rows={3}
                    value={ruleTemplate}
                    onChange={(e) => setRuleTemplate(e.target.value)}
                    className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring resize-none font-sans"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Trạng thái áp dụng</label>
                  <select
                    value={ruleStatus}
                    onChange={(e) => setRuleStatus(e.target.value as RuleStatus)}
                    className="w-full bg-surface border border-hairline rounded-control py-1 px-2 text-xs outline-none text-body"
                  >
                    <option value="Hoạt động">Kích hoạt ngay (Hoạt động)</option>
                    <option value="Tạm dừng">Tạm ngưng quét (Tạm dừng)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-2 pt-3 border-t border-border-premium">
                {editingRuleId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-surface-alt hover:bg-surface-alt/80 text-body text-[11px] font-semibold py-2 rounded-control transition-colors border border-hairline"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] bg-primary hover:bg-primary-hover text-on-accent text-[11px] font-semibold py-2 rounded-control transition-all shadow-premium-sm flex items-center justify-center gap-1 active:scale-95"
                >
                  <Plus size={14} weight="bold" />
                  {editingRuleId ? 'Lưu cập nhật (mock)' : 'Thêm luật gửi tự động (mock)'}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </div>
  );
};