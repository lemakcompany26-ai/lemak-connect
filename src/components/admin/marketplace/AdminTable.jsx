import { Fragment } from 'react';

// Responsive admin data table: a real table on desktop, stacked cards on
// mobile. Columns define desktop cells; renderCard keeps the mobile view.
export default function AdminTable({ columns, rows, rowKey, renderCard, renderExpanded, empty }) {
  if (!rows || rows.length === 0) return empty || null;
  const key = rowKey || (r => r.id);
  return (
    <div className="space-y-3">
      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin rounded-2xl border border-mk-border bg-mk-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mk-border bg-mk-card2/50">
              {columns.map((c, i) => (
                <th key={c.label + i} className={'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 ' + (c.className || '')}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-mk-border">
            {rows.map(r => (
              <Fragment key={key(r)}>
                <tr className="align-top">
                  {columns.map((c, i) => (
                    <td key={i} className={'px-4 py-3 text-slate-200 ' + (c.className || '')}>{c.cell(r)}</td>
                  ))}
                </tr>
                {renderExpanded && renderExpanded(r) ? (
                  <tr className="bg-mk-card2/30">
                    <td colSpan={columns.length} className="px-4 py-3">{renderExpanded(r)}</td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {rows.map(r => (
          <div key={key(r)} className="rounded-2xl bg-mk-card border border-mk-border p-4 space-y-3">
            {renderCard(r)}
            {renderExpanded && renderExpanded(r)}
          </div>
        ))}
      </div>
    </div>
  );
}