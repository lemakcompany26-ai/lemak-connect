import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = [
  'bg-mk-blue/20 text-mk-blue-soft',
  'bg-amber-400/15 text-amber-400',
  'bg-emerald-500/15 text-emerald-400',
  'bg-rose-500/15 text-rose-400',
  'bg-violet-500/15 text-violet-300',
  'bg-mk-brown/25 text-mk-brown-soft'
];

function hashName(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// One service row: avatar, name, live availability and the FINAL customer
// price (server-calculated). price: string | null (checking) | false (unavailable).
export default function CatalogRow({ name, availability, price, onAction, actionLabel = 'Get Number', busy }) {
  const color = COLORS[hashName(name) % COLORS.length];
  const initials = String(name).replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-mk-border bg-mk-card2 px-3.5 py-3">
      <span className={'flex items-center justify-center w-10 h-10 rounded-full text-xs font-extrabold shrink-0 ' + color}>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white capitalize truncate">{name}</div>
        {availability && <div className="text-[11px] text-slate-400 mt-0.5">{availability}</div>}
      </div>
      <div className="text-right shrink-0 w-20">
        {price == null ? (
          <span className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> checking
          </span>
        ) : price === false ? (
          <span className="text-[11px] text-slate-500">Unavailable</span>
        ) : (
          <span className="text-sm font-extrabold text-amber-400">{price}</span>
        )}
      </div>
      <Button
        size="sm"
        className="h-9 px-4 rounded-full bg-mk-blue hover:bg-mk-blue/90 text-white font-bold shrink-0"
        disabled={busy}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}