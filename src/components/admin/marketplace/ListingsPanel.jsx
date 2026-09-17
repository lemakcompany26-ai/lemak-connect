import { useState } from 'react';
import { Eye, Check, X, MessageSquare, Pause, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from './StatusBadge';
import ReasonDialog from './ReasonDialog';
import { formatNaira, formatDate } from '@/lib/format';

const FILTERS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['changes_requested', 'Changes Requested'],
  ['suspended', 'Suspended'],
  ['all', 'All']
];

function ListingDetail({ listing, seller, onClose }) {
  if (!listing) return null;
  const rows = [
    ['Listing ID', listing.listingId],
    ['Service', listing.title],
    ['Category', listing.category],
    ['Price', `${formatNaira(listing.price)} ${listing.currency || 'NGN'}`],
    ['Delivery Time', listing.deliveryTime],
    ['Source', listing.source === 'google_form' ? 'Google Form' : 'In App'],
    ['Submission ID', listing.submissionId],
    ['Submitted', formatDate(listing.submittedAt || listing.created_date)],
    ['Description', listing.description],
    ['Portfolio', listing.portfolioUrl],
    ['Seller', seller ? `${seller.fullName} (@${seller.username || '—'})` : '—'],
    ['Seller Email', seller && seller.email],
    ['Seller Phone', seller && seller.phone],
    ['Account Type', seller && seller.accountType],
    ['Seller Status', seller && seller.status],
    ['Reviewed By', listing.reviewedBy],
    ['Reviewed At', formatDate(listing.reviewedAt)],
    ['Rejection Reason', listing.rejectionReason],
    ['Admin Message', listing.adminMessage]
  ];
  return (
    <Dialog open={!!listing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-mk-card border-mk-border text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {listing.title}
            <StatusBadge status={listing.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5">
          {rows.filter(([, v]) => v !== undefined && v !== null && String(v) !== '').map(([label, value]) => (
            <div key={label} className="flex gap-3 text-sm">
              <span className="w-36 shrink-0 text-slate-400">{label}</span>
              <span className="text-slate-100 break-all">{String(value)}</span>
            </div>
          ))}
          {listing.portfolioUrl && (
            <a href={listing.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-mk-blue-soft font-medium">
              Open portfolio <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ListingsPanel({ listings, sellers, busyId, onAct }) {
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [requesting, setRequesting] = useState(null);

  const sellerMap = Object.fromEntries((sellers || []).map(s => [s.id, s]));
  const filtered = (listings || []).filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const seller = sellerMap[l.sellerId];
    return [l.listingId, l.title, seller && seller.username, seller && seller.fullName, seller && seller.email]
      .some(v => String(v || '').toLowerCase().includes(q));
  });
  const busy = busyId === (rejecting || requesting || {}).id;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listing ID, seller username, service or email…"
            className="h-11 pl-9 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500"
          />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
              filter === value ? 'bg-mk-blue text-white border-mk-blue' : 'bg-mk-card text-slate-300 border-mk-border hover:bg-mk-card2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-mk-border p-10 text-center text-sm text-slate-400">
          No listings match this filter.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(l => {
          const seller = sellerMap[l.sellerId];
          return (
            <div key={l.id} className="rounded-2xl bg-mk-card border border-mk-border p-4">
              <div className="flex flex-col gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-mk-brown-soft">{l.listingId || '—'}</span>
                    <span className="text-sm font-bold text-white">{l.title}</span>
                    <StatusBadge status={l.status} />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {seller ? `${seller.fullName}${seller.username ? ' (@' + seller.username + ')' : ''}` : 'Unknown seller'} · {l.category} · {formatNaira(l.price)} {l.currency}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Submitted {formatDate(l.submittedAt || l.created_date)} · Source: {l.source === 'google_form' ? 'Google Form' : 'In App'}
                    {seller ? ` · Seller status: ${seller.status}` : ''}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <Button size="sm" variant="outline" className="h-9 border-mk-border text-slate-300 hover:bg-mk-card2" onClick={() => setViewing(l)}>
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  {l.status === 'pending' && (
                    <>
                      <Button size="sm" className="h-9 bg-mk-blue hover:bg-mk-blue/90 text-white font-semibold" disabled={busyId === l.id} onClick={() => onAct('approve_listing', l)}>
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 border-mk-brown-soft/40 text-mk-brown-soft hover:bg-mk-brown/20 font-semibold" disabled={busyId === l.id} onClick={() => setRequesting(l)}>
                        <MessageSquare className="w-4 h-4 mr-1" /> Request Changes
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold" disabled={busyId === l.id} onClick={() => setRejecting(l)}>
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {l.status === 'approved' && (
                    <Button size="sm" variant="outline" className="h-9 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-semibold" disabled={busyId === l.id} onClick={() => onAct('suspend_listing', l)}>
                      <Pause className="w-4 h-4 mr-1" /> Suspend
                    </Button>
                  )}
                  {['suspended', 'rejected', 'changes_requested', 'delisted'].includes(l.status) && (
                    <Button size="sm" className="h-9 bg-mk-blue hover:bg-mk-blue/90 text-white font-semibold" disabled={busyId === l.id} onClick={() => onAct('approve_listing', l)}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ListingDetail listing={viewing} seller={viewing ? sellerMap[viewing.sellerId] : null} onClose={() => setViewing(null)} />
      <ReasonDialog
        open={!!rejecting}
        title="Reject listing"
        label="Rejection reason (shared with the seller)."
        placeholder="e.g. Service details are incomplete…"
        busy={busy}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => onAct('reject_listing', rejecting, { reason }).then(() => setRejecting(null))}
      />
      <ReasonDialog
        open={!!requesting}
        title="Request changes"
        label="What should the seller change before resubmission?"
        placeholder="e.g. Please add delivery time and portfolio links…"
        busy={busy}
        onCancel={() => setRequesting(null)}
        onConfirm={(message) => onAct('request_changes_listing', requesting, { message }).then(() => setRequesting(null))}
      />
    </div>
  );
}