import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ReceiptText, TrendingUp, Wallet, Store, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { formatNaira, formatDate, TRANSACTION_STATUS_STYLES } from '@/lib/format';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.functions.invoke('adminOverview', {}).then(res => setData(res.data || res)).catch(err => {
      setError((err.response && err.response.data && err.response.data.error) || err.message);
    });
  }, []);

  if (error) return <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>;
  if (!data) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const t = data.totals;
  const stats = [
    { label: 'Total Users', value: t.users, sub: `${t.customers} customers · ${t.staff} staff`, icon: Users },
    { label: 'Transactions', value: t.transactions, sub: `${t.successful} successful · ${t.pending} pending`, icon: ReceiptText },
    { label: 'Total Revenue', value: formatNaira(t.revenue), sub: `${formatNaira(t.fees)} in fees`, icon: TrendingUp },
    { label: 'Wallet Funding', value: formatNaira(t.walletFunded), sub: 'successful card payments', icon: Wallet },
    { label: 'Sellers', value: t.approvedSellers, sub: `${t.pendingSellers} pending review`, icon: Store }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><s.icon className="w-4 h-4" /></div>
              <div className="mt-3 text-xl font-heading font-extrabold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              <div className="text-[11px] text-muted-foreground/70 mt-1">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm">Recent Transactions</h3>
              <Link to="/admin/transactions" className="text-xs font-semibold text-primary">View all</Link>
            </div>
            <div className="space-y-2.5">
              {data.recentTransactions.length === 0 && <p className="text-sm text-muted-foreground py-4">No transactions yet.</p>}
              {data.recentTransactions.map(tx => (
                <div key={tx.transactionId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold truncate capitalize">{tx.type.replace('_', ' ')} · {tx.recipient || '—'}</div>
                    <div className="text-xs text-muted-foreground">{tx.transactionId} · {formatDate(tx.created_date)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{formatNaira(tx.amount)}</div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TRANSACTION_STATUS_STYLES[tx.status] || ''}`}>{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm">Newest Users</h3>
              <Link to="/admin/users" className="text-xs font-semibold text-primary">Manage users</Link>
            </div>
            <div className="space-y-2.5">
              {data.recentUsers.length === 0 && <p className="text-sm text-muted-foreground py-4">No users yet.</p>}
              {data.recentUsers.map(u => (
                <div key={u.email + u.created_date} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{u.fullName} <span className="text-muted-foreground font-normal">@{u.username}</span></div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <span className={'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ' +
                    (u.accountStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                    {u.accountStatus}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}