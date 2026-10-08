import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Heartbeat,
  ShieldCheck,
  CurrencyDollar,
  ArrowsLeftRight,
  Cpu,
  ArrowClockwise,
  WarningCircle,
  UserPlus,
  TrendUp,
  CloudArrowUp,
} from '@phosphor-icons/react';
import { SectionCard } from '../components/ui/SectionCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { isAbortError } from '../lib/api/client';
import { formatDateTime } from '../lib/format';
import { getAdminDashboard } from '../services/adminDashboard';
import type { AdminDashboardResponse } from '../types/admin';

const KPI_LABELS = [
  { key: 'totalUsers', label: 'Tổng tài khoản Active', icon: <Users size={16} className="text-primary" /> },
  { key: 'newUsersThisMonth', label: 'Tài khoản mới tháng này', icon: <UserPlus size={16} className="text-emerald-500" /> },
  { key: 'activeUsersLast30Days', label: 'Active users 30 ngày', icon: <Heartbeat size={16} className="text-emerald-500" /> },
  { key: 'bannedUsers', label: 'Tài khoản bị cấm', icon: <ShieldCheck size={16} className="text-danger" /> },
  { key: 'totalTransactions', label: 'Tổng giao dịch', icon: <ArrowsLeftRight size={16} className="text-amber-500" /> },
  { key: 'transactionsThisMonth', label: 'Giao dịch tháng này', icon: <CurrencyDollar size={16} className="text-success" /> },
  { key: 'totalJars', label: 'Tổng hũ ngân sách', icon: <Cpu size={16} className="text-purple-500" /> },
  { key: 'activeGoals', label: 'Mục tiêu đang hoạt động', icon: <TrendUp size={16} className="text-indigo-500" /> },
  { key: 'pendingImportJobs', label: 'Import job chờ duyệt', icon: <CloudArrowUp size={16} className="text-info" /> },
] as const;

type KpiKey = typeof KPI_LABELS[number]['key'];

