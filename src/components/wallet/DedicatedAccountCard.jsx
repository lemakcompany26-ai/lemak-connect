import { useEffect, useState } from 'react';
import { Building2, Copy, Landmark, Loader2, RefreshCw, Share2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// The customer's permanent dedicated bank account. Only real, server-issued
// details are ever shown — never provider API names, references or internal
// routing. If the account can't be created, nothing fake is displayed.
export default function DedicatedAccountCard() {
  const { toast } = useToast();
  // loading | needs_kyc | kyc_form | creating | ready | failed
  const [state, setState] = useState('loading');
  const [account, setAccount] = useState(null);
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const createAccount = async () => {
    setState('creating');
    setError('');
    try {
      const res = await base44.functions.invoke('koraAccount', { action: 'create' });
      const d = res.data || res;
      if (d.account) {
        setAccount(d.account);
        setState('ready');
        toast({ title: 'Your dedicated account is ready' });
      } else {
        setState('needs_kyc');
      }
    } catch (e) {
      setState('failed');
    }
  };

  const load = async () => {
    setState('loading');
    try {
      const res = await base44.functions.invoke('koraAccount', { action: 'status' });
      const d = res.data || res;
      if (d.account) {
        setAccount(d.account);
        setState('ready');
      } else if (d.kycComplete) {
        // Automatic creation as soon as KYC info is available
        createAccount();
      } else {
        setState('needs_kyc');
      }
    } catch (e) {
      setState('failed');
    }
  };

  useEffect(() => { load(); }, []);

  const saveKyc = async () => {
    setError('');
    const cleanBvn = bvn.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cleanBvn)) {
      setError('Enter your valid 11-digit BVN');
      return;
    }
    setBusy(true);
    try {
      await base44.functions.invoke('koraAccount', { action: 'save_kyc', bvn: cleanBvn, nin: nin.replace(/\D/g, '') || null });
      await createAccount();
    } catch (e) {
      const d = e.response && e.response.data;
      setError((d && d.error) || 'Could not save your verification information. Please try again.');
      setState('needs_kyc');
    } finally {
      setBusy(false);
    }
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: label + ' copied' });
    });
  };

  const share = async () => {
    const text = `Bank: ${account.bankName}\nAccount Number: ${account.accountNumber}\nAccount Name: ${account.accountName}\n\nFund your Lemak Connect wallet by transferring to this account.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Your Lemak Connect account details', text });
        return;
      } catch (e) { /* cancelled — fall through to copy */ }
    }
    copy(text, 'Account details');
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /> Your Dedicated Account</h3>
        {state === 'ready' && (
          <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{account.status === 'active' ? 'Active' : 'Activating'}</span>
        )}
      </div>

      {state === 'loading' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your dedicated account…
        </div>
      )}

      {state === 'needs_kyc' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Complete your verification information before creating your dedicated account. Transfers to it are credited to your wallet automatically.
          </p>
          <Button className="h-11 font-semibold" onClick={() => setState('kyc_form')}>
            <ShieldCheck className="w-4 h-4 mr-2" /> Add verification info
          </Button>
        </div>
      )}

      {state === 'kyc_form' && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bvn">BVN <span className="text-destructive">*</span></Label>
            <Input id="bvn" inputMode="numeric" value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11-digit Bank Verification Number" className="h-12 tracking-wider" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nin">NIN <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="nin" inputMode="numeric" value={nin} onChange={e => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11-digit National Identity Number" className="h-12 tracking-wider" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full h-11 font-semibold" disabled={busy || bvn.replace(/\D/g, '').length !== 11} onClick={saveKyc}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Verify &amp; create my account
          </Button>
          <p className="text-[11px] text-muted-foreground">Your BVN is stored securely and is used only to create your dedicated account.</p>
        </div>
      )}

      {state === 'creating' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Creating your dedicated account…
        </div>
      )}

      {state === 'failed' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Dedicated account temporarily unavailable. Please try again.</p>
          <Button variant="outline" className="h-11 font-semibold" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Try again
          </Button>
        </div>
      )}

      {state === 'ready' && account && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Bank Name</div>
              <div className="text-sm font-bold flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> {account.bankName}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Account Number</div>
              <div className="text-lg font-extrabold font-mono tracking-wider">{account.accountNumber}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Account Name</div>
              <div className="text-sm font-bold">{account.accountName}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10 text-xs font-semibold" onClick={() => copy(account.accountNumber, 'Account number')}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Number
            </Button>
            <Button variant="outline" className="h-10 text-xs font-semibold" onClick={() => copy(account.accountName, 'Account name')}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Name
            </Button>
          </div>
          <Button variant="outline" className="w-full h-10 text-xs font-semibold" onClick={share}>
            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share Account Details
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Transfers to this account are credited to your Lemak wallet automatically — use it anytime, it's permanently yours.
          </p>
        </div>
      )}
    </div>
  );
}