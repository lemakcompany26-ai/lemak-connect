import { useEffect, useState } from 'react';
import { Landmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inputCls = 'h-10 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500 focus-visible:ring-mk-blue';

// Seller payout settings — stored securely on the seller record, never in
// chat. Only a masked account number is ever referenced elsewhere.
export default function PayoutSettingsCard({ seller, busy, onSave }) {
  const [form, setForm] = useState({
    payoutMethod: '', payoutBank: '', payoutAccountName: '', payoutAccountNumber: ''
  });

  useEffect(() => {
    if (seller) {
      setForm({
        payoutMethod: seller.payoutMethod || '',
        payoutBank: seller.payoutBank || '',
        payoutAccountName: seller.payoutAccountName || '',
        payoutAccountNumber: ''
      });
    }
  }, [seller && seller.id]);

  if (!seller) return null;

  const set = (key, v) => setForm(f => ({ ...f, [key]: v }));
  const masked = seller.payoutAccountNumber ? `****${String(seller.payoutAccountNumber).slice(-4)}` : null;

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="w-5 h-5 text-mk-blue" />
        <h3 className="text-sm font-bold text-white">Payout settings</h3>
      </div>
      <p className="text-xs text-slate-400 -mt-2">
        Where we send your marketplace earnings. Payout details are stored securely on your seller record —
        never share them in chat. {masked ? <>On file: <span className="font-mono font-bold text-white">{masked}</span></> : 'No payout account on file yet.'}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">Payout method</Label>
          <Input className={inputCls} placeholder="e.g. Bank transfer" value={form.payoutMethod} onChange={(e) => set('payoutMethod', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">Bank / provider</Label>
          <Input className={inputCls} placeholder="e.g. GTBank" value={form.payoutBank} onChange={(e) => set('payoutBank', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">Account name</Label>
          <Input className={inputCls} placeholder="Account holder name" value={form.payoutAccountName} onChange={(e) => set('payoutAccountName', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">Account number {masked && <span className="text-slate-500 font-normal">(leave blank to keep {masked})</span>}</Label>
          <Input className={inputCls} inputMode="numeric" placeholder="10-digit account number" value={form.payoutAccountNumber} onChange={(e) => set('payoutAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 20))} />
        </div>
      </div>
      <Button
        className="w-full h-11 font-bold bg-mk-blue hover:bg-mk-blue/90 text-white"
        disabled={busy || !form.payoutMethod || (!form.payoutAccountNumber && !masked)}
        onClick={() => onSave({
          payoutMethod: form.payoutMethod,
          payoutBank: form.payoutBank,
          payoutAccountName: form.payoutAccountName,
          payoutAccountNumber: form.payoutAccountNumber || undefined
        })}
      >
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save payout settings
      </Button>
    </div>
  );
}