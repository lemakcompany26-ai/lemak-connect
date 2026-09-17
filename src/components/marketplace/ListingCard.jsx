import { ExternalLink, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';

export default function ListingCard({ listing, buySheetUrl, onBuy }) {
  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-5 space-y-3 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-white text-sm leading-snug">{listing.title}</h3>
          <span className="text-xs text-slate-400">{listing.category}</span>
        </div>
        <div className="font-heading font-extrabold text-mk-blue-soft whitespace-nowrap">{formatNaira(listing.price)}</div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{listing.description}</p>
      <div className="text-xs font-semibold text-slate-300">Delivery: {listing.deliveryTime || '—'}</div>
      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Button asChild className="h-11 font-bold bg-mk-blue hover:bg-mk-blue/90 text-white">
          <a href={buySheetUrl} target="_blank" rel="noreferrer">
            BUY NOW <ExternalLink className="w-4 h-4 ml-1.5" />
          </a>
        </Button>
        <Button variant="outline" className="h-11 font-semibold border-mk-brown-soft/40 text-mk-brown-soft hover:bg-mk-brown/20" onClick={() => onBuy(listing)}>
          <Wallet className="w-4 h-4 mr-1.5" /> Pay with Wallet
        </Button>
      </div>
    </div>
  );
}