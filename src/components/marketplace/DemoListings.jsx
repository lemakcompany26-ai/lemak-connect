import { BadgeDollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';

// DEMO PLACEHOLDERS ONLY — these are UI layout samples, never real accounts
// for sale, and they are shown only while no real approved listings exist.
const DEMO_LISTINGS = [
  { key: 'fb', platform: 'Facebook', accountKind: 'Page', followers: '25,000 Followers', monetised: true, price: 150000 },
  { key: 'tk', platform: 'TikTok', accountKind: 'Account', followers: '80,000 Followers', monetised: false, price: 95000 },
  { key: 'ig', platform: 'Instagram', accountKind: 'Account', followers: '12,500 Followers', monetised: true, price: 75000 },
  { key: 'x', platform: 'X / Twitter', accountKind: 'Account', followers: '40,000 Followers', monetised: false, price: 60000 },
  { key: 'yt', platform: 'YouTube', accountKind: 'Channel', followers: '10,000 Subscribers', monetised: true, price: 200000 }
];

export default function DemoListings() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] text-amber-300 font-semibold text-center">
        DEMO PLACEHOLDERS — layout preview only, not real accounts for sale. Real approved listings appear here as sellers pass verification.
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90">
        {DEMO_LISTINGS.map(d => (
          <div key={d.key} className="relative rounded-2xl bg-mk-card border border-dashed border-mk-border p-5 flex flex-col">
            <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">DEMO</span>
            <div className="text-sm font-bold text-white">{d.platform} <span className="text-slate-400 font-medium">· {d.accountKind}</span></div>
            <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-mk-blue-soft">
              <Users className="w-4 h-4" /> {d.followers}
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500">{d.monetised ? 'Monetised' : 'Unmonetised'}</div>
            <div className="mt-3 border-t border-mk-border pt-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Price</div>
              <div className="text-lg font-extrabold text-mk-blue-soft">{formatNaira(d.price)}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 border-mk-border text-slate-500" disabled>View Details</Button>
              <Button className="h-11 bg-mk-blue/40 text-white/60" disabled>Buy Now</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}