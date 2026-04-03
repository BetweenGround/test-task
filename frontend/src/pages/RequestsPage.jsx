import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '../services/api';
import { PriorityBadge, StatusBadge, Spinner, EmptyState } from '../components/shared';
import CreateRequestModal from '../components/modals/CreateRequestModal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

const FILTERS = [
  { label: 'Всі',         value: '' },
  { label: 'Очікують',    value: 'pending' },
  { label: 'В роботі',    value: 'in_progress' },
  { label: 'Виконано',    value: 'fulfilled' },
];

const PRIORITY_FILTERS = [
  { label: 'Всі', value: '' },
  { label: 'Критичний',  value: 'critical' },
  { label: 'Підвищений', value: 'elevated' },
  { label: 'Нормальний', value: 'normal' },
];

export default function RequestsPage() {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [allocating, setAllocating] = useState(null);
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', { status, priority }],
    queryFn: () => requestsApi.getAll({ status: status || undefined, priority: priority || undefined }),
    refetchInterval: 20000,
  });

  const allocateMutation = useMutation({
    mutationFn: (id) => requestsApi.allocate(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success(
        `Розподілено ${data.total_allocated} од. з ${data.allocations.length} склад(ів)${
          data.remaining_shortage > 0 ? `. Дефіцит: ${data.remaining_shortage}` : ''
        }`
      );
      setAllocating(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Помилка розподілу');
      setAllocating(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => requestsApi.setStatus(id, 'cancelled'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      toast('Запит скасовано', { icon: '🗑️' });
    },
  });

  const handleAllocate = (id) => {
    setAllocating(id);
    allocateMutation.mutate(id);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Запити на постачання</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {requests.length} запит(ів) · Сортування: пріоритет → дата
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <span className="text-lg leading-none">+</span>
          Новий запит
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                status === f.value ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {PRIORITY_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setPriority(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                priority === f.value ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : requests.length === 0 ? (
        <EmptyState icon="📋" title="Запитів не знайдено" description="Спробуйте змінити фільтри або створити новий запит" />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id}
              className={`card p-4 transition-all hover:border-slate-700 ${
                r.priority === 'critical' ? 'border-red-900/50 bg-red-950/10' : ''
              }`}>
              <div className="flex items-start gap-4">
                {/* Priority indicator */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                  r.priority === 'critical' ? 'bg-red-500'
                  : r.priority === 'elevated' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h3 className="font-semibold text-slate-100">{r.delivery_point}</h3>
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span>📦 {r.resource_name}</span>
                    <span className="font-mono text-slate-300">
                      {r.fulfilled_quantity > 0
                        ? `${r.fulfilled_quantity} / ${r.requested_quantity} ${r.unit}`
                        : `${r.requested_quantity} ${r.unit}`}
                    </span>
                    {r.assigned_warehouse && <span>🏭 {r.assigned_warehouse}</span>}
                    <span className="text-slate-600">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: uk })}
                    </span>
                  </div>

                  {r.notes && (
                    <p className={`text-xs mt-1.5 ${r.priority === 'critical' ? 'text-red-400' : 'text-slate-500'}`}>
                      {r.notes}
                    </p>
                  )}

                  {/* Fulfillment progress */}
                  {r.requested_quantity > 0 && r.fulfilled_quantity > 0 && (
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden w-48">
                      <div className="h-full bg-sky-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (r.fulfilled_quantity / r.requested_quantity) * 100)}%` }} />
                    </div>
                  )}
                </div>

                {/* Actions */}
                {['pending', 'in_progress'].includes(r.status) && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAllocate(r.id)}
                      disabled={allocating === r.id || allocateMutation.isPending}
                      className="btn-primary flex items-center gap-1.5 py-1.5 text-xs whitespace-nowrap">
                      {allocating === r.id ? <Spinner /> : '⚡'}
                      Розподілити
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(r.id)}
                      className="text-xs text-slate-600 hover:text-red-400 transition-colors text-center py-1">
                      Скасувати
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateRequestModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
