import React, { useCallback, useEffect, useState } from 'react';
import {
  Sliders,
  Cpu,
  CloudArrowUp,
  Tag,
  ArrowClockwise as RefreshIcon,
  Plus,
  PencilSimple,
  Trash,
  WarningCircle,
  Check,
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { ApiError, isAbortError } from '../lib/api/client';
import { getAiSettings, updateAiSettings } from '../services/adminAiSettings';
import { createPlan, listPlans, updatePlan } from '../services/adminPlans';
import type {
  AdminAiSettings,
  AdminSubscriptionPlan,
  BillingCycle,
  CreatePlanRequest,
  UpdateAiSettingsRequest,
  UpdatePlanRequest,
} from '../types/admin';

const BILLING_CYCLE_OPTIONS: readonly { value: BillingCycle; label: string }[] = [
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'yearly', label: 'Hàng năm' },
  { value: 'lifetime', label: 'Trọn đời' },
];

const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: 'Tháng',
  yearly: 'Năm',
  lifetime: 'Trọn đời',
};

export const Configuration: React.FC = () => {
  /* ======================== STAGE 4 — AI SETTINGS ======================== */
  const [aiSettings, setAiSettingsState] = useState<AdminAiSettings | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaveError, setAiSaveError] = useState<string | null>(null);
  const [aiSaveSuccess, setAiSaveSuccess] = useState<string | null>(null);

  // AI form state
  const [modelName, setModelName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [rebalanceThresholdPercent, setRebalanceThresholdPercent] = useState('');

  const loadAiSettings = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await getAiSettings();
      setAiSettingsState(data);
      setModelName(data.modelName);
      setSystemPrompt(data.systemPrompt);
      setTemperature(String(data.temperature));
      setMaxTokens(String(data.maxTokens));
      setIsEnabled(data.isEnabled);
      setRebalanceThresholdPercent(String(data.rebalanceThresholdPercent));
    } catch (error) {
      if (isAbortError(error)) return;
      if (error instanceof ApiError && error.status === 404) {
        // Chưa có cấu hình AI - hiển thị form rỗng để tạo mới
        setAiSettingsState(null);
        setAiError(null);
      } else {
        setAiError('Không tải được cấu hình AI: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
      }
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAiSettings();
  }, [loadAiSettings]);

  const handleAiSave = async () => {
    setAiSaving(true);
    setAiSaveError(null);
    setAiSaveSuccess(null);

    const payload: UpdateAiSettingsRequest = {
      modelName: modelName.trim() || null,
      systemPrompt: systemPrompt.trim() || null,
      temperature: temperature ? parseFloat(temperature) : null,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : null,
      isEnabled,
    };

    try {
      await updateAiSettings(payload);
      setAiSaveSuccess('Đã lưu cấu hình AI thành công.');
      // Refetch để hiển thị giá trị thực tế đã lưu
      loadAiSettings();
    } catch (error) {
      if (isAbortError(error)) return;
      setAiSaveError('Lưu cấu hình AI thất bại: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setAiSaving(false);
    }
  };

  /* ======================== STAGE 5 — SUBSCRIPTION PLANS ======================== */
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  type PlanFormState = {
    code: string;
    name: string;
    description: string;
    price: string;
    billingCycle: BillingCycle;
    features: string;
    isPopular: boolean;
    isActive: boolean;
  };

  const [planForm, setPlanForm] = useState<PlanFormState>({
    code: '',
    name: '',
    description: '',
    price: '',
    billingCycle: 'monthly',
    features: '',
    isPopular: false,
    isActive: true,
  });
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await listPlans();
      setPlans(data);
    } catch (error) {
      if (isAbortError(error)) return;
      setPlansError('Không tải được danh sách gói: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlans();
  }, [loadPlans]);

  const openCreatePlan = () => {
    setEditingPlanId(null);
    setPlanForm({
      code: '',
      name: '',
      description: '',
      price: '',
      billingCycle: 'monthly',
      features: '',
      isPopular: false,
      isActive: true,
    });
    setPlanError(null);
    setPlanSuccess(null);
  };

  const openEditPlan = (plan: AdminSubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      price: String(plan.price),
      billingCycle: plan.billingCycle,
      features: plan.features.join(', '),
      isPopular: plan.isPopular ?? false,
      isActive: plan.isActive,
    });
    setPlanError(null);
    setPlanSuccess(null);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.code.trim() || !planForm.name.trim() || !planForm.price.trim() || planSaving) return;

    setPlanSaving(true);
    setPlanError(null);
    setPlanSuccess(null);

    const price = parseFloat(planForm.price);
    const features = planForm.features
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    try {
      if (editingPlanId) {
        // Update - không gửi code, billingCycle
        const updatePayload: UpdatePlanRequest = {
          name: planForm.name.trim(),
          description: planForm.description.trim() || null,
          price,
          features: features.length > 0 ? features : null,
          isActive: planForm.isActive,
          isPopular: planForm.isPopular,
        };
        await updatePlan(editingPlanId, updatePayload);
        setPlanSuccess(`Đã cập nhật gói "${planForm.name.trim()}" thành công.`);
      } else {
        // Create - cần code, billingCycle
        const createPayload: CreatePlanRequest = {
          code: planForm.code.trim(),
          name: planForm.name.trim(),
          description: planForm.description.trim() || null,
          price,
          billingCycle: planForm.billingCycle,
          features: features.length > 0 ? features : null,
          isPopular: planForm.isPopular,
        };
        await createPlan(createPayload);
        setPlanSuccess(`Đã tạo gói "${planForm.name.trim()}" thành công.`);
      }
      loadPlans();
      setEditingPlanId(null);
    } catch (error) {
      if (isAbortError(error)) return;
      setPlanError((error instanceof ApiError && error.field === 'code')
        ? 'Mã gói (code) đã tồn tại. Vui lòng chọn mã khác.'
        : 'Lưu gói thất bại: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setPlanSaving(false);
    }
  };

  const handlePlanCancel = () => {
    setEditingPlanId(null);
    setPlanError(null);
    setPlanSuccess(null);
  };

  const handleDeletePlan = async (plan: AdminSubscriptionPlan) => {
    if (!confirm(`Bạn có chắc chắn muốn vô hiệu hóa gói "${plan.name}"? (Backend chỉ cho phép isActive=false, không có DELETE)`)) return;
    try {
      await updatePlan(plan.id, { isActive: false });
      setPlanSuccess(`Đã vô hiệu hóa gói "${plan.name}".`);
      loadPlans();
    } catch (error) {
      if (isAbortError(error)) return;
      setPlanError('Vô hiệu hóa thất bại: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    }
  };

  /* ======================== RENDER ======================== */
  return (
    <div className="h-full flex flex-col gap-5 max-w-7xl mx-auto select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-ink tracking-tight flex items-center gap-1.5">
            <Sliders size={20} className="text-primary" />
            Cấu Hình Tham Số Hệ Thống
          </h1>
          <p className="text-[11px] text-muted font-medium">Thiết lập cấu hình AI, chu kỳ đồng bộ, và biểu giá gói đăng ký người dùng.</p>
        </div>
      </div>

      {/* Main Grid - 2 columns: AI Settings (left) + Subscription Plans (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

        {/* STAGE 4: AI SETTINGS */}
        <SectionCard className="h-[550px] flex flex-col" title="Cấu hình AI" subtitle={aiLoading ? 'Đang tải…' : aiSettings ? 'Đã tải' : 'Chưa có cấu hình'}>
          {aiError && (
            <div role="alert" className="shrink-0 px-4 py-2 border-b border-danger-soft-border bg-danger-soft flex items-center justify-between gap-3 mb-4">
              <span className="text-[11px] font-medium text-danger-deep">{aiError}</span>
              <Button variant="secondary" icon={<RefreshIcon size={12} />} onClick={loadAiSettings}>
                Thử lại
              </Button>
            </div>
          )}

          {aiSaveError && (
            <div role="alert" className="shrink-0 px-4 py-2 border-b border-danger-soft-border bg-danger-soft flex items-center justify-between gap-3 mb-4">
              <span className="text-[11px] font-medium text-danger-deep">{aiSaveError}</span>
            </div>
          )}

          {aiSaveSuccess && (
            <div role="status" className="shrink-0 px-4 py-2 border-b border-success-soft-border bg-success-soft flex items-center justify-between gap-3 mb-4">
              <span className="text-[11px] font-medium text-success-deep">{aiSaveSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAiSave} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
                <Cpu size={15} className="text-primary" />
                Mô hình AI
              </h3>

              {/* Model Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Tên mô hình (modelName)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: wivi-core-v3.2"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring"
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">System Prompt</label>
                <textarea
                  placeholder="Nhập system prompt cho AI..."
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring resize-none font-sans"
                />
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Temperature (độ sáng tạo 0-2)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  placeholder="Ví dụ: 0.7"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring font-mono"
                />
              </div>

              {/* Max Tokens */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Max Tokens</label>
                <input
                  type="number"
                  min="1"
                  max="8192"
                  placeholder="Ví dụ: 2048"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring font-mono"
                />
              </div>

              {/* Rebalance Threshold Percent */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Ngưỡng cân bằng lại (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ví dụ: 10"
                  value={rebalanceThresholdPercent}
                  onChange={(e) => setRebalanceThresholdPercent(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring font-mono"
                />
              </div>

              {/* Is Enabled */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-ink-soft">Kích hoạt AI</span>
                  <span className="text-[9px] text-muted">Bật/tắt toàn bộ tính năng AI cho hệ thống</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none ${
                    isEnabled ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                    isEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>
            </div>

            <div className="shrink-0 pt-3 border-t border-border-premium flex justify-end gap-2">
              <Button variant="secondary" onClick={loadAiSettings} disabled={aiLoading || aiSaving}>
                <RefreshIcon size={12} className={aiLoading ? 'animate-spin' : ''} />
                Tải lại
              </Button>
              <Button variant="primary" type="submit" disabled={aiSaving}>
                {aiSaving ? (
                  <>
                    <RefreshIcon size={12} className="animate-spin" />
                    Đang lưu…
                  </>
                ) : (
                  <>
                    <CloudArrowUp size={14} weight="bold" />
                    Lưu cấu hình AI
                  </>
                )}
              </Button>
            </div>
          </form>
        </SectionCard>

        {/* STAGE 5: SUBSCRIPTION PLANS */}
        <SectionCard className="h-[550px] flex flex-col" title="Gói đăng ký (Subscription Plans)" subtitle={plansLoading ? 'Đang tải…' : `${plans.length} gói`}>
          {plansError && (
            <div role="alert" className="shrink-0 px-4 py-2 border-b border-danger-soft-border bg-danger-soft flex items-center justify-between gap-3 mb-4">
              <span className="text-[11px] font-medium text-danger-deep">{plansError}</span>
              <Button variant="secondary" icon={<RefreshIcon size={12} />} onClick={loadPlans}>
                Thử lại
              </Button>
            </div>
          )}

          {planError && (
            <div role="alert" className="shrink-0 px-4 py-2 border-b border-danger-soft-border bg-danger-soft flex items-center justify-between gap-3 mb-4">
              <span className="text-[11px] font-medium text-danger-deep">{planError}</span>
            </div>
          )}

          {planSuccess && (
            <div role="status" className="shrink-0 px-4 py-2 border-b border-success-soft-border bg-success-soft flex items-center justify-between gap-3 mb-4">
              <span className="text-[11px] font-medium text-success-deep">{planSuccess}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* Plans Table */}
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Tên gói',
                  render: (plan) => (
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-ink truncate">{plan.name}</span>
                      <span className="text-[9px] font-mono text-muted-light">Code: {plan.code}</span>
                    </div>
                  ),
                },
                {
                  key: 'billingCycle',
                  header: 'Kỳ thanh toán',
                  render: (plan) => (
                    <span className="px-1.5 py-0.2 rounded bg-surface-alt text-muted font-mono text-[9px]">
                      {BILLING_CYCLE_LABEL[plan.billingCycle] ?? plan.billingCycle}
                    </span>
                  ),
                },
                {
                  key: 'price',
                  header: 'Giá',
                  align: 'right',
                  render: (plan) => (
                    <span className="font-mono font-bold text-ink">{plan.price.toLocaleString('vi-VN')} {plan.currency}</span>
                  ),
                },
                {
                  key: 'features',
                  header: 'Tính năng',
                  render: (plan) => (
                    <span className="text-[9px] text-muted max-w-[200px] truncate block">{plan.features.join(', ') || '—'}</span>
                  ),
                },
                {
                  key: 'isActive',
                  header: 'Trạng thái',
                  align: 'center',
                  render: (plan) => (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                      plan.isActive ? 'bg-success-soft text-success-deep border success-soft-border' : 'bg-surface-alt text-muted border-hairline'
                    }`}>
                      {plan.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Thao tác',
                  align: 'right',
                  width: '160px',
                  render: (plan) => (
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        icon={<PencilSimple size={12} />}
                        aria-label="Chỉnh sửa gói"
                        title="Chỉnh sửa gói"
                        disabled={planSaving}
                        onClick={() => openEditPlan(plan)}
                      >
                        <span className="hidden xl:inline">Sửa</span>
                      </Button>
                      {plan.isActive ? (
                        <Button
                          variant="danger"
                          icon={<Trash size={12} />}
                          aria-label="Vô hiệu hóa gói"
                          title="Vô hiệu hóa gói (set isActive=false)"
                          disabled={planSaving}
                          onClick={() => handleDeletePlan(plan)}
                        >
                          <span className="hidden xl:inline">Vô hiệu hóa</span>
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          icon={<Check size={12} />}
                          aria-label="Kích hoạt lại gói"
                          title="Kích hoạt lại gói (set isActive=true)"
                          disabled={planSaving}
                          onClick={() => updatePlan(plan.id, { isActive: true }).then(loadPlans)}
                        >
                          <span className="hidden xl:inline">Kích hoạt</span>
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={plans}
              rowKey={(plan) => plan.id}
              empty={
                <EmptyState
                  colSpan={6}
                  icon={<Tag size={18} />}
                  title="Chưa có gói đăng ký nào"
                  description="Backend chưa trả về gói nào. Tạo gói mới để bắt đầu."
                />
              }
            />

            {/* Create/Edit Plan Form */}
            <form onSubmit={handlePlanSubmit} className="shrink-0 pt-3 border-t border-border-premium space-y-3">
              <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
                <Tag size={14} className={editingPlanId ? 'text-primary' : 'text-success'} />
                {editingPlanId ? 'Cập nhật gói đăng ký' : 'Tạo gói đăng ký mới'}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Code - chỉ hiển thị khi tạo mới, read-only khi edit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Mã gói (code) {editingPlanId ? '(không đổi được)' : '<span className="text-danger">*</span>'}</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: plan_pro_monthly"
                    value={planForm.code}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, code: e.target.value }))}
                    disabled={Boolean(editingPlanId) || planSaving}
                    className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring font-mono"
                    required
                  />
                </div>

                {/* Billing Cycle - chỉ hiển thị khi tạo mới, read-only khi edit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Kỳ thanh toán {editingPlanId ? '(không đổi được)' : '<span className="text-danger">*</span>'}</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, billingCycle: e.target.value as BillingCycle }))}
                    disabled={Boolean(editingPlanId) || planSaving}
                    className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring"
                    required
                  >
                    {BILLING_CYCLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Tên gói <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Gói Pro Hàng Tháng"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring"
                    required
                  />
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Giá (VND) <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Ví dụ: 109000"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Mô tả</label>
                <textarea
                  placeholder="Mô tả chi tiết gói..."
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring resize-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-light uppercase tracking-wider">Tính năng (phân tách bằng dấu phẩy)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: AI không giới hạn, Ưu tiên hỗ trợ, Báo cáo nâng cao"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  className="w-full bg-surface border border-hairline rounded-control py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-ink-soft">Phổ biến (isPopular)</span>
                    <span className="text-[9px] text-muted">Đánh dấu gói này là gói khuyến nghị</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, isPopular: !planForm.isPopular })}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none ${
                      planForm.isPopular ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                      planForm.isPopular ? 'translate-x-4' : 'translate-x-0'
                    }`}></div>
                  </button>
                </div>

                {editingPlanId && (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-ink-soft">Đang hoạt động (isActive)</span>
                      <span className="text-[9px] text-muted">Hiển thị gói này cho người dùng</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPlanForm({ ...planForm, isActive: !planForm.isActive })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none ${
                        planForm.isActive ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                        planForm.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={handlePlanCancel} disabled={planSaving}>
                  {editingPlanId ? 'Hủy' : 'Đóng'}
                </Button>
                <Button variant="primary" type="submit" disabled={planSaving || !planForm.code.trim() || !planForm.name.trim() || !planForm.price.trim()}>
                  {planSaving ? (
                    <>
                      <RefreshIcon size={12} className="animate-spin" />
                      Đang lưu…
                    </>
                  ) : (
                    <>
                      {editingPlanId ? <PencilSimple size={14} weight="bold" /> : <Plus size={14} weight="bold" />}
                      {editingPlanId ? 'Lưu cập nhật' : 'Tạo gói mới'}
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Add new plan button when not editing */}
            {!editingPlanId && plans.length > 0 && (
              <div className="pt-3 border-t border-border-premium">
                <Button variant="secondary" icon={<Plus size={12} />} className="w-full" onClick={openCreatePlan}>
                  Tạo gói đăng ký mới
                </Button>
              </div>
            )}

            {/* Note about backend limitations */}
            <div className="pt-3 border-t border-border-premium text-[10px] text-muted leading-snug">
              <p className="flex items-start gap-2">
                <WarningCircle size={14} className="text-warning shrink-0 mt-0.5" />
                <span>
                  Lưu ý: Backend không cho phép đổi <span className="font-mono">code</span> và <span className="font-mono">billingCycle</span> sau khi tạo.
                  Field <span className="font-mono">description</span> và <span className="font-mono">isPopular</span> được gửi nhưng có thể chưa được áp dụng bởi handler hiện tại.
                </span>
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};