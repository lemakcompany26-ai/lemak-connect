import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import { formatNaira, formatDate } from '@/lib/format';

export default function OrdersPanel({ orders, busyId, onRefund }) {
  const REFUNDABLE = ['pending', 'paid', 'in_progress', 'delivered', 'confirmed'];

  return (
    <div className="space-y-3">
      {(orders || []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-mk-border p-10 text-center text-sm text-slate-400">No marketplace orders yet.</div>
      )}
      {(orders || []).map(o => (
        <div key={o.id} className="rounded-2xl bg-mk-card border border-mk-border p-4">
          <div className="flex flex-col gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-mk-brown-soft">{o.transactionId || o.id}</span>
                <span className="text-sm font-bold text-white">{o.listingTitle}</span>
                <StatusBadge status={o.status} />
                {o.payoutStatus === 'manual' && <StatusBadge status="manual" />}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Escrow {formatNaira(o.amount)} · Listing {formatNaira(o.listingPrice)} · Buyer fee {formatNaira(o.buyerFee)} · Commission {formatNaira(o.commission)}
              </div>
              <div className="text-xs text-mk-blue-soft mt-0.5">Seller payout: {formatNaira(o.sellerPayout)}{o.payoutAt ? ` · paid ${formatDate(o.payoutAt)}` : ''}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Created {formatDate(o.created_date)}{o.deliveredAt ? ` · delivered ${formatDate(o.deliveredAt)}` : ''}{o.confirmedAt ? ` · confirmed ${formatDate(o.confirmedAt)}` : ''}</div>
            </div>
            {REFUNDABLE.includes(o.status) && (
              <Button size="sm" variant="outline" className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold shrink-0" disabled={busyId === o.id} onClick={() => onRefund(o)}>
                <RotateCcw className="w-4 h-4 mr-1" /> Refund Buyer
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}