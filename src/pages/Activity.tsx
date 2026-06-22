import React, { useState, useMemo } from 'react';
import { CurrencyDollar, CheckCircle, Warning, UserPlus, ShoppingBag, Coffee, Car, ForkKnife, GameController, MagnifyingGlass, Receipt, CreditCard } from '@phosphor-icons/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

const revenueData = [
  { name: '12/06', rev: 18200 },
  { name: '13/06', rev: 22400 },
  { name: '14/06', rev: 19500 },
  { name: '15/06', rev: 24100 },
  { name: '16/06', rev: 28900 },
  { name: '17/06', rev: 32400 },
  { name: '18/06', rev: 30800 },
];

const customerTransactions = [
  { id: 'TX-9011', customer: 'Nguyễn Văn A', category: 'Coffee', amount: '35.000 đ', date: '18/06 12:44', method: 'Ví Momo', status: 'Thành công' },
  { id: 'TX-8924', customer: 'Trần Thị B', category: 'Food', amount: '120.000 đ', date: '18/06 11:30', method: 'Chuyển khoản QR', status: 'Thành công' },
  { id: 'TX-8910', customer: 'Phạm Minh C', category: 'Food', amount: '450.000 đ', date: '18/06 10:15', method: 'Visa *4812', status: 'Chờ xử lý' },
  { id: 'TX-8742', customer: 'Lê Hoàng D', category: 'Shopping', amount: '1.250.000 đ', date: '17/06 18:22', method: 'Thẻ tín dụng', status: 'Thành công' },
  { id: 'TX-8622', customer: 'Hoàng Văn E', category: 'Entertainment', amount: '120.000 đ', date: '17/06 14:05', method: 'Ví Momo', status: 'Thành công' },
  { id: 'TX-8591', customer: 'Vũ Minh F', category: 'Transportation', amount: '62.000 đ', date: '17/06 09:40', method: 'Chuyển khoản QR', status: 'Thành công' },
];

