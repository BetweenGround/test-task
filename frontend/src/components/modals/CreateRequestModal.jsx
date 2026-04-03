import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requestsApi, stockApi } from '../../services/api';
import { queueOfflineRequest } from '../../hooks/useOfflineSync';
import toast from 'react-hot-toast';
import { Spinner } from '../shared';

const PRIORITY_OPTIONS = [
  { value: 'normal',   label: 'Нормальний',   desc: 'Стандартне постачання' },
  { value: 'elevated', label: 'Підвищений',   desc: 'Запаси знижуються' },
  { value: 'critical', label: 'Критичний',    desc: 'Термінова потреба' },
];

export default function CreateRequestModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    delivery_point_id: '', resource_id: '', requested_quantity: '',
    priority: 'normal', notes: '',
  });

  const { data: points = [] } = useQuery({ queryKey: ['delivery-points'], queryFn: stockApi.getDeliveryPoints });
  const { data: resources = [] } = useQuery({ queryKey: ['resources'], queryFn: stockApi.getResources });

  const mutation = useMutation({
    mutationFn: requestsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Запит створено успішно');
      onClose();
    },
    onError: () => toast.error('Помилка при створенні запиту'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, requested_quantity: parseFloat(form.requested_quantity) };
    if (!navigator.onLine) {
      await queueOfflineRequest(payload);
      toast('Запит збережено офлайн. Буде надіслано при відновленні зв\'язку.', {
        icon: '📶', style: { background: '#451a03', color: '#fcd34d' },
      });
      onClose();
      return;
    }
    mutation.mutate(payload);
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Новий запит на постачання</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Delivery point */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Точка доставки</label>
            <select className="select" value={form.delivery_point_id} onChange={set('delivery_point_id')} required>
              <option value="">Оберіть точку доставки</option>
              {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Resource */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Ресурс</label>
            <select className="select" value={form.resource_id} onChange={set('resource_id')} required>
              <option value="">Оберіть ресурс</option>
              {resources.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>)}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Кількість</label>
            <input type="number" className="input" placeholder="0" min="0.01" step="0.01"
              value={form.requested_quantity} onChange={set('requested_quantity')} required />
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">Рівень пріоритету</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map(({ value, label, desc }) => (
                <label key={value} className={`cursor-pointer rounded-lg border p-3 transition-all ${
                  form.priority === value
                    ? value === 'critical' ? 'border-red-600 bg-red-950/50'
                      : value === 'elevated' ? 'border-amber-600 bg-amber-950/50'
                      : 'border-emerald-600 bg-emerald-950/50'
                    : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <input type="radio" name="priority" value={value} className="sr-only"
                    checked={form.priority === value} onChange={set('priority')} />
                  <p className={`text-xs font-semibold ${
                    value === 'critical' ? 'text-red-400'
                    : value === 'elevated' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Примітки</label>
            <textarea className="input resize-none h-20" placeholder="Додаткова інформація..."
              value={form.notes} onChange={set('notes')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Скасувати</button>
            <button type="submit" disabled={mutation.isPending}
              className={`flex-1 flex items-center justify-center gap-2 btn-primary ${
                form.priority === 'critical' ? 'bg-red-700 hover:bg-red-600' : ''
              }`}>
              {mutation.isPending ? <Spinner /> : null}
              {mutation.isPending ? 'Збереження...' : 'Створити запит'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
