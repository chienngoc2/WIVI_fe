import React from 'react';
import { Cpu, Warning, WarningOctagon, Trophy, Database, Bell } from '@phosphor-icons/react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const behaviorTrends = [
  { month: 'T1', savings: 72, discipline: 74, riskRatio: 12 },
  { month: 'T2', savings: 75, discipline: 76, riskRatio: 10 },
  { month: 'T3', savings: 78, discipline: 78, riskRatio: 9 },
  { month: 'T4', savings: 81, discipline: 80, riskRatio: 8 },
  { month: 'T5', savings: 84, discipline: 82, riskRatio: 6 },
  { month: 'T6', savings: 88, discipline: 85, riskRatio: 4 },
];

const riskUsers = [
  { name: 'Nguyễn Văn A', score: '38/100', reason: 'Chi tiêu mua sắm quá mức', tier: 'Nguy hiểm' },
  { name: 'Hoàng Văn E', score: '55/100', reason: 'Tăng vọt chi tiêu giải trí', tier: 'Trung bình' },
  { name: 'Lê Hoàng D', score: '42/100', reason: 'Vi phạm ngân sách liên tục', tier: 'Cao' },
];

const churnUsers = [
  { name: 'Trần Thị B', risk: '84%', inactive: '14 ngày không hoạt động', plan: 'Premium' },
  { name: 'Vũ Minh F', risk: '76%', inactive: '10 ngày không hoạt động', plan: 'Premium' },
  { name: 'Phạm Minh C', risk: '62%', inactive: '8 ngày không hoạt động', plan: 'Free' },
];

const goalAchievers = [
  { name: 'Nguyễn Văn A', goal: 'Tiết kiệm mua nhà', progress: 96, target: '80.000.000 đ' },
  { name: 'Trần Thị B', goal: 'Quỹ dự phòng khẩn cấp', progress: 92, target: '15.000.000 đ' },
  { name: 'Phạm Minh C', goal: 'Đầu tư chứng khoán', progress: 90, target: '250.000.000 đ' },
];

const radarData = [
  { subject: 'Phân mục GD', A: 98, B: 95, fullMark: 100 },
  { subject: 'Mô hình rủi ro', A: 99, B: 90, fullMark: 100 },
  { subject: 'Phát hiện bất thường', A: 97, B: 85, fullMark: 100 },
  { subject: 'Tư vấn mục tiêu', A: 89, B: 80, fullMark: 100 },
  { subject: 'Dự báo xu hướng', A: 94, B: 88, fullMark: 100 },
  { subject: 'Dự báo rời bỏ', A: 92, B: 82, fullMark: 100 },
];

