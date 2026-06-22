import React, { useState, useMemo } from 'react';
import { MagnifyingGlass, Funnel, UserGear } from '@phosphor-icons/react';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'Miễn phí' | 'Basic (29k)' | 'Premium (59k)' | 'Pro (109k)';
  duration: '1 tháng' | '6 tháng' | '1 năm' | 'Vĩnh viễn' | '-';
  status: 'Hoạt động' | 'Tạm dừng';
  disciplineScore: number;
  aiQuotaUsed: number;
  aiQuotaLimit: number;
  sepayNotificationsUsed: number;
  sepayNotificationsLimit: number;
  lastActive: string;
}

const mockMembers: Member[] = [
  {
    id: 'W-9481',
    name: 'Nguyễn Văn A',
    email: 'nva@wivi.vn',
    avatar: 'NA',
    plan: 'Pro (109k)',
    duration: '1 năm',
    status: 'Hoạt động',
    disciplineScore: 94,
    aiQuotaUsed: 8250,
    aiQuotaLimit: 15000,
    sepayNotificationsUsed: 420,
    sepayNotificationsLimit: 1000,
    lastActive: '18/06/2026 12:10',
  },
  {
    id: 'W-7241',
    name: 'Trần Thị B',
    email: 'ttb@gmail.com',
    avatar: 'TB',
    plan: 'Premium (59k)',
    duration: '6 tháng',
    status: 'Hoạt động',
    disciplineScore: 91,
    aiQuotaUsed: 2200,
    aiQuotaLimit: 5000,
    sepayNotificationsUsed: 150,
    sepayNotificationsLimit: 500,
    lastActive: '18/06/2026 08:30',
  },
  {
    id: 'W-8392',
    name: 'Phạm Minh C',
    email: 'pmc@rostov.tech',
    avatar: 'PC',
    plan: 'Pro (109k)',
    duration: '1 năm',
    status: 'Hoạt động',
    disciplineScore: 88,
    aiQuotaUsed: 12500,
    aiQuotaLimit: 15000,
    sepayNotificationsUsed: 890,
    sepayNotificationsLimit: 1000,
    lastActive: '17/06/2026 17:15',
  },
  {
    id: 'W-5281',
    name: 'Lê Hoàng D',
    email: 'lhd@drakecapital.com',
    avatar: 'LD',
    plan: 'Miễn phí',
    duration: '-',
    status: 'Tạm dừng',
    disciplineScore: 52,
    aiQuotaUsed: 95,
    aiQuotaLimit: 100,
    sepayNotificationsUsed: 45,
    sepayNotificationsLimit: 50,
    lastActive: '17/06/2026 15:44',
  },
  {
    id: 'W-4819',
    name: 'Hoàng Văn E',
    email: 'hve@tardis.org',
    avatar: 'HE',
    plan: 'Basic (29k)',
    duration: '1 tháng',
    status: 'Hoạt động',
    disciplineScore: 78,
    aiQuotaUsed: 810,
    aiQuotaLimit: 1000,
    sepayNotificationsUsed: 120,
    sepayNotificationsLimit: 200,
    lastActive: '12/06/2026 11:20',
  },
  {
    id: 'W-6102',
    name: 'Lê Văn G',
    email: 'lvg@wivi.vn',
    avatar: 'LG',
    plan: 'Premium (59k)',
    duration: '1 tháng',
    status: 'Hoạt động',
    disciplineScore: 85,
    aiQuotaUsed: 2350,
    aiQuotaLimit: 5000,
    sepayNotificationsUsed: 180,
    sepayNotificationsLimit: 500,
    lastActive: '15/06/2026 09:15',
  },
  {
    id: 'W-2910',
    name: 'Vũ Minh F',
    email: 'vmf@vanceholdings.co',
    avatar: 'VF',
    plan: 'Premium (59k)',
    duration: '6 tháng',
    status: 'Hoạt động',
    disciplineScore: 92,
    aiQuotaUsed: 3100,
    aiQuotaLimit: 5000,
    sepayNotificationsUsed: 210,
    sepayNotificationsLimit: 500,
    lastActive: '10/06/2026 14:50',
  },
];

