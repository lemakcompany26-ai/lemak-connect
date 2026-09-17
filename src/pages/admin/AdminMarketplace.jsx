import { useEffect, useState } from 'react';
import { Check, X, Loader2, Pause, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira, formatDate } from '@/lib/format';

function SellerRow({ seller, onAct, busy }) {
  const statusStyles = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    suspended: 'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-blue-50 text-blue-700 border-blue-200'
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">{seller.fullName}</span>
            <span className="text-xs text-muted-foreground">@{seller.username}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusStyles[seller.status] || ''}`}>{seller.status}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{seller.email} · {seller.phone || '—'} · {seller.accountType}</div>
          <div className="mt-2 text-sm font-semibold">{seller.serviceTitle} — {formatNaira(seller.price)}</div>
          <div className="text-xs text-muted-foreground">{seller.category} · Delivery: {seller.deliveryTime || '—'}</div>
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{seller.description}</p>
          {seller.portfolioUrl && <a href={seller.portfolioUrl} target="_blank" rel="noreferrer" className="text-xs text-primary font-medium">{seller.portfolioUrl}</a>}
          <div className="mt-1 text-[11px] text-muted-foreground/70">Applied {formatDate(seller.created_date)}{seller.reviewedBy ? ` · reviewed by ${seller.reviewedBy}` : ''}</div>
        </div>
        {seller.status === 'pending' && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" className="h-9 font-semibold" disabled={busy} onClick={() => onAct(seller, 'approve_seller')}><Check className="w-4 h-4 mr-1" /> Approve</Button>
            <Button size="sm" variant="outline" className="h-9 font-semibold text-destructive border-destructive/30" disabled={busy} onClick={() => onAct(seller, 'reject_seller')}><X className="w-4 h-4 mr-1" /> Reject</Button>
          </div>
        )}
        {seller.status === 'approved' && (
          <Button size="sm" variant="outline" className="h-9 shrink-0 font-semibold" disabled={busy} onClick={() => onAct(seller, 'suspend_seller')}>
            <Pause className="w-4 h-4 mr-1" /> Suspend
          </Button>
        )}
        {(seller.status === 'suspended' || seller.status === 'rejected') && (
          <Button size="sm" variant="outline" className="h-9 shrink-0 font-semibold" disabled={busy} onClick={() => onAct(seller, 'reinstate_seller')}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reinstate
          </Button>
        )}
      </div>
    </div>
  );
}

function ListingRow({ listing, onAct, busy }) {
  const statusStyles = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    delisted: 'bg-amber-50 text-amber-700 border-amber-200',
    pending_approval: 'bg-blue-50 text-blue-700 border-blue-200'
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{listing.title}</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusStyles[listing.status] || ''}`}>{listing.status.replace('_', ' ')}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{listing.category} · {formatNaira(listing.price)} · {formatDate(listing.created_date)}</div>
      </div>
      {listing.status === 'pending_approval' && (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="h-9 font-semibold" disabled={busy} onClick={() => onAct(listing, 'approve_listing')}><Check className="w-4 h-4 mr-1" /> Publish</Button>
          <Button size="sm" variant="outline" className="h-9 font-semibold text-destructive border-destructive/30" disabled={busy} onClick={() => onAct(listing, 'reject_listing')}><X className="w-4 h-4 mr-1" /> Reject</Button>
        </div>
      )}
      {listing.status === 'approved' && (
        <Button size="sm" variant="outline" className="h-9 shrink-0 font-semibold" disabled={busy} onClick={() => onAct(listing, 'delist_listing')}>Delist</Button>
      )}
    </div>
  );
}

export default function AdminMarketplace() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState(null);
  const [listings, setListings] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    base44.entities.MarketplaceSeller.list('-created_date', 200).then(setSellers).catch(() => setSellers([]));
    base44.entities.MarketplaceListing.list('-created_date', 200).then(setListings).catch(() => setListings([]));
  };
  useEffect(() => { load(); }, []);

  const act = async (record, action) => {
    setBusyId(record.id);
    try {
      await base44.functions.invoke('adminAction', { action, targetId: record.id });
      toast({ title: 'Done' });
      load();
    } catch (err) {
      toast({ title: 'Action failed', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const pendingSellers = (sellers || []).filter(s => s.status === 'pending');
  const otherSellers = (sellers || []).filter(s => s.status !== 'pending');
  const pendingListings = (listings || []).filter(l => l.status === 'pending_approval');
  const otherListings = (listings || []).filter(l => l.status !== 'pending_approval');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">Seller verification and listing approvals. Nothing goes public without approval.</p>
      </div>

      <Tabs defaultValue="sellers">
        <TabsList>
          <TabsTrigger value="sellers">Sellers ({pendingSellers.length} pending)</TabsTrigger>
          <TabsTrigger value="listings">Listings ({pendingListings.length} pending)</TabsTrigger>
        </TabsList>

        <TabsContent value="sellers" className="mt-5 space-y-3">
          {sellers === null && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
          {pendingSellers.map(s => <SellerRow key={s.id} seller={s} onAct={act} busy={busyId === s.id} />)}
          {otherSellers.map(s => <SellerRow key={s.id} seller={s} onAct={act} busy={busyId === s.id} />)}
          {sellers && sellers.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No seller applications yet.</div>}
        </TabsContent>

        <TabsContent value="listings" className="mt-5 space-y-3">
          {listings === null && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
          {pendingListings.map(l => <ListingRow key={l.id} listing={l} onAct={act} busy={busyId === l.id} />)}
          {otherListings.map(l => <ListingRow key={l.id} listing={l} onAct={act} busy={busyId === l.id} />)}
          {listings && listings.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No listings yet.</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}