export const Intelligence: React.FC = () => {
  return (
    <div className="h-full flex flex-col justify-between gap-5 max-w-7xl mx-auto select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight flex items-center gap-1.5">
            <Cpu size={20} className="text-primary animate-pulse" />
            Vận Hành Trí Tuệ AI & Số Liệu Sepay
          </h1>
          <p className="text-[11px] text-gray-500 font-medium">Báo cáo định mức sử dụng cổng API OpenAI/Gemini và tổng lượng giao dịch cổng ngân hàng Sepay.</p>
        </div>
      </div>

      {/* Top KPI row - Platform Quota & Sepay Metrics */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Hạn ngạch API OpenAI', val: '12.450 / 20.000', target: 'Mức dùng: 62.2%', color: 'text-primary', progress: 62.2, icon: <Cpu size={16} className="text-primary" /> },
          { label: 'Hạn ngạch API Anthropic', val: '8.420 / 15.000', target: 'Mức dùng: 56.1%', color: 'text-indigo-500', progress: 56.1, icon: <Database size={16} className="text-indigo-500" /> },
          { label: 'Hạn ngạch API Gemini', val: '42.190 / 50,000', target: 'Mức dùng: 84.3%', color: 'text-purple-500', progress: 84.3, icon: <Cpu size={16} className="text-purple-500" /> },
          { label: 'Tổng thông báo Sepay nhận', val: '14.820 / 20.000', target: 'Mức nhận: 74.1%', color: 'text-success', progress: 74.1, icon: <Bell size={16} className="text-success" /> },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-3.5 rounded-2xl border border-border-premium shadow-premium-sm flex flex-col justify-between h-[85px] hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>{kpi.label}</span>
              <div className="w-5 h-5 rounded bg-gray-50 flex items-center justify-center border border-border-premium">
                {kpi.icon}
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <div className="flex flex-col">
                <span className="text-[13px] font-mono font-bold text-gray-900 leading-none">{kpi.val}</span>
                <span className="text-[9px] text-gray-400 font-mono mt-1">{kpi.target}</span>
              </div>
              <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div className={`h-full ${
                  idx === 0 ? 'bg-primary' :
                  idx === 1 ? 'bg-indigo-500' :
                  idx === 2 ? 'bg-purple-500' : 'bg-success'
                }`} style={{ width: `${kpi.progress}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row - Behavior trends & AI matrix (12 Column grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[255px]">
        
        {/* Left Side: Financial Behavior Indices (Area/Line) */}
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-full">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Chỉ Số Hành Vi Tài Chính Người Dùng</h3>
              <p className="text-[9px] text-gray-400">Tỷ lệ tiết kiệm, điểm kỷ luật tài chính và tỷ lệ giao dịch bất thường</p>
            </div>
            <div className="flex gap-3 text-[9px] font-mono">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Tiết kiệm</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Điểm kỷ luật</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Tỷ lệ rủi ro</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={behaviorTrends} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#8E9AA8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#8E9AA8' }} />
                <Tooltip contentStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="savings" stroke="#7C5CFF" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="discipline" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="riskRatio" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side: Radar Chart representing model intelligence coverage */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-full">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Khung Hiệu Năng Mô Hình Trí Tuệ AI</h3>
            <p className="text-[9px] text-gray-400">So sánh độ nhạy mô hình hiện tại so với tiêu chuẩn cơ sở</p>
          </div>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#F1F3F5" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: '#8E9AA8' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 7 }} />
                <Radar name="Active Model" dataKey="A" stroke="#7C5CFF" fill="#7C5CFF" fillOpacity={0.15} />
                <Radar name="Baseline" dataKey="B" stroke="#B3C5FF" fill="#B3C5FF" fillOpacity={0.05} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row - 3 Columns (At Risk, Churn Risk, Goal Achievers) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[190px]">
        {/* Users At Risk */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-full">
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1 text-red-500">
              <WarningOctagon size={14} />
              Thành viên rủi ro tài chính
            </h3>
            <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-none mt-2">
              {riskUsers.map((user, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{user.name}</span>
                    <span className="text-[9px] text-gray-400 truncate max-w-[150px]">{user.reason}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-mono font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                      Điểm: {user.score}
                    </span>
                    <span className="text-[9px] text-red-400 font-mono mt-0.5">{user.tier}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Churn Risk */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-full">
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1 text-amber-500">
              <Warning size={14} />
              Thành viên có nguy cơ rời bỏ
            </h3>
            <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-none mt-2">
              {churnUsers.map((user, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{user.name}</span>
                    <span className="text-[9px] text-gray-400">{user.inactive}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-50/5 px-1.5 py-0.2 rounded border border-amber-100">
                      Nguy cơ: {user.risk}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono mt-0.5">{user.plan}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Near Goal Achievement */}
        <div className="bg-white p-4 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-full">
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1 text-emerald-600">
              <Trophy size={14} />
              Thành viên sắp đạt mục tiêu
            </h3>
            <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-none mt-2">
              {goalAchievers.map((user, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{user.name}</span>
                    <span className="text-[9px] text-gray-400">{user.goal} (Mục tiêu: {user.target})</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-50/5 px-1.5 py-0.2 rounded border border-emerald-100">
                      {user.progress}% hoàn thành
                    </span>
                    <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-success" style={{ width: `${user.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
