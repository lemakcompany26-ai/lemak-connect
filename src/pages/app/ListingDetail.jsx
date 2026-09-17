import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, BadgeDollarSign, Loader2, ShieldCheck, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import PurchaseDialog from '@/components/marketplace/PurchaseDialog';
import { formatNaira, formatDate } from '@/lib/format';
import { followersLabel } from '@/components/marketplace/platforms';

export default function ListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { refresh } = useApp();
  const { toast } = useToast();
  const [listing, setListing] = useState(undefined); // undefined = loading
  const [buying, setBuying] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setListing(undefined);
    base44.functions.invoke('getPublicMarketplace', { action: 'detail', listingId })
      .then(res => setListing((res.data || res).listing))
      .catch(() => setListing(null));
  }, [listingId]);

  const purchase = async () => {
    if (!listing) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('marketplaceOrder', { action: 'purchase', listingId: listing.id });
      const d = res.data || res;
      toast({
        title: 'Payment successful 🎉',
        description: `Order ${d.transactionId} created. Your private chat with the seller is open in My Orders.`
      });
      setBuying(false);
      refresh();
      navigate('/app/marketplace');
    } catch (err) {
      toast({ title: 'Purchase failed', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (listing === undefined) {
    return <div className="rounded-3xl bg-mk-bg border border-mk-border p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-mk-blue" /></div>;
  }

  if (listing === null) {
    return (
      <div className="rounded-3xl bg-mk-bg border border-mk-border p-10 text-center space-y-4">
        <p className="text-sm text-slate-400">This listing is not available.</p>
        <Button variant="outline" className="border-mk-border text-slate-200" onClick={() => navigate('/app/marketplace')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Marketplace
        </Button>
      </div>
    );
  }

  const isAccount = !!listing.platform || !!listing.accountKind;
  const verified = listing.verificationStatus === 'verified';

  return (
    <div className="rounded-3xl bg-mk-bg border border-mk-border p-4 sm:p-6 space-y-5">
      <Button variant="ghost" className="text-slate-400 hover:text-white -ml-2" onClick={() => navigate('/app/marketplace')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Marketplace
      </Button>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl bg-mk-card border border-mk-border p-5 sm:p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-mk-blue-soft bg-mk-blue/10 border border-mk-blue/25 px-2.5 py-1 rounded-full">{listing.platform || listing.category}</span>
              {isAccount && listing.accountKind && <span className="text-xs font-semibold text-slate-400">{listing.accountKind}</span>}
              {listing.monetised && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <BadgeDollarSign className="w-3 h-3" /> Monetised
                </span>
              )}
            </div>
            <h1 className="font-heading text-xl font-extrabold text-white mt-3">{listing.title}</h1>
            <div className="text-xs font-mono text-mk-brown-soft mt-1">Listing ID: {listing.listingId}</div>
          </div>

          {isAccount && listing.followersCount != null && (
            <div className="flex items-center gap-2 text-base font-bold text-mk-blue-soft">
              <Users className="w-5 h-5" /> {Number(listing.followersCount).toLocaleString()} {followersLabel(listing.accountKind)}
            </div>
          )}
          {isAccount && (
            <div className={'text-xs flex items-center gap-1.5 ' + (verified ? 'text-emerald-400' : 'text-slate-500')}>
              <BadgeCheck className="w-3.5 h-3.5" />
              {verified ? 'Metrics verified by Lemak Connect' : 'Metrics as stated by the seller — not independently verified'}
            </div>
          )}

          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{listing.description}</p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {listing.niche && <div><span className="text-slate-500">Niche:</span> <span className="text-slate-200 font-semibold">{listing.niche}</span></div>}
            {listing.audienceCountry && <div><span className="text-slate-500">Audience country:</span> <span className="text-slate-200 font-semibold">{listing.audienceCountry}</span></div>}
            {listing.accountAgeYears != null && <div><span className="text-slate-500">Account age:</span> <span className="text-slate-200 font-semibold">{listing.accountAgeYears} year(s)</span></div>}
            {listing.deliveryTime && <div><span className="text-slate-500">Delivery:</span> <span className="text-slate-200 font-semibold">{listing.deliveryTime}</span></div>}
            {listing.deliveryMethod && <div><span className="text-slate-500">Delivery method:</span> <span className="text-slate-200 font-semibold">{listing.deliveryMethod}</span></div>}
            {listing.averageViews != null && <div><span className="text-slate-500">Avg. views:</span> <span className="text-slate-200 font-semibold">{Number(listing.averageViews).toLocaleString()}</span></div>}
            {listing.averageLikes != null && <div><span className="text-slate-500">Avg. likes:</span> <span className="text-slate-200 font-semibold">{Number(listing.averageLikes).toLocaleString()}</span></div>}
            {listing.averageComments != null && <div><span className="text-slate-500">Avg. comments:</span> <span className="text-slate-200 font-semibold">{Number(listing.averageComments).toLocaleString()}</span></div>}
            {listing.audienceAgeRange && <div><span className="text-slate-500">Audience age:</span> <span className="text-slate-200 font-semibold">{listing.audienceAgeRange}</span></div>}
            {listing.audienceGender && <div><span className="text-slate-500">Audience gender:</span> <span className="text-slate-200 font-semibold">{listing.audienceGender}</span></div>}
            <div><span className="text-slate-500">Listed:</span> <span className="text-slate-200 font-semibold">{formatDate(listing.createdDate)}</span></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-mk-card border border-mk-border p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Price</div>
              <div className="text-3xl font-extrabold text-mk-blue-soft">{formatNaira(listing.price)}</div>
            </div>
            {listing.sellerName && (
              <div className="text-xs text-slate-400">
                Seller: <span className="text-slate-200 font-semibold">{listing.sellerName}</span>{' '}
                <span className="text-emerald-400 font-semibold">· Verified seller</span>
              </div>
            )}
            <Button className="w-full h-12 font-bold bg-mk-blue hover:bg-mk-blue/90 text-white" onClick={() => setBuying(true)}>
              BUY NOW
            </Button>
            <div className="flex items-start gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-mk-brown-soft shrink-0 mt-0.5" />
              <span>Your payment is held in escrow. Chat with the seller opens after payment; the seller is paid only after you test and confirm the delivered account.</span>
            </div>
          </div>

          <div className="rounded-2xl bg-mk-card border border-mk-border p-5 space-y-2 text-[11px] text-slate-400 leading-relaxed">
            <div className="text-xs font-bold text-white">Marketplace terms</div>
            <p>· Payment is protected in escrow — the seller is paid only after you confirm.</p>
            <p>· After payment, a private chat opens for delivery and testing.</p>
            <p>· Test the delivered account before confirming completion.</p>
            <p>· Report problems through My Orders if the account does not match the listing.</p>
            <p>· Never share your Lemak Connect password or wallet PIN with anyone.</p>
          </div>
        </div>
      </div>

      <PurchaseDialog listing={listing} busy={busy} onClose={() => setBuying(false)} onConfirm={purchase} />
    </div>
  );
}