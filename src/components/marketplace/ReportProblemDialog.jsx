import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const REASONS = [
  ['account_inaccessible', 'Account inaccessible'],
  ['wrong_account', 'Wrong account'],
  ['follower_count_differs', 'Follower count differs'],
  ['monetisation_differs', 'Monetisation differs'],
  ['account_type_differs', 'Account type differs'],
  ['seller_did_not_deliver', 'Seller did not deliver'],
  ['other', 'Other']
];

export default function ReportProblemDialog({ order, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  return (
    <Dialog open={!!order} onOpenChange={(o) => { if (!o) { setReason(''); setDetails(''); onClose(); } }}>
      <DialogContent className="bg-mk-card border-mk-border text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" /> Report a problem
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-slate-300">{order && order.listingTitle}</div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">What went wrong?</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-10 bg-mk-card2 border-mk-border text-white">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="bg-mk-card border-mk-border">
                {REASONS.map(([v, label]) => (
                  <SelectItem key={v} value={v} className="text-white focus:bg-mk-blue focus:text-white">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Details (optional)</Label>
            <Textarea
              className="bg-mk-card2 border-mk-border text-white min-h-[80px]"
              placeholder="Describe the problem — e.g. what differs from the listing"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Opening a dispute locks the escrow. Lemak Connect support will review and decide — refund you, release the seller, or re-open testing. Never share your password with anyone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-mk-border text-slate-300 hover:bg-mk-card2" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant="destructive"
            className="font-bold"
            disabled={busy || !reason}
            onClick={() => onConfirm(reason, details.trim())}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Report Problem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}