import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Wifi, Zap, Tv, Trophy, LayoutGrid, Plus, ArrowRight, ReceiptText, Rocket, ShieldCheck, Headphones, ThumbsUp } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatNaira, formatDate, TRANSACTION_STATUS_STYLES } from '@/lib/format';
import PullToRefresh from '@/components/app/PullToRefresh';

const SERVICE_GRID = [
  { to: '/app/airtime', label: 'Airtime', icon: Smartphone, color: 'bg-[#00A3FF]' },
  { to: '/app/data', label: 'Data', icon: Wifi, color: 'bg-[#00CC66]' },
  { to: '/app/electricity', label: 'Electricity', icon: Zap, color: 'bg-[#FF9900]' },
  { to: '/app/cable', label: 'Cable TV', icon: Tv, color: 'bg-[#8B5CF6]' },
  { to: '/app/betting', label: 'Betting', icon: Trophy, color: 'bg-[#FF3366]' },
  { to: '/app/services', label: 'More', icon: LayoutGrid, color: 'bg-primary' }
];

const QUICK_SERVICES = [
  { to: '/app/airtime', label: 'Buy Airtime', desc: 'Top up your phone instantly', icon: Smartphone, color: 'bg-[#00A3FF]' },
  { to: '/app/data', label: 'Buy Data', desc: 'Stay connected on any network', icon: Wifi, color: 'bg-[#00CC66]' },
  { to: '/app/cable', label: 'Cable TV', desc: 'DStv, GOtv, Startimes & more', icon: Tv, color: 'bg-[#8B5CF6]' }
];

const TRUST = [
  { icon: ShieldCheck, label: 'Safe & Secure' },
  { icon: Zap, label: 'Fast & Reliable' },
  { icon: Headphones, label: '24/7 Support' },
  { icon: ThumbsUp, label: 'Affordable Rates' }
];

export default function Dashboard() {
  const { wallet } = useApp();
  const [transactions, setTransactions] = useState(null);

  const loadDashboard = () => {
    base44.entities.Transaction.list('-created_date', 5).then(setTransactions).catch(() => setTransactions([]));
  };

  useEffect(() => { loadDashboard(); }, []);

  return (
    <PullToRefresh onRefresh={loadDashboard}>
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Quick access to all your favourite services.</p>
      </div>

      {/* Wallet card */}
      <div className="rounded-3xl brand-gradient p-7 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 85% 20%, rgba(96,165,250,.6) 0%, transparent 40%)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider font-semibold text-white/60">Wallet Balance</div>
            <div className="mt-1.5 text-white text-3xl sm:text-4xl font-extrabold">{formatNaira(wallet ? wallet.balance : 0)}</div>
            <div className="mt-1 text-xs text-white/50">Currency: {wallet ? wallet.currency : 'NGN'}</div>
          </div>
          <Button asChild size="lg" className="h-12 px-6 bg-white text-primary hover:bg-blue-50 font-bold">
            <Link to="/app/wallet"><Plus className="w-4 h-4 mr-2" /> Fund Wallet</Link>
          </Button>
        </div>
      </div>

      {/* Service grid */}
      <div>
        <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Services</h2>
        <div className="mt-3 grid grid-cols-3 gap-4">
          {SERVICE_GRID.map(s => (
            <Link key={s.label} to={s.to} className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary/40 hover:shadow-md transition-all">
              <span className={'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ' + s.color}>
                <s.icon className="w-6 h-6 text-white" />
              </span>
              <span className="text-xs font-semibold">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Promo banner */}
      <Link to="/app/social-growth" className="block rounded-3xl bg-gradient-to-r from-primary to-[#00A3FF] p-5 relative overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Rocket className="w-6 h-6 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm">Grow Your Social Media</div>
            <div className="text-white/80 text-xs mt-0.5">More Likes. More Views. More Followers.</div>
          </div>
          <span className="text-white text-xs font-bold bg-white/15 rounded-full px-3.5 py-1.5 shrink-0 inline-flex items-center gap-1">Start Now <ArrowRight className="w-3 h-3" /></span>
        </div>
      </Link>

      {/* Quick services */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Services</h2>
          <Link to="/app/services" className="text-xs font-semibold text-primary inline-flex items-center gap-1">See All <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="mt-3 space-y-3">
          {QUICK_SERVICES.map(q => (
            <Link key={q.label} to={q.to} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all">
              <span className={'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ' + q.color}>
                <q.icon className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{q.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{q.desc}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2"><ReceiptText className="w-4 h-4 text-primary" /> Recent Transactions</h3>
          <Link to="/app/transactions" className="text-xs font-semibold text-primary inline-flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="space-y-2.5">
          {transactions === null && <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>}
          {transactions && transactions.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No transactions yet. Buy your first airtime!</div>}
          {transactions && transactions.map(t => (
            <div key={t.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Smartphone className="w-4 h-4 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold capitalize truncate">{t.type.replace('_', ' ')} · {t.recipient || '—'}</div>
                <div className="text-xs text-muted-foreground truncate">{t.transactionId} · {formatDate(t.created_date)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold">{formatNaira(t.amount)}</div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TRANSACTION_STATUS_STYLES[t.status] || ''}`}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TRUST.map(t => (
          <div key={t.label} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3">
            <t.icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
    </PullToRefresh>
  );
}