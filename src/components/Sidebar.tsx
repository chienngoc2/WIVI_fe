import React from 'react';
import { NavLink } from 'react-router-dom';
import { SquaresFour, Users, ArrowsLeftRight, Brain, Megaphone, Sliders, Sparkle } from '@phosphor-icons/react';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Tổng quan', icon: <SquaresFour weight="regular" size={20} />, to: '/' },
    { label: 'Thành viên', icon: <Users weight="regular" size={20} />, to: '/members' },
    { label: 'Nhật ký giao dịch', icon: <ArrowsLeftRight weight="regular" size={20} />, to: '/activity' },
    { label: 'Hệ thống AI & Sepay', icon: <Brain weight="regular" size={20} />, to: '/intelligence' },
    { label: 'Chiến dịch gửi tin', icon: <Megaphone weight="regular" size={20} />, to: '/campaigns' },
    { label: 'Cấu hình hệ thống', icon: <Sliders weight="regular" size={20} />, to: '/configuration' },
  ];

  return (
    <aside className="w-60 bg-white border-r border-border-premium flex flex-col h-screen select-none">
      {/* Brand logo section */}
      <div className="h-14 flex items-center px-5 border-b border-border-premium gap-2.5">
        
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 font-display tracking-tight flex items-center gap-1">
            WIVI <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider scale-90 origin-left">PRO</span>
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-none">
        <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-gray-400 px-3 mb-3">
          Hệ thống vận hành
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-gray-50 text-gray-900 shadow-premium-sm'
                  : 'text-gray-500 hover:bg-gray-50/60 hover:text-gray-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    'transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
                  )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border-premium bg-gray-50/50 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span className="text-[11px] font-semibold text-gray-500 font-mono tracking-tight flex items-center gap-1">
            Hệ thống Live <Sparkle size={10} className="text-primary fill-primary inline" />
          </span>
        </div>
        <div className="text-[10px] text-gray-400 px-1 leading-relaxed">
          v2.4.1-build // 100,240 nút hoạt động
        </div>
      </div>
    </aside>
  );
};
