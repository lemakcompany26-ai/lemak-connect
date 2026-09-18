import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarClock, Loader2, MessageSquare, Phone, Timer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';

const STATUS_LABELS = {
  active: 'Waiting for verification message…',
  completed: 'Message received',
  cancelled: 'Cancelled',
  expired: 'Expired — refunded',
  refunded: 'Refunded'
};

// Private virtual number order screen: assigned number, countdown, live
// status and incoming verification messages. No provider details are ever
// shown — those live behind the unified Virtual Numbers backend.
export default function VirtualNumberOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh } = useApp();
  const [order, setOrder] = useState(null); // null loading | false not found
  const [messages, setMessages] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(() => {
    base44.functions.invoke('virtualNumbers', { action: 'vn_order', orderId })
      .then(res => {
        const d = res.data || res;
        setOrder(d.order || false);
        setMessages(d.messages || []);
      })
      .catch(() => setOrder(false));
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  // Live countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll for the verification message while the order is active
  useEffect(() => {
    if (!order || order.status !== 'active') return;
    const t = setInterval(async () => {
      try {
        const res = await base44.functions.invoke('virtualNumbers', { action: 'provider_check', rentalId: order.id });
        const d = res.data || res;
        if (d && (d.otp || (d.status && d.status !== 'waiting' && d.status !== 'active'))) {
          if (d.otp) toast({ title: 'New verification message received 🔑' });
          refresh();
          load();
        }
      } catch (e) { /* keep waiting */ }
    }, 15000);
    return () => clearInterval(t);
  }, [order, load, refresh, toast]);

  const remaining = order && order.expiresAt ? Math.max(0, new Date(order.expiresAt).getTime() - now) : 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  const isActive = order && order.status === 'active';
  const isRent = order && order.product === 'rent';
  const canCancel = isActive && !order.otpReceived && !isRent;
  const statusLabel = isRent && isActive
    ? `Active — yours for ${order.duration || '1'} month${(order.duration || '1') !== '1' ? 's' : ''}`
    : (STATUS_LABELS[order.status] || order.status);
  const expiryDate = order && order.expiresAt
    ? new Date(order.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const cancelRequest = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke('virtualNumbers', { action: 'provider_cancel', rentalId: order.id });
      toast({ title: 'Request cancelled', description: 'Your refund has been processed to your wallet.' });
      setConfirmCancel(false);
      refresh();
      load();
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Cannot cancel', description: (d && d.error) || e.message, variant: 'destructive' });
      setConfirmCancel(false);
    } finally {
      setBusy(false);
    }
  };

  if (order === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (order === false) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">We couldn't find this order. It may belong to another account.</p>
        <Button variant="outline" onClick={() => navigate('/app/virtual-numbers')}>Back to Virtual Numbers</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/app/virtual-numbers')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Virtual Numbers
      </button>

      {/* Order card */}
      <div className="rounded-3xl border border-mk-border bg-mk-bg p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-extrabold text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-mk-blue" /> Virtual Number Order
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">{order.rentalRef}</p>
          </div>
          {isActive && !isRent && (
            <div className={'shrink-0 rounded-xl border px-3 py-2 text-center ' + (remaining > 0 ? 'border-mk-blue/40 bg-mk-blue/10' : 'border-destructive/40 bg-destructive/10')}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                <Timer className="w-3 h-3 text-mk-blue" /> Time remaining
              </div>
              <div className="text-lg font-extrabold text-white font-mono tabular-nums">{mm}:{ss}</div>
            </div>
          )}
          {isActive && isRent && (
            <div className="shrink-0 rounded-xl border border-mk-blue/40 bg-mk-blue/10 px-3 py-2 text-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                <CalendarClock className="w-3 h-3 text-mk-blue" /> Rented until
              </div>
              <div className="text-sm font-extrabold text-white mt-0.5">{expiryDate}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-mk-card border border-mk-border px-3.5 py-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Service</div>
            <div className="text-sm font-bold text-white mt-1 capitalize truncate">{order.service}</div>
          </div>
          <div className="rounded-xl bg-mk-card border border-mk-border px-3.5 py-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Country</div>
            <div className="text-sm font-bold text-white mt-1 truncate">{order.country || '—'}</div>
          </div>
          <div className="rounded-xl bg-mk-card border border-mk-border px-3.5 py-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Amount paid</div>
            <div className="text-sm font-bold text-white mt-1">{formatNaira(order.amount)}</div>
          </div>
          <div className="rounded-xl bg-mk-card border border-mk-border px-3.5 py-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</div>
            <div className={'text-sm font-bold mt-1 ' + (order.status === 'completed' ? 'text-emerald-400' : order.status === 'active' ? 'text-mk-blue' : 'text-slate-300')}>
              {statusLabel}
            </div>
          </div>
        </div>

        {/* The assigned number / email address */}
        {order.handle && (
          <div className="rounded-2xl border border-mk-blue/40 bg-mk-blue/10 p-4 text-center">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">
              {order.product === 'email' ? 'Your temporary email address' : isRent ? 'Your rented number' : 'Your number'}
            </div>
            <div className="text-xl font-extrabold text-white font-mono mt-1 break-all">{order.handle}</div>
          </div>
        )}

        {/* Cancel & refund */}
        {isActive && isRent && (
          <p className="text-[11px] text-slate-500 text-center">
            Long-term rentals cannot be cancelled once purchased.
          </p>
        )}
        {isActive && !isRent && (
          confirmCancel ? (
            <div className="rounded-2xl border border-mk-border bg-mk-card p-4 space-y-3">
              <p className="text-sm text-slate-200">
                Cancel this number request and receive a refund if the request is eligible?
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="h-10 flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold" disabled={busy} onClick={cancelRequest}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4 mr-1" /> Cancel Request</>}
                </Button>
                <Button size="sm" variant="outline" className="h-10 flex-1 border-mk-border text-slate-200 font-bold" disabled={busy} onClick={() => setConfirmCancel(false)}>
                  Keep Number
                </Button>
              </div>
            </div>
          ) : canCancel ? (
            <Button variant="outline" className="w-full h-11 border-mk-border text-slate-300 hover:text-white font-semibold" onClick={() => setConfirmCancel(true)}>
              <Ban className="w-4 h-4 mr-1.5" /> Cancel & Refund
            </Button>
          ) : (
            <p className="text-[11px] text-slate-500 text-center">
              This request has already received a verification message and may no longer be eligible for cancellation.
            </p>
          )
        )}

        {order.refundStatus === 'REFUNDED' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            Refunded: {formatNaira(order.refundAmount || order.amount)} credited back to your wallet.
          </div>
        )}
      </div>

      {/* Private message feed */}
      <div className="rounded-3xl border border-mk-border bg-mk-bg p-5 sm:p-6 space-y-4">
        <h2 className="font-heading text-sm font-extrabold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-mk-blue" /> Verification messages
        </h2>
        {messages.length === 0 && (
          <p className="text-xs text-slate-500">No messages yet.</p>
        )}
        <div className="space-y-2.5">
          {messages.map(m => (
            <div key={m.id} className={'rounded-xl px-3.5 py-3 border ' + (m.isOtp ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-mk-border bg-mk-card')}>
              {m.isOtp ? (
                <>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">New verification message received</div>
                  <div className="text-lg font-extrabold text-white font-mono mt-1 tracking-widest break-all">{m.content}</div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{m.senderName || 'Lemak Connect'}</div>
                  <div className="text-xs text-slate-200 mt-1 break-words">{m.content}</div>
                </>
              )}
            </div>
          ))}
        </div>
        {isActive && !order.otpReceived && (
          isRent
            ? <p className="text-[11px] text-mk-blue-soft">Your rented number is live — every SMS it receives appears below automatically.</p>
            : <p className="text-[11px] text-slate-500 animate-pulse">Waiting for verification message…</p>
        )}
      </div>
    </div>
  );
}