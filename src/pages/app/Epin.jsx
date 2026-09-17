import { useEffect, useState } from 'react';
import { Ticket, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { formatNairaShort } from '@/lib/format';
import PurchaseFormFooter from '@/components/app/PurchaseFormFooter';
import PurchaseSuccess from '@/components/app/PurchaseSuccess';
import TransactionProcessingOverlay, { PROCESSING_DURATION_MS } from '@/components/app/TransactionProcessingOverlay';

const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
const NETWORK_COLORS = { MTN: 'bg-yellow-400', GLO: 'bg-green-600', AIRTEL: 'bg-red-500', '9MOBILE': 'bg-emerald-700' };

export default function Epin() {
  const { setWalletLocal } = useApp();
  const [network, setNetwork] = useState('MTN');
  const [plans, setPlans] = useState(null);
  const [plansError, setPlansError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
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
      const res = await base44.functions.invoke('vtuServices', { action: 'epin_plans' });
      const d = res.data || res;
      setPlans(d.plans || []);
    } catch (err) {
      const d = err.response && err.response.data;
      setPlansError((d && d.error) || err.message || 'Could not load packages');
      setPlans([]);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedPlan) return setError('Select an ePIN package');
    setLoading(true); setProcessing(true);
    // Branded pre-provider preparation window. No provider request is made during this animation.
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DURATION_MS));
    try {
      const res = await base44.functions.invoke('purchaseVtu', {
        action: 'epin', planId: selectedPlan.id,
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
    const epin = (success.metadata && success.metadata.epin) || null;
    return (
      <PurchaseSuccess
        title="ePIN delivered!"
        subtitle="Your recharge pin details are below and saved to this transaction."
        transaction={success}
        onReset={() => { setSuccess(null); setSelectedPlan(null); }}
      >
        {epin && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-5 text-left">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Your ePIN details</div>
            {Object.entries(epin).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 py-1 text-sm">
                <span className="text-muted-foreground capitalize">{String(k).replace(/_/g, ' ')}</span>
                <span className="font-mono font-bold">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </PurchaseSuccess>
    );
  }

  const networkPlans = (plans || []).filter(p => p.network === network);

  return (
    <div className="max-w-lg space-y-6">
      <TransactionProcessingOverlay visible={processing} />
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Ticket className="w-6 h-6 text-primary" /> ePIN / Recharge</h1>
        <p className="text-sm text-muted-foreground mt-1">Digital recharge pins for MTN, Glo, Airtel & 9mobile — delivered instantly.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
        <div>
          <Label className="mb-2.5 block">Network</Label>
          <div className="grid grid-cols-4 gap-2">
            {NETWORKS.map(n => (
              <button key={n} type="button" onClick={() => { setNetwork(n); setSelectedPlan(null); }}
                className={'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-bold transition-all ' + (network === n ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                <span className={'w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] ' + (NETWORK_COLORS[n] || 'bg-primary')}>{n[0]}</span>
                {n === '9MOBILE' ? '9mobile' : n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <Label>Select Package</Label>
            <button onClick={loadPlans} className="text-xs font-semibold text-primary inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
          </div>
          {plans === null && <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading packages…</div>}
          {plansError && <div className="py-6 text-center text-sm text-destructive">{plansError}</div>}
          {plans && networkPlans.length === 0 && !plansError && (
            <div className="py-6 text-center text-sm text-muted-foreground">No ePIN packages available for this network right now.</div>
          )}
          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2 pr-1">
            {networkPlans.map(p => (
              <button key={p.id} type="button" onClick={() => setSelectedPlan(p)}
                className={'w-full flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ' + (selectedPlan && selectedPlan.id === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-sm font-extrabold text-primary">{formatNairaShort(p.customerPrice)}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PurchaseFormFooter
            serviceSlug="epin"
            providerCost={selectedPlan ? selectedPlan.providerCost : 0}
            promo={promo} setPromo={setPromo}
            pin={pin} setPin={setPin}
            biometricToken={biometricToken} setBiometricToken={setBiometricToken}
            error={error}
            submitLabel={selectedPlan ? `Buy — ${formatNairaShort(selectedPlan.customerPrice)}` : 'Select a package'}
            disabled={!selectedPlan}
            loading={loading}
          />
        </form>
      </div>
    </div>
  );
}