export const Members: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Filter members
  const filteredMembers = useMemo(() => {
    return mockMembers.filter((member) => {
      const matchSearch = member.name.toLowerCase().includes(search.toLowerCase()) || 
                          member.email.toLowerCase().includes(search.toLowerCase()) ||
                          member.id.toLowerCase().includes(search.toLowerCase());
      
      const matchPlan = filterPlan === 'All' || member.plan.includes(filterPlan) || (filterPlan === 'Miễn phí' && member.plan === 'Miễn phí');
      const matchStatus = filterStatus === 'All' || member.status === filterStatus;
      
      return matchSearch && matchPlan && matchStatus;
    });
  }, [search, filterPlan, filterStatus]);

  return (
    <div className="h-full flex flex-col gap-6 select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-2">
        <div>
          <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight">Thành Viên Hệ Thống</h1>
          <p className="text-[11px] text-gray-500 font-medium">Bảng điều khiển quản lý thành viên, hạn ngạch AI API và cổng giao dịch Sepay.</p>
        </div>
      </div>

      {/* Main Layout Grid - Split 4 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Left Area: Main Table System (3 Columns) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-border-premium shadow-premium flex flex-col h-[550px] overflow-hidden">
          
          {/* Section Header Controls */}
          <div className="px-5 py-4 border-b border-border-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Danh sách thành viên WIVI</h3>
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:max-w-xs">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Tìm thành viên, email, mã ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-border-premium focus:border-primary/30 focus:ring-2 focus:ring-primary/10 rounded-lg py-1.5 pl-9 pr-4 outline-none transition-all text-xs"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-premium">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-premium bg-gray-50/20 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    <th className="py-2.5 px-4">Thành Viên</th>
                    <th className="py-2.5 px-3">Gói Đang Dùng</th>
                    <th className="py-2.5 px-3">Thời Hạn</th>
                    <th className="py-2.5 px-3">Hạn Ngạch AI API</th>
                    <th className="py-2.5 px-3">Thông Báo Sepay</th>
                    <th className="py-2.5 px-3">Hoạt động gần nhất</th>
                    <th className="py-2.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-400">
                        Không tìm thấy thành viên phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                        {/* Name / Avatar / Email */}
                        <td className="py-3 px-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center font-display font-bold text-xs text-primary shadow-sm">
                            {member.avatar}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{member.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{member.id} // {member.email}</span>
                          </div>
                        </td>

                        {/* Plan status - 'Miễn phí' badge if Free */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              member.plan.includes('Pro') ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                              member.plan.includes('Premium') ? 'bg-primary/5 text-primary border border-primary/10' :
                              member.plan.includes('Basic') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-gray-100 text-gray-500 font-medium'
                            }`}>
                              {member.plan}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              member.status === 'Hoạt động' ? 'bg-success animate-pulse' : 'bg-danger'
                            }`} title={member.status}></span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-3 font-medium text-gray-600">
                          {member.duration}
                        </td>

                        {/* AI API Limit Progress bar */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 w-28">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-gray-500">Đã dùng:</span>
                              <span className="font-semibold text-gray-800">{member.aiQuotaUsed} / {member.aiQuotaLimit}</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${(member.aiQuotaUsed / member.aiQuotaLimit) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Sepay Notifications limit progress bar */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 w-28">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-gray-500">Đã nhận:</span>
                              <span className="font-semibold text-gray-800">{member.sepayNotificationsUsed} / {member.sepayNotificationsLimit}</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-success rounded-full" 
                                style={{ width: `${(member.sepayNotificationsUsed / member.sepayNotificationsLimit) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Last active date */}
                        <td className="py-3 px-3 font-mono text-[10px] text-gray-500">
                          {member.lastActive}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button className="text-gray-400 hover:text-primary p-1 rounded hover:bg-gray-100 transition-colors" title="Xem chi tiết">
                              <span className="text-[10px] font-bold uppercase tracking-wider">Xem</span>
                            </button>
                            <button className="text-gray-400 hover:text-danger p-1 rounded hover:bg-gray-100 transition-colors" title="Xóa tài khoản">
                              <span className="text-[10px] font-bold text-danger uppercase tracking-wider">Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Area: Advanced Filter Side Console (1 Column) */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-border-premium shadow-premium p-4 flex flex-col h-[550px] justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 pb-2 border-b border-border-premium text-gray-900 font-bold text-xs uppercase tracking-wider">
              <Funnel size={14} className="text-primary" />
              Lọc Nâng Cao
            </div>

            {/* Filter Plan */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gói Đăng Ký</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['All', 'Basic', 'Premium', 'Pro', 'Miễn phí'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPlan(p)}
                    className={`text-[11px] py-1 px-2.5 rounded-lg border font-medium text-center transition-all ${
                      filterPlan === p
                        ? 'bg-primary/5 text-primary border-primary/30 font-semibold'
                        : 'bg-white border-border-premium text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng Thái Tài Khoản</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['All', 'Active', 'Suspended'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s === 'Active' ? 'Hoạt động' : s === 'Suspended' ? 'Tạm dừng' : 'All')}
                    className={`text-[10px] py-1 rounded-lg border font-medium text-center transition-all ${
                      (s === 'Active' && filterStatus === 'Hoạt động') || 
                      (s === 'Suspended' && filterStatus === 'Tạm dừng') || 
                      (s === 'All' && filterStatus === 'All')
                        ? 'bg-primary/5 text-primary border-primary/30 font-semibold'
                        : 'bg-white border-border-premium text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'Active' ? 'Hoạt động' : s === 'Suspended' ? 'Tạm ngưng' : 'Tất cả'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reset Filters Buttons */}
          <div className="pt-4 border-t border-border-premium space-y-2">
            <button
              onClick={() => {
                setSearch('');
                setFilterPlan('All');
                setFilterStatus('All');
              }}
              className="w-full py-1.5 text-center text-xs border border-border-premium bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 font-semibold transition-colors"
            >
              Reset bộ lọc nâng cao
            </button>
            <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-2.5 border border-border-premium">
              <UserGear size={18} className="text-primary shrink-0" />
              <p className="text-[10px] text-gray-400 leading-snug font-medium">Hệ thống Sepay tự động xác nhận giao dịch chuyển khoản ngân hàng qua mã QR để nâng cấp gói tức thì.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
