import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AtSign, Phone, Loader2, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/Logo';
import SignupPromoInput from '@/components/app/SignupPromoInput';

// Shown when an authenticated user has no profile yet (e.g. Google sign-up).
// Creates profile + wallet + notification preferences via the backend.
export default function CompleteProfile() {
  const navigate = useNavigate();
  // Prefill from a registration whose profile setup failed, so nothing is retyped.
  const [pending] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lemak_pending_onboarding') || '{}'); } catch (e) { return {}; }
  });
  const [fullName, setFullName] = useState(pending.fullName || '');
  const [username, setUsername] = useState(pending.username || '');
  const [phone, setPhone] = useState(pending.phone || '');
  const [promoCode, setPromoCode] = useState(pending.promoCode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !username.trim() || !phone.trim()) {
      setError('Please fill in your full name, username and phone number');
      return;
    }
    setLoading(true);
    try {
      await base44.functions.invoke('onboardUser', {
        fullName: fullName.trim(), username: username.trim().toLowerCase(),
        phone: phone.trim(), promoCode: promoCode.trim(), referralCode: pending.referralCode || ''
      });
      localStorage.removeItem('lemak_pending_onboarding');
      navigate('/app', { replace: true });
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.error) || err.message || 'Could not complete your profile');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl">
        <Logo size="lg" className="justify-center" />
        <div className="mt-6 text-center">
          <h1 className="font-heading text-xl font-extrabold">One more step</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Tell us a bit about you to finish setting up your wallet.</p>
        </div>

        {error && <div className="mt-5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="pl-10 h-12" placeholder="Adaeze Okafor" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} className="pl-10 h-12" placeholder="adaeze_o" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 h-12" placeholder="08012345678" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="promoCode">Promo Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <SignupPromoInput value={promoCode} onChange={setPromoCode} />
          </div>
          <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating your wallet…</> : <><Zap className="w-4 h-4 mr-2" /> Finish setup</>}
          </Button>
        </form>
      </div>
    </div>
  );
}