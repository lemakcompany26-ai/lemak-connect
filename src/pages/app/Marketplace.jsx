import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import ListingCard from '@/components/marketplace/ListingCard';
import ListingFilters from '@/components/marketplace/ListingFilters';
import DemoListings from '@/components/marketplace/DemoListings';
import DeliverDialog from '@/components/marketplace/DeliverDialog';
import PurchaseDialog from '@/components/marketplace/PurchaseDialog';
import { DEFAULT_PLATFORMS } from '@/components/marketplace/platforms';
import SellerStatusCard from '@/components/marketplace/SellerStatusCard';
import SellerApplicationForm from '@/components/marketplace/SellerApplicationForm';
import OrderCard from '@/components/marketplace/OrderCard';
import OrderChatDialog from '@/components/marketplace/OrderChatDialog';
import { formatNaira } from '@/lib/format';

const DEFAULT_SELL_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScImMvathwSUGku7WKY_R4E9eo2Ps9k23Fs8qWpU0GmneNAIQ/viewform?usp=headers';
const EMPTY_FILTERS = { search: '', platform: '', accountKind: '', monetised: '', minFollowers: '', maxFollowers: '', minPrice: '', maxPrice: '', sort: '' };

export default function Marketplace() {
  const { profile, wallet, refresh } = useApp();
  const { toast } = useToast();
  const [listings, setListings] = useState(null);
  const [applications, setApplications] = useState(null);
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState({});
  const [tab, setTab] = useState('browse');
  const [buying, setBuying] = useState(null);
  const [chatOrder, setChatOrder] = useState(null);
  const [delivering, setDelivering] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    base44.functions.invoke('getPublicMarketplace', {})
      .then(res => setListings((res.data || res).listings || []))
      .catch(() => setListings([]));
    base44.entities.MarketplaceSeller.list('-created_date', 50).then(setApplications).catch(() => setApplications([]));
    base44.entities.MarketplaceOrder.list('-created_date', 50).then(setOrders).catch(() => setOrders([]));
    base44.entities.AdminSetting.list('-created_date', 200)
      .then(rows => setSettings(Object.fromEntries((rows || []).map(r => [r.key, r.value]))))
      .catch(() => setSettings({}));
  };
  useEffect(() => { load(); }, []);

  const sellUrl = settings.google_sell_form_url || DEFAULT_SELL_FORM_URL;
  const myUserId = profile ? profile.userId : null;
  const myApplications = (applications || []).filter(a => a.userId === myUserId);
  const myBuyingOrders = (orders || []).filter(o => o.buyerUserId === myUserId);
  const mySellingOrders = (orders || []).filter(o => o.sellerUserId === myUserId && o.buyerUserId !== myUserId);

  const adminPlatforms = (settings.marketplace_platforms || '').split(',').map(s => s.trim()).filter(Boolean);
  const filterPlatforms = adminPlatforms.length ? adminPlatforms : DEFAULT_PLATFORMS;

  const f = filters;
  let visible = listings || [];
  const q = f.search.trim().toLowerCase();
  if (q) visible = visible.filter(l => [l.title, l.platform, l.niche, l.sellerName, l.listingId, l.category].some(v => String(v || '').toLowerCase().includes(q)));
  if (f.platform) visible = visible.filter(l => l.platform === f.platform);
  if (f.accountKind) visible = visible.filter(l => l.accountKind === f.accountKind);
  if (f.monetised) visible = visible.filter(l => (l.monetised === true) === (f.monetised === 'yes'));
  if (f.minFollowers) visible = visible.filter(l => (l.followersCount || 0) >= Number(f.minFollowers));
  if (f.maxFollowers) visible = visible.filter(l => (l.followersCount || 0) <= Number(f.maxFollowers));
  if (f.minPrice) visible = visible.filter(l => (l.price || 0) >= Number(f.minPrice));
  if (f.maxPrice) visible = visible.filter(l => (l.price || 0) <= Number(f.maxPrice));
  if (f.sort === 'price_asc') visible = [...visible].sort((a, b) => a.price - b.price);
  else if (f.sort === 'price_desc') visible = [...visible].sort((a, b) => b.price - a.price);
  else if (f.sort === 'followers_desc') visible = [...visible].sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));

  const purchase = async () => {
    if (!buying) return;
    setBusy(true);
    try {
      await base44.functions.invoke('marketplaceOrder', { action: 'purchase', listingId: buying.id });
      toast({ title: 'Order placed 🎉', description: 'Your payment is held in escrow until you confirm delivery.' });
      setBuying(null);
      load();
      refresh();
    } catch (err) {
      toast({ title: 'Purchase failed', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const orderAction = async (action, order) => {
    if (action === 'deliver') { setDelivering(order); return; }
    setBusy(order.id);
    try {
      await base44.functions.invoke('marketplaceOrder', { action, orderId: order.id });
      toast({
        title: action === 'confirm' ? 'Delivery confirmed ✅' : 'Marked as delivered',
        description: action === 'confirm' ? 'The seller has been paid.' : 'The buyer can now confirm delivery to release your payout.'
      });
      load();
      refresh();
    } catch (err) {
      toast({ title: 'Action failed', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const deliverListing = async (accountUrl) => {
    const order = delivering;
    if (!order) return;
    setBusy(order.id);
    try {
      await base44.functions.invoke('marketplaceOrder', { action: 'deliver', orderId: order.id, accountUrl });
      toast({ title: 'Delivery submitted', description: 'The buyer can now test the account before confirming.' });
      setDelivering(null);
      load();
    } catch (err) {
      toast({ title: 'Action failed', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-3xl bg-mk-bg border border-mk-border p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 text-mk-blue" /> Marketplace
          </h1>
          <p className="text-sm text-slate-400 mt-1">Buy and sell trusted digital services. Fast · Secure · Reliable.</p>
        </div>
        {wallet && (
          <div className="text-xs text-slate-400">
            Wallet balance: <span className="font-bold text-white">{formatNaira(wallet.balance)}</span>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-mk-card2 border border-mk-border h-auto flex-wrap">
          <TabsTrigger value="browse" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Browse</TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Sell</TabsTrigger>
          <TabsTrigger value="submissions" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">My Submissions</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">My Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-5 space-y-5">
          <ListingFilters value={filters} onChange={setFilters} platforms={filterPlatforms} />

          {listings === null && <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>}

          {listings && listings.length === 0 && (
            <div className="space-y-5">
              <div className="py-10 text-center border border-dashed border-mk-border rounded-2xl">
                <Store className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="mt-3 text-sm text-slate-400">No approved listings available yet.</p>
              </div>
              <DemoListings />
            </div>
          )}

          {listings && listings.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{visible.length} listing{visible.length === 1 ? '' : 's'} · only approved sellers</span>
                {(q || f.platform || f.accountKind || f.monetised || f.minFollowers || f.maxFollowers || f.minPrice || f.maxPrice) && (
                  <button className="text-mk-blue-soft font-semibold" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
                )}
              </div>
              {visible.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-mk-border rounded-2xl text-sm text-slate-400">
                  No listings match your filters. Try widening your search.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visible.map(l => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      onBuy={setBuying}
                      onView={(listing) => navigate(`/app/marketplace/listing/${listing.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="sell" className="mt-5">
          <SellerApplicationForm
            profile={profile}
            sellUrl={sellUrl}
            onSubmitted={() => { load(); setTab('submissions'); }}
          />
        </TabsContent>

        <TabsContent value="submissions" className="mt-5 space-y-3">
          {applications === null && <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>}
          {applications && myApplications.length === 0 && (
            <div className="py-14 text-center border border-dashed border-mk-border rounded-2xl text-sm text-slate-400">
              You haven't submitted a seller application yet. Open the Sell tab to get started.
            </div>
          )}
          {myApplications.map(a => <SellerStatusCard key={a.id} application={a} />)}
        </TabsContent>

        <TabsContent value="orders" className="mt-5 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Buying</h3>
            {myBuyingOrders.length === 0 && <div className="text-xs text-slate-500 py-2">No purchase orders yet.</div>}
            {myBuyingOrders.map(o => <OrderCard key={o.id} order={o} mode="buying" busy={busy === o.id} onAction={orderAction} onChat={setChatOrder} />)}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Selling</h3>
            {mySellingOrders.length === 0 && <div className="text-xs text-slate-500 py-2">No sale orders yet.</div>}
            {mySellingOrders.map(o => <OrderCard key={o.id} order={o} mode="selling" busy={busy === o.id} onAction={orderAction} onChat={setChatOrder} />)}
          </div>
        </TabsContent>
      </Tabs>

      <PurchaseDialog listing={buying} busy={busy === true || busy === 'purchase'} onClose={() => setBuying(null)} onConfirm={purchase} />
      <DeliverDialog order={delivering} busy={!!delivering && busy === delivering.id} onClose={() => setDelivering(null)} onConfirm={deliverListing} />
      <OrderChatDialog order={chatOrder} onClose={() => setChatOrder(null)} />
    </div>
  );
}