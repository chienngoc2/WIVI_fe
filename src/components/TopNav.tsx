import React from 'react';
import { MagnifyingGlass, Bell, Terminal } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';

export const TopNav: React.FC<{ overview?: boolean }> = ({ overview = false }) => {
  const { session } = useAuth();
  const displayName = session?.identity.fullName || session?.identity.email || 'Quản trị viên';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header className={`h-14 shrink-0 bg-white border-b border-border-premium flex items-center justify-between z-10 select-none ${overview ? 'gap-3 px-4 md:px-6' : 'px-6'}`}>
      {/* Search Input Box */}
      {overview ? <span className="min-w-0 truncate text-xs text-muted">Không gian quản trị</span> : <div className="flex-1 max-w-md">
        <div className="relative group">
          <MagnifyingGlass 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" 
            size={18} 
          />
          <input
            type="text"
            placeholder="Gõ lệnh tìm kiếm nhanh..."
            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-primary/20 focus:ring-2 focus:ring-primary/10 rounded-lg py-1.5 pl-9 pr-4 outline-none transition-all text-xs text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>}
      
      {/* Navigation Right Actions */}
      <div className="flex min-w-0 items-center gap-4">
        {!overview && <>
        {/* API Engine Status Ticker */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 px-2.5 py-1 rounded-md border border-border-premium">
          <Terminal size={14} className="text-gray-400" />
          <span className="text-[11px] font-mono text-gray-500 font-medium">Hệ thống AI // 98.4% Acc</span>
        </div>

        <button className="relative text-gray-400 hover:text-gray-900 transition-colors p-1.5 hover:bg-gray-50 rounded-lg">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger rounded-full ring-2 ring-white"></span>
        </button>

        <div className="h-4 w-px bg-gray-200"></div>
        </>}

        {/* Admin profile detail */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0 text-right">
            <p data-testid="topnav-identity-name" className="truncate text-xs font-semibold text-gray-900 leading-tight">{displayName}</p>
            <p className="text-[10px] text-gray-400 font-mono leading-none">Quản trị viên</p>
          </div>
          <div data-testid="topnav-identity-initials" className="w-8 h-8 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display text-xs font-bold text-primary shadow-inner">
            {initials || 'AD'}
          </div>
        </div>
      </div>
    </header>
  );
};
