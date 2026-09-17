import { useEffect, useState } from 'react';
import { Store, Loader2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import ListingCard from '@/components/marketplace/ListingCard';
import PurchaseDialog from '@/components/marketplace/PurchaseDialog';
import SellerStatusCard from '@/components/marketplace/SellerStatusCard';
import OrderCard from '@/components/marketplace/OrderCard';
import { formatNaira } from '@/lib/format';

const DEFAULT_SELL_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScImMvathwSUGku7WKY_R4E9eo2Ps9k23Fs8qWpU0GmneNAIQ/viewform?usp=headers';
const DEFAULT_BUY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JJcLb_Nw2C-witaftZYpVqp6pW0RlCo9h967yzhcDc/edit?usp=drivesdk';

export default function Marketplace() {
  const { profile, wallet, refresh } = useApp();
  const { toast } = useToast();
  const [listings, setListings] = useState(null);
  const [applications, setApplications] = useState(null);
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState({});
  const [buying, setBuying] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    base44.entities.MarketplaceListing.filter({ status: 'approved' }, '-created_date', 50)
      .then(l => setListings(l.filter(x => x.isActive !== false)))
      .catch(() => setListings([]));
    base44.entities.MarketplaceSeller.list('-created_date', 50).then(setApplications).catch(() => setApplications([]));
    base44.entities.MarketplaceOrder.list('-created_date', 50).then(setOrders).catch(() => setOrders([]));
    base44.entities.AdminSetting.list('-created_date', 200)
      .then(rows => setSettings(Object.fromEntries((rows || []).map(r => [r.key, r.value]))))
      .catch(() => setSettings({}));
  };
  useEffect(() => { load(); }, []);

  const sellUrl = settings.google_sell_form_url || DEFAULT_SELL_FORM_URL;
  const buySheetUrl = settings.google_buy_sheet_url || DEFAULT_BUY_SHEET_URL;
  const myUserId = profile ? profile.userId : null;
  const myApplications = (applications || []).filter(a => a.userId === myUserId);
  const myBuyingOrders = (orders || []).filter(o => o.buyerUserId === myUserId);
  const mySellingOrders = (orders || []).filter(o => o.sellerUserId === myUserId && o.buyerUserId !== myUserId);

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

      <Tabs defaultValue="browse">
        <TabsList className="bg-mk-card2 border border-mk-border h-auto flex-wrap">
          <TabsTrigger value="browse" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Browse</TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Sell</TabsTrigger>
          <TabsTrigger value="submissions" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">My Submissions</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">My Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-5">
          {listings === null && <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>}
          {listings && listings.length === 0 && (
            <div className="py-16 text-center border border-dashed border-mk-border rounded-2xl">
              <Store className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="mt-3 text-sm text-slate-400">No approved listings available yet.</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {(listings || []).map(l => (
              <ListingCard key={l.id} listing={l} buySheetUrl={buySheetUrl} onBuy={setBuying} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sell" className="mt-5">
          <div className="rounded-2xl bg-mk-card border border-mk-border p-6 sm:p-10 text-center space-y-5 max-w-xl mx-auto">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-mk-blue/15 flex items-center justify-center">
              <Store className="w-7 h-7 text-mk-blue" />
            </div>
            <h3 className="font-heading font-extrabold text-white text-lg">Sell your digital service on Lemak Connect</h3>
            <p className="text-sm text-slate-400">
              Apply with the seller form. Every submission is reviewed by our team — only approved listings become publicly available.
            </p>
            <Button asChild className="h-12 px-8 font-bold bg-mk-blue hover:bg-mk-blue/90 text-white">
              <a href={sellUrl} target="_blank" rel="noreferrer">SELL NOW <ExternalLink className="w-4 h-4 ml-1.5" /></a>
            </Button>
            <p className="text-xs text-mk-brown-soft">Every order is protected by escrow and a fair platform commission.</p>
          </div>
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
            {myBuyingOrders.map(o => <OrderCard key={o.id} order={o} mode="buying" busy={busy === o.id} onAction={orderAction} />)}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Selling</h3>
            {mySellingOrders.length === 0 && <div className="text-xs text-slate-500 py-2">No sale orders yet.</div>}
            {mySellingOrders.map(o => <OrderCard key={o.id} order={o} mode="selling" busy={busy === o.id} onAction={orderAction} />)}
          </div>
        </TabsContent>
      </Tabs>

      <PurchaseDialog listing={buying} busy={busy === true || busy === 'purchase'} onClose={() => setBuying(null)} onConfirm={purchase} />
    </div>
  );
}