export const Overview: React.FC = () => {
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await getAdminDashboard();
      setDashboard(data);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Không tải được dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  const handleRetry = () => loadDashboard(false);

  // Render helper: show "—" for stub zeros, real numbers for meaningful counters
  const renderKpiValue = (key: KpiKey): string => {
    if (!dashboard) return '—';
    const value = dashboard!.summary[key];
    // Backend hiện trả 0 cho các counter stub (totalTransactions, totalJars, activeGoals, pendingImportJobs)
    // Chỉ hiển thị số cho 3 KPI có ý nghĩa: totalUsers, activeUsersLast30Days, bannedUsers
    const meaningfulKeys: KpiKey[] = ['totalUsers', 'activeUsersLast30Days', 'bannedUsers'];
    if (!meaningfulKeys.includes(key) && value === 0) return '—';
    return value.toLocaleString('vi-VN');
  };

  const renderKpiNote = (key: KpiKey): string => {
    if (!dashboard) return 'Đang tải…';
    const value = dashboard!.summary[key];
    const meaningfulKeys: KpiKey[] = ['totalUsers', 'activeUsersLast30Days', 'bannedUsers'];
    if (!meaningfulKeys.includes(key) && value === 0) return 'Backend stub (chưa triển khai)';
    return 'Dữ liệu thực từ backend';
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-5 max-w-7xl mx-auto select-none w-full text-xs">
        <div className="flex justify-between items-center h-10 px-1">
          <div>
            <h1 className="text-xl font-bold font-display text-ink tracking-tight">Tổng Quan Hệ Thống WIVI</h1>
            <p className="text-[11px] text-muted font-medium">Trạng thái hoạt động vận hành & phân tích số liệu tài chính thời gian thực.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {KPI_LABELS.map((kpi, idx) => (
            <div key={idx} className="bg-surface rounded-panel border border-border-premium shadow-premium-sm p-4 flex flex-col justify-between h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-light uppercase tracking-wider">{kpi.label}</span>
                <div className="w-6 h-6 rounded-md bg-surface-alt flex items-center justify-center border border-border-premium">{kpi.icon}</div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-base font-bold font-display text-ink leading-tight animate-pulse">—</span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[250px]">
          <SectionCard className="h-full" title="Tốc Độ Tăng Trưởng Thành Viên">
            <div className="h-full flex items-center justify-center text-muted">Đang tải…</div>
          </SectionCard>
          <SectionCard className="h-full" title="Doanh Thu & Tỷ Lệ Chuyển Đổi">
            <div className="h-full flex items-center justify-center text-muted">Đang tải…</div>
          </SectionCard>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[200px]">
          <SectionCard className="h-full" title="Thành Viên Tích Cực Nhất">
            <div className="h-full flex items-center justify-center text-muted">Đang tải…</div>
          </SectionCard>
          <SectionCard className="h-full" title="Hoạt Động Gần Đây">
            <div className="h-full flex items-center justify-center text-muted">Đang tải…</div>
          </SectionCard>
          <SectionCard className="h-full" title="Phân Khúc Người Dùng">
            <div className="h-full flex items-center justify-center text-muted">Đang tải…</div>
          </SectionCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col gap-5 max-w-7xl mx-auto select-none w-full text-xs">
        <div className="flex justify-between items-center h-10 px-1">
          <div>
            <h1 className="text-xl font-bold font-display text-ink tracking-tight">Tổng Quan Hệ Thống WIVI</h1>
            <p className="text-[11px] text-muted font-medium">Trạng thái hoạt động vận hành & phân tích số liệu tài chính thời gian thực.</p>
          </div>
          <Button variant="primary" icon={<ArrowClockwise size={14} />} onClick={handleRetry}>
            Thử lại
          </Button>
        </div>
        <div role="alert" className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center bg-danger-soft border border-danger-soft-border rounded-panel">
          <WarningCircle size={28} className="text-danger" />
          <p className="text-xs font-semibold text-ink-soft">Không tải được dashboard</p>
          <p className="text-[11px] text-muted-light max-w-sm">{error}</p>
          <Button variant="primary" icon={<ArrowClockwise size={12} />} onClick={handleRetry}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // ---- Render Dashboard with real data ----
  const recentUsers = dashboard!.recentUsers;
  const recentTransactions = dashboard!.recentTransactions;

  return (
    <div className="h-full flex flex-col gap-5 max-w-7xl mx-auto select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-ink tracking-tight">Tổng Quan Hệ Thống WIVI</h1>
          <p className="text-[11px] text-muted font-medium">Trạng thái hoạt động vận hành & phân tích số liệu tài chính thời gian thực.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-success-soft/20 px-2.5 py-1 rounded-control border border-success-soft-border">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold text-success uppercase tracking-wider">Hệ thống ổn định</span>
          </div>
          <Button variant="secondary" icon={<ArrowClockwise size={12} />} disabled={refreshing} onClick={() => loadDashboard(false)}>
            {refreshing ? 'Đang làm mới…' : 'Làm mới'}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid - 3 meaningful + 6 stub */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {KPI_LABELS.map((kpi, idx) => {
          const value = renderKpiValue(kpi.key);
          const isMeaningful = ['totalUsers', 'activeUsersLast30Days', 'bannedUsers'].includes(kpi.key);
          const isStub = !isMeaningful && value === '—';
          return (
            <div
              key={idx}
              className={`bg-surface rounded-panel border border-border-premium shadow-premium-sm p-4 flex flex-col justify-between h-[95px] ${
                isStub ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-light uppercase tracking-wider">{kpi.label}</span>
                <div className="w-6 h-6 rounded-md bg-surface-alt flex items-center justify-center border border-border-premium">{kpi.icon}</div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-base font-bold font-display text-ink leading-tight">{value}</span>
                <span className="text-[9px] font-medium text-muted font-mono">{renderKpiNote(kpi.key)}</span>
              </div>
              {isStub && (
                <div className="mt-2 pt-2 border-t border-border-premium">
                  <Badge tone="warning" className="text-[8px]">Stub (backend chưa tính)</Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Middle Grid - Charts (Placeholder - no time-series API) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[250px]">
        <SectionCard className="h-full flex flex-col" title="Biểu đồ: Chưa có dữ liệu time-series">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted p-4">
              <WarningCircle size={24} className="mx-auto mb-2 text-warning" />
              <p className="text-sm font-medium text-ink-soft">Backend không cung cấp API time-series</p>
              <p className="text-[11px] text-muted-light">Dashboard hiện chỉ trả aggregate counters. Biểu đồ cần endpoint riêng.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="h-full flex flex-col" title="Biểu đồ: Chưa có dữ liệu time-series">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted p-4">
              <WarningCircle size={24} className="mx-auto mb-2 text-warning" />
              <p className="text-sm font-medium text-ink-soft">Backend không cung cấp API time-series</p>
              <p className="text-[11px] text-muted-light">Dashboard hiện chỉ trả aggregate counters. Biểu đồ cần endpoint riêng.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Bottom Grid - Recent Users & Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px]">
        {/* Recent Users */}
        <SectionCard className="h-full flex flex-col" title="Thành viên mới đăng ký" subtitle={`${recentUsers.length} bản ghi`}>
          {recentUsers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<Users size={18} />} title="Chưa có thành viên mới" description="Backend trả về mảng rỗng." />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-hairline last:border-0 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-pill bg-primary-soft border border-primary-soft-border flex items-center justify-center font-display font-bold text-xs text-primary shrink-0 overflow-hidden">
                      {user.firstName?.charAt(0) ?? '?'}{user.lastName?.charAt(0) ?? ''}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-ink truncate group-hover:text-primary transition-colors">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-[10px] text-muted-light font-mono truncate">@{user.username} · {user.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={user.status === 'Active' ? 'success' : 'danger'} dot className="text-[9px]">
                      {user.status === 'Active' ? 'Hoạt động' : 'Bị cấm'}
                    </Badge>
                    <span className="text-[10px] text-muted font-mono">{formatDateTime(user.lastLoginAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Transactions */}
        <SectionCard className="h-full flex flex-col" title="Giao dịch gần đây" subtitle={`${recentTransactions.length} bản ghi`}>
          {recentTransactions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<ArrowsLeftRight size={18} />} title="Chưa có giao dịch gần đây" description="Backend trả về mảng rỗng." />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-hairline last:border-0 group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'Income' ? 'bg-success' : 'bg-danger'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-ink truncate">{tx.user.firstName} {tx.user.lastName}</span>
                      <span className="text-[10px] text-muted-light truncate">
                        {tx.category.name} · {tx.financialAccount.name} ({tx.financialAccount.accountType})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono font-bold text-[11px] ${tx.type === 'Income' ? 'text-success' : 'text-danger'}`}>
                      {tx.type === 'Income' ? '+' : '-'}{tx.transactionsAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[10px] text-muted font-mono">{formatDateTime(tx.transactionDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};