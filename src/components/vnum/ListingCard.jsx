import { Button } from '@/components/ui/button';
import { Clock, Phone, Power } from 'lucide-react';
import { formatNaira } from '@/lib/format';

export default function ListingCard({ listing, busy, onRent }) {
  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-mk-blue shrink-0" /> {listing.service}
          </div>
          <div className="text-[11px] font-mono text-mk-brown-soft mt-0.5">{listing.listingRef}</div>
        </div>
        {listing.available
          ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Available</span>
          : <span className="text-[10px] font-bold text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full">Rented</span>}
      </div>

      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{listing.description || `Rent this number to receive ${listing.service} OTPs.`}</p>

      <div className="mt-3 text-[11px] text-slate-500">
        by {listing.sellerName} · {listing.country}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-base font-extrabold text-mk-blue">{formatNaira(listing.price)}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {listing.rentalMinutes} min window
          </div>
        </div>
        <Button
          size="sm"
          className="h-9 bg-mk-blue hover:bg-mk-blue/90 text-white font-bold"
          disabled={busy || !listing.available}
          onClick={() => onRent(listing)}
        >
          <Power className="w-3.5 h-3.5 mr-1" /> Rent
        </Button>
      </div>
    </div>
  );
}