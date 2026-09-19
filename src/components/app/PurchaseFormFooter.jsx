import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import PromoCodeInput from '@/components/app/PromoCodeInput';
import TransactionPinInput from '@/components/app/TransactionPinInput';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';

// Shared purchase form block: promo code, transaction PIN / biometric unlock,
// inline error, wallet balance and the submit button. The biometric / PIN gate
// must be satisfied BEFORE the purchase can run.
export default function PurchaseFormFooter({ serviceSlug, providerCost, promo, setPromo, pin, setPin, biometricToken, setBiometricToken, error, submitLabel, disabled, loading }) {
  const { wallet } = useApp();
  const [gateRequired, setGateRequired] = useState(false);
  return (
    <>
      <PromoCodeInput serviceSlug={serviceSlug} providerCost={providerCost} onValidated={setPromo} />
      <TransactionPinInput value={pin} onChange={setPin} biometricToken={biometricToken} onBiometricToken={setBiometricToken} onGateChange={setGateRequired} />
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
      <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Wallet balance</span>
        <span className="font-bold">{formatNaira(wallet ? wallet.balance : 0)}</span>
      </div>
      <Button type="submit" className="w-full h-12 text-sm font-bold" disabled={disabled || loading || (gateRequired && !pin && !biometricToken)}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : submitLabel}
      </Button>
    </>
  );
}