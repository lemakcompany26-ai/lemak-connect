import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const digits = v => String(v || '').replace(/\D/g, '').slice(0, 6);

export default function SecurityPinCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('idle'); // idle | create | change | reset
  const [form, setForm] = useState({ pin: '', confirm: '' });
  const [changeForm, setChangeForm] = useState({ current: '', next: '', confirm: '' });

  const loadStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('managePin', { action: 'status' });
      setStatus(res.data || res);
    } catch (e) {
      setStatus({ hasPin: false, requireForPurchases: false, locked: false });
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const call = async (payload, successMsg, onDone) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('managePin', payload);
      if ((res.data || res).ok === false) throw new Error((res.data || res).error);
      toast({ title: successMsg });
      if (onDone) onDone();
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
        <Loader2 className="w-4 h-4 animate-spin" /> Loading security settings…
      </div>
    );
  }

  const pinFields = (values, setValues, keys) => (
    <div className="space-y-3">
      {keys.map(([key, label]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={'pin-' + key}>{label}</Label>
          <Input
            id={'pin-' + key}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={values[key]}
            onChange={e => setValues({ ...values, [key]: digits(e.target.value) })}
            className="h-11"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-heading font-bold text-sm flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Security</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Add a transaction PIN to protect purchases. It is stored only as a secure hash — never in readable form.
        </p>
      </div>

      {status.locked && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          Too many incorrect attempts. Your PIN is temporarily locked.
        </div>
      )}

      {!status.hasPin && view !== 'create' && (
        <Button variant="outline" className="w-full h-11 font-semibold" onClick={() => setView('create')}>
          <KeyRound className="w-4 h-4 mr-2" /> Create transaction PIN
        </Button>
      )}

      {!status.hasPin && view === 'create' && (
        <div className="space-y-3">
          {pinFields(form, setForm, [['pin', 'New PIN (4-6 digits)'], ['confirm', 'Confirm PIN']])}
          <Button
            className="w-full h-11 font-semibold"
            disabled={busy || !form.pin || form.pin !== form.confirm}
            onClick={() => call({ action: 'setup', pin: form.pin }, 'Transaction PIN created', () => { setView('idle'); setForm({ pin: '', confirm: '' }); })}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create PIN'}
          </Button>
          <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => setView('idle')}>Cancel</button>
        </div>
      )}

      {status.hasPin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <Label className="text-sm font-medium">Require PIN for purchases</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Ask for your PIN on every airtime or data purchase.</p>
            </div>
            <Switch
              checked={!!status.requireForPurchases}
              disabled={busy}
              onCheckedChange={v => call(
                { action: 'setRequirePurchases', enabled: v },
                v ? 'PIN required for purchases' : 'PIN no longer required for purchases'
              )}
            />
          </div>

          {view === 'idle' && (
            <div className="space-y-2">
              <Button variant="outline" className="w-full h-11 font-semibold" onClick={() => setView('change')}>
                <KeyRound className="w-4 h-4 mr-2" /> Change PIN
              </Button>
              <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setView('reset')}>
                Forgot your PIN? Reset it
              </button>
            </div>
          )}

          {view === 'change' && (
            <div className="space-y-3 border-t border-border/60 pt-4">
              {pinFields(changeForm, setChangeForm, [
                ['current', 'Current PIN'],
                ['next', 'New PIN (4-6 digits)'],
                ['confirm', 'Confirm new PIN']
              ])}
              <Button
                className="w-full h-11 font-semibold"
                disabled={busy || !changeForm.current || !changeForm.next || changeForm.next !== changeForm.confirm}
                onClick={() => call(
                  { action: 'change', currentPin: changeForm.current, newPin: changeForm.next },
                  'PIN changed',
                  () => { setView('idle'); setChangeForm({ current: '', next: '', confirm: '' }); }
                )}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save new PIN'}
              </Button>
              <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => setView('idle')}>Cancel</button>
            </div>
          )}

          {view === 'reset' && (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="text-xs text-muted-foreground">
                Resetting your PIN requires only your logged-in session and is recorded in your security history.
              </p>
              {pinFields(form, setForm, [['pin', 'New PIN (4-6 digits)'], ['confirm', 'Confirm PIN']])}
              <Button
                className="w-full h-11 font-semibold"
                disabled={busy || !form.pin || form.pin !== form.confirm}
                onClick={() => call(
                  { action: 'reset', newPin: form.pin },
                  'PIN reset',
                  () => { setView('idle'); setForm({ pin: '', confirm: '' }); }
                )}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset PIN'}
              </Button>
              <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => setView('idle')}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}