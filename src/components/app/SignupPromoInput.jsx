import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Gift, Loader2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { formatNaira } from '@/lib/format';

// Signup promo field with live SERVER-side validation: the green check only
// appears when the backend confirms the code is active right now.
export default function SignupPromoInput({ value, onChange, id = 'promoCode' }) {
  const [state, setState] = useState('idle'); // idle | checking | valid | invalid
  const [info, setInfo] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const code = String(value || '').trim();
    if (!code) { setState('idle'); setInfo(null); return; }
    setState('checking');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('validatePromoCode', { code, forSignup: true });
        const d = res.data || res;
        setInfo(d);
        setState(d.valid ? 'valid' : 'invalid');
      } catch (err) {
        setInfo({ reason: 'Could not check this code right now' });
        setState('invalid');
      }
    }, 500);
    return () => clearTimeout(timer.current);
  }, [value]);

  const bonus = info && info.signupBonus ? formatNaira(info.signupBonus) : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="pl-10 h-12"
          placeholder="e.g. PELLER26"
        />
      </div>
      {state === 'checking' && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking promo code…
        </p>
      )}
      {state === 'valid' && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          {bonus
            ? `Active — ${bonus} welcome bonus credited after your first funding`
            : 'Promo code active'}
        </p>
      )}
      {state === 'invalid' && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <XCircle className="w-4 h-4" /> {info && info.reason ? info.reason : 'Invalid promo code'}
        </p>
      )}
    </div>
  );
}