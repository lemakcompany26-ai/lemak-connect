import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import ListingCard from '@/components/vnum/ListingCard';
import RentalCard from '@/components/vnum/RentalCard';
import RentalChatDialog from '@/components/vnum/RentalChatDialog';
import CreateListingForm from '@/components/vnum/CreateListingForm';
import UnifiedCatalogue from '@/components/vnum/UnifiedCatalogue';
import { formatNaira } from '@/lib/format';

export default function VirtualNumbers() {
  const { refresh } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [listings, setListings] = useState(null);
  const [myRentals, setMyRentals] = useState(null);
  const [sellerRentals, setSellerRentals] = useState(null);
  const [myListings, setMyListings] = useState(null);
  const [tab, setTab] = useState('browse');
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState(null); // { rental, role }

  const call = async (payload, okTitle, okDesc) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('virtualNumbers', payload);
      const d = res.data || res;
      if (okTitle) toast({ title: okTitle, description: okDesc });
      load();
      refresh();
      return d;
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Action failed', description: (d && d.error) || e.message, variant: 'destructive' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const load = useCallback(() => {
    base44.functions.invoke('virtualNumbers', { action: 'browse' })
      .then(res => { const d = res.data || res; setListings(d.listings || []); })
      .catch(() => setListings([]));
    base44.functions.invoke('virtualNumbers', { action: 'my_rentals' })
      .then(res => { const d = res.data || res; setMyRentals(d.rentals || []); })
      .catch(() => setMyRentals([]));
    base44.functions.invoke('virtualNumbers', { action: 'seller_rentals' })
      .then(res => { const d = res.data || res; setSellerRentals(d.rentals || []); })
      .catch(() => setSellerRentals([]));
    base44.functions.invoke('virtualNumbers', { action: 'my_listings' })
      .then(res => { const d = res.data || res; setMyListings(d.listings || []); })
      .catch(() => setMyListings([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rent = async (listing) => {
    const d = await call(
      { action: 'rent', listingId: listing.id },
      'Number rented 🎉',
      'Open My Rentals — the number is unlocked and the seller will send your OTP.'
    );
    if (d && d.ok) setTab('rentals');
  };

  const complete = async (rental) => {
    await call({ action: 'complete', rentalId: rental.id }, 'Rental complete ✅', 'The seller has been paid.');
  };

  const cancel = async (rental) => {
    if (rental.provider) {
      await call({ action: 'provider_cancel', rentalId: rental.id }, 'Rental cancelled', 'You were refunded in full.');
    } else {
      await call({ action: 'cancel', rentalId: rental.id }, 'Rental cancelled', 'You were refunded in full.');
    }
  };

  const toggleListing = async (listing) => {
    await call(
      { action: 'update_listing', listingId: listing.id, isActive: listing.isActive === false },
      listing.isActive === false ? 'Listing live again' : 'Listing paused'
    );
  };

  const myActiveCount = (myRentals || []).filter(r => r.status === 'active').length;

  // Live provider rentals: poll the provider for the OTP while the page is
  // open. When it arrives it lands in the rental chat + a notification.
  useEffect(() => {
    const activeProvider = (myRentals || [])
      .filter(r => r.provider && r.status === 'active')
      .slice(0, 3);
    if (!activeProvider.length) return;
    const timer = setInterval(async () => {
      for (const r of activeProvider) {
        try {
          const res = await base44.functions.invoke('virtualNumbers', { action: 'provider_check', rentalId: r.id });
          const d = res.data || res;
          if (d && d.otp) {
            toast({ title: 'OTP received 🔑', description: 'Your code is waiting in the rental chat.' });
            load();
            return;
          }
          if (d && d.status && d.status !== 'waiting' && d.status !== 'active') {
            load();
            return;
          }
        } catch (e) { /* keep polling */ }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [myRentals]);

  return (
    <div className="rounded-3xl bg-mk-bg border border-mk-border p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Phone className="w-6 h-6 text-mk-blue" /> Virtual Numbers
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Rent a number, receive your OTP in a private chat, and get auto-refunded if the window expires.
        </p>
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full border border-mk-border bg-mk-card px-2.5 py-1 text-[10px] font-semibold text-slate-300">
            Live numbers & temporary email addresses — OTP delivered privately
          </span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-mk-card2 border border-mk-border h-auto flex-wrap">
          <TabsTrigger value="browse" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Browse</TabsTrigger>
          <TabsTrigger value="rentals" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">
            My Rentals{myActiveCount > 0 && <span className="ml-1.5 min-w-5 h-5 px-1.5 rounded-full bg-mk-blue text-white text-[10px] font-bold inline-flex items-center justify-center">{myActiveCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Sell</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-5 space-y-5">
          <UnifiedCatalogue
            onBought={(orderId) => navigate('/app/virtual-numbers/order/' + orderId)}
          />

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">From verified sellers</h3>
            {listings === null && <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>}
            {listings && listings.length === 0 && (
              <div className="py-10 text-center border border-dashed border-mk-border rounded-2xl">
                <Phone className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="mt-3 text-sm text-slate-400">No seller numbers listed yet. Approved sellers can add theirs in the Sell tab.</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(listings || []).map(l => <ListingCard key={l.id} listing={l} busy={busy} onRent={rent} />)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rentals" className="mt-5 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Renting</h3>
            {myRentals === null && <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>}
            {myRentals && myRentals.length === 0 && <div className="text-xs text-slate-500 py-2">You haven't rented any numbers yet.</div>}
            {myRentals && myRentals.map(r => (
              <RentalCard key={r.id} rental={r} role="buyer" busy={busy} onComplete={complete} onCancel={cancel} onChat={(rental) => rental.provider ? navigate('/app/virtual-numbers/order/' + rental.id) : setChat({ rental, role: 'buyer' })} />
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Your rentals as seller</h3>
            {sellerRentals && sellerRentals.filter(r => r.buyerUserId !== r.sellerUserId).length === 0 && (
              <div className="text-xs text-slate-500 py-2">No one has rented your numbers yet.</div>
            )}
            {sellerRentals && sellerRentals.filter(r => r.buyerUserId !== r.sellerUserId).map(r => (
              <RentalCard key={r.id} rental={r} role="seller" busy={busy} onChat={(rental) => setChat({ rental, role: 'seller' })} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sell" className="mt-5 space-y-5">
          <CreateListingForm onCreated={load} />

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">My numbers</h3>
            {myListings === null && <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>}
            {myListings && myListings.length === 0 && (
              <div className="text-xs text-slate-500 py-2">No listings yet — add your first number above.</div>
            )}
            {myListings && myListings.map(l => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl bg-mk-card border border-mk-border px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">{l.service} · {formatNaira(l.price)}</div>
                  <div className="text-xs text-slate-400 truncate font-mono">{l.number}</div>
                </div>
                <Button size="sm" variant="outline" className="h-9 border-mk-border text-slate-300 hover:text-white shrink-0" disabled={busy} onClick={() => toggleListing(l)}>
                  {l.isActive === false ? 'Paused — resume' : 'Pause'}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <RentalChatDialog rental={chat ? chat.rental : null} role={chat ? chat.role : 'buyer'} onClose={() => setChat(null)} />
    </div>
  );
}