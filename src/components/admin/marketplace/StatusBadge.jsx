const STYLES = {
  pending: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  changes_requested: 'bg-mk-brown/25 text-mk-brown-soft border-mk-brown-soft/40',
  suspended: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  delisted: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  in_progress: 'bg-mk-blue/15 text-mk-blue-soft border-mk-blue/40',
  delivered: 'bg-mk-blue/15 text-mk-blue-soft border-mk-blue/40',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  refunded: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  manual: 'bg-mk-brown/25 text-mk-brown-soft border-mk-brown-soft/40'
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${STYLES[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
      {String(status || '—').replace(/_/g, ' ')}
    </span>
  );
}