import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '../services/api';
import { StockStatusDot, Spinner, EmptyState } from '../components/shared';
import toast from 'react-hot-toast';

export default function StockPage() {
  const [editing, setEditing] = useState(null); // { warehouse_id, resource_id, quantity }
  const [editVal, setEditVal] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const qc = useQueryClient();

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['stock'], queryFn: stockApi.getAll, refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ warehouse_id, resource_id, quantity }) =>
      stockApi.update(warehouse_id, resource_id, { quantity: parseFloat(quantity) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Залишок оновлено');
      setEditing(null);
    },
    onError: () => toast.error('Помилка оновлення'),
  });

  // Group by warehouse
  const categories = [...new Set(stock.map(s => s.category).filter(Boolean))];

  const filtered = categoryFilter ? stock.filter(s => s.category === categoryFilter) : stock;

  const byWarehouse = filtered.reduce((acc, s) => {
    if (!acc[s.warehouse_id]) acc[s.warehouse_id] = { name: s.warehouse_name, address: s.address, items: [] };
    acc[s.warehouse_id].items.push(s);
    return acc;
  }, {});

  const startEdit = (s) => {
    setEditing({ warehouse_id: s.warehouse_id, resource_id: s.resource_id });
    setEditVal(String(s.quantity));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Запаси на складах</h1>
          <p className="text-slate-500 text-sm mt-0.5">Оновлюється кожні 30 секунд</p>
        </div>

        {/* Category filter */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${!categoryFilter ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            Всі
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${categoryFilter === c ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : Object.keys(byWarehouse).length === 0 ? (
        <EmptyState icon="🏭" title="Немає даних" />
      ) : (
        <div className="space-y-6">
          {Object.entries(byWarehouse).map(([wId, wh]) => {
            const critCount = wh.items.filter(i => i.stock_status === 'critical').length;
            const lowCount = wh.items.filter(i => i.stock_status === 'low').length;
            return (
              <div key={wId} className="card overflow-hidden">
                <div className="px-5 py-4 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-100">{wh.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{wh.address}</p>
                  </div>
                  <div className="flex gap-3">
                    {critCount > 0 && (
                      <span className="text-xs text-red-400 bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded-full">
                        {critCount} критично
                      </span>
                    )}
                    {lowCount > 0 && (
                      <span className="text-xs text-amber-400 bg-amber-950/50 border border-amber-900/50 px-2 py-0.5 rounded-full">
                        {lowCount} низько
                      </span>
                    )}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-2.5 text-left">Ресурс</th>
                      <th className="px-5 py-2.5 text-left">Категорія</th>
                      <th className="px-5 py-2.5 text-right">Залишок</th>
                      <th className="px-5 py-2.5 text-right">Мін. поріг</th>
                      <th className="px-5 py-2.5 text-left">Стан</th>
                      <th className="px-5 py-2.5 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {wh.items.map((s) => {
                      const isEdit = editing?.warehouse_id === s.warehouse_id && editing?.resource_id === s.resource_id;
                      return (
                        <tr key={s.id} className={`hover:bg-slate-800/20 transition-colors ${
                          s.stock_status === 'critical' ? 'bg-red-950/10' : ''
                        }`}>
                          <td className="px-5 py-3 font-medium text-slate-200">{s.resource_name}</td>
                          <td className="px-5 py-3 text-slate-500">{s.category}</td>
                          <td className="px-5 py-3 text-right">
                            {isEdit ? (
                              <input type="number" className="input w-24 text-right py-1 px-2 text-sm"
                                value={editVal} onChange={(e) => setEditVal(e.target.value)}
                                min="0" step="0.1" autoFocus />
                            ) : (
                              <span className={`font-mono ${
                                s.stock_status === 'critical' ? 'text-red-400'
                                : s.stock_status === 'low' ? 'text-amber-400' : 'text-slate-200'
                              }`}>
                                {parseFloat(s.quantity).toLocaleString('uk-UA')} {s.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500 font-mono">
                            {s.min_threshold} {s.unit}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <StockStatusDot status={s.stock_status} />
                              <span className="text-xs text-slate-500">
                                {s.stock_status === 'critical' ? 'Критично' : s.stock_status === 'low' ? 'Низько' : 'Норма'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {isEdit ? (
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditing(null)} className="text-xs text-slate-500 hover:text-slate-300">Відміна</button>
                                <button
                                  onClick={() => updateMutation.mutate({ warehouse_id: s.warehouse_id, resource_id: s.resource_id, quantity: editVal })}
                                  disabled={updateMutation.isPending}
                                  className="btn-primary text-xs py-1 px-3">
                                  {updateMutation.isPending ? '...' : 'Зберегти'}
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => startEdit(s)} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                                Редагувати
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
