import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Fingerprint, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { platformAuthenticatorAvailable, requestBiometricApproval } from '@/lib/webauthn';

// Renders the transaction-PIN gate only when the user has enabled
// "Require PIN for purchases" in Settings → Security. If fingerprint /
// Face ID is registered, it can be used instead of typing the PIN.
export default function TransactionPinInput({ value, onChange, biometricToken, onBiometricToken }) {
  const [required, setRequired] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bioError, setBioError] = useState('');

  useEffect(() => {
    let mounted = true;
    base44.functions.invoke('managePin', { action: 'status' })
      .then(res => {
        const d = res.data || res;
        if (mounted) setRequired(!!d.requireForPurchases);
      })
      .catch(() => {});
    base44.functions.invoke('manageBiometric', { action: 'status' })
      .then(async res => {
        const d = res.data || res;
        if (mounted && d.registered) setBiometricReady(await platformAuthenticatorAvailable());
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!required) return null;

  const unlock = async () => {
    setBusy(true);
    setBioError('');
    try {
      const token = await requestBiometricApproval();
      onBiometricToken(token);
      onChange('');
    } catch (e) {
      const d = e.response && e.response.data;
      setBioError((d && d.error) || e.message || 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  if (biometricToken) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Fingerprint verified — PIN not needed
        </div>
        <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => onBiometricToken('')}>
          Use PIN instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="txn-pin">Transaction PIN</Label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id="txn-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter your PIN"
          className="pl-10 h-12 tracking-[0.3em]"
        />
      </div>
      {biometricReady && (
        <div className="space-y-1.5">
          <Button type="button" variant="outline" className="w-full h-11 font-semibold" disabled={busy} onClick={unlock}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
            Use fingerprint / Face ID
          </Button>
          {bioError && <p className="text-xs text-destructive">{bioError}</p>}
        </div>
      )}
    </div>
  );
}