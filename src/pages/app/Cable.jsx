import { useEffect, useState } from 'react';
import { Tv, Loader2, RefreshCw, UserCheck, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { formatNairaShort } from '@/lib/format';
import PurchaseFormFooter from '@/components/app/PurchaseFormFooter';
import PurchaseSuccess from '@/components/app/PurchaseSuccess';
import TransactionProcessingOverlay, { PROCESSING_DURATION_MS } from '@/components/app/TransactionProcessingOverlay';

const CABLE_PROVIDERS = [
  { code: 'dstv', name: 'DStv' },
  { code: 'gotv', name: 'GOtv' },
  { code: 'startimes', name: 'Startimes' }
];

export default function Cable() {
  const { setWalletLocal } = useApp();
  const [cableName, setCableName] = useState('dstv');
  const [cardNo, setCardNo] = useState('');
  const [plans, setPlans] = useState(null);
  const [plansError, setPlansError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
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

  const loadPlans = async () => {
    setPlans(null); setPlansError(''); setSelectedPlan(null);
    try {
      const res = await base44.functions.invoke('vtuServices', { action: 'cable_plans' });
      const d = res.data || res;
      setPlans(d.plans || []);
    } catch (err) {
      const d = err.response && err.response.data;
      setPlansError((d && d.error) || err.message || 'Could not load packages');
      setPlans([]);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const handleVerify = async () => {
    setVerifyError(''); setVerified(null);
    if (!/^\d{5,15}$/.test(cardNo)) return setVerifyError('Enter a valid smartcard / decoder number first');
    setVerifying(true);
    try {
      const res = await base44.functions.invoke('vtuServices', { action: 'cable_verify', cableName, cardNo });
      const d = res.data || res;
      setVerified({ name: d.customerName });
    } catch (err) {
      const d = err.response && err.response.data;
      setVerifyError((d && d.error) || err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!verified) return setError('Verify your smartcard number before subscribing');
    if (!selectedPlan) return setError('Select a package');
    setLoading(true); setProcessing(true);
    // Branded pre-provider preparation window. No provider request is made during this animation.
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DURATION_MS));
    try {
      const res = await base44.functions.invoke('purchaseVtu', {
        action: 'cable', cableName, cardNo, planId: selectedPlan.id,
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
        title="Subscription sent!"
        subtitle={`${success.metadata && success.metadata.planName} was applied to smartcard ${success.recipient}.`}
        transaction={success}
        onReset={() => { setSuccess(null); setSelectedPlan(null); setVerified(null); }}
      />
    );
  }

  const providerPlans = (plans || []).filter(p => p.cableName === cableName);

  return (
    <div className="max-w-lg space-y-6">
      <TransactionProcessingOverlay visible={processing} />
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Tv className="w-6 h-6 text-primary" /> Cable TV</h1>
        <p className="text-sm text-muted-foreground mt-1">DStv, GOtv & Startimes subscriptions — delivered instantly.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
        <div>
          <Label className="mb-2.5 block">Provider</Label>
          <div className="grid grid-cols-3 gap-2">
            {CABLE_PROVIDERS.map(p => (
              <button key={p.code} type="button" onClick={() => { setCableName(p.code); setSelectedPlan(null); }}
                className={'rounded-xl border-2 p-3 text-xs font-bold transition-all ' + (cableName === p.code ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="card">Smartcard / Decoder Number</Label>
          <div className="flex gap-2">
            <Input id="card" inputMode="numeric" value={cardNo} onChange={e => { setCardNo(e.target.value.replace(/\D/g, '').slice(0, 15)); setVerified(null); setVerifyError(''); }} placeholder="e.g. 7039288104" className="h-12 text-base" />
            <Button type="button" variant="outline" className="h-12 px-4 font-semibold shrink-0" onClick={handleVerify} disabled={verifying || !cardNo}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
          {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
          {verified && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
              <UserCheck className="w-4 h-4" /> Verified{verified.name ? ` — ${verified.name}` : ''}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <Label>Select Package</Label>
            <button onClick={loadPlans} className="text-xs font-semibold text-primary inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
          </div>
          {plans === null && <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading packages…</div>}
          {plansError && <div className="py-6 text-center text-sm text-destructive">{plansError}</div>}
          {plans && providerPlans.length === 0 && !plansError && (
            <div className="py-6 text-center text-sm text-muted-foreground">No packages available for this provider right now.</div>
          )}
          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2 pr-1">
            {providerPlans.map(p => (
              <button key={p.id} type="button" onClick={() => setSelectedPlan(p)}
                className={'w-full flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ' + (selectedPlan && selectedPlan.id === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                <div className="text-sm font-bold truncate pr-3">{p.name}</div>
                <div className="text-sm font-extrabold text-primary shrink-0">{formatNairaShort(p.customerPrice)}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PurchaseFormFooter
            serviceSlug="cable"
            providerCost={selectedPlan ? selectedPlan.providerCost : 0}
            promo={promo} setPromo={setPromo}
            pin={pin} setPin={setPin}
            biometricToken={biometricToken} setBiometricToken={setBiometricToken}
            error={error}
            submitLabel={selectedPlan ? `Pay ${formatNairaShort(selectedPlan.customerPrice)}` : 'Select a package'}
            disabled={!selectedPlan || !verified}
            loading={loading}
          />
        </form>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5" /> Funds are held safely — instant refund if the subscription fails.</p>
      </div>
    </div>
  );
}