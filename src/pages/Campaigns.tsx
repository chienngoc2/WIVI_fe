import React, { useState } from 'react';
import { Megaphone, PaperPlaneTilt, ChatCircleText, BellSimple, Envelope, CheckCircle, Trash, PencilSimple, Plus, Sparkle } from '@phosphor-icons/react';

interface Campaign {
  id: string;
  name: string;
  audience: string;
  channel: 'Push' | 'In-App' | 'Email';
  sentDate: string;
  openRate: string;
  conversionRate: string;
  status: 'Đã gửi' | 'Nháp' | 'Đang gửi';
}

interface AutoRule {
  id: string;
  triggerType: 'risk_over' | 'goal_achieved' | 'app_churn';
  channel: 'Push' | 'In-App' | 'Email';
  thresholds: number[];
  messageTemplate: string;
  status: 'Hoạt động' | 'Tạm dừng';
}

const mockCampaigns: Campaign[] = [
  { id: 'C-0182', name: 'Khuyến mãi gia hạn gói Pro', audience: 'Người dùng Pro', channel: 'Email', sentDate: '17/06 09:00', openRate: '72.4%', conversionRate: '14.2%', status: 'Đã gửi' },
  { id: 'C-0181', name: 'Đề xuất cài đặt tự động ngân sách', audience: 'Thành viên Free', channel: 'Push', sentDate: '16/06 14:30', openRate: '58.9%', conversionRate: '9.4%', status: 'Đã gửi' },
  { id: 'C-0180', name: 'Cảnh báo rủi ro chi tiêu cao', audience: 'Người dùng rủi ro cao', channel: 'In-App', sentDate: '15/06 11:15', openRate: '88.1%', conversionRate: '21.5%', status: 'Đã gửi' },
  { id: 'C-0179', name: 'Khảo sát tái kích hoạt tài khoản', audience: 'Người dùng ngưng hoạt động', channel: 'Email', sentDate: '12/06 10:00', openRate: '31.2%', conversionRate: '3.1%', status: 'Đã gửi' },
];

const segments = [
  { name: 'Thành viên Free', activeCampaigns: 2, openRate: '48%', clickRate: '18%', convRate: '5.2%' },
  { name: 'Người dùng Premium', activeCampaigns: 4, openRate: '75%', clickRate: '32%', convRate: '12.8%' },
  { name: 'Người dùng rủi ro cao', activeCampaigns: 1, openRate: '89%', clickRate: '41%', convRate: '18.4%' },
  { name: 'Thành viên tạm dừng', activeCampaigns: 1, openRate: '28%', clickRate: '8%', convRate: '2.1%' },
  { name: 'Khách hàng doanh nghiệp', activeCampaigns: 3, openRate: '82%', clickRate: '38%', convRate: '15.6%' },
];

