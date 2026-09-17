import { useEffect, useState } from 'react';
import { Store, Loader2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import PublicListingCard from '@/components/marketplace/PublicListingCard';
import { Button } from '@/components/ui/button';

const DEFAULT_SELL_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScImMvathwSUGku7WKY_R4E9eo2Ps9k23Fs8qWpU0GmneNAIQ/viewform?usp=headers';

export default function MarketplacePublic() {
  const [listings, setListings] = useState(null);
  const [sellUrl, setSellUrl] = useState(DEFAULT_SELL_FORM_URL);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getPublicMarketplace')
      .then(res => setListings((res.data && res.data.listings) || []))
      .catch(() => { setListings([]); setFailed(true); });
    base44.entities.AdminSetting.list('-created_date', 200)
      .then(rows => {
        const row = (rows || []).find(r => r.key === 'google_sell_form_url');
        if (row && row.value) setSellUrl(row.value);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1 bg-mk-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-extrabold text-white flex items-center gap-3">
                <Store className="w-7 h-7 text-mk-blue" /> Marketplace
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                Browse trusted digital services from verified sellers. Pay securely from your Lemak wallet — every order is protected by escrow.
              </p>
            </div>
            <Button asChild className="bg-mk-blue hover:bg-mk-blue/90 text-white font-bold h-11 px-6">
              <a href={sellUrl} target="_blank" rel="noreferrer">SELL ON LEMAK <ExternalLink className="w-4 h-4 ml-1.5" /></a>
            </Button>
          </div>

          {listings === null && (
            <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-mk-blue" /></div>
          )}

          {listings && listings.length === 0 && (
            <div className="py-16 text-center border border-dashed border-mk-border rounded-2xl">
              <Store className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="mt-3 text-sm text-slate-400">
                {failed ? 'The marketplace could not be loaded right now. Please refresh.' : 'No listings yet — be the first to sell your digital service.'}
              </p>
            </div>
          )}

          {listings && listings.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(l => <PublicListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}