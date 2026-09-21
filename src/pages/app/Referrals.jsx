import { useEffect, useState } from 'react';
import { Copy, Gift, History, Link2, Loader2, Share2, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { formatNaira, formatDate } from '@/lib/format';

export default function Referrals() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.functions.invoke('referrals', {})
      .then(response => setData(response.data || response))
      .catch(err => setError(err.message || 'Referral information is temporarily unavailable.'));
  }, []);

  const copy = async (value, message) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast({ title: message });
  };

  const share = async () => {
    if (!data?.link) return;
    if (navigator.share) {
      await navigator.share({ title: 'Join LEMAK Connect', text: 'Join me on LEMAK Connect and get a ₦100 welcome reward.', url: data.link });
    } else {
      await copy(data.link, 'Referral link copied');
    }
  };

  if (!data && !error) return <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Gift className="w-6 h-6 text-primary" /> Invite & Earn</h1>
        <p className="text-sm text-muted-foreground mt-1">Invite a friend. They receive a ₦100 welcome reward after registration.</p>
      </div>
      {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {data && <>
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Link2 className="w-4 h-4 text-primary" /> Your referral link</div>
          <div className="rounded-xl bg-muted px-3 py-3 text-xs break-all select-all">{data.link || 'Referral link is being generated.'}</div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => copy(data.link, 'Referral link copied')} disabled={!data.link}><Copy className="w-4 h-4 mr-2" /> Copy Link</Button>
            <Button className="h-11" onClick={share} disabled={!data.link}><Share2 className="w-4 h-4 mr-2" /> Share Link</Button>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="text-muted-foreground">Referral code</span>
            <button type="button" className="font-bold text-primary inline-flex items-center gap-1.5" onClick={() => copy(data.code, 'Referral code copied')}>{data.code || '—'} <Copy className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4"><Users className="w-4 h-4 text-primary mb-2" /><div className="text-xl font-extrabold">{data.totalReferrals}</div><div className="text-xs text-muted-foreground">Total referrals</div></div>
          <div className="rounded-2xl border border-border bg-card p-4"><Gift className="w-4 h-4 text-primary mb-2" /><div className="text-xl font-extrabold">{formatNaira(data.rewards)}</div><div className="text-xs text-muted-foreground">Referral rewards</div></div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-heading font-bold text-sm flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Referral history</h2>
          <div className="mt-4 space-y-3">
            {!data.history?.length && <p className="text-sm text-muted-foreground">No referrals yet.</p>}
            {data.history?.map(item => <div key={item.id} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{formatDate(item.date)}</span><span className="font-semibold">{item.reward ? formatNaira(item.reward) : 'Pending'} · {item.status}</span></div>)}
          </div>
        </div>
      </>}
    </div>
  );
}