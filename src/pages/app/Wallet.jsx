import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Loader2, ArrowDownLeft, ArrowUpRight, CheckCircle2, Wallet as WalletIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/AppContext';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira, formatNairaShort, formatDate } from '@/lib/format';
import PullToRefresh from '@/components/app/PullToRefresh';
import { firePurchaseConversion } from '@/lib/ads';
import DedicatedAccountCard from '@/components/wallet/DedicatedAccountCard';
import FundWalletSheet from '@/components/wallet/FundWalletSheet';

export default function Wallet() {
  const { wallet, refresh } = useApp();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [funding, setFunding] = useState(null); // 'verifying' | 'done'
  const [ledger, setLedger] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadLedger = () => base44.entities.WalletLedger.list('-created_date', 20).then(setLedger).catch(() => setLedger([]));

  useEffect(() => { loadLedger(); }, [wallet && wallet.balance]);

  // Pull-to-refresh: reload the activity ledger and refresh wallet data
  const handleRefresh = async () => {
    await Promise.all([refresh(), loadLedger()]);
  };

  // Returning from a payment gateway — verify server-side before trusting
  // anything (Paystack returns ?reference, Flutterwave returns ?tx_ref).
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const flwRef = searchParams.get('tx_ref');
    const ref = flwRef || reference;
    if (!ref || funding === 'done') return;
    setFunding('verifying');
    (async () => {
      try {
        const verifyFn = ref.startsWith('LMK-KORA-')
          ? 'verifyKoraFunding'
          : (flwRef ? 'verifyFlutterwaveFunding' : 'verifyFunding');
        const res = await base44.functions.invoke(verifyFn, { reference: ref });
        const d = res.data || res;
        if (d.credited) {
          await refresh();
          firePurchaseConversion({ value: d.amount, transactionId: ref });
          toast({ title: 'Wallet funded!', description: `${formatNairaShort(d.amount)} credited after a ${formatNairaShort(d.fee || 50)} funding fee.` });
        } else {
          toast({ title: 'Payment not completed', description: 'If you were charged, it will reflect automatically once confirmed.', variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Could not verify payment', description: 'Please contact support with your reference.', variant: 'destructive' });
      } finally {
        setFunding('done');
      }
    })();
  }, [searchParams]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><WalletIcon className="w-6 h-6 text-primary" /> LEMAK WALLET</h1>
        <p className="text-sm text-muted-foreground mt-1">Fund once, buy anything, instantly.</p>
      </div>

      {funding === 'verifying' && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-primary">
          <Loader2 className="w-4 h-4 animate-spin" /> Confirming your payment…
        </div>
      )}

      <div className="rounded-3xl brand-gradient p-7 relative overflow-hidden">
        <div className="relative">
          <div className="text-xs uppercase tracking-wider font-semibold text-white/60">Available Balance</div>
          <div className="mt-1.5 text-white text-3xl font-extrabold">{formatNaira(wallet ? wallet.balance : 0)}</div>
          <div className="mt-1 text-xs text-white/50">Currency: {wallet ? wallet.currency : 'NGN'}</div>
        </div>
      </div>

      <DedicatedAccountCard />

      <Button className="w-full h-12 font-bold" onClick={() => setSheetOpen(true)}>
        <Plus className="w-4 h-4 mr-2" /> Fund Wallet
      </Button>

      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="font-heading font-bold text-sm">Wallet Activity</h3>
        <div className="mt-4 space-y-2">
          {ledger === null && <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>}
          {ledger && ledger.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No activity yet. Fund your wallet to get started.</div>}
          {ledger && ledger.map(l => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
              <div className={'w-9 h-9 rounded-xl flex items-center justify-center ' + (l.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                {l.amount >= 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold capitalize">{l.type}</div>
                <div className="text-xs text-muted-foreground truncate">{l.description || l.reference} · {formatDate(l.created_date)}</div>
              </div>
              <div className={'text-sm font-bold ' + (l.amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {l.amount >= 0 ? '+' : ''}{formatNaira(l.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {funding === 'done' && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Payment processed. Your balance above is up to date.
        </div>
      )}

      <FundWalletSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
    </PullToRefresh>
  );
}