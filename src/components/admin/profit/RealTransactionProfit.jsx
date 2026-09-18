import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AdminTable from '@/components/admin/marketplace/AdminTable';
import { formatNaira, formatDate } from '@/lib/format';

// Real transaction profit, computed by the backend from authoritative
// transaction records — never from frontend-submitted values.
export default function RealTransactionProfit({ transactions }) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const all = transactions || [];
    return q
      ? all.filter(t => [t.transactionId, t.service, t.provider, t.status].some(v => String(v || '').toLowerCase().includes(q)))
      : all;
  }, [transactions, q]);

  const profitCls = v => 'font-bold ' + ((v || 0) >= 0 ? 'text-emerald-600' : 'text-red-600');

  const columns = [
    {
      label: 'Transaction',
      cell: t => (
        <div className="min-w-[180px]">
          <div className="text-[11px] font-mono text-muted-foreground">{t.transactionId}</div>
          <div className="text-sm font-semibold capitalize">{t.service}</div>
        </div>
      )
    },
    { label: 'Date', cell: t => <span className="text-xs whitespace-nowrap">{formatDate(t.date)}</span> },
    { label: 'Customer Paid', cell: t => <span className="font-bold whitespace-nowrap">{formatNaira(t.customerPaid)}</span> },
    { label: 'Provider Cost', cell: t => <span className="whitespace-nowrap">{formatNaira(t.providerCost)}</span> },
    {
      label: 'Refund',
      cell: t => t.refund > 0
        ? <span className="text-red-600 font-semibold whitespace-nowrap">{formatNaira(t.refund)}</span>
        : <span className="text-muted-foreground">—</span>
    },
    { label: 'Gross Profit', cell: t => <span className={profitCls(t.grossProfit) + ' whitespace-nowrap'}>{formatNaira(t.grossProfit)}</span> },
    { label: 'Net Profit', cell: t => <span className={profitCls(t.netProfit) + ' whitespace-nowrap'}>{formatNaira(t.netProfit)}</span> },
    { label: 'Status', cell: t => <span className="text-[11px] font-bold uppercase tracking-wide">{t.status}</span> }
  ];

  const renderCard = t => (
    <div className="flex flex-col gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground">{t.transactionId}</span>
          <span className="text-sm font-semibold capitalize">{t.service}</span>
          <span className="text-[11px] font-bold uppercase">{t.status}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDate(t.date)} · Paid {formatNaira(t.customerPaid)} · Cost {formatNaira(t.providerCost)}
        </div>
        <div className="text-xs mt-0.5">
          Gross <span className={profitCls(t.grossProfit)}>{formatNaira(t.grossProfit)}</span>
          {' '}· Net <span className={profitCls(t.netProfit)}>{formatNaira(t.netProfit)}</span>
          {t.refund > 0 && <> · Refund <span className="text-red-600 font-semibold">{formatNaira(t.refund)}</span></>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold">Real Transaction Profit</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Actual profit from completed backend transaction records — authoritative, never frontend-submitted.
        </p>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          placeholder="Search transaction ID, service or status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <AdminTable
        columns={columns}
        rows={rows}
        renderCard={renderCard}
        empty={<div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No transactions yet.</div>}
      />
    </div>
  );
}