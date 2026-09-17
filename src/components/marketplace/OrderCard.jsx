import { MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/admin/marketplace/StatusBadge';
import { formatNaira, formatDate } from '@/lib/format';

export default function OrderCard({ order, mode, busy, onAction, onChat }) {
  const isBuying = mode === 'buying';
  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">{order.listingTitle}</div>
          <div className="text-[11px] font-mono text-mk-brown-soft mt-0.5">{order.transactionId}</div>
          <div className="text-xs text-slate-400 mt-1">
            {isBuying ? `You paid ${formatNaira(order.amount)}` : `Your payout ${formatNaira(order.sellerPayout)}`} · {formatDate(order.created_date)}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-mk-brown-soft" /> Escrow-protected
        </div>
        {onChat && (
          <Button size="sm" variant="ghost" className="h-9 text-slate-300 hover:text-white font-semibold" onClick={() => onChat(order)}>
            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat
          </Button>
        )}
        {isBuying && order.status === 'delivered' && (
          <>
            {!order.testingStartedAt && (
              <Button size="sm" variant="outline" className="h-9 border-mk-blue/40 text-mk-blue-soft hover:bg-mk-blue/10 font-semibold" disabled={busy} onClick={() => onAction('start_test', order)}>
                Start Test
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-9 border-red-500/40 text-red-400 hover:bg-red-500/10 font-semibold" disabled={busy} onClick={() => onAction('report_problem', order)}>
              Report Problem
            </Button>
            <Button size="sm" className="h-9 ml-auto bg-mk-blue hover:bg-mk-blue/90 text-white font-bold" disabled={busy} onClick={() => onAction('confirm', order)}>
              Confirm Account
            </Button>
          </>
        )}
        {isBuying && order.status === 'disputed' && (
          <span className="ml-auto text-[11px] text-red-400 font-semibold">Dispute open — Lemak Connect is reviewing</span>
        )}
        {!isBuying && ['in_progress', 'paid', 'pending'].includes(order.status) && (
          <Button size="sm" variant="outline" className="h-9 ml-auto border-mk-brown-soft/40 text-mk-brown-soft hover:bg-mk-brown/20 font-semibold" disabled={busy} onClick={() => onAction('deliver', order)}>
            Mark Delivered
          </Button>
        )}
      </div>
    </div>
  );
}