import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '../services/api';
import { Spinner, EmptyState } from '../components/shared';

export default function NearestPage() {
  const [form, setForm] = useState({ resource_id: '', lat: '', lng: '', quantity: '' });
  const [search, setSearch] = useState(null);

  const { data: resources = [] } = useQuery({ queryKey: ['resources'], queryFn: stockApi.getResources });
  const { data: points = [] } = useQuery({ queryKey: ['delivery-points'], queryFn: stockApi.getDeliveryPoints });

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['nearest', search],
    queryFn: () => stockApi.getNearest(search),
    enabled: !!search,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearch({ ...form, quantity: parseFloat(form.quantity) || 1 });
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // Fill coords from delivery point
  const handlePointSelect = (e) => {
    const point = points.find(p => p.id === e.target.value);
    if (point) setForm(f => ({ ...f, lat: point.lat, lng: point.lng }));
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Пошук найближчого залишку</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Знайдіть склади з потрібним ресурсом, відсортовані за відстанню
        </p>
      </div>

      <div className="card p-5 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Ресурс</label>
            <select className="select" value={form.resource_id} onChange={set('resource_id')} required>
              <option value="">Оберіть ресурс</option>
              {resources.map(r => <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
              Точка відліку (або введіть координати вручну)
            </label>
            <select className="select" onChange={handlePointSelect} defaultValue="">
              <option value="">Оберіть точку доставки...</option>
              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Широта (lat)</label>
              <input type="number" className="input" placeholder="49.8397" step="any"
                value={form.lat} onChange={set('lat')} required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Довгота (lng)</label>
              <input type="number" className="input" placeholder="24.0297" step="any"
                value={form.lng} onChange={set('lng')} required />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Мінімальна кількість</label>
            <input type="number" className="input" placeholder="100" min="1" step="1"
              value={form.quantity} onChange={set('quantity')} />
          </div>

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            {isFetching ? <Spinner /> : '◎'}
            Знайти найближчі склади
          </button>
        </form>
      </div>

      {/* Results */}
      {isLoading || isFetching ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : search && results.length === 0 ? (
        <EmptyState icon="🔍" title="Не знайдено" description="Жоден склад не має необхідної кількості цього ресурсу" />
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
            Знайдено {results.length} склад(ів)
          </p>
          {results.map((r, i) => (
            <div key={r.id} className="card p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i === 0 ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100">{r.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.address}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono text-sky-400 font-semibold">
                  {parseFloat(r.distance_km).toFixed(1)} км
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Залишок: <span className="text-emerald-400 font-mono">{parseFloat(r.quantity).toLocaleString('uk-UA')} {r.unit}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
