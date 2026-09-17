import { useEffect, useState } from 'react';
import { Store, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import MarketplaceStats from '@/components/admin/marketplace/MarketplaceStats';
import ListingsPanel from '@/components/admin/marketplace/ListingsPanel';
import SellersPanel from '@/components/admin/marketplace/SellersPanel';
import OrdersPanel from '@/components/admin/marketplace/OrdersPanel';
import ChargesPanel from '@/components/admin/marketplace/ChargesPanel';

export default function AdminMarketplace() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState(null);
  const [listings, setListings] = useState(null);
  const [orders, setOrders] = useState(null);
  const [disputes, setDisputes] = useState(null);
  const [settings, setSettings] = useState(null);
  const [lastSync, setLastSync] = useState(undefined);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    base44.entities.MarketplaceSeller.list('-created_date', 200).then(setSellers).catch(() => setSellers([]));
    base44.entities.MarketplaceListing.list('-created_date', 200).then(setListings).catch(() => setListings([]));
    base44.entities.MarketplaceOrder.list('-created_date', 200).then(setOrders).catch(() => setOrders([]));
    base44.entities.MarketplaceDispute.list('-created_date', 200).then(setDisputes).catch(() => setDisputes([]));
    base44.entities.AdminSetting.list('-created_date', 200)
      .then(rows => setSettings(Object.fromEntries((rows || []).map(r => [r.key, r.value]))))
      .catch(() => setSettings({}));
    base44.entities.MarketplaceSyncLog.list('-created_date', 1)
      .then(l => setLastSync(l && l[0] ? l[0] : null))
      .catch(() => setLastSync(null));
  };
  useEffect(() => { load(); }, []);

  const act = async (action, record, data) => {
    setBusyId(record.id);
    try {
      await base44.functions.invoke('adminAction', { action, targetId: record.id, data });
      toast({ title: 'Done' });
      load();
      return true;
    } catch (err) {
      toast({ title: 'Action failed', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncMarketplaceSubmissions', {});
      const d = res.data || res;
      if (d.requiresGoogleIntegration) {
        toast({ title: 'Google integration required', description: d.message, variant: 'destructive' });
      } else if (d.error) {
        toast({ title: 'Sync failed', description: d.error, variant: 'destructive' });
      } else {
        toast({ title: 'Sync complete', description: `${d.imported} new submission(s), ${d.updated} updated, ${d.skipped} already imported.` });
      }
      load();
    } catch (err) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const saveCharges = async (values) => {
    try {
      await base44.functions.invoke('adminAction', { action: 'save_marketplace_charges', data: values });
      toast({ title: 'Charges saved', description: 'Marketplace charges updated. The change has been audited.' });
      load();
    } catch (err) {
      toast({ title: 'Could not save charges', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
    }
  };

  const previewCharges = async (saleAmount) => {
    const res = await base44.functions.invoke('adminAction', { action: 'preview_marketplace_charges', data: { saleAmount } });
    return (res.data || res).breakdown;
  };

  const refundOrder = (order) => act('refund_marketplace_order', order);
  const resolveDispute = (dispute, decision) => act('resolve_dispute', dispute, { decision });

  const openDisputes = (disputes || []).filter(d => ['open', 'under_review'].includes(d.status)).length;
  const loading = sellers === null || listings === null || orders === null || disputes === null || settings === null;
  const completed = (orders || []).filter(o => o.status === 'completed');
  const stats = {
    pendingSellers: (sellers || []).filter(s => s.status === 'pending').length,
    pendingListings: (listings || []).filter(l => l.status === 'pending').length,
    approvedListings: (listings || []).filter(l => l.status === 'approved').length,
    rejectedListings: (listings || []).filter(l => l.status === 'rejected').length,
    suspendedListings: (listings || []).filter(l => l.status === 'suspended').length,
    orders: (orders || []).length,
    revenue: completed.reduce((a, o) => a + (o.amount || 0), 0),
    payouts: completed.reduce((a, o) => a + (o.sellerPayout || 0), 0),
    platformFees: completed.reduce((a, o) => a + (o.commission || 0) + (o.buyerFee || 0), 0)
  };

  return (
    <div className="rounded-3xl bg-mk-bg border border-mk-border p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Store className="w-6 h-6 text-mk-blue" /> Marketplace
        </h1>
        <p className="text-sm text-slate-400 mt-1">Seller submissions, listing approvals, orders and marketplace charges. Nothing goes public without approval.</p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-mk-blue" /></div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="bg-mk-card2 border border-mk-border h-auto flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Overview</TabsTrigger>
            <TabsTrigger value="listings" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Listings ({stats.pendingListings} pending)</TabsTrigger>
            <TabsTrigger value="sellers" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Sellers ({stats.pendingSellers} pending)</TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Orders{openDisputes > 0 && <span className="ml-1.5 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">{openDisputes}</span>}</TabsTrigger>
            <TabsTrigger value="charges" className="data-[state=active]:bg-mk-blue data-[state=active]:text-white text-slate-300">Charges</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <MarketplaceStats stats={stats} syncing={syncing} lastSync={lastSync} onSync={sync} />
          </TabsContent>
          <TabsContent value="listings" className="mt-5">
            <ListingsPanel listings={listings} sellers={sellers} busyId={busyId} onAct={act} />
          </TabsContent>
          <TabsContent value="sellers" className="mt-5">
            <SellersPanel sellers={sellers} busyId={busyId} onAct={act} />
          </TabsContent>
          <TabsContent value="orders" className="mt-5">
            <OrdersPanel orders={orders} disputes={disputes} busyId={busyId} onRefund={refundOrder} onResolve={resolveDispute} />
          </TabsContent>
          <TabsContent value="charges" className="mt-5">
            <ChargesPanel settings={settings} saving={busyId !== null} onSave={saveCharges} onPreview={previewCharges} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}