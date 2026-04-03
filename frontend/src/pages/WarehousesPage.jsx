import { useQuery } from '@tanstack/react-query';
import { stockApi } from '../services/api';
import { Spinner, EmptyState } from '../components/shared';

export default function WarehousesPage() {
  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'], queryFn: stockApi.getWarehouses,
  });
  const { data: stock = [] } = useQuery({
    queryKey: ['stock'], queryFn: stockApi.getAll,
  });

  const warehouseStats = warehouses.map(w => {
    const items = stock.filter(s => s.warehouse_id === w.id);
    const critical = items.filter(s => s.stock_status === 'critical').length;
    const low = items.filter(s => s.stock_status === 'low').length;
    const totalResources = items.length;
    return { ...w, items, critical, low, totalResources };
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Склади</h1>
        <p className="text-slate-500 text-sm mt-0.5">{warehouses.length} активних складів</p>
      </div>

      {warehouseStats.length === 0 ? (
        <EmptyState icon="🏭" title="Складів не знайдено" />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouseStats.map(w => (
            <div key={w.id} className="card p-5 hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-100">{w.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{w.address}</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 flex-shrink-0" title="Активний" />
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-200">{w.totalResources}</p>
                  <p className="text-xs text-slate-500">ресурсів</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${w.critical > 0 ? 'text-red-400' : 'text-slate-600'}`}>{w.critical}</p>
                  <p className="text-xs text-slate-500">критично</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${w.low > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{w.low}</p>
                  <p className="text-xs text-slate-500">низько</p>
                </div>
              </div>

              {/* Coords */}
              {w.lat && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                  <span>📍</span>
                  <span>{parseFloat(w.lat).toFixed(4)}, {parseFloat(w.lng).toFixed(4)}</span>
                </div>
              )}

              {/* Resource list preview */}
              {w.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                  {w.items.slice(0, 4).map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 truncate">{s.resource_name}</span>
                      <span className={`text-xs font-mono ${
                        s.stock_status === 'critical' ? 'text-red-400'
                        : s.stock_status === 'low' ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {parseFloat(s.quantity).toLocaleString('uk-UA')} {s.unit}
                      </span>
                    </div>
                  ))}
                  {w.items.length > 4 && (
                    <p className="text-xs text-slate-600">+{w.items.length - 4} ресурсів...</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
