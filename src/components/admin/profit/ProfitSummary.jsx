import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';

const PERIODS = [
  ['today', 'Today'],
  ['7days', '7 Days'],
  ['30days', '30 Days'],
  ['thisMonth', 'This Month'],
  ['allTime', 'All Time']
];

// Profit summary over completed transactions — today, 7 days, 30 days,
// this month and all time. Failed and cancelled orders never count.
export default function ProfitSummary({ summary, loading, onRefresh }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold">Profit Summary</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Completed transactions only — failed and cancelled orders are never counted. Payment fees are estimated at Paystack's local rate (1.5% + ₦100, capped at ₦2,000).
          </p>
        </div>
        <Button variant="outline" size="icon" className="shrink-0" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {loading && !summary ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {PERIODS.map(([key, label]) => {
            const s = (summary && summary[key]) || {};
            return (
              <div key={key} className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Revenue</span><span className="font-bold">{formatNaira(s.revenue || 0)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Provider cost</span><span className="font-bold">{formatNaira(s.providerCost || 0)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Gross profit</span><span className="font-bold text-emerald-600">{formatNaira(s.grossProfit || 0)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Net profit</span><span className={'font-extrabold ' + ((s.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatNaira(s.netProfit || 0)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}