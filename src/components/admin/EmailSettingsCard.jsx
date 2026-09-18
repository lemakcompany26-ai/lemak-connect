import { useEffect, useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Admin → Settings → Email. Shows the Resend configuration status (never the
// API key), last successful send, last safe error, and sends a real test
// email through the production pipeline.
export default function EmailSettingsCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    base44.functions.invoke('sendTransactionalEmail', { action: 'status' })
      .then(res => setStatus(res.data || res))
      .catch(() => setStatus({ error: true }));
  };
  useEffect(() => { load(); }, []);

  const sendTest = async () => {
    if (!testEmail.trim()) {
      toast({ title: 'Enter an email address', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendTransactionalEmail', { action: 'test', to: testEmail.trim() });
      const d = res.data || res;
      if (d.ok) {
        toast({ title: 'Test email sent ✅', description: `Check ${testEmail} — it went through Resend.` });
      } else {
        toast({
          title: 'Test email failed',
          description: d.error === 'not_configured' ? 'RESEND_API_KEY is not configured.' : (d.error || 'Resend rejected the send. Is the sender domain verified?'),
          variant: 'destructive'
        });
      }
      load();
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Test email failed', description: (d && d.error) || e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" /> Email — Transactional
        </h3>
        {status && !status.error && (
          <span className={'text-[11px] font-bold px-2.5 py-1 rounded-full ' + (status.configured ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive')}>
            {status.configured ? (status.status === 'operational' ? 'Operational' : 'Error') : 'Not Configured'}
          </span>
        )}
      </div>

      {status === null && <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}

      {status && status.error && <p className="text-sm text-muted-foreground">Could not load email status. Admin access required.</p>}

      {status && !status.error && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Provider</div>
              <div className="font-semibold mt-0.5">{status.provider}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">API configuration</div>
              <div className={'font-semibold mt-0.5 ' + (status.configured ? 'text-emerald-600' : 'text-destructive')}>{status.configured ? 'Configured' : 'Not Configured'}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sender</div>
              <div className="font-semibold mt-0.5 break-all">{status.sender}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Last successful send</div>
              <div className="font-semibold mt-0.5">{status.lastSent ? new Date(status.lastSent.at).toLocaleString() : 'None yet'}</div>
            </div>
          </div>
          {status.lastError && (
            <div className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
              Last error ({new Date(status.lastError.at).toLocaleString()}): {status.lastError.message}
            </div>
          )}

          <div className="pt-2 border-t border-border space-y-2">
            <Label htmlFor="test-email">Send test email</Label>
            <div className="flex gap-2">
              <Input
                id="test-email"
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button className="h-10 font-semibold shrink-0" disabled={sending} onClick={sendTest}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" /> Send</>}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sends a real “Lemak Connect — Test Email” through Resend. The API key is never displayed or exposed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}