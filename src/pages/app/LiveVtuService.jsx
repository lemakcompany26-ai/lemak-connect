import { useEffect, useState } from 'react';
import { GraduationCap, Globe, Lightbulb, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { formatNairaShort } from '@/lib/format';
import PurchaseFormFooter from '@/components/app/PurchaseFormFooter';
import PurchaseSuccess from '@/components/app/PurchaseSuccess';
import TransactionProcessingOverlay, { PROCESSING_DURATION_MS } from '@/components/app/TransactionProcessingOverlay';

const CONFIG = {
  electricity: { title: 'Electricity', description: 'Validate your meter and pay a live electricity bill through Bigisub.', icon: Lightbulb, recipient: 'Meter number', placeholder: 'Enter your meter number' },
  education: { title: 'Education', description: 'Purchase live WAEC, JAMB and NECO products from Bigisub.', icon: GraduationCap, recipient: 'Phone number or account ID', placeholder: 'Enter the recipient number or account ID' },
  broadband: { title: 'Broadband', description: 'Choose a live home or office internet plan from Bigisub.', icon: Globe, recipient: 'Phone number or account ID', placeholder: 'Enter the recipient number or account ID' }
};

export default function LiveVtuService({ serviceType }) {
  const { setWalletLocal } = useApp();
  const config = CONFIG[serviceType];
  const [plans, setPlans] = useState(null);
  const [plansError, setPlansError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
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
      const res = await base44.functions.invoke('vtuServices', { action: serviceType + '_plans' });
      const data = res.data || res;
      setPlans(data.plans || []);
    } catch (err) {
      const data = err.response && err.response.data;
      setPlansError((data && data.error) || err.message || 'Could not load live plans');
      setPlans([]);
    }
  };

  useEffect(() => { loadPlans(); }, [serviceType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!selectedPlan) return setError('Select an available plan');
    if (recipient.trim().length < 3) return setError(`Enter a valid ${config.recipient.toLowerCase()}`);
    if (serviceType === 'electricity' && (!Number(amount) || Number(amount) < 100)) return setError('Enter an electricity amount of at least ₦100');
    setLoading(true); setProcessing(true);
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DURATION_MS));
    try {
      const res = await base44.functions.invoke('purchaseVtu', {
        action: serviceType, planId: selectedPlan.id, recipient: recipient.trim(),
        amount: serviceType === 'electricity' ? Number(amount) : undefined,
        meterType: serviceType === 'electricity' ? meterType : null,
        promoCode: promo ? promo.code : null, pin: pin || null, biometricToken: biometricToken || null
      });
      const data = res.data || res;
      if (data.wallet) setWalletLocal(data.wallet);
      setSuccess(data.transaction);
    } catch (err) {
      const data = err.response && err.response.data;
      setError((data && (data.error || data.message)) || err.message || 'Purchase failed');
      if (data && data.wallet) setWalletLocal(data.wallet);
    } finally {
      setProcessing(false); setLoading(false); setBiometricToken('');
    }
  };

  if (success) {
    return (
      <PurchaseSuccess
        title={`${config.title} purchase successful`}
        subtitle={`${success.metadata && success.metadata.planName} was purchased for ${success.recipient}.`}
        transaction={success}
        onReset={() => { setSuccess(null); setSelectedPlan(null); setRecipient(''); }}
      />
    );
  }

  return (
    <div className="max-w-lg space-y-6 bg-background">
      <TransactionProcessingOverlay visible={processing} />
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><config.icon className="w-6 h-6 text-primary" /> {config.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
        {serviceType === 'electricity' && (
          <div>
            <Label className="mb-2.5 block">Meter type</Label>
            <div className="grid grid-cols-2 gap-2">
              {['prepaid', 'postpaid'].map(type => (
                <button key={type} type="button" onClick={() => setMeterType(type)} className={'rounded-xl border-2 p-3 text-xs font-bold capitalize transition-all ' + (meterType === type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <Label>{serviceType === 'electricity' ? 'Select your electricity provider' : 'Select an available plan'}</Label>
            <button type="button" onClick={loadPlans} className="text-xs font-semibold text-primary inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
          </div>
          {plans === null && <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading live plans…</div>}
          {plansError && <div className="py-6 text-center text-sm text-destructive">{plansError}</div>}
          {plans && plans.length === 0 && !plansError && <div className="py-6 text-center text-sm text-muted-foreground">No live plans are available right now.</div>}
          <div className="max-h-72 overflow-y-auto scrollbar-thin space-y-2 pr-1">
            {(plans || []).map(plan => (
              <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan)} className={'w-full flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all ' + (selectedPlan && selectedPlan.id === plan.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                <span className="min-w-0"><span className="block text-sm font-bold truncate">{plan.name}</span>{plan.providerName && <span className="block text-xs text-muted-foreground mt-0.5">{plan.providerName}</span>}</span>
                <span className="text-sm font-extrabold text-primary shrink-0">{serviceType === 'electricity' ? 'Live' : formatNairaShort(plan.customerPrice)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${serviceType}-recipient`}>{config.recipient}</Label>
          <Input id={`${serviceType}-recipient`} value={recipient} onChange={event => setRecipient(event.target.value.replace(/\s/g, '').slice(0, 40))} placeholder={config.placeholder} className="h-12 text-base" />
        </div>

        {serviceType === 'electricity' && (
          <div className="space-y-2">
            <Label htmlFor="electricity-amount">Amount (₦)</Label>
            <Input id="electricity-amount" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter amount" className="h-12 text-base" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PurchaseFormFooter serviceSlug={serviceType} providerCost={serviceType === 'electricity' ? Number(amount) || 0 : 0} promo={promo} setPromo={setPromo} pin={pin} setPin={setPin} biometricToken={biometricToken} setBiometricToken={setBiometricToken} error={error} submitLabel={selectedPlan ? serviceType === 'electricity' ? `Pay ${formatNairaShort(Number(amount) || 0)}` : `Pay ${formatNairaShort(selectedPlan.customerPrice)}` : 'Select a plan'} disabled={!selectedPlan || recipient.trim().length < 3 || (serviceType === 'electricity' && Number(amount) < 100)} loading={loading} />
        </form>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5" /> Your wallet is debited once and refunded automatically if the provider rejects the order.</p>
      </div>
    </div>
  );
}

export function Electricity() { return <LiveVtuService serviceType="electricity" />; }
export function Education() { return <LiveVtuService serviceType="education" />; }
export function Broadband() { return <LiveVtuService serviceType="broadband" />; }