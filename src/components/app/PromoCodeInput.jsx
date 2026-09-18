import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Ticket } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';

// Promo code field with SERVER-side validation.
// The green check is only shown when the backend returns valid: true.
export default function PromoCodeInput({ serviceSlug, providerCost, onValidated }) {
  const [code, setCode] = useState('');
  const [state, setState] = useState('idle'); // idle | checking | valid | invalid
  const [result, setResult] = useState(null);

  const validate = async () => {
    if (!code.trim()) return;
    setState('checking');
    try {
      const res = await base44.functions.invoke('validatePromoCode', {
        code: code.trim(), serviceSlug, providerCost: providerCost || 0
      });
      const d = res.data || res;
      setResult(d);
      setState(d.valid ? 'valid' : 'invalid');
      if (onValidated) onValidated(d.valid ? d : null);
    } catch (err) {
      setResult({ reason: 'Could not validate code right now' });
      setState('invalid');
      if (onValidated) onValidated(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setState('idle'); if (onValidated) onValidated(null); }}
            placeholder="Promo code (optional)"
            className="pl-10"
          />
        </div>
        <Button type="button" variant="outline" onClick={validate} disabled={!code.trim() || state === 'checking'}>
          {state === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {state === 'valid' && (
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          {result.signupBonus
            ? 'Active welcome-bonus code — no discount on this purchase'
            : `Promo applied — you save ${formatNaira(result.discount)}`}
        </div>
      )}
      {state === 'invalid' && (
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <XCircle className="w-4 h-4" />
          {result.reason || 'Invalid promo code'}
        </div>
      )}
    </div>
  );
}