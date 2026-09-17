import { useState } from 'react';
import { Settings as SettingsIcon, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { useAuth } from '@/lib/AuthContext';
import SecurityPinCard from '@/components/app/SecurityPinCard';
import BiometricCard from '@/components/app/BiometricCard';

const PREF_ROWS = [
  ['transactionAlerts', 'Transactions', 'Receipts, success and refund alerts'],
  ['walletAlerts', 'Wallet', 'Funding and balance changes'],
  ['paymentAlerts', 'Payments', 'Card payment confirmations'],
  ['marketplaceAlerts', 'Marketplace', 'Orders, delivery and payouts'],
  ['virtualNumberAlerts', 'Virtual Numbers', 'OTP arrivals and refunds'],
  ['smmAlerts', 'Social Growth', 'SMM order updates'],
  ['securityAlerts', 'Security', 'Login and account security events'],
  ['systemAlerts', 'System', 'Important service notifications'],
  ['promotionalAlerts', 'Promotions', 'Deals, discounts and new services']
];

export default function Settings() {
  const { preferences, setPreferences } = useApp();
  const { logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!preferences) return <div className="py-16 text-center text-sm text-muted-foreground">Loading settings…</div>;

  const update = async (key, value) => {
    setSaving(true); setSaved(false);
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      await base44.entities.NotificationPreference.update(preferences.id, { [key]: value });
      setSaved(true);
    } catch (e) { setPreferences(preferences); }
    setSaving(false);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><SettingsIcon className="w-6 h-6 text-primary" /> Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Notifications and account controls.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-sm">Email notifications</h3>
          <Switch checked={preferences.emailEnabled} onCheckedChange={v => update('emailEnabled', v)} />
        </div>
        {PREF_ROWS.map(([key, label, desc]) => (
          <div key={key} className="flex items-center justify-between gap-4 py-2.5 border-t border-border/60">
            <div>
              <Label className="text-sm font-medium">{label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <Switch checked={preferences[key]} onCheckedChange={v => update(key, v)} />
          </div>
        ))}
        <div className="pt-3 text-right">
          {saving && <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mr-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>}
          {saved && !saving && <span className="text-xs text-emerald-600 font-semibold">Saved</span>}
        </div>
      </div>

      <SecurityPinCard />

      <BiometricCard />

      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Account</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Your wallet is protected by server-side security. Only you can access your data, and every naira movement is permanently logged.
        </p>
        <Button variant="outline" className="mt-4 w-full h-11 font-semibold" onClick={() => logout()}>
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}