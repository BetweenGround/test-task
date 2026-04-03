import { useQuery } from '@tanstack/react-query';
import { stockApi, requestsApi } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { StatCard, PriorityBadge, StatusBadge, Spinner, EmptyState } from '../components/shared';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  useSocket(); // activate real-time

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'], queryFn: stockApi.getStats, refetchInterval: 30000,
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ['requests', { status: 'pending' }],
    queryFn: () => requestsApi.getAll({ status: 'pending' }),
    refetchInterval: 15000,
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['stock'], queryFn: stockApi.getAll, refetchInterval: 60000,
  });

  const criticalRequests = requests.filter(r => r.priority === 'critical');
  const criticalStock = stock.filter(s => s.stock_status === 'critical');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Дашборд</h1>
        <p className="text-slate-500 text-sm mt-0.5">Огляд системи в реальному часі</p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Критичних" value={stats?.critical_alerts ?? 0}
            sub="активних запитів" accent="red" />
          <StatCard label="Очікують" value={stats?.pending_requests ?? 0}
            sub="запитів в черзі" accent="amber" />
          <StatCard label="В роботі" value={stats?.in_progress ?? 0}
            sub="розподіляється" accent="sky" />
          <StatCard label="Виконано" value={stats?.fulfilled_today ?? 0}
            sub="за останні 24г" accent="emerald" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Critical alerts */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              {criticalRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              Критичні запити
            </h2>
            <Link to="/requests?priority=critical" className="text-xs text-sky-400 hover:text-sky-300">
              Всі →
            </Link>
          </div>
          {reqLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : criticalRequests.length === 0 ? (
            <EmptyState icon="✅" title="Критичних запитів немає" description="Всі ресурси в нормі" />
          ) : (
            <ul className="divide-y divide-slate-800/50">
              {criticalRequests.slice(0, 5).map((r) => (
                <li key={r.id} className="px-5 py-3 pulse-critical hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{r.delivery_point}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{r.resource_name} — {r.requested_quantity} {r.unit}</p>
                      {r.notes && <p className="text-xs text-red-400 mt-0.5 truncate">{r.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <PriorityBadge priority={r.priority} />
                      <span className="text-xs text-slate-600">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: uk })}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Critical stock */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Критичні залишки</h2>
            <Link to="/stock" className="text-xs text-sky-400 hover:text-sky-300">Всі →</Link>
          </div>
          {criticalStock.length === 0 ? (
            <EmptyState icon="📦" title="Запаси в нормі" description="Жодного критичного рівня" />
          ) : (
            <ul className="divide-y divide-slate-800/50">
              {criticalStock.slice(0, 5).map((s) => (
                <li key={s.id} className="px-5 py-3 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{s.resource_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.warehouse_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-mono text-red-400">{s.quantity} {s.unit}</p>
                      <p className="text-xs text-slate-600">мін: {s.min_threshold}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min(100, (s.quantity / (s.min_threshold * 2)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent pending requests */}
      <div className="card mt-6">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">Останні запити</h2>
          <Link to="/requests" className="text-xs text-sky-400 hover:text-sky-300">Всі запити →</Link>
        </div>
        {reqLoading ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : requests.length === 0 ? (
          <EmptyState icon="📋" title="Запитів немає" description="Нових запитів на постачання немає" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Точка доставки</th>
                  <th className="px-5 py-3 text-left">Ресурс</th>
                  <th className="px-5 py-3 text-left">Кількість</th>
                  <th className="px-5 py-3 text-left">Пріоритет</th>
                  <th className="px-5 py-3 text-left">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {requests.slice(0, 8).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 text-slate-200 font-medium">{r.delivery_point}</td>
                    <td className="px-5 py-3 text-slate-400">{r.resource_name}</td>
                    <td className="px-5 py-3 text-slate-300 font-mono">{r.requested_quantity} {r.unit}</td>
                    <td className="px-5 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
