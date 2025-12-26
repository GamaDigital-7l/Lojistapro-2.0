import React, { useMemo, useState } from 'react';
import { NAVIGATION_ITEMS, VIEW_PERMISSIONS } from '../constants';
import { View } from '../types';
import { LogOut, LayoutDashboard, User } from 'lucide-react';
import { useAppContext } from '../AppContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, activeView, setActiveView, handleLogout } = useAppContext();
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  const visibleNavItems = useMemo(() => {
    if (!profile) return [];
    const allowedViews = VIEW_PERMISSIONS[profile.papel] || [];
    return NAVIGATION_ITEMS.filter(item => allowedViews.includes(item.id as View));
  }, [profile]);
  
  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-slate-950 flex text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - Desktop Only (lg+) */}
      <aside className="hidden lg:flex w-72 bg-slate-900 border-r border-slate-800 flex-col sticky top-0 h-full z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tighter">
              LOJISTA PRO
            </h1>
          </div>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] ml-11">Versão 2.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-glow" />}
              </button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center border border-blue-500/50">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-slate-200 truncate">{profile?.nome || 'Usuário'}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">{profile?.papel || 'Online'}</p>
            </div>
            <button onClick={handleLogout} aria-label="Sair" className="text-slate-500 hover:text-red-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Mobile Header (hidden on desktop) */}
        <header className="lg:hidden px-6 py-4 flex justify-between items-center border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md z-40 shrink-0">
          <div>
            <h1 className="text-lg font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent uppercase tracking-tighter">
              Lojista Pro
            </h1>
          </div>
          <button onClick={() => setProfileMenuOpen(true)} className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center border border-blue-500/50 active:scale-95 transition-transform">
            <User size={18} className="text-white" />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
            <div className="max-w-6xl w-full mx-auto h-full">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile Navigation (hidden on desktop) */}
        <nav className="lg:hidden shrink-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 flex items-center px-2 py-2 z-50 pb-[env(safe-area-inset-bottom,8px)]">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-1 min-w-0 ${
                  isActive ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-blue-500/10 scale-110' : 'active:scale-90'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[8px] font-black uppercase truncate ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Mobile Profile & Logout Modal */}
      {isProfileMenuOpen && (
        <div 
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md lg:hidden flex items-end"
          onClick={() => setProfileMenuOpen(false)}
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          `}</style>
          <div 
            className="w-full bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] p-6 pb-[env(safe-area-inset-bottom,24px)]"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6"></div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center border border-blue-500/50">
                <User size={24} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white truncate">{profile?.nome || 'Usuário'}</p>
                <p className="text-xs text-green-500 font-bold uppercase">{profile?.papel || 'Online'}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setProfileMenuOpen(false);
                handleLogout();
              }} 
              className="w-full py-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl text-sm font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <LogOut size={16} /> Sair do Sistema
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
