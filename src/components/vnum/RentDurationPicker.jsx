import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatNaira } from '@/lib/format';

const MONTH_LABELS = { 1: '1 Month', 3: '3 Months', 12: '1 Year' };

// Confirm screen for long-term number rentals: duration, total, auto-renew.
export default function RentDurationPicker({ durations, months, onMonths, autoRenew, onAutoRenew, busy, onRent }) {
  const total = (durations.find(d => d.months === months) || {}).customerPrice || null;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-mk-blue" /> Rental duration
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {durations.map(d => (
            <button
              key={d.months}
              type="button"
              onClick={() => onMonths(d.months)}
              className={'rounded-xl border px-2 py-3 text-center ' + (months === d.months
                ? 'border-mk-blue bg-mk-blue text-white'
                : 'border-mk-border bg-mk-card2 text-slate-300')}
            >
              <span className="block text-xs font-bold">{MONTH_LABELS[d.months] || `${d.months} Months`}</span>
              <span className="block text-[11px] font-extrabold mt-1">{formatNaira(d.customerPrice)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-mk-blue/15 border border-mk-blue/30 py-2.5 text-center">
        <span className="text-sm font-extrabold text-white">Total: {total ? formatNaira(total) : '—'}</span>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-xl border border-mk-border bg-mk-card2 px-4 py-3">
        <div>
          <div className="text-xs font-bold text-white">Auto-Renew</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Automatically extend this number when the period ends</div>
        </div>
        <Switch checked={autoRenew} onCheckedChange={onAutoRenew} className="data-[state=checked]:bg-mk-blue" />
      </div>

      <Button
        className="w-full h-12 rounded-full bg-mk-blue hover:bg-mk-blue/90 text-white font-extrabold"
        disabled={busy || !total || !durations.length}
        onClick={onRent}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'RENT NOW'}
      </Button>
    </div>
  );
}