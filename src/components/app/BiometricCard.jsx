import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPlatformCredential, platformAuthenticatorAvailable } from '@/lib/webauthn';
import { Switch } from '@/components/ui/switch';
import { APP_LOCK_KEY } from '@/components/app/BiometricLock';

// Settings card for registering/removing this device's fingerprint or
// Face ID as an unlock method for PIN-protected purchases.
export default function BiometricCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null); // { supported, registered, deviceLabel, lastUsedAt, appLock }
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const supported = await platformAuthenticatorAvailable();
    let registered = false;
    let deviceLabel = null;
    let lastUsedAt = null;
    try {
      const res = await base44.functions.invoke('manageBiometric', { action: 'status' });
      const d = res.data || res;
      registered = !!d.registered;
      deviceLabel = d.deviceLabel || null;
      lastUsedAt = d.lastUsedAt || null;
    } catch (e) { /* non-fatal */ }
    let lockOn = false;
    try { lockOn = localStorage.getItem(APP_LOCK_KEY) === '1'; } catch (e) { /* ignore */ }
    setStatus({ supported, registered, deviceLabel, lastUsedAt, appLock: lockOn });
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const register = async () => {
    setBusy(true);
    try {
      const beginRes = await base44.functions.invoke('manageBiometric', { action: 'register_begin' });
      const begin = beginRes.data || beginRes;
      if (!begin.options) throw new Error(begin.error || 'Could not start registration');
      const credential = await createPlatformCredential(begin.options);
      const completeRes = await base44.functions.invoke('manageBiometric', { action: 'register_complete', credential });
      const complete = completeRes.data || completeRes;
      if (complete.ok !== true) throw new Error(complete.error || 'Registration failed');
      toast({ title: 'Biometric unlock enabled' });
      await loadStatus();
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Registration failed', description: (d && d.error) || e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manageBiometric', { action: 'remove' });
      const d = res.data || res;
      if (d.ok !== true) throw new Error(d.error || 'Could not remove biometric unlock');
      toast({ title: 'Biometric unlock removed' });
      await loadStatus();
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Action failed', description: (d && d.error) || e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (status === null) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading biometric settings…
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Fingerprint className="w-4 h-4 text-primary" /> Fingerprint / Face ID unlock</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Unlock PIN-protected purchases with your device biometrics instead of typing your PIN.
        </p>
      </div>

      {!status.supported && (
        <p className="text-xs text-muted-foreground rounded-lg bg-muted/60 p-3">
          This browser or device doesn't support biometric unlock. It works best on phones and laptops with a fingerprint sensor or Face ID.
        </p>
      )}

      {status.supported && !status.registered && (
        <Button className="w-full h-11 font-semibold" disabled={busy} onClick={register}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
          Enable on this device
        </Button>
      )}

      {status.supported && status.registered && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <Fingerprint className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-emerald-700">Enabled</div>
              <div className="text-xs text-muted-foreground truncate">
                {status.deviceLabel || 'This device'}
                {status.lastUsedAt ? ' · last used ' + new Date(status.lastUsedAt).toLocaleDateString() : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Lock the app on open</div>
              <div className="text-xs text-muted-foreground">Ask for fingerprint / Face ID whenever the app starts</div>
            </div>
            <Switch
              checked={!!status.appLock}
              onCheckedChange={on => {
                try { localStorage.setItem(APP_LOCK_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
                setStatus(s => ({ ...s, appLock: on }));
                toast({ title: on ? 'App lock enabled' : 'App lock disabled' });
              }}
            />
          </div>
          <Button variant="outline" className="w-full h-11 font-semibold" disabled={busy} onClick={remove}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Remove this device
          </Button>
        </div>
      )}
    </div>
  );
}