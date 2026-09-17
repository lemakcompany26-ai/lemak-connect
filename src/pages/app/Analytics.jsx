import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, CheckCircle2, Clock, ReceiptText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { formatNaira } from '@/lib/format';

export default function Analytics() {
  const [transactions, setTransactions] = useState(null);

  useEffect(() => {
    base44.entities.Transaction.list('-created_date', 200).then(setTransactions).catch(() => setTransactions([]));
  }, []);

  if (!transactions) return <div className="py-16 text-center text-sm text-muted-foreground">Loading your analytics…</div>;

  const successful = transactions.filter(t => t.status === 'successful');
  const pending = transactions.filter(t => ['pending', 'processing'].includes(t.status));
  const totalSpend = successful.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const byType = {};
  for (const t of successful) {
    byType[t.type] = { count: (byType[t.type] ? byType[t.type].count : 0) + 1, spend: (byType[t.type] ? byType[t.type].spend : 0) + (Number(t.amount) || 0) };
  }
  const typeRows = Object.entries(byType).sort((a, b) => b[1].spend - a[1].spend);
  const maxSpend = typeRows.length ? Math.max(...typeRows.map(([, v]) => v.spend)) : 0;

  const stats = [
    { label: 'Total Orders', value: transactions.length, icon: ReceiptText },
    { label: 'Completed', value: successful.length, icon: CheckCircle2 },
    { label: 'Pending', value: pending.length, icon: Clock },
    { label: 'Total Spend', value: formatNaira(totalSpend), icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><BarChart3 className="w-6 h-6 text-primary" /> Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Your real order activity on Lemak Connect.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><s.icon className="w-4 h-4" /></div>
              <div className="mt-3 text-2xl font-heading font-extrabold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-heading font-bold text-sm">Service Usage & Performance</h3>
          {typeRows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No completed orders yet — your usage will appear here.</p>}
          <div className="mt-4 space-y-3">
            {typeRows.map(([type, v]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold capitalize">{type.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">{v.count} order{v.count > 1 ? 's' : ''} · {formatNaira(v.spend)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full brand-gradient-soft rounded-full" style={{ width: (maxSpend ? (v.spend / maxSpend) * 100 : 0) + '%' }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}