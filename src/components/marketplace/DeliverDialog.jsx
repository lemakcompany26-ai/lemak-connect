import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Seller delivery dialog — submits the account/page/channel URL through the
// secure delivery process instead of posting credentials in chat.
export default function DeliverDialog({ order, busy, onClose, onConfirm }) {
  const [accountUrl, setAccountUrl] = useState('');

  useEffect(() => {
    if (order) setAccountUrl(order.accountUrl || '');
  }, [order && order.id]);

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-mk-card border-mk-border text-white">
        <DialogHeader>
          <DialogTitle>Deliver account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-slate-300">{order && order.listingTitle}</div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Account / Page / Channel URL (optional)</Label>
            <Input
              className="h-10 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500"
              placeholder="https://facebook.com/yourpage"
              value={accountUrl}
              onChange={(e) => setAccountUrl(e.target.value.trim())}
            />
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-400 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Never post passwords or login credentials in chat. Share sensitive access details only through a secure one-time
              handoff agreed with the buyer, and follow Lemak Connect's approved delivery process.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-mk-border text-slate-300 hover:bg-mk-card2" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="bg-mk-blue hover:bg-mk-blue/90 text-white font-bold" onClick={() => onConfirm(accountUrl)} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />} Mark Delivered
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}