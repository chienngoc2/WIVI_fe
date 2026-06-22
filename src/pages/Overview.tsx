import React from 'react';
import { Users, Heartbeat, ShieldCheck, CurrencyDollar, ArrowsLeftRight, Cpu, TrendUp } from '@phosphor-icons/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';

const userGrowthData = [
  { name: 'T1', users: 85000, active: 68000 },
  { name: 'T2', users: 88200, active: 71000 },
  { name: 'T3', users: 92400, active: 75500 },
  { name: 'T4', users: 96800, active: 79000 },
  { name: 'T5', users: 100500, active: 82100 },
  { name: 'T6', users: 104240, active: 84950 },
];

const revenueTrendData = [
  { name: 'T1', revenue: 490000, conversion: 28.5 },
  { name: 'T2', revenue: 510000, conversion: 29.2 },
  { name: 'T3', revenue: 545000, conversion: 30.1 },
  { name: 'T4', revenue: 580000, conversion: 30.8 },
  { name: 'T5', revenue: 615000, conversion: 31.4 },
  { name: 'T6', revenue: 642800, conversion: 32.8 },
];

const segments = [
  { name: 'Tích lũy tài sản', share: '38%', count: '39.6k thành viên', color: 'bg-primary' },
  { name: 'Xử lý nợ xấu', share: '24%', count: '25.0k thành viên', color: 'bg-indigo-400' },
  { name: 'Nhà đầu tư tích cực', share: '21%', count: '21.9k thành viên', color: 'bg-emerald-400' },
  { name: 'Tiết kiệm vãng lai', share: '17%', count: '17.7k thành viên', color: 'bg-amber-400' },
];

const activeUsers = [
  { name: 'Nguyễn Văn A', usage: '156 GD/tháng', score: '94/100', status: 'Gói Pro' },
  { name: 'Trần Thị B', usage: '142 GD/tháng', score: '91/100', status: 'Gói Premium' },
  { name: 'Phạm Minh C', usage: '128 GD/tháng', score: '88/100', status: 'Gói Pro' },
  { name: 'Vũ Minh F', usage: '115 GD/tháng', score: '92/100', status: 'Gói Premium' },
];

const activities = [
  { id: '1', type: 'quota_warn', message: 'Hạn ngạch đạt ngưỡng cảnh báo đối với user Hoàng Văn E. (94% dung lượng)', time: '3 phút trước' },
  { id: '2', type: 'risk_alert', message: 'Phát hiện bất thường giao dịch trên mã node transaction #8491A', time: '14 phút trước' },
  { id: '3', type: 'sub_renew', message: 'Gia hạn gói Pro thành công: Nguyễn Văn A (990.000 đ)', time: '28 phút trước' },
  { id: '4', type: 'ai_optim', message: 'Mô hình AI tự động tối ưu hóa cấu trúc phân loại giao dịch ngân hàng', time: '1 giờ trước' },
];

export const Overview: React.FC = () => {
  return (
    <div className="h-full flex flex-col justify-between gap-5 select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight flex items-center gap-2">
            Tổng Quan Hệ Thống WIVI
          </h1>
          <p className="text-[11px] text-gray-500 font-medium font-sans">
            Trạng thái hoạt động vận hành & phân tích số liệu tài chính thời gian thực.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold text-success uppercase tracking-wider">Hệ thống ổn định nominal</span>
          </div>
          <button className="bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-premium-sm active:scale-95">
            Báo cáo nhanh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - High Information Density (6 Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {[
          { label: 'Tổng Thành Viên', val: '104,240', change: '+8.4%', up: true, icon: <Users size={16} className="text-primary" /> },
          { label: 'Thành Viên Active', val: '84,950', change: '+12.1%', up: true, icon: <Heartbeat size={16} className="text-emerald-500" /> },
          { label: 'Gói Trả Phí', val: '32,840', change: '+14.2%', up: true, icon: <ShieldCheck size={16} className="text-indigo-500" /> },
          { label: 'Doanh Thu MTD', val: '642,8M đ', change: '+19.5%', up: true, icon: <CurrencyDollar size={16} className="text-success" /> },
          { label: 'Giao Dịch MTD', val: '2,14M', change: '+5.2%', up: true, icon: <ArrowsLeftRight size={16} className="text-amber-500" /> },
          { label: 'Hạn ngạch AI dùng', val: '62.2%', change: '+0.8%', up: true, icon: <Cpu size={16} className="text-purple-500" /> },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm flex flex-col justify-between h-[95px] hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</span>
              <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center border border-border-premium">
                {kpi.icon}
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-base font-bold font-display text-gray-900 leading-tight">{kpi.val}</span>
              <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono">
                <TrendUp size={10} />
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Grid - Charts (12-Column Layout, 2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[250px]">
        {/* User Growth Chart (Left Column) */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm flex flex-col justify-between h-full">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Tốc Độ Tăng Trưởng Thành Viên</h3>
              <p className="text-[10px] text-gray-400">Số lượng thành viên hoạt động trên hệ thống</p>
            </div>
            <div className="flex gap-4 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> Tổng số</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Active</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#8E9AA8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#8E9AA8' }} />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  labelStyle={{ fontWeight: 'bold' }} 
                />
                <Line type="monotone" dataKey="users" stroke="#7C5CFF" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="active" stroke="#818CF8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription & Revenue conversion chart (Right Column) */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm flex flex-col justify-between h-full">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Doanh Thu & Tỷ Lệ Chuyển Đổi</h3>
              <p className="text-[10px] text-gray-400">Doanh thu định kỳ hàng tháng và chỉ số nâng cấp gói</p>
            </div>
            <div className="flex gap-4 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Doanh thu</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> Tỷ lệ chuyển đổi</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#8E9AA8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#8E9AA8' }} />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  labelStyle={{ fontWeight: 'bold' }} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Line type="monotone" dataKey="conversion" stroke="#7C5CFF" strokeWidth={1.5} dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid - Executive Widgets (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[200px]">
        {/* User Segments */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm flex flex-col justify-between h-full">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Phân Khúc Người Dùng</h3>
            <div className="space-y-2 max-h-[130px] overflow-y-auto scrollbar-none">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${seg.color}`}></div>
                    <span className="text-gray-600 font-medium">{seg.name}</span>
                  </div>
                  <div className="flex gap-2 font-mono text-gray-400">
                    <span className="text-gray-800 font-semibold">{seg.share}</span>
                    <span>({seg.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Active Users */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm flex flex-col justify-between h-full">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Thành Viên Tích Cực Nhất</h3>
            <div className="space-y-2 max-h-[130px] overflow-y-auto scrollbar-none">
              {activeUsers.map((user, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">{user.name}</span>
                    <span className="text-[10px] text-gray-400">{user.usage}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/5 px-1.5 py-0.2 rounded border border-emerald-500/10">
                      Điểm: {user.score}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono mt-0.5">{user.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium-sm flex flex-col justify-between h-full">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Hoạt Động Hệ Thống Gần Đây</h3>
            <div className="space-y-2 max-h-[130px] overflow-y-auto scrollbar-none">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start justify-between text-[11px] gap-2 py-0.5">
                  <div className="flex gap-1.5 items-start">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      act.type === 'quota_warn' ? 'bg-amber-500 animate-pulse' :
                      act.type === 'risk_alert' ? 'bg-red-500 animate-pulse' :
                      act.type === 'sub_renew' ? 'bg-emerald-500' : 'bg-primary'
                    }`}></span>
                    <p className="text-gray-600 line-clamp-2 leading-snug">{act.message}</p>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono shrink-0 whitespace-nowrap">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
