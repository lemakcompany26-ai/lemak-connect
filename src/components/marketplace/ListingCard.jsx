import { BadgeCheck, BadgeDollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';
import { followersLabel } from '@/components/marketplace/platforms';

export default function ListingCard({ listing, onBuy, onView }) {
  const isAccount = !!listing.platform || !!listing.accountKind;
  const verified = listing.verificationStatus === 'verified';
  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
            {listing.platform || listing.category}
            {isAccount && listing.accountKind && <span className="text-slate-400 font-medium">· {listing.accountKind}</span>}
          </div>
          <div className="text-[11px] font-mono text-mk-brown-soft mt-0.5">{listing.listingId}</div>
        </div>
        {listing.monetised && (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
            <BadgeDollarSign className="w-3 h-3" /> Monetised
          </span>
        )}
      </div>

      <h3 className="font-heading font-bold text-white text-sm mt-2 leading-snug">{listing.title}</h3>

      {isAccount && listing.followersCount != null && (
        <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-mk-blue-soft">
          <Users className="w-4 h-4" /> {Number(listing.followersCount).toLocaleString()} {followersLabel(listing.accountKind)}
        </div>
      )}
      {isAccount && !listing.monetised && (
        <div className="mt-1.5 text-[11px] text-slate-500">Unmonetised</div>
      )}
      {isAccount && (
        <div className="mt-1.5 text-[11px] flex items-center gap-1">
          {verified
            ? <span className="text-emerald-400 font-semibold flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Metrics verified by Lemak Connect</span>
            : <span className="text-slate-500">Metrics as stated by seller (unverified)</span>}
        </div>
      )}

      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mt-2">{listing.description}</p>
      {listing.sellerName && <div className="text-[11px] text-slate-500 mt-2">by {listing.sellerName}{listing.niche ? ` · ${listing.niche}` : ''}</div>}

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-mk-border pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Price</div>
          <div className="text-lg font-extrabold text-mk-blue-soft">{formatNaira(listing.price)}</div>
        </div>
        {listing.deliveryTime && <div className="text-[11px] text-slate-500 text-right">Delivery: {listing.deliveryTime}</div>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11 font-semibold border-mk-border text-slate-200 hover:bg-mk-card2" onClick={() => onView(listing)}>
          View Details
        </Button>
        <Button className="h-11 font-bold bg-mk-blue hover:bg-mk-blue/90 text-white" onClick={() => onBuy(listing)}>
          Buy Now
        </Button>
      </div>
    </div>
  );
}