import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/api';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { requestsApi } from '../services/api';
import { useCallback } from 'react';

const NAV = [
  { to: '/',           icon: '▦', label: 'Дашборд'   },
  { to: '/requests',   icon: '≡', label: 'Запити'     },
  { to: '/stock',      icon: '⊟', label: 'Запаси'    },
  { to: '/warehouses', icon: '⊞', label: 'Склади'     },
  { to: '/nearest',    icon: '◎', label: 'Пошук'      },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const syncFn = useCallback((item) => requestsApi.create(item), []);
  const { isOnline, pendingCount } = useOfflineSync(syncFn);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-slate-900/60 backdrop-blur-xl border-r border-white/5 flex-col z-10 shadow-xl shadow-indigo-900/20">
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">LogistiQ</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-sky-500/10 text-indigo-300 font-semibold border border-indigo-500/20 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }>
              <span className="text-lg leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: status + user */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {/* Online status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
            isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
            {isOnline ? 'Синхронізовано' : `Офлайн (${pendingCount} в черзі)`}
          </div>

          {/* User */}
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 capitalize tracking-wider uppercase">{user?.role}</p>
            </div>
            <button onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 transition-colors p-2 rounded-lg flex-shrink-0"
              title="Вийти">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative z-0">
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-20 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-3 gap-1 transition-all duration-300 relative ${
                isActive
                  ? 'text-indigo-400'
                  : 'text-slate-500 hover:text-white'
              }`
            }>
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute top-0 w-8 h-0.5 bg-indigo-500 rounded-b-full shadow-[0_2px_8px_rgba(99,102,241,0.8)]" />}
                <span className={`text-2xl leading-none ${isActive ? 'transform -translate-y-0.5' : ''}`}>{icon}</span>
                <span className="text-[10px] font-semibold leading-none tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
