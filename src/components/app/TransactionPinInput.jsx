import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Fingerprint, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { platformAuthenticatorAvailable, requestBiometricApproval } from '@/lib/webauthn';

// Transaction security gate. Shown for every user with purchase-PIN protection
// ON or a registered fingerprint / Face ID — each payment and transaction
// must be verified BEFORE the processing animation runs.
export default function TransactionPinInput({ value, onChange, biometricToken, onBiometricToken, onGateChange }) {
  const [pinRequired, setPinRequired] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bioError, setBioError] = useState('');

  useEffect(() => {
    let mounted = true;
    base44.functions.invoke('managePin', { action: 'status' })
      .then(res => {
        const d = res.data || res;
        if (mounted) setPinRequired(!!d.requireForPurchases);
      })
      .catch(() => {});
    base44.functions.invoke('manageBiometric', { action: 'status' })
      .then(async res => {
        const d = res.data || res;
        if (!mounted || !d.registered) return;
        setBioRegistered(true);
        setBiometricReady(await platformAuthenticatorAvailable());
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const gateRequired = pinRequired || bioRegistered;

  useEffect(() => {
    if (onGateChange) onGateChange(gateRequired);
  }, [gateRequired]);

  if (!gateRequired) return null;

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

  // PIN protection off, biometrics registered → fingerprint-first gate
  if (!pinRequired) {
    if (biometricToken) {
      return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Fingerprint / Face ID verified
          </div>
          <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => onBiometricToken('')}>
            Verify again
          </button>
        </div>
      );
    }
    if (biometricReady) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Fingerprint className="w-4 h-4 text-primary" /> Verify to complete this transaction
          </div>
          <Button type="button" variant="outline" className="w-full h-11 font-semibold" disabled={busy} onClick={unlock}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
            Use fingerprint / Face ID
          </Button>
          {bioError && <p className="text-xs text-destructive">{bioError}</p>}
        </div>
      );
    }
    // Different device without the registered biometric → PIN fallback
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
        <p className="text-xs text-muted-foreground">
          This device can't use your fingerprint — verify with your transaction PIN instead. Manage this in Settings → Security.
        </p>
      </div>
    );
  }

  // Purchase-PIN protection on: PIN input, with biometric unlock when available
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