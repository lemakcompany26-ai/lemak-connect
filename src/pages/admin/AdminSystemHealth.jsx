import { useEffect, useState } from 'react';
import { Activity, Loader2, CheckCircle2, XCircle, MinusCircle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

const STATUS_UI = {
  operational: { icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Operational' },
  not_configured: { icon: MinusCircle, cls: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Not Configured' },
  error: { icon: XCircle, cls: 'text-red-600 bg-red-50 border-red-200', label: 'Error' },
  degraded: { icon: XCircle, cls: 'text-red-600 bg-red-50 border-red-200', label: 'Degraded' }
};

export default function AdminSystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const check = async () => {
    setLoading(true); setError('');
    try {
      const res = await base44.functions.invoke('adminSystemHealth', {});
      setData(res.data || res);
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.error) || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Activity className="w-6 h-6 text-primary" /> System Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `Last checked ${formatDate(data.checkedAt)}` : 'Provider and infrastructure status. Secret values are never shown.'}
          </p>
        </div>
        <Button variant="outline" className="h-10 font-semibold" onClick={check} disabled={loading}>
          <RefreshCw className={'w-4 h-4 mr-1.5 ' + (loading ? 'animate-spin' : '')} /> Refresh
        </Button>
      </div>

      {error && <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
      {loading && !data && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {data && Object.entries(data.providers).map(([key, p]) => {
          const ui = STATUS_UI[p.status] || STATUS_UI.not_configured;
          return (
            <div key={key} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Activity className="w-5 h-5" /></div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${ui.cls}`}>
                  <ui.icon className="w-3.5 h-3.5" /> {ui.label}
                </span>
              </div>
              <h3 className="mt-3 font-heading font-bold text-sm">{p.label}</h3>
              {p.detail && <p className="mt-1 text-xs text-muted-foreground">{p.detail}</p>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        This page is admin-only. Customers never see technical diagnostics — only the services they use.
      </div>
    </div>
  );
}