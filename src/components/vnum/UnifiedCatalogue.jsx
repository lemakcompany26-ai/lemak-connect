import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Phone, RefreshCw, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira } from '@/lib/format';

// Most-requested verification services, surfaced as quick picks.
const POPULAR = [
  'whatsapp', 'telegram', 'facebook', 'instagram', 'tiktok', 'snapchat',
  'google', 'gmail', 'discord', 'openai', 'tinder', 'binance', 'paypal',
  'amazon', 'netflix', 'spotify', 'uber', 'bolt', 'twitter', 'youtube'
];

// Unified Virtual Numbers catalogue. One service, one price — the backend
// chooses the eligible provider behind the scenes; the customer never sees
// providers, servers, stock internals or costs.
export default function UnifiedCatalogue({ onBought }) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState(null); // { available, smsServices, emailDomains }
  const [product, setProduct] = useState('sms');
  const [service, setService] = useState('whatsapp');
  const [search, setSearch] = useState('');
  const [price, setPrice] = useState(undefined); // undefined loading | false unavailable | number
  const [buying, setBuying] = useState(false);

  const loadCatalog = useCallback(() => {
    setCatalog(null);
    base44.functions.invoke('virtualNumbers', { action: 'unified_catalogue' })
      .then(res => { setCatalog(res.data || res); })
      .catch(() => setCatalog({ available: false, smsServices: [], emailDomains: [] }));
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const loadPrice = useCallback(() => {
    if (!catalog || !service) { setPrice(undefined); return; }
    setPrice(undefined);
    base44.functions.invoke('virtualNumbers', { action: 'unified_price', product, service })
      .then(res => {
        const d = res.data || res;
        setPrice(d.available ? d.customerPrice : false);
      })
      .catch(() => setPrice(false));
  }, [catalog, product, service]);

  useEffect(() => { loadPrice(); }, [loadPrice]);

  const serviceOptions = (() => {
    if (!catalog) return [];
    if (product === 'email') return catalog.emailDomains || [];
    const q = search.trim().toLowerCase();
    const inStock = catalog.smsServices || [];
    // Only genuinely available services are listed; popular picks are shown
    // first but greyed out if not currently in stock.
    const ids = [...new Set([...POPULAR.filter(id => inStock.includes(id)), ...inStock])];
    return ids.filter(id => !q || id.includes(q)).sort();
  })();

  const buy = async () => {
    if (!service) {
      toast({ title: 'Choose a service first', description: 'Pick what you need the verification for — e.g. WhatsApp.' });
      return;
    }
    setBuying(true);
    try {
      const res = await base44.functions.invoke('virtualNumbers', {
        action: 'vn_buy', product, service
      });
      const d = res.data || res;
      toast({
        title: 'Your number is ready 🎉',
        description: 'Opening your private order screen — your verification message will arrive there automatically.'
      });
      if (onBought) onBought(d.orderId);
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Order failed', description: (d && d.error) || e.message, variant: 'destructive' });
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-blue/25 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-extrabold text-white flex items-center gap-2">
            <Phone className="w-4 h-4 text-mk-blue" /> Live numbers & email OTP
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real live numbers and temporary email addresses — your verification message arrives in your private order screen.
          </p>
        </div>
        <Button size="icon" variant="outline" className="h-8 w-8 border-mk-border text-slate-400 hover:text-white shrink-0" onClick={loadCatalog} disabled={catalog === null}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Type: number or email */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setProduct('sms'); setService('whatsapp'); setSearch(''); }}
          className={'rounded-xl border px-3 py-2.5 text-left ' + (product === 'sms' ? 'border-mk-blue bg-mk-blue/15' : 'border-mk-border bg-mk-card2')}
        >
          <span className="flex items-center gap-2 text-xs font-bold text-white"><Phone className="w-3.5 h-3.5 text-mk-blue" /> Phone number</span>
          <span className="block text-[10px] text-slate-400 mt-0.5">WhatsApp, Telegram, banks…</span>
        </button>
        <button
          type="button"
          onClick={() => { setProduct('email'); setService(''); setSearch(''); }}
          className={'rounded-xl border px-3 py-2.5 text-left ' + (product === 'email' ? 'border-mk-blue bg-mk-blue/15' : 'border-mk-border bg-mk-card2')}
        >
          <span className="flex items-center gap-2 text-xs font-bold text-white"><Mail className="w-3.5 h-3.5 text-mk-brown-soft" /> Email address</span>
          <span className="block text-[10px] text-slate-400 mt-0.5">Temporary email OTP</span>
        </button>
      </div>

      {catalog === null && (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>
      )}

      {catalog !== null && !catalog.available && (
        <div className="rounded-xl border border-mk-border bg-mk-card2 px-4 py-3 text-xs text-slate-400">
          Currently unavailable. Please try again shortly.
        </div>
      )}

      {catalog !== null && catalog.available && (
        <>
          {/* Service picker */}
          {product === 'sms' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value.slice(0, 40))}
                  placeholder="Search services — whatsapp, telegram, binance…"
                  className="bg-mk-card2 border-mk-border text-slate-100 h-10 pl-9 text-sm"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                {POPULAR.slice(0, 8).map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setService(id)}
                    className={'shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold capitalize ' + (service === id ? 'border-mk-blue bg-mk-blue text-white' : 'border-mk-border bg-mk-card2 text-slate-300')}
                  >
                    {id === 'openai' ? 'OpenAI' : id}
                  </button>
                ))}
              </div>
              <div className="max-h-36 overflow-y-auto scrollbar-thin rounded-xl border border-mk-border bg-mk-card2 divide-y divide-mk-border">
                {serviceOptions.slice(0, 60).map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setService(id)}
                    className={'w-full flex items-center justify-between px-3 py-2 text-left ' + (service === id ? 'bg-mk-blue/15' : '')}
                  >
                    <span className="text-xs font-semibold text-slate-200 capitalize">{id}</span>
                    <span className="text-[10px] font-bold text-emerald-400">available</span>
                  </button>
                ))}
                {serviceOptions.length === 0 && (
                  <div className="px-3 py-3 text-xs text-slate-500">No services available right now. Please try again shortly.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">Pick the email domain for your temporary address:</p>
              <div className="max-h-36 overflow-y-auto scrollbar-thin rounded-xl border border-mk-border bg-mk-card2 divide-y divide-mk-border">
                {serviceOptions.slice(0, 60).map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setService(id)}
                    className={'w-full flex items-center justify-between px-3 py-2 text-left ' + (service === id ? 'bg-mk-blue/15' : '')}
                  >
                    <span className="text-xs font-semibold text-slate-200">{id}</span>
                    <span className="text-[10px] font-bold text-emerald-400">available</span>
                  </button>
                ))}
                {serviceOptions.length === 0 && (
                  <div className="px-3 py-3 text-xs text-slate-500">No email addresses available right now. Please try again shortly.</div>
                )}
              </div>
            </div>
          )}

          {/* Buy */}
          <div className="rounded-xl border border-mk-border bg-mk-card2 px-3.5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white capitalize truncate">
                {product === 'sms' ? (service || 'Choose a service') : (service || 'Choose a domain')}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {price === undefined
                  ? 'Checking availability…'
                  : price === false
                    ? 'Currently unavailable. Please try another service.'
                    : product === 'sms'
                      ? 'Live number · verification message within 7 minutes'
                      : 'Temporary email · verification message arrives automatically'}
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 bg-mk-blue hover:bg-mk-blue/90 text-white font-bold shrink-0"
              disabled={price === undefined || price === false || !service || buying}
              onClick={buy}
            >
              {buying || price === undefined
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : `Buy · ${formatNaira(price || 0)}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}