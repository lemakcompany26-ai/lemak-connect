import { useState } from 'react';
import { CreditCard, Landmark, Loader2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertCircle } from 'lucide-react';
import { formatNairaShort } from '@/lib/format';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

// Fund Wallet sheet: Option 1 — dedicated bank account (recommended for bank
// transfers, details shown on the wallet screen), Option 2 — secure card
// checkout. No provider API names or internals are ever shown.
export default function FundWalletSheet({ open, onOpenChange }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Online checkout — secure hosted payment. The wallet is credited only
  // after the payment is verified server-side on return.
  const fund = async () => {
    setError('');
    const value = Number(amount);
    if (!value || value < 100) return setError('Minimum funding amount is ₦100');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('initializeKoraFunding', {
        amount: value, callbackUrl: window.location.origin + '/app/wallet'
      });
      const d = res.data || res;
      window.location.href = d.checkoutUrl;
    } catch (err) {
      const d = err.response && err.response.data;
      setError((d && d.error) || err.message || 'Could not start payment');
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg px-4 sheet-safe-bottom">
          <DrawerHeader className="px-0">
            <DrawerTitle>Fund Wallet</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-5 pb-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Landmark className="w-4 h-4 text-primary" /> Option 1 — Dedicated Bank Account
                <span className="ml-auto text-[10px] font-bold uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Recommended</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Best for bank transfers. Your permanent account details are shown on your wallet screen — transfers to it are credited to your wallet automatically.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">or pay online</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <CreditCard className="w-4 h-4 text-primary" /> Option 2 — Pay Online
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
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
              {error && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="mt-4 space-y-2">
                <Button className="w-full h-12 font-bold" disabled={loading} onClick={fund}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</> : 'Pay Online'}
                </Button>
              </div>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
              <ShieldCheck className="w-3.5 h-3.5" /> Your wallet is credited only after payment is confirmed server-side.
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}