import React, { useState } from 'react';
import { Sliders, Cpu, CloudArrowUp, Database, PlugsConnected, ArrowClockwise, Tag, SealCheck } from '@phosphor-icons/react';

export const Configuration: React.FC = () => {
  const [modelType, setModelType] = useState('wivi-core-v3.2');
  const [learningRate, setLearningRate] = useState('0.0005');
  const [aggregationInterval, setAggregationInterval] = useState('6h');
  const [autoSuspend, setAutoSuspend] = useState(true);

  // Basic Tier Configurations (29k/tháng)
  const [basicPrice, setBasicPrice] = useState(29000);
  const [basicPrice6m, setBasicPrice6m] = useState(150000); // 150k
  const [basicPrice1y, setBasicPrice1y] = useState(280000); // 280k
  const [basicQuota, setBasicQuota] = useState(1000);
  const [basicSepay, setBasicSepay] = useState(200);

  // Premium Tier Configurations (59k/tháng)
  const [premiumPrice, setPremiumPrice] = useState(59000);
  const [premiumPrice6m, setPremiumPrice6m] = useState(300000); // 300k
  const [premiumPrice1y, setPremiumPrice1y] = useState(560000); // 560k
  const [premiumQuota, setPremiumQuota] = useState(5000);
  const [premiumSepay, setPremiumSepay] = useState(500);

  // Pro Tier Configurations (109k/tháng)
  const [proPrice, setProPrice] = useState(109000);
  const [proPrice6m, setProPrice6m] = useState(550000); // 550k
  const [proPrice1y, setProPrice1y] = useState(990000); // 990k
  const [proQuota, setProQuota] = useState(15000);
  const [proSepay, setProSepay] = useState(1000);

  const handleSave = () => {
    alert('Đã đồng bộ hóa cấu hình gói cước và các tham số vận hành hệ thống!');
  };

  return (
    <div className="h-full flex flex-col justify-between gap-5 max-w-7xl mx-auto select-none w-full text-xs">
      {/* Title Header */}
      <div className="flex justify-between items-center h-10 px-1">
        <div>
          <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight flex items-center gap-1.5">
            <Sliders size={20} className="text-primary" />
            Cấu Hình Tham Số Hệ Thống
          </h1>
          <p className="text-[11px] text-gray-500 font-medium">Thiết lập cấu hình mạng nơ-ron AI, chu kỳ Plaid, và biểu giá gói cước người dùng.</p>
        </div>
        
        <button 
          onClick={handleSave}
          className="bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-premium active:scale-95 flex items-center gap-1.5"
        >
          <CloudArrowUp size={14} weight="bold" />
          Lưu cấu hình hệ thống
        </button>
      </div>

      {/* Main Grid Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Core AI Parameters Card (Col 1) */}
        <div className="bg-white rounded-2xl border border-border-premium shadow-premium p-4 flex flex-col justify-between h-[470px]">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
              <Cpu size={15} className="text-primary" />
              Mô hình học máy AI
            </h3>

            {/* Model version */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mô hình phân loại hoạt động</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-2 text-xs text-gray-600 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              >
                <option value="wivi-core-v3.2">WIVI Core Neural (v3.2-Stable)</option>
                <option value="wivi-lite-v2.9">WIVI Lite Classifier (v2.9-Edge)</option>
                <option value="wivi-experimental-v4.0">WIVI Multi-Agent (v4.0-Beta)</option>
              </select>
            </div>

            {/* Hyperparameters */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tốc độ học (Learning Rate)</label>
              <select
                value={learningRate}
                onChange={(e) => setLearningRate(e.target.value)}
                className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-2 text-xs text-gray-600 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              >
                <option value="0.001">0.001 (Tối ưu hóa nhanh)</option>
                <option value="0.0005">0.0005 (Mặc định khuyên dùng)</option>
                <option value="0.0001">0.0001 (Hội tụ chậm ổn định)</option>
              </select>
            </div>

            {/* Parameter sliders */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Độ nhạy phát hiện bất thường</span>
                <span className="font-mono text-primary">85%</span>
              </div>
              <input type="range" min="50" max="100" defaultValue="85" className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Ngưỡng phân loại tin cậy</span>
                <span className="font-mono text-primary">92%</span>
              </div>
              <input type="range" min="50" max="100" defaultValue="92" className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary" />
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded-lg border border-border-premium flex items-start gap-2 text-[10px] text-gray-400">
            <Database size={16} className="text-primary mt-0.5 shrink-0" />
            <p className="leading-relaxed font-medium">Lưu ý: Thay đổi độ nhạy của mô hình sẽ kích hoạt tiến trình phân loại lại các giao dịch cũ trong hàng đợi.</p>
          </div>
        </div>

        {/* Aggregation & API Sync Limits Card (Col 2) */}
        <div className="bg-white rounded-2xl border border-border-premium shadow-premium p-4 flex flex-col justify-between h-[470px]">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider pb-2 border-b border-border-premium flex items-center gap-1.5">
              <PlugsConnected size={15} className="text-success" />
              Đồng bộ ngân hàng & Sepay
            </h3>

            {/* Sync interval */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chu kỳ quét số dư ngân hàng</label>
              <select
                value={aggregationInterval}
                onChange={(e) => setAggregationInterval(e.target.value)}
                className="w-full bg-white border border-border-premium rounded-lg py-1.5 px-2 text-xs text-gray-600 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              >
                <option value="1h">Mỗi 1 giờ (Băng thông cao)</option>
                <option value="6h">Mỗi 6 giờ (Chu kỳ tiêu chuẩn)</option>
                <option value="12h">Mỗi 12 giờ (Tiết kiệm hiệu năng)</option>
              </select>
            </div>

            {/* Security Rules */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-800">Tự động tạm ngưng user</span>
                  <span className="text-[9px] text-gray-400">Khi điểm kỷ luật tài chính dưới 40</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAutoSuspend(!autoSuspend)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none ${
                    autoSuspend ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                    autoSuspend ? 'translate-x-4' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-800">Khóa cứng hạn ngạch</span>
                  <span className="text-[9px] text-gray-400">Chặn khi vượt giới hạn sử dụng</span>
                </div>
                <button type="button" className="w-9 h-5 rounded-full p-0.5 bg-primary transition-colors">
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm translate-x-4"></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-800">Sepay Xác thực tự động</span>
                  <span className="text-[9px] text-gray-400">Xác nhận nạp tiền QR Code tự động</span>
                </div>
                <button type="button" className="w-9 h-5 rounded-full p-0.5 bg-primary transition-colors">
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm translate-x-4"></div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded-lg border border-border-premium flex items-start gap-2 text-[10px] text-gray-400">
            <ArrowClockwise size={16} className="text-success mt-0.5 shrink-0" />
            <p className="leading-relaxed font-medium">Toàn bộ giao dịch ngân hàng của người dùng được tiếp nhận an toàn qua cổng Sepay kết nối API ngân hàng.</p>
          </div>
        </div>

        {/* Tiers Pricing & Limits Config Card (Col 3) */}
        <div className="bg-white rounded-2xl border border-border-premium shadow-premium p-4 flex flex-col justify-between h-[470px] overflow-hidden">
          <div className="space-y-4 flex-1 overflow-y-auto scrollbar-premium pr-1">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider pb-1 border-b border-border-premium flex items-center gap-1.5">
              <Tag size={15} className="text-indigo-500" />
              Thiết lập gói biểu giá & Hạn mức
            </h3>

            {/* Basic Package Settings */}
            <div className="p-3 bg-gray-50/50 border border-border-premium rounded-xl space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-800">
                <span>GÓI CƠ BẢN (BASIC)</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 text-[8px] font-bold">BASIC</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá tháng</label>
                  <input type="number" value={basicPrice} onChange={(e) => setBasicPrice(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá 6 tháng</label>
                  <input type="number" value={basicPrice6m} onChange={(e) => setBasicPrice6m(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá 1 năm</label>
                  <input type="number" value={basicPrice1y} onChange={(e) => setBasicPrice1y(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Định mức Quota AI</label>
                  <input type="number" value={basicQuota} onChange={(e) => setBasicQuota(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Sepay Alert Max</label>
                  <input type="number" value={basicSepay} onChange={(e) => setBasicSepay(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
              </div>
            </div>

            {/* Premium Package Settings */}
            <div className="p-3 bg-gray-50/50 border border-border-premium rounded-xl space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-primary">
                <span>GÓI CAO CẤP (PREMIUM)</span>
                <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[8px] font-bold">PREMIUM</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá tháng</label>
                  <input type="number" value={premiumPrice} onChange={(e) => setPremiumPrice(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá 6 tháng</label>
                  <input type="number" value={premiumPrice6m} onChange={(e) => setPremiumPrice6m(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá 1 năm</label>
                  <input type="number" value={premiumPrice1y} onChange={(e) => setPremiumPrice1y(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Định mức Quota AI</label>
                  <input type="number" value={premiumQuota} onChange={(e) => setPremiumQuota(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Sepay Alert Max</label>
                  <input type="number" value={premiumSepay} onChange={(e) => setPremiumSepay(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
              </div>
            </div>

            {/* Pro Package Settings */}
            <div className="p-3 bg-gray-50/50 border border-border-premium rounded-xl space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-indigo-600">
                <span>GÓI CHUYÊN NGHIỆP (PRO)</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[8px] font-bold">PRO</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá tháng</label>
                  <input type="number" value={proPrice} onChange={(e) => setProPrice(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá 6 tháng</label>
                  <input type="number" value={proPrice6m} onChange={(e) => setProPrice6m(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Giá 1 năm</label>
                  <input type="number" value={proPrice1y} onChange={(e) => setProPrice1y(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Định mức Quota AI</label>
                  <input type="number" value={proQuota} onChange={(e) => setProQuota(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Sepay Alert Max</label>
                  <input type="number" value={proSepay} onChange={(e) => setProSepay(Number(e.target.value))} className="w-full bg-white border border-border-premium rounded-lg px-1.5 py-0.8 text-[10px] outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded-lg border border-border-premium flex items-start gap-2 text-[10px] text-gray-400 mt-2 shrink-0">
            <SealCheck size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <p className="leading-relaxed font-medium">Thay đổi thông số định mức của gói dịch vụ sẽ tự động điều chỉnh quyền lợi truy cập của người dùng thuộc gói đó.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
