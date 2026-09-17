import { UserCheck, Layers, CheckCircle2, XCircle, Pause, ShoppingBag, TrendingUp, Wallet, Percent, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira, formatDate } from '@/lib/format';

const CARDS = [
  { key: 'pendingSellers', label: 'Pending Seller Applications', icon: UserCheck },
  { key: 'pendingListings', label: 'Pending Listings', icon: Layers },
  { key: 'approvedListings', label: 'Approved Listings', icon: CheckCircle2 },
  { key: 'rejectedListings', label: 'Rejected Listings', icon: XCircle },
  { key: 'suspendedListings', label: 'Suspended Listings', icon: Pause },
  { key: 'orders', label: 'Marketplace Orders', icon: ShoppingBag },
  { key: 'revenue', label: 'Marketplace Revenue', icon: TrendingUp, money: true },
  { key: 'payouts', label: 'Seller Payouts', icon: Wallet, money: true },
  { key: 'platformFees', label: 'Platform Fees', icon: Percent, money: true }
];

export default function MarketplaceStats({ stats, syncing, lastSync, onSync }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-mk-card border border-mk-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold text-white">Google Form Synchronization</h3>
          <p className="text-xs text-slate-400 mt-1">
            {lastSync
              ? `Last sync: ${formatDate(lastSync.ranAt)} — ${lastSync.importedCount || 0} imported, ${lastSync.updatedCount || 0} updated`
              : 'No synchronization has run yet. New seller form submissions become pending listings.'}
          </p>
        </div>
        <Button className="bg-mk-blue hover:bg-mk-blue/90 text-white font-semibold h-11 px-6" onClick={onSync} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {syncing ? 'Syncing…' : 'Sync Now'}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CARDS.map(({ key, label, icon: Icon, money }) => (
          <div key={key} className="rounded-2xl bg-mk-card border border-mk-border p-4">
            <div className="flex items-center justify-between">
              <Icon className="w-4 h-4 text-mk-blue" />
            </div>
            <div className="mt-3 font-heading text-xl font-extrabold text-white">
              {money ? formatNaira(stats[key]) : stats[key]}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 leading-snug">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}