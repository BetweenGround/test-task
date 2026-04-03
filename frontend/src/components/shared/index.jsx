export function PriorityBadge({ priority }) {
  const map = {
    critical: { label: 'Критичний', cls: 'badge-critical' },
    elevated: { label: 'Підвищений', cls: 'badge-elevated' },
    normal:   { label: 'Нормальний', cls: 'badge-normal' },
  };
  const { label, cls } = map[priority] || map.normal;
  return <span className={cls}>{label}</span>;
}

export function StatusBadge({ status }) {
  const map = {
    pending:     { label: 'Очікує', cls: 'bg-slate-800 text-slate-400 border border-slate-700' },
    in_progress: { label: 'В роботі', cls: 'bg-sky-950 text-sky-400 border border-sky-800/50' },
    fulfilled:   { label: 'Виконано', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' },
    cancelled:   { label: 'Скасовано', cls: 'bg-slate-800 text-slate-500 border border-slate-700 line-through' },
  };
  const { label, cls } = map[status] || map.pending;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export function StockStatusDot({ status }) {
  const colors = { critical: 'bg-red-500', low: 'bg-amber-500', ok: 'bg-emerald-500' };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-slate-500'}`} />
  );
}

export function Spinner({ size = 'sm' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8';
  return (
    <div className={`${s} border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin`} />
  );
}

export function EmptyState({ icon = '📭', title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-slate-300 font-medium">{title}</p>
      {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = 'sky' }) {
  const accents = {
    sky: 'border-sky-800/40 text-sky-400',
    red: 'border-red-800/40 text-red-400',
    amber: 'border-amber-800/40 text-amber-400',
    emerald: 'border-emerald-800/40 text-emerald-400',
  };
  return (
    <div className={`card p-5 border-l-2 ${accents[accent]}`}>
      <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accents[accent].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}
