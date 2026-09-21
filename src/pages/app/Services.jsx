import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Smartphone, Wifi, Zap, Tv, Trophy, GraduationCap, Ticket, Globe, ShieldCheck, MessageCircle, Mail, Timer, CalendarClock, Rocket, Store } from 'lucide-react';

const EVERYDAY = [
  { name: 'Airtime', to: '/app/airtime', icon: Smartphone, color: 'bg-[#00A3FF]' },
  { name: 'Data', to: '/app/data', icon: Wifi, color: 'bg-[#00CC66]' },
  { name: 'Electricity', to: '/app/electricity', icon: Zap, color: 'bg-[#FF9900]' },
  { name: 'Cable TV', to: '/app/cable', icon: Tv, color: 'bg-[#8B5CF6]' },
  { name: 'Betting', to: '/app/betting', icon: Trophy, color: 'bg-[#FF3366]' },
  { name: 'Education', to: '/app/education', icon: GraduationCap, color: 'bg-[#00A3FF]' },
  { name: 'ePIN', to: '/app/epin', icon: Ticket, color: 'bg-[#F59E0B]' },
  { name: 'Broadband', to: '/app/broadband', icon: Globe, color: 'bg-[#00CC66]' }
];

const VNUM = [
  { name: 'OTP Verification', desc: 'Receive OTP instantly', to: '/app/virtual-numbers', icon: ShieldCheck, color: 'bg-[#0066FF]' },
  { name: 'Social Media OTP', desc: 'Get codes for social platforms', to: '/app/virtual-numbers', icon: MessageCircle, color: 'bg-[#00A3FF]' },
  { name: 'Email Verification', desc: 'Verify your email address', to: '/app/virtual-numbers', icon: Mail, color: 'bg-[#FF3366]' },
  { name: 'Temporary Numbers', desc: 'Use for a short period', to: '/app/virtual-numbers', icon: Timer, color: 'bg-[#F59E0B]' },
  { name: 'Virtual Number Rental', desc: 'Rent a number long-term', to: '/app/virtual-numbers', icon: CalendarClock, color: 'bg-[#00CC66]' }
];

const GROWTH = [
  { name: 'TikTok', to: '/app/social-growth', icon: Rocket, color: 'bg-[#FF3366]' },
  { name: 'Instagram', to: '/app/social-growth', icon: Rocket, color: 'bg-[#8B5CF6]' },
  { name: 'Facebook', to: '/app/social-growth', icon: Rocket, color: 'bg-[#00A3FF]' },
  { name: 'YouTube', to: '/app/social-growth', icon: Rocket, color: 'bg-[#FF3366]' }
];

function ServiceTile({ item, q }) {
  const hidden = q && !item.name.toLowerCase().includes(q) && !(item.desc || '').toLowerCase().includes(q);
  if (hidden) return null;
  return (
    <Link to={item.to} className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary/40 hover:shadow-md transition-all">
      <span className={'relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ' + item.color}>
        <item.icon className="w-6 h-6 text-white" />
        {item.soon && <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-1.5 py-0.5">SOON</span>}
      </span>
      <span className="text-xs font-semibold leading-tight">{item.name}</span>
      {item.desc && <span className="text-[10px] text-muted-foreground leading-tight">{item.desc}</span>}
    </Link>
  );
}

export default function Services() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const match = (arr) => arr.filter(s => !query || s.name.toLowerCase().includes(query) || (s.desc || '').toLowerCase().includes(query));
  const everyday = match(EVERYDAY);
  const vnum = match(VNUM);
  const growth = match(GROWTH);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">All Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you can buy with your Lemak wallet.</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={e => setQ(e.target.value.slice(0, 40))}
          placeholder="Search for a service…"
          className="w-full h-12 rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {everyday.length > 0 && (
        <section>
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Everyday Services</h2>
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-4">
            {everyday.map(s => <ServiceTile key={s.name} item={s} />)}
          </div>
        </section>
      )}

      {vnum.length > 0 && (
        <section>
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Virtual Numbers &amp; OTP</h2>
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-4">
            {vnum.map(s => <ServiceTile key={s.name} item={s} />)}
          </div>
        </section>
      )}

      {growth.length > 0 && (
        <section>
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Digital Growth</h2>
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-4">
            {growth.map(s => <ServiceTile key={s.name} item={s} />)}
            <Link to="/app/social-growth" className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary/40 hover:shadow-md transition-all">
              <span className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-sm"><Store className="w-6 h-6 text-white" /></span>
              <span className="text-xs font-semibold">More</span>
            </Link>
          </div>
        </section>
      )}

      {everyday.length === 0 && vnum.length === 0 && growth.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">No services match "{q}". Try another search.</div>
      )}

      <div className="rounded-2xl bg-primary px-5 py-4 text-center">
        <span className="text-white text-sm font-bold">Fast • Secure • Reliable</span>
        <span className="text-white/70 text-xs block mt-0.5">Lemak Connect — your trusted digital services partner.</span>
      </div>
    </div>
  );
}