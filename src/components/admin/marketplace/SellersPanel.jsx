import { Check, X, Pause, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import { formatNaira, formatDate } from '@/lib/format';

export default function SellersPanel({ sellers, busyId, onAct }) {
  const pending = (sellers || []).filter(s => s.status === 'pending');
  const others = (sellers || []).filter(s => s.status !== 'pending');

  const SellerCard = ({ seller }) => (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-4">
      <div className="flex flex-col gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{seller.fullName || seller.email}</span>
            {seller.username && <span className="text-xs text-slate-400">@{seller.username}</span>}
            <StatusBadge status={seller.status} />
            {seller.source === 'google_form' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-mk-brown/25 text-mk-brown-soft border-mk-brown-soft/40">Google Form</span>}
          </div>
          <div className="text-xs text-slate-400 mt-1">{seller.email} · {seller.phone || '—'} · {seller.accountType || '—'}</div>
          {seller.serviceTitle && <div className="mt-2 text-sm font-semibold text-white">{seller.serviceTitle} — {formatNaira(seller.price)}</div>}
          {(seller.category || seller.deliveryTime) && <div className="text-xs text-slate-400">{seller.category || '—'} · Delivery: {seller.deliveryTime || '—'}</div>}
          {seller.listingId && <div className="text-[11px] font-mono text-mk-brown-soft mt-1">{seller.listingId}</div>}
          {seller.verificationInfo && <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">Verification: {seller.verificationInfo}</p>}
          {seller.reviewNotes && <p className="mt-1.5 text-xs text-mk-blue-soft">Admin feedback: {seller.reviewNotes}</p>}
          {seller.portfolioUrl && (
            <a href={seller.portfolioUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-mk-blue-soft font-medium">
              Portfolio <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="mt-1 text-[11px] text-slate-500">Applied {formatDate(seller.submittedAt || seller.created_date)}{seller.reviewedBy ? ` · reviewed by ${seller.reviewedBy}` : ''}</div>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {seller.status === 'pending' && (
            <>
              <Button size="sm" className="h-9 bg-mk-blue hover:bg-mk-blue/90 text-white font-semibold" disabled={busyId === seller.id} onClick={() => onAct('approve_seller', seller)}>
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold" disabled={busyId === seller.id} onClick={() => onAct('reject_seller', seller)}>
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
            </>
          )}
          {seller.status === 'approved' && (
            <Button size="sm" variant="outline" className="h-9 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-semibold" disabled={busyId === seller.id} onClick={() => onAct('suspend_seller', seller)}>
              <Pause className="w-4 h-4 mr-1" /> Suspend
            </Button>
          )}
          {['suspended', 'rejected'].includes(seller.status) && (
            <Button size="sm" variant="outline" className="h-9 border-mk-border text-slate-300 hover:bg-mk-card2 font-semibold" disabled={busyId === seller.id} onClick={() => onAct('reinstate_seller', seller)}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reinstate
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {(sellers || []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-mk-border p-10 text-center text-sm text-slate-400">No seller applications yet.</div>
      )}
      {pending.map(s => <SellerCard key={s.id} seller={s} />)}
      {others.map(s => <SellerCard key={s.id} seller={s} />)}
    </div>
  );
}