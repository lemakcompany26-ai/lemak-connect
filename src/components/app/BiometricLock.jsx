import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { requestBiometricApproval, platformAuthenticatorAvailable } from '@/lib/webauthn';
import Logo from '@/components/Logo';

// Device-local flag: when '1', the app asks for fingerprint / Face ID
// whenever it opens. Password sign-in still applies when the underlying
// session itself expires.
export const APP_LOCK_KEY = 'lemak_app_lock';

export function appLockEnabled() {
  try { return localStorage.getItem(APP_LOCK_KEY) === '1'; } catch (e) { return false; }
}

// Full-screen biometric gate for the app lock. Unlocking is verified
// server-side (WebAuthn signature check); it opens the app without
// touching the underlying session.
export default function BiometricLock({ onUnlocked }) {
  const { logout } = useAuth();
  const [state, setState] = useState('busy'); // busy | error
  const [error, setError] = useState('');

  const attempt = useCallback(async () => {
    setState('busy');
    setError('');
    try {
      if (!(await platformAuthenticatorAvailable())) {
        throw new Error('Biometrics are not available on this device. Sign in with your password and disable app lock in Settings.');
      }
      await requestBiometricApproval();
      onUnlocked();
    } catch (e) {
      const d = e.response && e.response.data;
      setError((d && d.error) || e.message || 'Unlock failed');
      setState('error');
    }
  }, [onUnlocked]);

  useEffect(() => { attempt(); }, [attempt]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <div className="w-20 h-20 rounded-full brand-gradient-soft flex items-center justify-center">
        {state === 'busy'
          ? <Loader2 className="w-8 h-8 text-white animate-spin" />
          : <Fingerprint className="w-9 h-9 text-white" />}
      </div>
      <div>
        <h2 className="font-heading text-xl font-bold">Unlock Lemak Connect</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {state === 'busy' ? 'Waiting for your fingerprint or Face ID…' : 'Confirm it’s you to continue'}
        </p>
        {state === 'error' && (
          <p className="mt-2 text-xs text-red-600 max-w-xs mx-auto">{error}</p>
        )}
      </div>
      {state === 'error' && (
        <Button className="h-11 px-6 font-semibold" onClick={attempt}>
          <Fingerprint className="w-4 h-4 mr-2" /> Try again
        </Button>
      )}
      <button onClick={() => logout('/login')} className="text-xs text-muted-foreground underline underline-offset-4">
        Use password instead
      </button>
    </div>
  );
}