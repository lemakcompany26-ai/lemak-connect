import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';

export default function PurchaseDialog({ listing, busy, onClose, onConfirm }) {
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    if (!listing) { setBreakdown(null); return; }
    setBreakdown(null);
    base44.functions.invoke('marketplaceOrder', { action: 'preview', listingId: listing.id })
      .then(res => setBreakdown((res.data || res).breakdown))
      .catch(() => setBreakdown(null));
  }, [listing]);

  return (
    <Dialog open={!!listing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-mk-card border-mk-border text-white">
        <DialogHeader>
          <DialogTitle>Buy with Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">{listing && listing.title}</div>
          {listing && (listing.platform || listing.followersCount != null) && (
            <div className="text-xs text-slate-400 space-y-0.5">
              {listing.platform && (
                <div>Platform: <span className="text-slate-200 font-semibold">{listing.platform}{listing.accountKind ? ` — ${listing.accountKind}` : ''}</span></div>
              )}
              {listing.followersCount != null && (
                <div>{listing.accountKind === 'Channel' ? 'Subscribers' : 'Followers'}: <span className="text-slate-200 font-semibold">{Number(listing.followersCount).toLocaleString()}</span></div>
              )}
              <div>Monetisation: <span className="text-slate-200 font-semibold">{listing.monetised ? 'Monetised' : 'Unmonetised'}</span></div>
            </div>
          )}
          {!breakdown ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>
          ) : (
            <div className="rounded-xl bg-mk-card2 border border-mk-border divide-y divide-mk-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">Listing Price</span>
                <span className="font-semibold text-white">{formatNaira(breakdown.saleAmount)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">Buyer Fee</span>
                <span className="font-semibold text-white">{formatNaira(breakdown.buyerFee)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">Total You Pay</span>
                <span className="font-extrabold text-mk-blue-soft">{formatNaira(breakdown.buyerTotal)}</span>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-mk-brown-soft shrink-0 mt-0.5" />
            <span>Your payment is held in escrow and only released to the seller after you confirm delivery. Fees are calculated securely by Lemak Connect.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-mk-border text-slate-300 hover:bg-mk-card2" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="bg-mk-blue hover:bg-mk-blue/90 text-white font-bold" onClick={onConfirm} disabled={busy || !breakdown}>
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Pay {breakdown ? formatNaira(breakdown.buyerTotal) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}