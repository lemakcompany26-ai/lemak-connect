import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, MessageCircle, Timer, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';

const STATUS_STYLES = {
  active: 'bg-mk-blue/20 text-mk-blue-soft border-mk-blue/30',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

export default function RentalCard({ rental, role, busy, onComplete, onCancel, onChat }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const isBuyer = role === 'buyer';
  const remaining = rental.expiresAt ? Math.max(0, new Date(rental.expiresAt).getTime() - now) : 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">{rental.service} number</div>
          <div className="text-[11px] font-mono text-mk-brown-soft mt-0.5">{rental.rentalRef}</div>
          <div className="text-xs text-slate-400 mt-1">
            {isBuyer ? `Paid ${formatNaira(rental.amount)}` : `Payout ${formatNaira(rental.sellerPayout)}`}
          </div>
        </div>
        <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ' + (STATUS_STYLES[rental.status] || STATUS_STYLES.expired)}>
          {rental.status}
        </span>
      </div>

      {rental.number && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-mk-card2 px-3 py-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Number</span>
          <span className="text-sm font-mono font-bold text-white select-all">{rental.number}</span>
        </div>
      )}

      {rental.status === 'active' && (
        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-mk-blue-soft">
          <Timer className="w-4 h-4" /> {mm}:{ss} remaining
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="ghost" className="h-9 text-slate-300 hover:text-white font-semibold" disabled={busy} onClick={() => onChat(rental)}>
          <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat / OTP
        </Button>
        {isBuyer && rental.status === 'active' && (
          <>
            <Button size="sm" className="h-9 ml-auto bg-mk-blue hover:bg-mk-blue/90 text-white font-bold" disabled={busy} onClick={() => onComplete(rental)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark received
            </Button>
            <Button size="sm" variant="outline" className="h-9 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold" disabled={busy} onClick={() => onCancel(rental)}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          </>
        )}
        {!isBuyer && rental.status === 'active' && (
          <span className="ml-auto text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Send the OTP in chat
          </span>
        )}
      </div>
    </div>
  );
}