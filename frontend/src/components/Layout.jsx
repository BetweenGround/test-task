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
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sky-500 rounded-md flex items-center justify-center flex-shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <span className="font-bold text-white text-base tracking-tight">LogistiQ</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-400 font-medium'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }>
              <span className="text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: status + user */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Online status */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
            isOnline ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            {isOnline ? 'Онлайн' : `Офлайн (${pendingCount} в черзі)`}
          </div>

          {/* User */}
          <div className="flex items-center justify-between px-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.name}</p>
              <p className="text-xs text-slate-600 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout}
              className="text-slate-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
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
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
