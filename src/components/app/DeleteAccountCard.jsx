import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Double-confirmation account deletion. The backend function requires the
// same "DELETE" token, so the endpoint can never fire by accident.
export default function DeleteAccountCard() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0); // 0 = closed, 1 = first confirm, 2 = final confirm
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => { setStep(0); setToken(''); setBusy(false); };

  const confirmDelete = async () => {
    if (token.trim() !== 'DELETE' || busy) return;
    setBusy(true);
    try {
      await base44.functions.invoke('deleteAccount', { confirm: 'DELETE' });
      toast({ title: 'Account deleted', description: 'Your data has been permanently erased.' });
      await logout('/');
      window.location.href = '/';
    } catch (e) {
      setBusy(false);
      toast({ title: 'Could not delete account', description: e.message || 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
      <h3 className="font-heading font-bold text-sm flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-4 h-4 shrink-0" /> Danger zone
      </h3>
      <p className="mt-2 text-xs text-muted-foreground">
        Deleting your account permanently erases your profile, wallet balance, transaction history, listings and chats. This cannot be undone.
      </p>
      <Button variant="destructive" className="mt-4 w-full h-11 font-semibold" onClick={() => setStep(1)}>
        Delete my account
      </Button>

      <Dialog open={step === 1} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This erases everything — your profile, wallet balance, transactions, listings and chat history. There is no way to recover it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>Keep my account</Button>
            <Button variant="destructive" onClick={() => setStep(2)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={step === 2} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Final confirmation</DialogTitle>
            <DialogDescription>
              Type <span className="font-bold text-destructive">DELETE</span> to permanently erase your account.
            </DialogDescription>
          </DialogHeader>
          <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Type DELETE" disabled={busy} autoFocus />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy || token.trim() !== 'DELETE'}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}