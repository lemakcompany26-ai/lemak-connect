import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProfitSummary from '@/components/admin/profit/ProfitSummary';
import ProfitCalculatorForm from '@/components/admin/profit/ProfitCalculatorForm';
import RealTransactionProfit from '@/components/admin/profit/RealTransactionProfit';

// Admin-only profit calculator & analytics. Access is enforced server-side:
// the backend rejects anyone who is not admin / super_admin.
export default function AdminProfitCalculator() {
  const [summary, setSummary] = useState(null);
  const [rules, setRules] = useState([]);
  const [txs, setTxs] = useState(null);

  const loadSummary = useCallback(() => {
    setSummary(prev => prev === null ? null : prev); // keep stale while refreshing
    base44.functions.invoke('adminProfit', { action: 'summary' })
      .then(res => setSummary((res.data || res).summary || null))
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    loadSummary();
    base44.functions.invoke('adminProfit', { action: 'rules' })
      .then(res => setRules((res.data || res).rules || []))
      .catch(() => setRules([]));
    base44.functions.invoke('adminProfit', { action: 'transactions' })
      .then(res => setTxs((res.data || res).transactions || []))
      .catch(() => setTxs([]));
  }, [loadSummary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Profit Calculator & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulate margins with live pricing rules, and track real profit from completed transactions. Admin and super admin only.
        </p>
      </div>

      <ProfitSummary summary={summary} loading={summary === null} onRefresh={loadSummary} />
      <ProfitCalculatorForm rules={rules} />
      {txs === null ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <RealTransactionProfit transactions={txs} />
      )}
    </div>
  );
}