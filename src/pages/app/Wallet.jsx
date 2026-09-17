import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Loader2, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Wallet as WalletIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira, formatNairaShort, formatDate } from '@/lib/format';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function Wallet() {
  const { wallet, refresh } = useApp();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(null); // 'verifying' | 'done'
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.WalletLedger.list('-created_date', 20).then(setLedger).catch(() => setLedger([]));
  }, [wallet && wallet.balance]);

  // Returning from Paystack — verify server-side before trusting anything
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference || funding === 'done') return;
    setFunding('verifying');
    (async () => {
      try {
        const res = await base44.functions.invoke('verifyFunding', { reference });
        const d = res.data || res;
        if (d.credited) {
          await refresh();
          toast({ title: 'Wallet funded!', description: `${formatNairaShort(d.amount)} was added to your wallet.` });
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

  const handleFund = async () => {
    setError('');
    const value = Number(amount);
    if (!value || value < 100) return setError('Minimum funding amount is ₦100');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('initializeFunding', {
        amount: value,
        callbackUrl: window.location.origin + '/app/wallet'
      });
      const d = res.data || res;
      window.location.href = d.authorizationUrl;
    } catch (err) {
      const d = err.response && err.response.data;
      setError((d && d.error) || err.message || 'Could not start payment');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><WalletIcon className="w-6 h-6 text-primary" /> Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Fund once, buy anything, instantly.</p>
      </div>

      {funding === 'verifying' && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-primary">
          <Loader2 className="w-4 h-4 animate-spin" /> Confirming your payment…
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl brand-gradient p-7 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 85% 20%, rgba(96,165,250,.6) 0%, transparent 40%)' }} />
          <div className="relative">
            <div className="text-xs uppercase tracking-wider font-semibold text-white/60">Available Balance</div>
            <div className="mt-1.5 text-white text-3xl font-extrabold">{formatNaira(wallet ? wallet.balance : 0)}</div>
            <div className="mt-1 text-xs text-white/50">Currency: {wallet ? wallet.currency : 'NGN'}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Fund with card</h3>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map(a => (
              <button key={a} type="button" onClick={() => setAmount(String(a))}
                className={'rounded-xl border-2 py-2 text-xs font-bold transition-all ' + (amount === String(a) ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {formatNairaShort(a)}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <Label htmlFor="fundAmount">Amount (₦)</Label>
            <Input id="fundAmount" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter amount" className="h-12 text-base" />
          </div>
          {error && <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
          <Button className="w-full mt-4 h-12 font-bold" onClick={handleFund} disabled={loading || !amount}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</> : 'Pay Securely with Paystack'}
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground text-center">Your wallet is credited only after payment is confirmed server-side.</p>
        </div>
      </div>

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
    </div>
  );
}