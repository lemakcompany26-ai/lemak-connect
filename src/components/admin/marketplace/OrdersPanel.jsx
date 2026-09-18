import { useMemo, useState } from 'react';
import { RotateCcw, Search, ShieldCheck, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminTable from './AdminTable';
import StatusBadge from './StatusBadge';
import { formatNaira, formatDate } from '@/lib/format';

const REFUNDABLE = ['pending', 'paid', 'in_progress', 'delivered', 'disputed', 'confirmed'];
const REASON_LABELS = {
  account_inaccessible: 'Account inaccessible',
  wrong_account: 'Wrong account',
  follower_count_differs: 'Follower count differs',
  monetisation_differs: 'Monetisation differs',
  account_type_differs: 'Account type differs',
  seller_did_not_deliver: 'Seller did not deliver',
  other: 'Other'
};

export default function OrdersPanel({ orders, disputes, busyId, onRefund, onResolve }) {
  const [search, setSearch] = useState('');

  const openDisputeByOrder = useMemo(() => {
    const map = {};
    for (const d of disputes || []) {
      if (['open', 'under_review'].includes(d.status)) map[d.orderId] = d;
    }
    return map;
  }, [disputes]);

  const q = search.trim().toLowerCase();
  const visible = q
    ? (orders || []).filter(o => [o.transactionId, o.id, o.listingId, o.listingTitle, o.buyerUserId, o.sellerUserId]
        .some(v => String(v || '').toLowerCase().includes(q)))
    : (orders || []);

  const columns = [
    {
      label: 'Order',
      cell: o => (
        <div className="min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-mk-brown-soft">{o.transactionId || o.id}</span>
            <StatusBadge status={o.status} />
            {o.payoutStatus === 'manual' && <StatusBadge status="manual" />}
          </div>
          <div className="text-sm font-bold text-white mt-1">{o.listingTitle}</div>
          {o.accountUrl && (
            <a href={o.accountUrl} target="_blank" rel="noreferrer" className="text-[11px] text-mk-blue-soft underline break-all mt-0.5 block">{o.accountUrl}</a>
          )}
        </div>
      )
    },
    { label: 'Escrow', cell: o => <span className="font-bold text-white whitespace-nowrap">{formatNaira(o.amount)}</span> },
    {
      label: 'Fees',
      cell: o => (
        <div className="text-xs whitespace-nowrap">
          <div>Listing {formatNaira(o.listingPrice)}</div>
          <div className="text-slate-400">Buyer fee {formatNaira(o.buyerFee)} · Commission {formatNaira(o.commission)}</div>
        </div>
      )
    },
    {
      label: 'Seller Payout',
      cell: o => (
        <div className="text-xs whitespace-nowrap">
          <div className="text-mk-blue-soft font-semibold">{formatNaira(o.sellerPayout)}</div>
          <div className="text-slate-400">{o.payoutAt ? `paid ${formatDate(o.payoutAt)}` : o.payoutStatus || ''}</div>
        </div>
      )
    },
    {
      label: 'Timeline',
      cell: o => (
        <div className="text-[11px] text-slate-500 whitespace-nowrap">
          <div>Created {formatDate(o.created_date)}</div>
          {o.deliveredAt && <div>Delivered {formatDate(o.deliveredAt)}</div>}
          {o.testingStartedAt && <div>Testing {formatDate(o.testingStartedAt)}</div>}
          {o.confirmedAt && <div>Confirmed {formatDate(o.confirmedAt)}</div>}
        </div>
      )
    },
    {
      label: '',
      className: 'text-right',
      cell: o => REFUNDABLE.includes(o.status) && !openDisputeByOrder[o.id] ? (
        <Button size="sm" variant="outline" className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold" disabled={busyId === o.id} onClick={() => onRefund(o)}>
          <RotateCcw className="w-4 h-4 mr-1" /> Refund Buyer
        </Button>
      ) : null
    }
  ];

  // Compact card for mobile — same information as the table.
  const renderCard = o => (
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
        <div className="text-[11px] text-slate-500 mt-0.5">
          Created {formatDate(o.created_date)}
          {o.deliveredAt ? ` · delivered ${formatDate(o.deliveredAt)}` : ''}
          {o.testingStartedAt ? ` · testing ${formatDate(o.testingStartedAt)}` : ''}
          {o.confirmedAt ? ` · confirmed ${formatDate(o.confirmedAt)}` : ''}
        </div>
        {o.accountUrl && (
          <div className="text-[11px] mt-1">
            <span className="text-slate-500">Account URL:</span>{' '}
            <a href={o.accountUrl} target="_blank" rel="noreferrer" className="text-mk-blue-soft underline break-all">{o.accountUrl}</a>
          </div>
        )}
      </div>
      {REFUNDABLE.includes(o.status) && !openDisputeByOrder[o.id] && (
        <Button size="sm" variant="outline" className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold shrink-0" disabled={busyId === o.id} onClick={() => onRefund(o)}>
          <RotateCcw className="w-4 h-4 mr-1" /> Refund Buyer
        </Button>
      )}
    </div>
  );

  const renderExpanded = o => {
    const dispute = openDisputeByOrder[o.id];
    if (!dispute) return null;
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={dispute.status} />
          <span className="text-xs font-bold text-white">Dispute {dispute.disputeId || ''}</span>
          <span className="text-[11px] text-slate-400">· {REASON_LABELS[dispute.reason] || dispute.reason} · {formatDate(dispute.created_date)}</span>
        </div>
        {dispute.details && <p className="text-[11px] text-slate-300 leading-relaxed">{dispute.details}</p>}
        <div className="flex gap-2 flex-wrap pt-1">
          <Button size="sm" variant="outline" className="h-8 border-red-500/40 text-red-400 hover:bg-red-500/10 font-semibold" disabled={busyId === dispute.id} onClick={() => onResolve(dispute, 'refund_buyer')}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refund Buyer
          </Button>
          <Button size="sm" variant="outline" className="h-8 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-semibold" disabled={busyId === dispute.id} onClick={() => onResolve(dispute, 'release_seller')}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Release to Seller
          </Button>
          <Button size="sm" variant="outline" className="h-8 border-mk-border text-slate-300 hover:bg-mk-card2 font-semibold" disabled={busyId === dispute.id} onClick={() => onResolve(dispute, 'resume_testing')}>
            <Undo2 className="w-3.5 h-3.5 mr-1" /> Resume Testing
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          className="h-10 pl-9 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500"
          placeholder="Search by order ID, transaction ID, listing, buyer or seller…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <AdminTable
        columns={columns}
        rows={visible}
        renderCard={renderCard}
        renderExpanded={renderExpanded}
        empty={<div className="rounded-2xl border border-dashed border-mk-border p-10 text-center text-sm text-slate-400">No marketplace orders found.</div>}
      />
    </div>
  );
}