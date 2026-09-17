import { useState } from 'react';
import { Smartphone, Loader2, CheckCircle2, Copy, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { formatNaira, formatNairaShort, NIGERIAN_NETWORKS } from '@/lib/format';
import PromoCodeInput from '@/components/app/PromoCodeInput';
import TransactionProcessingOverlay, { PROCESSING_DURATION_MS } from '@/components/app/TransactionProcessingOverlay';
import TransactionPinInput from '@/components/app/TransactionPinInput';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const NETWORK_COLORS = { MTN: 'bg-yellow-400', Airtel: 'bg-red-500', Glo: 'bg-green-600', '9mobile': 'bg-emerald-700' };

export default function Airtime() {
  const { wallet, setWalletLocal } = useApp();
  const [network, setNetwork] = useState('MTN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [pin, setPin] = useState('');
  const [biometricToken, setBiometricToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^0\d{10}$/.test(phoneNumber)) return setError('Enter a valid 11-digit phone number');
    if (!amount || Number(amount) < 50) return setError('Minimum airtime amount is ₦50');
    setLoading(true);
    setProcessing(true);
    // Branded pre-provider preparation window. No provider request is made during this animation.
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DURATION_MS));
    try {
      const res = await base44.functions.invoke('purchaseAirtime', {
        network, phoneNumber, amount: Number(amount),
        promoCode: promo ? promo.code : null,
        pin: pin || null,
        biometricToken: biometricToken || null
      });
      const d = res.data || res;
      if (d.wallet) setWalletLocal(d.wallet);
      setSuccess(d.transaction);
    } catch (err) {
      const d = err.response && err.response.data;
      setError((d && (d.error || d.message)) || err.message || 'Purchase failed');
      if (d && d.wallet) setWalletLocal(d.wallet);
    } finally {
      setProcessing(false);
      setLoading(false);
      setBiometricToken('');
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-extrabold">Airtime sent!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatNaira(success.amount)} of airtime was delivered to {success.recipient} ({success.metadata && success.metadata.network}).
        </p>
        <div className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Transaction Reference</div>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span className="font-mono font-bold text-primary">{success.transactionId}</span>
            <button onClick={() => navigator.clipboard.writeText(success.transactionId)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Copy reference">
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button className="flex-1 h-12 font-semibold" onClick={() => { setSuccess(null); setAmount(''); setPhoneNumber(''); }}>Buy again</Button>
          <Button variant="outline" className="flex-1 h-12 font-semibold" asChild><a href="/app/transactions">View receipt</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <TransactionProcessingOverlay visible={processing} />
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Smartphone className="w-6 h-6 text-primary" /> Airtime Top-up</h1>
        <p className="text-sm text-muted-foreground mt-1">Instant delivery for MTN, Airtel, Glo & 9mobile.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6 space-y-5">
        <div>
          <Label className="mb-2.5 block">Network</Label>
          <div className="grid grid-cols-4 gap-2">
            {NIGERIAN_NETWORKS.map(n => (
              <button
                key={n} type="button" onClick={() => setNetwork(n)}
                className={'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-bold transition-all ' + (network === n ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}
              >
                <span className={'w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] ' + NETWORK_COLORS[n]}>{n[0]}</span>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" inputMode="numeric" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="08012345678" className="h-12 text-base" />
        </div>

        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map(a => (
              <button key={a} type="button" onClick={() => setAmount(String(a))}
                className={'rounded-xl border-2 py-2.5 text-sm font-bold transition-all ' + (amount === String(a) ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {formatNairaShort(a)}
              </button>
            ))}
          </div>
          <Input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="Or enter a custom amount" className="h-12 text-base" />
        </div>

        <PromoCodeInput serviceSlug="airtime" providerCost={Number(amount) || 0} onValidated={setPromo} />

        <TransactionPinInput value={pin} onChange={setPin} biometricToken={biometricToken} onBiometricToken={setBiometricToken} />

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Wallet balance</span>
          <span className="font-bold">{formatNaira(wallet ? wallet.balance : 0)}</span>
        </div>

        <Button type="submit" className="w-full h-12 text-sm font-bold" disabled={loading || !phoneNumber || !amount}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : `Buy ${amount ? formatNairaShort(amount) : ''} Airtime`}
        </Button>
      </form>
    </div>
  );
}