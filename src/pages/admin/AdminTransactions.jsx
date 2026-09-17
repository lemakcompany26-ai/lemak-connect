import { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNaira, formatDate, TRANSACTION_STATUS_STYLES } from '@/lib/format';

const FILTERS = ['all', 'successful', 'pending', 'failed', 'refunded'];

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.Transaction.list('-created_date', 200).then(setTransactions).catch(() => setTransactions([]));
  }, []);

  const filtered = (transactions || []).filter(t => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'pending' ? ['pending', 'processing'].includes(t.status) :
      t.status === filter;
    const s = search.toLowerCase();
    const matchesSearch = !s || (t.transactionId + ' ' + (t.recipient || '') + ' ' + (t.service || '') + ' ' + t.userId).toLowerCase().includes(s);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide transaction log.</p>
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reference, phone, service…" className="pl-10" />
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>{FILTERS.map(f => <TabsTrigger key={f} value={f} className="capitalize text-xs">{f}</TabsTrigger>)}</TabsList>
      </Tabs>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {transactions === null && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {transactions !== null && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="text-left font-semibold px-4 py-3">Reference</th>
                  <th className="text-left font-semibold px-4 py-3">Service</th>
                  <th className="text-left font-semibold px-4 py-3">Recipient</th>
                  <th className="text-left font-semibold px-4 py-3">Amount</th>
                  <th className="text-left font-semibold px-4 py-3">Fee</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{t.transactionId}</td>
                    <td className="px-4 py-3 capitalize">{(t.service || t.type || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3">{t.recipient || '—'}</td>
                    <td className="px-4 py-3 font-bold">{formatNaira(t.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatNaira(t.fee || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TRANSACTION_STATUS_STYLES[t.status] || ''}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(t.created_date)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="7" className="px-4 py-10 text-center text-muted-foreground text-sm">No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}