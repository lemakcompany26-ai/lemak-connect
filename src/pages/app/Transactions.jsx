import { useEffect, useState } from 'react';
import { Copy, ReceiptText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatNaira, formatDate, TRANSACTION_STATUS_STYLES } from '@/lib/format';

const FILTERS = ['all', 'successful', 'pending', 'failed'];

export default function Transactions() {
  const [transactions, setTransactions] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Transaction.list('-created_date', 100).then(setTransactions).catch(() => setTransactions([]));
  }, []);

  const filtered = (transactions || []).filter(t => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'processing'].includes(t.status);
    if (filter === 'failed') return ['failed', 'refunded', 'reversed'].includes(t.status);
    return t.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><ReceiptText className="w-6 h-6 text-primary" /> Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">Every naira, accounted for.</p>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="sm:ml-auto">
          <TabsList>
            {FILTERS.map(f => <TabsTrigger key={f} value={f} className="capitalize text-xs">{f}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2.5">
        {transactions === null && <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}
        {transactions && filtered.length === 0 && (
          <div className="py-16 text-center">
            <ReceiptText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">No {filter === 'all' ? '' : filter + ' '}transactions yet.</p>
          </div>
        )}
        {transactions && filtered.map(t => (
          <button key={t.id} onClick={() => setSelected(t)} className="w-full text-left flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ReceiptText className="w-4.5 h-4.5 w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold capitalize">{(t.service || t.type || '').replace('_', ' ')}</div>
              <div className="text-xs text-muted-foreground truncate">{t.recipient || '—'} · {formatDate(t.created_date)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold">{formatNaira(t.amount)}</div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TRANSACTION_STATUS_STYLES[t.status] || ''}`}>{t.status}</span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              Receipt
              {selected && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TRANSACTION_STATUS_STYLES[selected.status] || ''}`}>{selected.status}</span>}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Transaction Reference</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-sm">{selected.transactionId}</span>
                  <button onClick={() => navigator.clipboard.writeText(selected.transactionId)} className="p-1 rounded hover:bg-muted" aria-label="Copy">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  ['Service', (selected.service || selected.type || '').replace('_', ' ')],
                  ['Recipient', selected.recipient || '—'],
                  ['Amount', formatNaira(selected.amount)],
                  ['Fee', formatNaira(selected.fee || 0)],
                  ['Provider Reference', selected.providerReference || '—'],
                  ['Date', formatDate(selected.created_date)]
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold text-right">{v}</span>
                  </div>
                ))}
                {selected.failureReason && (
                  <div className="rounded-lg bg-destructive/10 text-destructive text-xs p-3">{selected.failureReason}</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}