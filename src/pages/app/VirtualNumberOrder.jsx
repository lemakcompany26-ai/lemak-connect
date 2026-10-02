import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarClock, Check, Copy, Loader2, ShieldCheck, Timer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';
import TypingIndicator from '@/components/chat/TypingIndicator';
import OtpChatFeed from '@/components/vnum/OtpChatFeed';
import AdminChatSheet from '@/components/chat/AdminChatSheet';

const STATUS_LABELS = {
  active: 'Waiting for verification code...',
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
  const [adminOpen, setAdminOpen] = useState(false);

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
  const statusLabel = !order ? ''
    : isRent && isActive
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
          : 'Waiting for verification code...')
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
          <div className="mt-1 text-[10px] font-mono font-bold text-slate-700 truncate">
            Transaction ID: {order.transactionId}
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

          <Button
            variant="outline"
            className="w-full h-11 border-amber-400/40 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 font-semibold"
            onClick={() => setAdminOpen(true)}
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" /> Chat with Admin
          </Button>
        </div>
      </div>

      <AdminChatSheet open={adminOpen} onClose={() => setAdminOpen(false)} context={`Order ${order.rentalRef}`} />
    </div>
  );
}if (action === "order") {
  try {
    const userEmail = String(body.userEmail || "").trim();
    const serverId = String(body.serverId || "");
    const service = String(body.service || "");
    const realId = String(body.realId || service);

    if (!userEmail) {
      return response({
        success: false,
        error: "User email is missing."
      });
    }

    if (!service) {
      return response({
        success: false,
        error: "Service is missing."
      });
    }

    console.log("=== VIRTUAL NUMBER ORDER START ===");
    console.log("serverId:", serverId);
    console.log("service:", service);
    console.log("realId:", realId);
    console.log("country:", body.country);
    console.log("countryProviderId:", body.countryProviderId);
    console.log("userEmail:", userEmail);

    // -----------------------------------------------------
    // GET WALLET
    // -----------------------------------------------------

    const wallets =
      await base44.entities.Wallet.filter({
        userEmail
      });

    console.log(
      "Wallet lookup result:",
      JSON.stringify(wallets)
    );

    const wallet = wallets?.[0];

    if (!wallet) {
      return response({
        success: false,
        error:
          "Wallet not found for this account."
      });
    }

    const walletBalance =
      Number(wallet.balance || 0);

    console.log(
      "Wallet balance:",
      walletBalance
    );

    // -----------------------------------------------------
    // FLEEXA
    // -----------------------------------------------------

    if (serverId === "a") {
      if (!FLEEXA_KEY) {
        return response({
          success: false,
          error:
            "FLEEXA_API_KEY is not configured in Base44 Secrets."
        });
      }

      console.log(
        "FLEEXA ORDER - service:",
        realId
      );

      // Get REAL Fleexa price first.
      const priceUrl =
        `${FLEEXA_BASE}/sms4/prices?serviceName=` +
        encodeURIComponent(realId);

      console.log(
        "Fleexa price URL:",
        priceUrl
      );

      const priceResponse =
        await fetch(priceUrl, {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${FLEEXA_KEY}`,
            "X-API-Key":
              FLEEXA_KEY,
            "Content-Type":
              "application/json"
          }
        });

      const priceData =
        await priceResponse
          .json()
          .catch(() => ({}));

      console.log(
        "Fleexa price response:",
        JSON.stringify(priceData)
      );

      if (!priceResponse.ok) {
        return response({
          success: false,
          error:
            `Fleexa price request failed (${priceResponse.status}): ` +
            JSON.stringify(priceData)
        });
      }

      const providerPrice = Number(
        priceData?.price_ngn ??
        priceData?.rate ??
        priceData?.price ??
        priceData?.data?.price_ngn ??
        priceData?.data?.rate ??
        priceData?.data?.price ??
        0
      );

      if (!providerPrice || providerPrice <= 0) {
        return response({
          success: false,
          error:
            "Fleexa returned no valid price for this service."
        });
      }

      // Your customer markup.
      const customerPrice =
        Math.ceil(providerPrice * 1.30);

      console.log(
        "Fleexa provider price:",
        providerPrice
      );

      console.log(
        "Lemak customer price:",
        customerPrice
      );

      if (
        walletBalance <
        customerPrice
      ) {
        return response({
          success: false,
          error:
            `Insufficient wallet balance. Required ${customerPrice} NGN, available ${walletBalance} NGN.`
        });
      }

      // ---------------------------------------------------
      // PURCHASE REAL FLEEXA NUMBER
      // ---------------------------------------------------

      console.log(
        "Sending Fleexa purchase..."
      );

      const buyResponse =
        await fetch(
          `${FLEEXA_BASE}/sms4/buy`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${FLEEXA_KEY}`,
              "X-API-Key":
                FLEEXA_KEY,
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              serviceName: realId,
              maxPrice: String(
                providerPrice
              )
            })
          }
        );

      const buyData =
        await buyResponse
          .json()
          .catch(() => ({}));

      console.log(
        "Fleexa BUY response:",
        JSON.stringify(buyData)
      );

      if (
        !buyResponse.ok ||
        buyData?.success !== true
      ) {
        return response({
          success: false,
          error:
            buyData?.message ||
            buyData?.error ||
            `Fleexa rejected purchase (${buyResponse.status}).`,
          providerResponse:
            buyData
        });
      }

      const purchase =
        buyData?.data ||
        buyData;

      const phone =
        purchase?.phone ||
        purchase?.number ||
        "";

      const activationId =
        purchase?.activation_id ||
        purchase?.requestId ||
        purchase?.id ||
        "";

      if (!phone) {
        return response({
          success: false,
          error:
            "Fleexa accepted the order but returned no phone number.",
          providerResponse:
            buyData
        });
      }

      if (!activationId) {
        return response({
          success: false,
          error:
            "Fleexa returned a phone number but no activation/order ID.",
          providerResponse:
            buyData
        });
      }

      console.log(
        "REAL FLEEXA NUMBER:",
        phone
      );

      console.log(
        "FLEEXA ACTIVATION ID:",
        activationId
      );

      // ---------------------------------------------------
      // SAVE RENTAL
      // ---------------------------------------------------

      let rental;

      try {
        rental =
          await base44.entities.Rental.create({
            userEmail,
            phoneNumber: phone,
            orderId:
              `fleexa_${activationId}`,
            serverId: "a",
            country:
              body.country || "US",
            service,
            status:
              "waiting_sms"
          });
      } catch (rentalError) {
        console.error(
          "RENTAL CREATE ERROR:",
          rentalError
        );

        /*
         * IMPORTANT:
         * The provider already delivered a real
         * number. Return that information instead
         * of hiding it behind HTTP 500.
         */

        return response({
          success: false,
          providerPurchased: true,
          phone,
          orderId:
            `fleexa_${activationId}`,
          error:
            "Number was purchased from Fleexa, but Lemak Connect could not save the rental record. Contact admin before trying again.",
          details:
            String(rentalError)
        });
      }

      // ---------------------------------------------------
      // DEDUCT WALLET
      // ---------------------------------------------------

      try {
        await base44.entities.Wallet.update(
          wallet.id,
          {
            balance:
              walletBalance -
              customerPrice
          }
        );
      } catch (walletError) {
        console.error(
          "WALLET UPDATE ERROR:",
          walletError
        );

        return response({
          success: true,
          warning:
            "Number purchased and rental saved, but wallet update failed. Admin should reconcile this transaction.",
          phone,
          orderId:
            `fleexa_${activationId}`,
          rentalId:
            rental?.id,
          charged:
            customerPrice
        });
      }

      console.log(
        "=== FLEEXA ORDER SUCCESS ==="
      );

      return response({
        success: true,
        phone,
        orderId:
          `fleexa_${activationId}`,
        rentalId:
          rental?.id,
        charged:
          customerPrice,
        providerPrice
      });
    }

    // -----------------------------------------------------
    // SMSPOOL
    // -----------------------------------------------------

    if (serverId === "b") {
      if (!SMSPOOL_KEY) {
        return response({
          success: false,
          error:
            "SMSPOOL_API_KEY is not configured in Base44 Secrets."
        });
      }

      const country =
        String(
          body.countryProviderId ||
          body.country ||
          "US"
        );

      console.log(
        "SMSPOOL ORDER"
      );

      console.log(
        "Service:",
        realId
      );

      console.log(
        "Country:",
        country
      );

      // ---------------------------------------------------
      // GET SMSPOOL PRICE
      // ---------------------------------------------------

      const priceForm =
        new URLSearchParams();

      priceForm.append(
        "key",
        SMSPOOL_KEY
      );

      priceForm.append(
        "service",
        realId
      );

      priceForm.append(
        "country",
        country
      );

      const priceResponse =
        await fetch(
          `${SMSPOOL_BASE}/request/price`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${SMSPOOL_KEY}`,
              "Content-Type":
                "application/x-www-form-urlencoded"
            },
            body: priceForm
          }
        );

      const priceData =
        await priceResponse
          .json()
          .catch(() => ({}));

      console.log(
        "SMSPool price response:",
        JSON.stringify(priceData)
      );

      if (!priceResponse.ok) {
        return response({
          success: false,
          error:
            `SMSPool price request failed (${priceResponse.status}): ` +
            JSON.stringify(priceData)
        });
      }

      const usdPrice = Number(
        Array.isArray(priceData)
          ? (
              priceData[0]?.price ||
              priceData[0]?.cost
            )
          : (
              priceData?.price ||
              priceData?.cost ||
              priceData?.data?.price
            )
      );

      if (!usdPrice || usdPrice <= 0) {
        return response({
          success: false,
          error:
            "SMSPool returned no valid price.",
          providerResponse:
            priceData
        });
      }

      const rate =
        Number(
          Deno.env.get(
            "SMSPOOL_USD_NGN_RATE"
          ) || "1600"
        );

      const providerNgn =
        usdPrice * rate;

      const customerPrice =
        Math.ceil(
          providerNgn * 1.30
        );

      console.log(
        "SMSPool USD:",
        usdPrice
      );

      console.log(
        "SMSPool NGN:",
        providerNgn
      );

      console.log(
        "Customer price:",
        customerPrice
      );

      if (
        walletBalance <
        customerPrice
      ) {
        return response({
          success: false,
          error:
            `Insufficient wallet balance. Required ${customerPrice} NGN, available ${walletBalance} NGN.`
        });
      }

      // ---------------------------------------------------
      // PURCHASE SMSPOOL NUMBER
      // ---------------------------------------------------

      const orderForm =
        new URLSearchParams();

      orderForm.append(
        "key",
        SMSPOOL_KEY
      );

      orderForm.append(
        "country",
        country
      );

      orderForm.append(
        "service",
        realId
      );

      orderForm.append(
        "pool",
        "1"
      );

      console.log(
        "Sending SMSPool purchase..."
      );

      const orderResponse =
        await fetch(
          `${SMSPOOL_BASE}/purchase/sms`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${SMSPOOL_KEY}`,
              "Content-Type":
                "application/x-www-form-urlencoded"
            },
            body: orderForm
          }
        );

      const orderData =
        await orderResponse
          .json()
          .catch(() => ({}));

      console.log(
        "SMSPool purchase response:",
        JSON.stringify(orderData)
      );

      if (
        !orderResponse.ok ||
        !(
          orderData?.success === 1 ||
          orderData?.success === true
        )
      ) {
        return response({
          success: false,
          error:
            orderData?.message ||
            orderData?.type ||
            `SMSPool rejected purchase (${orderResponse.status}).`,
          providerResponse:
            orderData
        });
      }

      const phone =
        orderData?.phonenumber ||
        orderData?.number ||
        "";

      const providerOrderId =
        orderData?.order_id ||
        "";

      if (!phone) {
        return response({
          success: false,
          error:
            "SMSPool accepted the purchase but returned no phone number.",
          providerResponse:
            orderData
        });
      }

      if (!providerOrderId) {
        return response({
          success: false,
          error:
            "SMSPool returned a phone number but no order ID.",
          providerResponse:
            orderData
        });
      }

      console.log(
        "REAL SMSPOOL NUMBER:",
        phone
      );

      console.log(
        "SMSPOOL ORDER ID:",
        providerOrderId
      );

      // ---------------------------------------------------
      // SAVE RENTAL
      // ---------------------------------------------------

      let rental;

      try {
        rental =
          await base44.entities.Rental.create({
            userEmail,
            phoneNumber: String(
              phone
            ),
            orderId:
              `smspool_${providerOrderId}`,
            serverId: "b",
            country:
              body.country || country,
            service,
            status:
              "waiting_sms"
          });
      } catch (rentalError) {
        console.error(
          "RENTAL CREATE ERROR:",
          rentalError
        );

        return response({
          success: false,
          providerPurchased: true,
          phone: String(phone),
          orderId:
            `smspool_${providerOrderId}`,
          error:
            "SMSPool delivered a real number, but Lemak Connect could not save the rental record. Contact admin before trying again.",
          details:
            String(rentalError)
        });
      }

      // ---------------------------------------------------
      // DEDUCT WALLET
      // ---------------------------------------------------

      try {
        await base44.entities.Wallet.update(
          wallet.id,
          {
            balance:
              walletBalance -
              customerPrice
          }
        );
      } catch (walletError) {
        console.error(
          "WALLET UPDATE ERROR:",
          walletError
        );

        return response({
          success: true,
          warning:
            "Number purchased and rental saved, but wallet update failed. Admin should reconcile this transaction.",
          phone: String(phone),
          orderId:
            `smspool_${providerOrderId}`,
          rentalId:
            rental?.id,
          charged:
            customerPrice
        });
      }

      console.log(
        "=== SMSPOOL ORDER SUCCESS ==="
      );

      return response({
        success: true,
        phone: String(phone),
        orderId:
          `smspool_${providerOrderId}`,
        rentalId:
          rental?.id,
        charged:
          customerPrice,
        providerPrice:
          usdPrice,
        providerCurrency:
          "USD"
      });
    }

    return response({
      success: false,
      error:
        `Unknown server ID: ${serverId}`
    });

  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "VIRTUAL NUMBERS 500 ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "================================"
    );

    return response({
      success: false,
      error:
        error?.message ||
        String(error) ||
        "Unknown backend error"
    });
  }
          }
