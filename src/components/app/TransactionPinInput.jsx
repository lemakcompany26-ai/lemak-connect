import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Renders a transaction-PIN field only when the user has enabled
// "Require PIN for purchases" in Settings → Security.
export default function TransactionPinInput({ value, onChange }) {
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let mounted = true;
    base44.functions.invoke('managePin', { action: 'status' })
      .then(res => {
        const d = res.data || res;
        if (mounted) setRequired(!!d.requireForPurchases);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!required) return null;

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
    </div>
  );
}