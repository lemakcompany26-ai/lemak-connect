import { useEffect, useState } from 'react';
import { Trophy, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { formatNaira, formatNairaShort } from '@/lib/format';
import PurchaseFormFooter from '@/components/app/PurchaseFormFooter';
import PurchaseSuccess from '@/components/app/PurchaseSuccess';
import TransactionProcessingOverlay, { PROCESSING_DURATION_MS } from '@/components/app/TransactionProcessingOverlay';

export default function Betting() {
  const { setWalletLocal } = useApp();
  const [providers, setProviders] = useState([]);
  const [billerCode, setBillerCode] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [verified, setVerified] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [pin, setPin] = useState('');
  const [biometricToken, setBiometricToken] = useState('');

  useEffect(() => {
    base44.functions.invoke('vtuServices', { action: 'betting_providers' })
      .then(res => {
        const d = res.data || res;
        setProviders(d.providers || []);
        if (d.providers && d.providers[0]) setBillerCode(d.providers[0].code);
      })
      .catch(() => setProviders([]));
  }, []);

  const provider = providers.find(p => p.code === billerCode);

  const handleValidate = async () => {
    setVerifyError(''); setVerified(null);
    if (!billerCode) return setVerifyError('Select a betting platform first');
    if (customerId.length < 4) return setVerifyError('Enter your betting account / user ID first');
    setVerifying(true);
    try {
      const res = await base44.functions.invoke('vtuServices', { action: 'betting_validate', billerCode, customerId });
      const d = res.data || res;
      setVerified({ name: d.customerName });
    } catch (err) {
      const d = err.response && err.response.data;
      setVerifyError((d && d.error) || err.message || 'Validation failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!verified) return setError('Validate your betting ID before funding');
    const nairaAmount = Number(amount);
    if (!nairaAmount || nairaAmount < 100) return setError('Minimum funding is ₦100');
    setLoading(true); setProcessing(true);
    // Branded pre-provider preparation window. No provider request is made during this animation.
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DURATION_MS));
    try {
      const res = await base44.functions.invoke('purchaseVtu', {
        action: 'betting', billerCode, customerId, amount: nairaAmount,
        customerName: verified.name || null,
        promoCode: promo ? promo.code : null,
        pin: pin || null, biometricToken: biometricToken || null
      });
      const d = res.data || res;
      if (d.wallet) setWalletLocal(d.wallet);
      setSuccess(d.transaction);
    } catch (err) {
      const d = err.response && err.response.data;
      setError((d && (d.error || d.message)) || err.message || 'Purchase failed');
      if (d && d.wallet) setWalletLocal(d.wallet);
    } finally {
      setProcessing(false); setLoading(false); setBiometricToken('');
    }
  };

  if (success) {
    return (
      <PurchaseSuccess
        title="Wallet funded!"
        subtitle={`₦${(success.amount || 0).toLocaleString()} was added to your ${success.metadata && success.metadata.providerName} account (${success.recipient}).`}
        transaction={success}
        onReset={() => { setSuccess(null); setVerified(null); setAmount(''); }}
      />
    );
  }

  const amountNum = Number(amount) || 0;
  // Promo preview uses providerCost = funding amount
  const estimate = promo ? Math.max(0, amountNum - (promo.discount || 0)) : amountNum;

  return (
    <div className="max-w-lg space-y-6">
      <TransactionProcessingOverlay visible={processing} />
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Trophy className="w-6 h-6 text-primary" /> Betting</h1>
        <p className="text-sm text-muted-foreground mt-1">Fund Bet9ja, SportyBet, 1xBet and more — instantly.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
        <div>
          <Label className="mb-2.5 block">Platform</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {providers.map(p => (
              <button key={p.code} type="button" onClick={() => { setBillerCode(p.code); setVerified(null); setVerifyError(''); }}
                className={'rounded-xl border-2 p-3 text-xs font-bold transition-all ' + (billerCode === p.code ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer">Betting Account / User ID</Label>
          <div className="flex gap-2">
            <Input id="customer" value={customerId} onChange={e => { setCustomerId(e.target.value.replace(/\s/g, '').slice(0, 30)); setVerified(null); setVerifyError(''); }} placeholder="e.g. 1234567890" className="h-12 text-base" />
            <Button type="button" variant="outline" className="h-12 px-4 font-semibold shrink-0" onClick={handleValidate} disabled={verifying || !customerId || !billerCode}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate'}
            </Button>
          </div>
          {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
          {verified && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
              <UserCheck className="w-4 h-4" /> ID valid{verified.name ? ` — ${verified.name}` : ''}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₦)</Label>
          <Input id="amount" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="Minimum ₦100" className="h-12 text-base" />
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map(a => (
              <button key={a} type="button" onClick={() => setAmount(String(a))} className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-all">
                {formatNairaShort(a)}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PurchaseFormFooter
            serviceSlug="betting"
            providerCost={amountNum}
            promo={promo} setPromo={setPromo}
            pin={pin} setPin={setPin}
            biometricToken={biometricToken} setBiometricToken={setBiometricToken}
            error={error}
            submitLabel={amountNum >= 100 && provider ? `Fund ${provider.name} — ${formatNaira(estimate)}` : 'Enter an amount'}
            disabled={!amountNum || amountNum < 100 || !verified}
            loading={loading}
          />
        </form>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5" /> Funds are held safely — instant refund if the funding fails.</p>
      </div>
    </div>
  );
}