// A titled catalogue section with an icon and scrollable rows.
export default function CatalogSection({ icon: Icon, title, count, children, empty, emptyText }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-amber-400" />}
        <h2 className="text-[11px] font-extrabold text-white uppercase tracking-widest">{title}</h2>
        {count > 0 && <span className="text-[10px] font-bold text-slate-500">{count}</span>}
      </div>
      {empty ? (
        <p className="text-xs text-slate-500 py-2">{emptyText || 'Currently unavailable'}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}