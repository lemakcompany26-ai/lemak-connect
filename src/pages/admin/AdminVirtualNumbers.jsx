import { useEffect, useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatNaira, formatDate } from '@/lib/format';

// Admin-only virtual numbers dashboard. Admins can see internal provider
// details (provider, server, request id, cost, markup) — customers never can.
export default function AdminVirtualNumbers() {
  const [data, setData] = useState(null);

  useEffect(() => {
    base44.functions.invoke('virtualNumbers', { action: 'vn_admin_stats' })
      .then(res => setData(res.data || res))
      .catch(() => setData({ error: true }));
  }, []);

  if (data === null) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }
  if (data.error) {
    return <p className="text-sm text-muted-foreground">Could not load virtual number stats. Do you have admin access?</p>;
  }

  const { stats, orders } = data;
  const cards = [
    ['Total orders', stats.total],
    ['Active numbers', stats.active],
    ['Waiting for OTP', stats.waiting],
    ['Completed', stats.completed],
    ['Expired', stats.expired],
    ['Cancelled', stats.cancelled],
    ['Refunded', stats.refunded],
    ['Revenue', formatNaira(stats.revenue)],
    ['Provider cost', formatNaira(stats.providerCost)],
    ['Profit (markup)', formatNaira(stats.profit)]
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5">
          <Phone className="w-6 h-6 text-primary" /> Virtual Numbers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Live OTP number and email orders across all providers.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-lg font-extrabold mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-bold text-sm">Recent live orders</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Internal view — provider details visible to admins only.</p>
        </div>
        {(!orders || orders.length === 0) ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No live virtual number orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Reference</th>
                  <th className="px-4 py-2.5 font-semibold">Service</th>
                  <th className="px-4 py-2.5 font-semibold">Country</th>
                  <th className="px-4 py-2.5 font-semibold">Provider</th>
                  <th className="px-4 py-2.5 font-semibold">Server</th>
                  <th className="px-4 py-2.5 font-semibold">Request ID</th>
                  <th className="px-4 py-2.5 font-semibold">Customer price</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-border/60">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-2.5 font-mono">{o.rentalRef}</td>
                    <td className="px-4 py-2.5 capitalize">{o.service}</td>
                    <td className="px-4 py-2.5">{o.country || '—'}</td>
                    <td className="px-4 py-2.5 capitalize">{o.provider}</td>
                    <td className="px-4 py-2.5 uppercase">{o.serverId}</td>
                    <td className="px-4 py-2.5 font-mono max-w-32 truncate" title={o.providerOrderId}>{o.providerOrderId || '—'}</td>
                    <td className="px-4 py-2.5 font-semibold">{formatNaira(o.customerPrice)}</td>
                    <td className="px-4 py-2.5">
                      <span className={'font-semibold capitalize ' + (o.status === 'completed' ? 'text-emerald-600' : o.status === 'active' ? 'text-blue-600' : 'text-muted-foreground')}>
                        {o.status}{o.otpReceived ? ' · OTP' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}