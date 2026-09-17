import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Wifi, Lightbulb, Tv, Store, Plus, ArrowRight, ReceiptText, Bell } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatNaira, formatDate, TRANSACTION_STATUS_STYLES } from '@/lib/format';

const QUICK_ACTIONS = [
  { to: '/app/airtime', label: 'Airtime', icon: Smartphone },
  { to: '/app/data', label: 'Data', icon: Wifi },
  { to: '/app/electricity', label: 'Electricity', icon: Lightbulb, soon: true },
  { to: '/app/cable', label: 'Cable TV', icon: Tv, soon: true },
  { to: '/app/social-growth', label: 'Social Growth', icon: Store, soon: false },
  { to: '/app/marketplace', label: 'Marketplace', icon: Store }
];

export default function Dashboard() {
  const { profile, wallet } = useApp();
  const [transactions, setTransactions] = useState(null);
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    base44.entities.Transaction.list('-created_date', 5).then(setTransactions).catch(() => setTransactions([]));
    base44.entities.Notification.list('-created_date', 5).then(setNotifications).catch(() => setNotifications([]));
  }, []);

  const firstName = profile && profile.fullName ? profile.fullName.split(' ')[0] : 'there';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Welcome back, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your account.</p>
      </div>

      <div className="rounded-3xl brand-gradient p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 85% 20%, rgba(96,165,250,.6) 0%, transparent 40%)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider font-semibold text-white/60">Wallet Balance</div>
            <div className="mt-1 text-white text-3xl sm:text-4xl font-extrabold">{formatNaira(wallet ? wallet.balance : 0)}</div>
          </div>
          <Button asChild size="lg" className="h-12 px-6 bg-white text-secondary hover:bg-blue-50 font-semibold">
            <Link to="/app/wallet"><Plus className="w-4 h-4 mr-2" /> Fund Wallet</Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(a => {
            const cls = 'flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary/40 hover:shadow-md transition-all' + (a.soon ? ' opacity-50' : '');
            return a.soon
              ? <div key={a.label} className={cls} title="Launching soon"><a.icon className="w-5 h-5 text-primary" /><span className="text-xs font-medium">{a.label}</span></div>
              : <Link key={a.label} to={a.to} className={cls}><a.icon className="w-5 h-5 text-primary" /><span className="text-xs font-medium">{a.label}</span></Link>;
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
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
                    <div className="text-xs text-muted-foreground">{formatDate(t.created_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatNaira(t.amount)}</div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TRANSACTION_STATUS_STYLES[t.status] || ''}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Notifications</h3>
              <Link to="/app/notifications" className="text-xs font-semibold text-primary inline-flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="space-y-2.5">
              {notifications === null && <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>}
              {notifications && notifications.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</div>}
              {notifications && notifications.map(n => (
                <div key={n.id} className={'rounded-xl border p-3 ' + (n.isRead ? 'border-border bg-card' : 'border-primary/20 bg-primary/5')}>
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}