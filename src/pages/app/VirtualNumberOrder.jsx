import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarClock, Check, Copy, Loader2, Timer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';
import TypingIndicator from '@/components/chat/TypingIndicator';
import OtpChatFeed from '@/components/vnum/OtpChatFeed';

const STATUS_LABELS = {
  active: 'Waiting for verification message…',
  completed: 'Message received',
  cancelled: 'Cancelled',
  expired: 'Expired',
  refunded: 'Refunded'
};

const COUNTRY_FLAGS = {
  'United States': '🇺🇸', 'Nigeria': '🇳🇬', 'United Kingdom': '🇬🇧', 'Canada': '🇨🇦',
  'Germany': '🇩🇪', 'France': '🇫🇷', 'India': '🇮🇳', 'South Africa': '🇿🇦',
  'Ghana': '🇬🇭', 'Kenya': '🇰🇪'
};

// Full-screen yellow OTP chat: the assigned number, a live countdown, and
// verification messages as chat bubbles with one-tap copy. No provider or
// server information is ever displayed — only Lemak Connect.
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
  const [copied, setCopied] = useState(false);

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
  const isEmail = order && order.product === 'email';
  const canCancel = isActive && !order.otpReceived && !isRent;
  const statusLabel = isRent && isActive
    ? `Active — yours for ${order.duration || '1'} month${(order.duration || '1') !== '1' ? 's' : ''}`
    : (STATUS_LABELS[order.status] || order.status);
  const expiryDate = order && order.expiresAt
    ? new Date(order.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const serviceLabel = order ? String(order.service || '').replace(/\s*\(.*\)\s*$/, '') : '';

  const copyHandle = () => {
    if (!order.handle) return;
    if (navigator.clipboard) navigator.clipboard.writeText(order.handle).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

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
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (order === false) {
    return (
      <div className="rounded-3xl border border-mk-border bg-mk-card2 p-8 text-center space-y-3">
        <p className="text-sm text-slate-400">We couldn't find this order. It may belong to another account.</p>
        <Button variant="outline" className="border-mk-border text-slate-200" onClick={() => navigate('/app/virtual-numbers')}>
          Back to Virtual Numbers
        </Button>
      </div>
    );
  }

  const emptyHint = isActive
    ? (isRent
        ? 'Your rented number is live — every SMS it receives appears here automatically.'
        : isEmail
          ? 'Waiting for your verification email… it will appear here automatically.'
          : 'Waiting for your verification message… it will appear here automatically.')
    : 'This order has ended.';

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/app/virtual-numbers')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Virtual Numbers
      </button>

      {/* Full-screen yellow OTP chat card */}
      <div className="flex flex-col h-[calc(100dvh-13rem)] min-h-[480px] rounded-3xl overflow-hidden border border-mk-border bg-mk-bg">
        {/* Yellow header */}
        <div className="bg-amber-400 px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-extrabold text-slate-900 truncate capitalize">{serviceLabel}</h1>
              <p className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">{order.rentalRef}</p>
            </div>
            {isActive && !isRent && (
              <div className="shrink-0 rounded-xl bg-slate-900/90 px-3 py-1.5 text-center">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400 uppercase tracking-wide">
                  <Timer className="w-3 h-3" /> Time left
                </div>
                <div className="text-sm font-extrabold text-white font-mono tabular-nums">{mm}:{ss}</div>
              </div>
            )}
            {isActive && isRent && (
              <div className="shrink-0 rounded-xl bg-slate-900/90 px-3 py-1.5 text-center">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400 uppercase tracking-wide">
                  <CalendarClock className="w-3 h-3" /> Rented until
                </div>
                <div className="text-xs font-extrabold text-white mt-0.5">{expiryDate}</div>
              </div>
            )}
          </div>
          <div className="mt-2.5 flex items-center gap-3 text-[11px] font-bold text-slate-800">
            {order.country && (
              <span className="inline-flex items-center gap-1 truncate">
                <span aria-hidden>{COUNTRY_FLAGS[order.country] || '🌐'}</span> {order.country}
              </span>
            )}
            <span className="ml-auto shrink-0">Paid {formatNaira(order.amount)}</span>
          </div>
        </div>

        {/* The assigned number / email address */}
        {order.handle && (
          <div className="bg-mk-card border-b border-mk-border px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {isEmail ? 'Your temporary email address' : isRent ? 'Your rented number' : 'Your number'}
              </div>
              <div className="text-base font-extrabold text-white font-mono break-all select-all">{order.handle}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-full border-amber-400/50 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 shrink-0"
              onClick={copyHandle}
            >
              {copied ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
            </Button>
          </div>
        )}

        {/* Status strip */}
        <div className="px-4 py-2.5 border-b border-mk-border flex items-center gap-2">
          <span className={'w-2 h-2 rounded-full shrink-0 ' + (order.status === 'completed'
            ? 'bg-emerald-400'
            : order.status === 'active' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500')} />
          <span className={'text-[11px] font-bold ' + (order.status === 'completed'
            ? 'text-emerald-400'
            : order.status === 'active' ? 'text-amber-400' : 'text-slate-400')}>
            {statusLabel}
          </span>
        </div>

        {/* Message feed */}
        <OtpChatFeed
          messages={messages}
          emptyHint={emptyHint}
          highlight={order.handle ? {
            label: isEmail ? 'Your temporary email address' : isRent ? 'Your rented number' : 'Your number',
            value: order.handle
          } : null}
        />

        {/* Footer */}
        <div className="border-t border-mk-border px-4 py-3 space-y-2.5 sheet-safe-bottom">
          {order.status === 'completed' && (
            <p className="text-[11px] font-bold text-emerald-400 text-center">
              Verification message received — your code is in the chat above.
            </p>
          )}
          {order.refundStatus === 'REFUNDED' && (
            <p className="text-[11px] font-bold text-emerald-400 text-center">
              Refunded: {formatNaira(order.refundAmount || order.amount)} credited back to your wallet.
            </p>
          )}

          {isActive && !order.otpReceived && <TypingIndicator visible />}

          {isActive && isRent && (
            <p className="text-[11px] text-slate-500 text-center">
              Long-term rentals cannot be cancelled once purchased.
            </p>
          )}

          {isActive && !isRent && (
            confirmCancel ? (
              <div className="rounded-2xl border border-mk-border bg-mk-card p-3 space-y-2.5">
                <p className="text-xs text-slate-200">
                  Cancel this number request and receive a refund if the request is eligible?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="h-10 flex-1 bg-rose-500 hover:bg-rose-500/90 text-white font-bold" disabled={busy} onClick={cancelRequest}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4 mr-1" /> Cancel Request</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-10 flex-1 border-mk-border text-slate-200 font-bold" disabled={busy} onClick={() => setConfirmCancel(false)}>
                    Keep Number
                  </Button>
                </div>
              </div>
            ) : canCancel ? (
              <Button
                variant="outline"
                className="w-full h-11 border-mk-border text-slate-300 hover:text-white font-semibold"
                onClick={() => setConfirmCancel(true)}
              >
                <Ban className="w-4 h-4 mr-1.5" /> Cancel & Refund
              </Button>
            ) : (
              <p className="text-[11px] text-slate-500 text-center">
                This request has already received a verification message and may no longer be eligible for cancellation.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}