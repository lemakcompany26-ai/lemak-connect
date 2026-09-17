import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ReasonDialog({ open, title, label, placeholder, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="bg-mk-card border-mk-border text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-slate-300">{label}</p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="bg-mk-card2 border-mk-border text-white placeholder:text-slate-500"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-mk-border text-slate-300 hover:bg-mk-card2" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button className="bg-mk-blue hover:bg-mk-blue/90 text-white" onClick={() => onConfirm(reason)} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}