const subscriptionTransactions = [
  { id: 'SPY-4091', customer: 'Nguyễn Văn A', plan: 'Gói Pro (1 năm)', paid: '990.000 đ', date: '18/06 12:10', renewal: '18/06/2027', status: 'Thành công' },
  { id: 'SPY-4090', customer: 'Trần Thị B', plan: 'Gói Premium (6 tháng)', paid: '300.000 đ', date: '18/06 08:30', renewal: '18/12/2026', status: 'Thành công' },
  { id: 'SPY-4089', customer: 'Phạm Minh C', plan: 'Gói Pro (1 năm)', paid: '990.000 đ', date: '17/06 17:15', renewal: '17/06/2027', status: 'Thành công' },
  { id: 'SPY-4088', customer: 'Lê Hoàng D', plan: 'Gói Pro (1 năm)', paid: '990.000 đ', date: '17/06 15:44', renewal: '17/06/2027', status: 'Thành công' },
  { id: 'SPY-4087', customer: 'Hoàng Văn E', plan: 'Gói Basic (1 tháng)', paid: '29.000 đ', date: '12/06 11:20', renewal: '12/07/2026', status: 'Thành công' },
  { id: 'SPY-4086', customer: 'Vũ Minh F', plan: 'Gói Premium (6 tháng)', paid: '300.000 đ', date: '10/06 14:50', renewal: '10/12/2026', status: 'Thành công' },
  { id: 'SPY-4085', customer: 'Lê Văn G', plan: 'Gói Premium (1 tháng)', paid: '59.000 đ', date: '15/06 09:15', renewal: '15/07/2026', status: 'Thành công' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  Coffee: <Coffee size={12} className="text-amber-500" />,
  Transportation: <Car size={12} className="text-blue-500" />,
  Food: <ForkKnife size={12} className="text-emerald-500" />,
  Shopping: <ShoppingBag size={12} className="text-purple-500" />,
  Entertainment: <GameController size={12} className="text-pink-500" />,
};

export const Activity: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'spending' | 'subscription'>('spending');
  const [search, setSearch] = useState('');

  // Filter spending transactions
  const filteredSpending = useMemo(() => {
    return customerTransactions.filter(tx => 
      tx.customer.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // Filter subscription transactions
  const filteredSubscriptions = useMemo(() => {
    return subscriptionTransactions.filter(sub => 
      sub.customer.toLowerCase().includes(search.toLowerCase()) ||
      sub.id.toLowerCase().includes(search.toLowerCase()) ||
      sub.plan.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="h-full flex flex-col justify-between gap-5 max-w-7xl mx-auto select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight">Sổ Cái & Giao Dịch Hệ Thống</h1>
          <p className="text-[11px] text-gray-500 font-medium">Báo cáo doanh thu nâng cấp gói cước và dòng tiền chi tiêu của người dùng.</p>
        </div>
      </div>

      {/* Top KPIs Row - Total Revenue, New Subscriptions, Renewals, Failed Payments */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Tổng doanh thu MTD', val: '642,8M đ', note: 'Tháng này +19.5%', icon: <CurrencyDollar size={18} className="text-success" /> },
          { label: 'Số lượt đăng ký mới', val: '840 thành viên', note: 'Trong chu kỳ hiện tại', icon: <UserPlus size={18} className="text-primary" /> },
          { label: 'Số lượt gia hạn gói', val: '2,482 hóa đơn', note: 'Tỷ lệ giữ chân 98.2%', icon: <CheckCircle size={18} className="text-emerald-500" /> },
          { label: 'Giao dịch lỗi', val: '12 hóa đơn', note: 'Đã gửi mail nhắc nợ tự động', icon: <Warning size={18} className="text-danger" /> },
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

      {/* Tabbed Transaction Ledgers Card - Takes full-width */}
      <div className="bg-white rounded-2xl border border-border-premium shadow-premium flex flex-col h-[300px] overflow-hidden">
        
        {/* Section Header Controls */}
        <div className="px-4 py-2.5 border-b border-border-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40">
          {/* Tab switches */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-border-premium">
            <button
              onClick={() => {
                setActiveTab('spending');
                setSearch('');
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'spending'
                  ? 'bg-white text-gray-900 shadow-premium-sm'
                  : 'text-gray-500 hover:text-gray-950'
              }`}
            >
              <CreditCard size={14} />
              Dòng tiền chi tiêu
            </button>
            <button
              onClick={() => {
                setActiveTab('subscription');
                setSearch('');
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'subscription'
                  ? 'bg-white text-gray-900 shadow-premium-sm'
                  : 'text-gray-500 hover:text-gray-950'
              }`}
            >
              <Receipt size={14} />
              Sổ cái mua gói (Cổng Sepay)
            </button>
          </div>

          {/* Quick search input */}
          <div className="relative w-full sm:max-w-xs">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder={activeTab === 'spending' ? "Tìm chi tiêu, thành viên..." : "Tìm hóa đơn, gói mua, tên..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-border-premium focus:border-primary/30 focus:ring-2 focus:ring-primary/10 rounded-lg py-1.5 pl-9 pr-4 outline-none transition-all text-xs"
            />
          </div>
        </div>

        {/* Tab Content Table */}
        <div className="flex-1 overflow-y-auto scrollbar-premium">
          {activeTab === 'spending' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-premium bg-gray-50/10 text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-2 px-3">Mã GD</th>
                  <th className="py-2 px-3">Thành viên</th>
                  <th className="py-2 px-3">Phân mục</th>
                  <th className="py-2 px-3">Số tiền</th>
                  <th className="py-2 px-3">Thời gian</th>
                  <th className="py-2 px-3">Phương thức</th>
                  <th className="py-2 px-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredSpending.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      Không tìm thấy giao dịch chi tiêu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredSpending.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3 font-mono font-medium text-[10px] text-gray-500">{tx.id}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800">{tx.customer}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          {categoryIcons[tx.category]}
                          <span>{tx.category === 'Coffee' ? 'Cà phê' : tx.category === 'Food' ? 'Ăn uống' : tx.category === 'Shopping' ? 'Mua sắm' : tx.category === 'Entertainment' ? 'Giải trí' : 'Di chuyển'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-gray-800">{tx.amount}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-gray-450">{tx.date}</td>
                      <td className="py-2 px-3 text-gray-500">{tx.method}</td>
                      <td className="py-2 px-4 text-right">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                          tx.status === 'Thành công' ? 'bg-[#10B981]/10 text-success' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-premium bg-gray-50/10 text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-2 px-3">Mã Sepay QR</th>
                  <th className="py-2 px-3">Thành viên</th>
                  <th className="py-2 px-3">Gói mua</th>
                  <th className="py-2 px-3">Thành tiền</th>
                  <th className="py-2 px-3">Ngày giao dịch</th>
                  <th className="py-2 px-3">Hạn gia hạn</th>
                  <th className="py-2 px-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      Không tìm thấy lịch sử hóa đơn mua gói phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3 font-mono font-medium text-[10px] text-gray-500">{sub.id}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800">{sub.customer}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-semibold text-[9px]">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-600">{sub.paid}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-gray-450">{sub.date}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-gray-450">{sub.renewal}</td>
                      <td className="py-2 px-4 text-right">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                          sub.status === 'Active' || sub.status === 'Thành công' ? 'bg-[#10B981]/10 text-success' : 'bg-red-500/10 text-red-500 border border-red-200'
                        }`}>
                          {sub.status === 'Active' || sub.status === 'Thành công' ? 'Thành công' : 'Thất bại'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Analytics Footer - Revenue Chart & Subscription Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[170px]">
        {/* Revenue chart (Left) */}
        <div className="bg-white p-3 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-full">
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Tốc độ tăng trưởng doanh thu</h3>
            <p className="text-[9px] text-gray-400">Doanh thu định kỳ nâng cấp gói theo ngày (VND)</p>
          </div>
          <div className="flex-1 min-h-0 w-full mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 2, right: 5, left: -25, bottom: -5 }}>
                <defs>
                  <linearGradient id="colorRevActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 8, fill: '#8E9AA8' }} />
                <Tooltip contentStyle={{ fontSize: '10px' }} />
                <Area type="monotone" dataKey="rev" stroke="#7C5CFF" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRevActive)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Conversion Funnel (Right) */}
        <div className="bg-white p-3.5 rounded-2xl border border-border-premium shadow-premium flex flex-col justify-between h-full">
          <div>
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Phễu chuyển đổi mua gói</h3>
            <p className="text-[9px] text-gray-400">Các bước từ khi đăng ký ứng dụng đến khi nâng cấp cước thành công</p>
          </div>
          
          <div className="flex items-center justify-between gap-2 mt-2">
            {[
              { stage: 'Đăng ký App', rate: '100%', val: '22k thành viên', color: 'bg-primary' },
              { stage: 'L.Kết Bank', rate: '45.1%', val: '9.9k liên kết', color: 'bg-[#8E79FF]' },
              { stage: 'Mục tiêu Active', rate: '32.4%', val: '7.1k hoạt động', color: 'bg-[#A695FF]' },
              { stage: 'Premium Paid', rate: '12.8%', val: '2.8k chuyển đổi', color: 'bg-[#BFB2FF]' },
            ].map((step, idx) => (
              <div key={idx} className="flex-1 flex flex-col gap-1 select-none">
                <div className="h-2 rounded bg-gray-100 overflow-hidden relative">
                  <div className={`h-full ${step.color}`} style={{ width: step.rate }}></div>
                </div>
                <div className="flex flex-col mt-0.5">
                  <span className="text-[9px] font-bold text-gray-800 truncate leading-none">{step.stage}</span>
                  <span className="text-[9px] font-mono text-gray-400 mt-1">{step.rate} ({step.val})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

