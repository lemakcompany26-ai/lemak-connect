import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira } from '@/lib/format';

// Confirm-and-buy drawer for SMS numbers and email OTP addresses. The final
// price is re-quoted from the backend right before purchase, and the server
// picks the supplier invisibly — the customer only ever sees the final price.
export default function BuySheet({ open, onOpen, product, service, country, countryName, price, onDone }) {
  const { toast } = useToast();
  const [quote, setQuote] = useState(undefined); // undefined = checking
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !service) return;
    let cancelled = false;
    setBusy(false);
    setQuote(undefined);
    if (product === 'email') {
      setQuote({ available: price != null && price !== false, customerPrice: price });
      return;
    }
    base44.functions.invoke('virtualNumbers', { action: 'quote', country: country || 'NG', services: [service] })
      .then(res => {
        if (cancelled) return;
        const d = res.data || res;
        setQuote((d.prices || {})[service] || { available: false, customerPrice: null });
      })
      .catch(() => { if (!cancelled) setQuote({ available: false, customerPrice: null }); });
    return () => { cancelled = true; };
  }, [open, service, product, country, price]);

  const buy = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('virtualNumbers', product === 'sms'
        ? { action: 'provider_rent', product: 'sms', serviceName: service, country: country || 'NG' }
        : { action: 'provider_rent', product: 'email', domain: service });
      const d = res.data || res;
      const charged = d.rental ? Number(d.rental.amount) : null;
      const displayed = quote && quote.customerPrice;
      if (displayed && charged && charged !== Number(displayed)) {
        toast({ title: 'Price updated', description: 'The final price just changed — please review the new price on your order.' });
      } else {
        toast({ title: product === 'sms' ? 'Number ready 🎉' : 'Email address ready 🎉', description: 'Opening your OTP screen…' });
      }
      if (onDone && d.rental) onDone({ id: d.rental.id });
    } catch (e) {
      const d = e.response && e.response.data;
      toast({
        title: 'Purchase failed',
        description: (d && d.error) || 'Numbers are temporarily unavailable. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setBusy(false);
    }
  };

  const finalPrice = quote && quote.customerPrice;

  return (
    <Drawer open={open} onOpenChange={onOpen}>
      <DrawerContent className="bg-mk-bg border-mk-border">
        <DrawerHeader className="pb-2 sm:pb-2">
          <DrawerTitle className="font-heading text-sm font-extrabold text-white uppercase tracking-wide">
            {product === 'sms' ? 'GET YOUR NUMBER' : 'GET YOUR EMAIL'}
          </DrawerTitle>
          <DrawerDescription className="text-[11px] text-slate-400">
            The final price is confirmed at purchase — nothing is charged before you continue.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-5 space-y-3">
          <div className="rounded-2xl border border-mk-border bg-mk-card2 px-4 py-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Service</span>
              <span className="text-sm font-bold text-white capitalize truncate">{service}</span>
            </div>
            {product === 'sms' && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Country</span>
                <span className="text-sm font-bold text-white">{countryName || country}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Availability</span>
              <span className="text-sm font-bold text-white">
                {quote === undefined ? 'Checking…' : quote.available ? 'Available' : 'Currently unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Final price</span>
              {quote === undefined ? (
                <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> Checking…
                </span>
              ) : finalPrice ? (
                <span className="text-base font-extrabold text-amber-400">{formatNaira(finalPrice)}</span>
              ) : (
                <span className="text-sm font-bold text-slate-500">Price temporarily unavailable</span>
              )}
            </div>
          </div>
          <Button
            className="w-full h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold"
            disabled={busy || !quote || !quote.available || !finalPrice}
            onClick={buy}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : product === 'sms' ? 'GET NUMBER' : 'GET EMAIL'}
          </Button>
          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Secure checkout from your Lemak Connect wallet
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}