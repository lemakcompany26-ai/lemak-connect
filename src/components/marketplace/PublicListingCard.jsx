import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatNaira } from '@/lib/format';

export default function PublicListingCard({ listing }) {
  const [open, setOpen] = useState(false);
  const seller = listing.seller || {};

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-5 flex flex-col gap-3 hover:border-mk-blue/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Badge className="bg-mk-blue/15 text-mk-blue-soft border border-mk-blue/30 hover:bg-mk-blue/15">{listing.category || 'Service'}</Badge>
        <span className="font-heading font-extrabold text-white text-lg">{formatNaira(listing.price)}</span>
      </div>
      <div>
        <h3 className="font-heading font-bold text-white leading-snug">{listing.title}</h3>
        {seller.fullName && (
          <p className="mt-1 text-xs text-slate-400">
            by {seller.fullName}{seller.accountType ? ` · ${seller.accountType}` : ''}
          </p>
        )}
      </div>
      {listing.deliveryTime && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-mk-brown-soft" /> Delivery: {listing.deliveryTime}
        </p>
      )}
      <Button
        variant="outline"
        className="mt-auto border-mk-border bg-mk-card2 text-white hover:bg-mk-blue hover:border-mk-blue hover:text-white"
        onClick={() => setOpen(true)}
      >
        View details
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-mk-card border-mk-border text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">{listing.title}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {listing.category} · {formatNaira(listing.price)}{listing.deliveryTime ? ` · ${listing.deliveryTime}` : ''}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-slate-300 whitespace-pre-line">{listing.description}</p>

          {(seller.fullName || seller.serviceTitle || seller.portfolioUrl) && (
            <div className="rounded-xl bg-mk-card2 border border-mk-border p-4 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-mk-brown-soft">About the seller</p>
              {seller.fullName && <p className="text-sm text-white">{seller.fullName}{seller.accountType ? ` — ${seller.accountType}` : ''}</p>}
              {seller.serviceTitle && <p className="text-xs text-slate-400">{seller.serviceTitle}</p>}
              {seller.portfolioUrl && (
                <a href={seller.portfolioUrl} target="_blank" rel="noreferrer" className="text-xs text-mk-blue-soft underline inline-flex items-center gap-1">
                  View portfolio <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button asChild className="flex-1 bg-mk-blue hover:bg-mk-blue/90 text-white font-bold">
              <Link to="/login?returnTo=/app/marketplace" onClick={() => setOpen(false)}>Sign in to purchase</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-mk-border bg-mk-card2 text-white hover:bg-mk-card hover:border-mk-blue">
              <Link to="/register" onClick={() => setOpen(false)}>Create account</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}