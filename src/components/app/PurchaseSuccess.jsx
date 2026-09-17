import { CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Shared purchase success screen with the transaction reference.
export default function PurchaseSuccess({ title, subtitle, transaction, onReset, resetLabel = 'Buy again', children }) {
  return (
    <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <h1 className="mt-5 font-heading text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      {children}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Transaction Reference</div>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <span className="font-mono font-bold text-primary">{transaction.transactionId}</span>
          <button onClick={() => navigator.clipboard.writeText(transaction.transactionId)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Copy reference">
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button className="flex-1 h-12 font-semibold" onClick={onReset}>{resetLabel}</Button>
        <Button variant="outline" className="flex-1 h-12 font-semibold" asChild><a href="/app/transactions">View receipt</a></Button>
      </div>
    </div>
  );
}