export const Campaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  
  // Manual campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [channel, setChannel] = useState<'Push' | 'In-App' | 'Email'>('Push');
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>(['Người dùng Premium']);

  // Auto rules state
  const [autoRules, setAutoRules] = useState<AutoRule[]>([
    { id: 'AR-001', triggerType: 'risk_over', channel: 'In-App', thresholds: [70, 85, 95], messageTemplate: 'Cảnh báo: Chỉ số rủi ro chi tiêu của bạn đã vượt quá {threshold}%. Hãy kiểm tra lại ngân sách cá nhân nhé.', status: 'Hoạt động' },
    { id: 'AR-002', triggerType: 'goal_achieved', channel: 'Push', thresholds: [50, 80, 100], messageTemplate: 'Tuyệt vời! Bạn đã hoàn thành {threshold}% mục tiêu tài chính đề ra. WIVI chúc mừng bạn!', status: 'Hoạt động' },
    { id: 'AR-003', triggerType: 'app_churn', channel: 'Email', thresholds: [3, 7, 14], messageTemplate: 'Đã {threshold} ngày bạn chưa cập nhật WIVI. Đừng quên kiểm tra các báo cáo tài chính tuần này của bạn.', status: 'Tạm dừng' },
  ]);

  // Auto rule form state
  const [ruleTrigger, setRuleTrigger] = useState<'risk_over' | 'goal_achieved' | 'app_churn'>('risk_over');
  const [ruleChannel, setRuleChannel] = useState<'Push' | 'In-App' | 'Email'>('Push');
  const [ruleThresholdsText, setRuleThresholdsText] = useState('70, 85, 95');
  const [ruleTemplate, setRuleTemplate] = useState('');
  const [ruleStatus, setRuleStatus] = useState<'Hoạt động' | 'Tạm dừng'>('Hoạt động');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const toggleSegment = (segName: string) => {
    setSelectedSegments(prev =>
      prev.includes(segName) ? prev.filter(s => s !== segName) : [...prev, segName]
    );
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !message) return;
    
    const newCamp: Campaign = {
      id: `C-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      name: campaignName,
      audience: selectedSegments.join(', '),
      channel: channel,
      sentDate: 'Vừa xong',
      openRate: '0.0%',
      conversionRate: '0.0%',
      status: 'Đang gửi'
    };
    
    setCampaigns([newCamp, ...campaigns]);
    alert(`Chiến dịch "${campaignName}" đã được kích hoạt gửi tự động thành công tới ${selectedSegments.join(', ')}.`);
    setCampaignName('');
    setMessage('');
  };

  const getTriggerLabel = (type: 'risk_over' | 'goal_achieved' | 'app_churn') => {
    switch (type) {
      case 'risk_over': return 'Rủi ro vượt mức';
      case 'goal_achieved': return 'Hoàn thành mục tiêu';
      case 'app_churn': return 'Rời bỏ ứng dụng';
    }
  };


  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTemplate) return;

    const parsedThresholds = ruleThresholdsText
      .split(',')
      .map(val => parseInt(val.trim(), 10))
      .filter(val => !isNaN(val))
      .sort((a, b) => a - b);

    if (parsedThresholds.length === 0) {
      alert('Vui lòng nhập ít nhất một mốc kích hoạt hợp lệ (ví dụ: 50, 80, 100)!');
      return;
    }

    if (editingRuleId) {
      setAutoRules(prev => prev.map(r => r.id === editingRuleId ? {
        ...r,
        triggerType: ruleTrigger,
        channel: ruleChannel,
        thresholds: parsedThresholds,
        messageTemplate: ruleTemplate,
        status: ruleStatus,
      } : r));
      alert('Đã cập nhật quy tắc gửi tự động thành công!');
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
      setAutoRules(prev => [...prev, newRule]);
      alert('Đã thêm quy tắc gửi tự động mới thành công!');
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
    if (confirm('Bạn có chắc chắn muốn xóa quy tắc gửi tự động này?')) {
      setAutoRules(prev => prev.filter(r => r.id !== id));
      if (editingRuleId === id) {
        handleCancelEdit();
      }
    }
  };

  const handleToggleStatus = (id: string) => {
    setAutoRules(prev => prev.map(r => r.id === id ? {
      ...r,
      status: r.status === 'Hoạt động' ? 'Tạm dừng' : 'Hoạt động'
    } : r));
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setRuleTemplate('');
    setRuleThresholdsText('70, 85, 95');
    setRuleTrigger('risk_over');
    setRuleChannel('Push');
    setRuleStatus('Hoạt động');
  };

  return (
    <div className="h-full flex flex-col justify-between gap-5 max-w-7xl mx-auto select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight">Chiến Dịch Gửi Tin Nhắn</h1>
          <p className="text-[11px] text-gray-500 font-medium">Trung tâm thiết lập thông báo tương tác người dùng và phân tích phễu chuyển đổi.</p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-border-premium shrink-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-gray-900 shadow-premium-sm'
                : 'text-gray-500 hover:text-gray-950'
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'auto'
                ? 'bg-white text-gray-900 shadow-premium-sm'
                : 'text-gray-500 hover:text-gray-950'
            }`}
          >
            <PaperPlaneTilt size={14} />
            Gửi tự động (Automation)
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Tổng tin nhắn đã gửi', val: '142,940', note: 'Tháng này đã gửi', icon: <PaperPlaneTilt size={18} className="text-primary" /> },
          { label: 'Tỷ lệ mở trung bình', val: '64.2%', note: 'Mục tiêu: 60%', icon: <Envelope size={18} className="text-emerald-500" /> },
          { label: 'Tỷ lệ click liên kết', val: '24.8%', note: 'Mục tiêu: 20%', icon: <ChatCircleText size={18} className="text-indigo-500" /> },
          { label: 'Tỷ lệ nâng cấp gói', val: '8.4%', note: 'Mục tiêu: 7.5%', icon: <CheckCircle size={18} className="text-success" /> },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-3.5 rounded-2xl border border-border-premium shadow-premium-sm flex justify-between items-center h-[75px]">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</span>
              <span className="text-base font-bold text-gray-900 mt-1">{kpi.val}</span>
              <span className="text-[9px] font-mono text-gray-400 mt-0.5">{kpi.note}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-border-premium">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Split Main Content Area */}
      {activeTab === 'manual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Left Side: Create Campaign Form (5 Cols) */}
          <form onSubmit={handleDispatch} className="lg:col-span-5 bg-white rounded-2xl border border-border-premium shadow-premium p-4 flex flex-col justify-between h-[450px]">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
                <Megaphone size={14} className="text-primary" />
                Thiết lập chiến dịch thông báo mới
              </h3>

              {/* Channel Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kênh truyền tải thông điệp</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'Push', label: 'Cảnh báo Push', icon: <BellSimple size={14} /> },
                    { value: 'In-App', label: 'Bảng tin In-App', icon: <ChatCircleText size={14} /> },
                    { value: 'Email', label: 'Email Marketing', icon: <Envelope size={14} /> },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setChannel(item.value as any)}
                      className={`py-1.5 rounded-lg border text-[10px] font-medium flex flex-col items-center gap-1 transition-all ${
                        channel === item.value
                          ? 'bg-primary/5 text-primary border-primary/30 font-semibold shadow-premium-sm'
                          : 'bg-white border-border-premium text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tên chiến dịch gửi tin</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Động viên tiết kiệm tuần mới..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nội dung thông điệp chi tiết</label>
                <textarea
                  placeholder="Nhập nội dung tin nhắn gửi đi..."
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none font-sans"
                  required
                />
              </div>

              {/* Audience Segment Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phân khúc khách hàng nhận tin</label>
                <div className="flex flex-wrap gap-1.5 max-h-[75px] overflow-y-auto scrollbar-none">
                  {segments.map((seg) => (
                    <button
                      key={seg.name}
                      type="button"
                      onClick={() => toggleSegment(seg.name)}
                      className={`px-2 py-0.8 rounded-full border text-[9px] font-medium transition-all ${
                        selectedSegments.includes(seg.name)
                          ? 'bg-primary text-white border-transparent'
                          : 'bg-[#F1F3F5] text-gray-600 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {seg.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold py-2 rounded-lg transition-all shadow-premium-sm flex items-center justify-center gap-1.5 active:scale-95 mt-2"
            >
              <PaperPlaneTilt size={14} weight="bold" />
              Bắt đầu gửi chiến dịch tin nhắn
            </button>
          </form>

          {/* Right Side: Segment Performance (Top) & Recent Campaigns (Bottom) (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5 h-[450px]">
            
            {/* Segment Performance */}
            <div className="bg-white p-3 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-[180px] overflow-hidden">
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">Hiệu quả chiến dịch theo phân khúc</h3>
                <p className="text-[9px] text-gray-400 font-medium">Tỷ lệ tương tác thành công trên các nhóm thành viên</p>
              </div>
              
              <div className="space-y-2 mt-2 overflow-y-auto scrollbar-none pr-1">
                {segments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                    <span className="font-semibold text-gray-700 w-24 truncate">{seg.name}</span>
                    
                    <div className="flex-1 mx-3 flex items-center gap-2">
                      <span className="text-[9px] text-gray-400 font-mono">Tỷ lệ chuyển đổi:</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: seg.convRate }}></div>
                      </div>
                      <span className="text-[9px] text-gray-700 font-mono font-bold w-8 text-right">{seg.convRate}</span>
                    </div>

                    <div className="text-[9px] font-mono text-gray-400 text-right flex gap-3">
                      <span>Mở: <strong className="text-gray-700">{seg.openRate}</strong></span>
                      <span>Click: <strong className="text-gray-700">{seg.clickRate}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Campaigns Table */}
            <div className="bg-white rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-[250px] overflow-hidden">
              <div className="px-3 py-2 border-b border-border-premium bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Nhật ký chiến dịch đã gửi gần đây</h3>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-premium">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-premium bg-gray-50/10 text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                      <th className="py-2 px-3">Tên chiến dịch</th>
                      <th className="py-2 px-3">Đối tượng nhận</th>
                      <th className="py-2 px-2">Ngày gửi</th>
                      <th className="py-2 px-2 text-right">Lượt mở</th>
                      <th className="py-2 px-3 text-right">Chuyển đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {campaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-gray-50/30">
                        <td className="py-2 px-3 font-semibold text-gray-800 truncate max-w-[150px]" title={camp.name}>
                          <div className="flex flex-col">
                            <span>{camp.name}</span>
                            <span className="text-[8px] font-mono text-gray-400 font-medium">Kênh: {camp.channel}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 font-medium text-[9px] max-w-[120px] truncate block">
                            {camp.audience}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-[10px] text-gray-400">{camp.sentDate}</td>
                        <td className="py-2 px-2 font-mono font-bold text-gray-700 text-right">{camp.openRate}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-600 text-right">{camp.conversionRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* AUTOMATION TAB VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Left Side: Auto Rule Form (5 Cols) */}
          <form onSubmit={handleSaveRule} className="lg:col-span-5 bg-white rounded-2xl border border-border-premium shadow-premium p-4 flex flex-col justify-between h-[450px]">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
                <PaperPlaneTilt size={14} className="text-primary" />
                {editingRuleId ? 'Cập nhật quy tắc gửi tự động' : 'Thiết lập luật gửi tự động mới'}
              </h3>

              {/* Trigger Event Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sự kiện kích hoạt gửi tin</label>
                <select
                  value={ruleTrigger}
                  onChange={(e) => {
                    const newTrigger = e.target.value as any;
                    setRuleTrigger(newTrigger);
                    if (newTrigger === 'risk_over') setRuleThresholdsText('70, 85, 95');
                    else if (newTrigger === 'goal_achieved') setRuleThresholdsText('50, 80, 100');
                    else if (newTrigger === 'app_churn') setRuleThresholdsText('3, 7, 14');
                  }}
                  disabled={!!editingRuleId}
                  className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 text-gray-700"
                >
                  <option value="risk_over">Người rủi ro (Rủi ro chi tiêu vượt mức)</option>
                  <option value="goal_achieved">Người hoàn thành mục tiêu tài chính</option>
                  <option value="app_churn">Người rời bỏ ứng dụng (Không hoạt động)</option>
                </select>
              </div>

              {/* Threshold Milestones Setting */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Thiết lập các mốc gửi tin (phân tách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder={
                    ruleTrigger === 'risk_over' ? "Ví dụ: 70, 85, 95" :
                    ruleTrigger === 'goal_achieved' ? "Ví dụ: 50, 80, 100" :
                    "Ví dụ: 3, 7, 14"
                  }
                  value={ruleThresholdsText}
                  onChange={(e) => setRuleThresholdsText(e.target.value)}
                  className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 text-gray-700 font-mono"
                  required
                />
                
                {/* Quick select presets */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[8px] text-gray-400 font-medium">Gợi ý mốc nhanh:</span>
                  {ruleTrigger === 'risk_over' && (
                    <>
                      <button type="button" onClick={() => setRuleThresholdsText('70, 85, 95')} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[8px] font-mono text-gray-600">70, 85, 95 (%)</button>
                      <button type="button" onClick={() => setRuleThresholdsText('80, 90, 100')} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[8px] font-mono text-gray-600">80, 90, 100 (%)</button>
                    </>
                  )}
                  {ruleTrigger === 'goal_achieved' && (
                    <>
                      <button type="button" onClick={() => setRuleThresholdsText('50, 80, 100')} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[8px] font-mono text-gray-600">50, 80, 100 (%)</button>
                      <button type="button" onClick={() => setRuleThresholdsText('25, 50, 75, 100')} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[8px] font-mono text-gray-600">25, 50, 75, 100 (%)</button>
                    </>
                  )}
                  {ruleTrigger === 'app_churn' && (
                    <>
                      <button type="button" onClick={() => setRuleThresholdsText('3, 7, 14')} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[8px] font-mono text-gray-600">3, 7, 14 (ngày)</button>
                      <button type="button" onClick={() => setRuleThresholdsText('7, 14, 30')} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[8px] font-mono text-gray-600">7, 14, 30 (ngày)</button>
                    </>
                  )}
                </div>
              </div>

              {/* Channel Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kênh gửi tự động</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'Push', label: 'Push Alert', icon: <BellSimple size={14} /> },
                    { value: 'In-App', label: 'In-App Feed', icon: <ChatCircleText size={14} /> },
                    { value: 'Email', label: 'Email Auto', icon: <Envelope size={14} /> },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRuleChannel(item.value as any)}
                      className={`py-1.5 rounded-lg border text-[10px] font-medium flex flex-col items-center gap-1 transition-all ${
                        ruleChannel === item.value
                          ? 'bg-primary/5 text-primary border-primary/30 font-semibold shadow-premium-sm'
                          : 'bg-white border-border-premium text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Template with Dynamic Parameters Info */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mẫu nội dung tin nhắn</label>
                  <span className="text-[8px] text-gray-400 font-mono">Dùng biến: &#123;threshold&#125;</span>
                </div>
                <textarea
                  placeholder="Nhập nội dung mẫu. Ví dụ: WIVI nhận thấy chỉ số chi tiêu rủi ro của bạn đã vượt quá {threshold}%..."
                  rows={3}
                  value={ruleTemplate}
                  onChange={(e) => setRuleTemplate(e.target.value)}
                  className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-3 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none font-sans"
                  required
                />
              </div>

              {/* Initial Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái áp dụng</label>
                <select
                  value={ruleStatus}
                  onChange={(e) => setRuleStatus(e.target.value as any)}
                  className="w-full bg-white border border-border-premium rounded-lg py-1 px-2 text-xs outline-none text-gray-700"
                >
                  <option value="Hoạt động">Kích hoạt ngay (Hoạt động)</option>
                  <option value="Tạm dừng">Tạm ngưng quét (Tạm dừng)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              {editingRuleId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-gray-105 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold py-2 rounded-lg transition-colors border border-border-premium"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                className="flex-[2] bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold py-2 rounded-lg transition-all shadow-premium-sm flex items-center justify-center gap-1 active:scale-95"
              >
                <Plus size={14} weight="bold" />
                {editingRuleId ? 'Lưu cập nhật' : 'Thêm luật gửi tự động'}
              </button>
            </div>
          </form>

          {/* Right Side: Operative Auto Rules List (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-border-premium shadow-premium p-4 flex flex-col justify-between h-[450px] overflow-hidden">
            <div className="space-y-3 flex-1 overflow-y-auto scrollbar-premium pr-1">
              <div className="flex justify-between items-center pb-2 border-b border-border-premium">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Quy tắc gửi tự động đang chạy</h3>
                  <p className="text-[9px] text-gray-400 font-medium">Hệ thống quét cron-job liên tục để kích hoạt gửi thông báo</p>
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {autoRules.filter(r => r.status === 'Hoạt động').length} Đang chạy
                </span>
              </div>

              {/* Rules List Grid */}
              <div className="space-y-3">
                {autoRules.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    Chưa thiết lập quy tắc tự động nào.
                  </div>
                ) : (
                  autoRules.map((rule) => (
                    <div 
                      key={rule.id} 
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                        editingRuleId === rule.id 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                          : 'border-border-premium bg-gray-50/30 hover:border-gray-300'
                      }`}
                    >
                      {/* Rule header */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            rule.triggerType === 'risk_over' ? 'bg-red-50 text-red-600 border border-red-100' :
                            rule.triggerType === 'goal_achieved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {getTriggerLabel(rule.triggerType)}
                          </span>
                          
                          <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 font-mono text-[9px] flex items-center gap-1">
                            {rule.channel === 'Push' ? <BellSimple size={10} /> :
                             rule.channel === 'In-App' ? <ChatCircleText size={10} /> : <Envelope size={10} />}
                            {rule.channel}
                          </span>
                          
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mr-0.5">Mốc gửi:</span>
                            {rule.thresholds.map((val, idx) => (
                              <span 
                                key={idx} 
                                className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[9px] font-mono font-bold"
                              >
                                {val}{rule.triggerType === 'app_churn' ? ' ngày' : '%'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Status Toggle and Operations */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(rule.id)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-colors ${
                              rule.status === 'Hoạt động' 
                                ? 'bg-emerald-500/10 text-success hover:bg-emerald-500/20' 
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {rule.status}
                          </button>
                          
                          <div className="flex items-center border-l border-gray-200 pl-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditRule(rule)}
                              className="text-gray-400 hover:text-primary p-0.5 rounded transition-colors"
                              title="Chỉnh sửa quy tắc"
                            >
                              <PencilSimple size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-gray-400 hover:text-danger transition-colors p-0.5 rounded"
                              title="Xóa quy tắc"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Message preview */}
                      <div className="bg-white/70 p-2 rounded-lg border border-gray-200/50 space-y-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Xem trước (Mốc kích hoạt đầu tiên):</span>
                        <p className="text-[10.5px] text-gray-600 font-sans leading-relaxed">
                          {rule.messageTemplate.replace('{threshold}', String(rule.thresholds[0] || 'X'))}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-2.5 bg-gray-50 rounded-xl border border-border-premium flex items-center gap-2.5 shrink-0 mt-3">
              <Sparkle size={16} className="text-primary shrink-0 animate-pulse" />
              <p className="text-[10px] text-gray-400 leading-snug font-medium">Hệ thống WIVI sử dụng Webhook tự động quét định kỳ các chỉ số rủi ro, tiến độ mục tiêu, và chu kỳ rời bỏ của người dùng để kích hoạt các chiến dịch truyền thông phù hợp.</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
