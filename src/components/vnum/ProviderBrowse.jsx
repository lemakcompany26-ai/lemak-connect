import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Phone, RefreshCw, Search, Server } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';

// Most-requested OTP services, surfaced as quick picks (WhatsApp first).
const POPULAR = [
  'whatsapp', 'telegram', 'facebook', 'instagram', 'tiktok', 'snapchat',
  'google', 'gmail', 'discord', 'openai', 'tinder', 'binance', 'paypal',
  'amazon', 'netflix', 'spotify', 'uber', 'bolt', 'twitter', 'youtube'
];

// Live provider browse: pick the OTP type (WhatsApp, email OTP, …), then
// choose Server A or Server B — each shown as its own row with live stock
// and the exact price. Renting opens the OTP chat instantly.
export default function ProviderBrowse({ onRented }) {
  const { toast } = useToast();
  const { refresh } = useApp();
  const [catalog, setCatalog] = useState(null);
  const [product, setProduct] = useState('sms');
  const [service, setService] = useState('whatsapp');
  const [search, setSearch] = useState('');
  const [prices, setPrices] = useState({});
  const [pricing, setPricing] = useState(false);
  const [renting, setRenting] = useState(null);

  const loadCatalog = useCallback(() => {
    setCatalog(null);
    setPrices({});
    base44.functions.invoke('virtualNumbers', { action: 'provider_catalog' })
      .then(res => { setCatalog((res.data || res).servers || []); })
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const loadPrices = useCallback(() => {
    if (!catalog) return;
    const online = catalog.filter(s => s.online);
    if (!online.length || !service) { setPrices({}); return; }
    setPricing(true);
    Promise.all(online.map(s =>
      base44.functions.invoke('virtualNumbers', {
        action: 'provider_price', serverId: s.id, product,
        ...(product === 'sms' ? { serviceName: service } : { domain: service })
      }).then(res => ({ s, d: res.data || res })).catch(() => ({ s, d: null }))
    )).then(rows => {
      const map = {};
      for (const r of rows) map[r.s.id] = r.d && r.d.customerPrice ? r.d.customerPrice : 'unavailable';
      setPrices(map);
    }).finally(() => setPricing(false));
  }, [catalog, product, service]);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  // Combined live stock across servers (max quantity per service).
  const inStock = useMemo(() => {
    const all = {};
    for (const s of catalog || []) {
      for (const svc of s.smsServices || []) all[svc.id] = Math.max(all[svc.id] || 0, svc.quantity);
    }
    return all;
  }, [catalog]);

  const serviceOptions = useMemo(() => {
    if (product === 'email') {
      const domains = new Set();
      for (const s of catalog || []) for (const p of s.emailProducts || []) domains.add(p.id);
      return [...domains].sort();
    }
    const ids = new Set([...POPULAR, ...Object.keys(inStock)]);
    const q = search.trim().toLowerCase();
    return [...ids].filter(id => !q || id.includes(q)).sort();
  }, [product, catalog, inStock, search]);

  const rent = async (server) => {
    if (!service) {
      toast({ title: 'Choose a service first', description: 'Pick what you need the OTP for — e.g. WhatsApp.' });
      return;
    }
    setRenting(server.id);
    try {
      const res = await base44.functions.invoke('virtualNumbers', {
        action: 'provider_rent', serverId: server.id, product,
        ...(product === 'sms' ? { serviceName: service } : { domain: service })
      });
      const d = res.data || res;
      toast({
        title: product === 'sms' ? 'Live number ready 🎉' : 'Email address ready 🎉',
        description: 'The OTP chat is open — your code will arrive automatically.'
      });
      refresh();
      if (onRented) onRented(d.rental);
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Rental failed', description: (d && d.error) || e.message, variant: 'destructive' });
    } finally {
      setRenting(null);
    }
  };

  const anyOnline = (catalog || []).some(s => s.online);

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-blue/25 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-extrabold text-white flex items-center gap-2">
            <Phone className="w-4 h-4 text-mk-blue" /> Live OTP numbers & emails
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real non-VoIP US numbers and temporary email addresses from our live OTP providers.
          </p>
        </div>
        <Button size="icon" variant="outline" className="h-8 w-8 border-mk-border text-slate-400 hover:text-white shrink-0" onClick={loadCatalog} disabled={catalog === null}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* OTP type */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setProduct('sms'); setService('whatsapp'); setSearch(''); }}
          className={'rounded-xl border px-3 py-2.5 text-left ' + (product === 'sms' ? 'border-mk-blue bg-mk-blue/15' : 'border-mk-border bg-mk-card2')}
        >
          <span className="flex items-center gap-2 text-xs font-bold text-white"><Phone className="w-3.5 h-3.5 text-mk-blue" /> Number OTP</span>
          <span className="block text-[10px] text-slate-400 mt-0.5">WhatsApp, Telegram, banks…</span>
        </button>
        <button
          type="button"
          onClick={() => { setProduct('email'); setService(''); setSearch(''); }}
          className={'rounded-xl border px-3 py-2.5 text-left ' + (product === 'email' ? 'border-mk-blue bg-mk-blue/15' : 'border-mk-border bg-mk-card2')}
        >
          <span className="flex items-center gap-2 text-xs font-bold text-white"><Mail className="w-3.5 h-3.5 text-mk-brown-soft" /> Email OTP</span>
          <span className="block text-[10px] text-slate-400 mt-0.5">Temporary email addresses</span>
        </button>
      </div>

      {catalog === null && (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>
      )}

      {catalog !== null && (
        <>
          {/* Service / domain picker */}
          {product === 'sms' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value.slice(0, 40))}
                  placeholder="Search 300+ services — whatsapp, telegram, binance…"
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
                {serviceOptions.slice(0, 40).map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setService(id)}
                    className={'w-full flex items-center justify-between px-3 py-2 text-left ' + (service === id ? 'bg-mk-blue/15' : '')}
                  >
                    <span className="text-xs font-semibold text-slate-200 capitalize">{id}</span>
                    {(inStock[id] || 0) > 0
                      ? <span className="text-[10px] font-bold text-emerald-400">{inStock[id]} in stock</span>
                      : <span className="text-[10px] text-slate-500">out of stock</span>}
                  </button>
                ))}
                {serviceOptions.length === 0 && (
                  <div className="px-3 py-3 text-xs text-slate-500">No services match your search.</div>
                )}
              </div>
            </div>
          )}

          {product === 'email' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">Pick the email domain for your temporary address:</p>
              <div className="max-h-36 overflow-y-auto scrollbar-thin rounded-xl border border-mk-border bg-mk-card2 divide-y divide-mk-border">
                {serviceOptions.slice(0, 40).map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setService(id)}
                    className={'w-full flex items-center justify-between px-3 py-2 text-left ' + (service === id ? 'bg-mk-blue/15' : '')}
                  >
                    <span className="text-xs font-semibold text-slate-200">{id}</span>
                    <span className="text-[10px] text-slate-500">{(catalog.some(s => (s.emailProducts || []).some(p => p.id === id && p.price > 0))) ? 'available' : ''}</span>
                  </button>
                ))}
                {serviceOptions.length === 0 && (
                  <div className="px-3 py-3 text-xs text-slate-500">No email domains available right now.</div>
                )}
              </div>
            </div>
          )}

          {/* Server rows — Server A in one row, Server B below it */}
          <div className="space-y-2.5">
            {catalog.map(s => {
              const price = prices[s.id];
              const stockQty = product === 'sms' ? (inStock[service] || 0) : 1;
              const canRent = s.online && service && price && price !== 'unavailable' &&
                (product === 'email' || stockQty > 0);
              return (
                <div key={s.id} className="rounded-xl border border-mk-border bg-mk-card2 px-3.5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-mk-blue shrink-0" />
                      <span className="text-sm font-bold text-white">Server {s.id.toUpperCase()}</span>
                      <span className={'inline-block w-2 h-2 rounded-full shrink-0 ' + (s.online ? 'bg-emerald-400' : 'bg-slate-600')} />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {s.online
                        ? (product === 'sms'
                            ? ((inStock[service] || 0) > 0 ? `${inStock[service]} live numbers in stock` : 'Out of stock — restocks frequently')
                            : 'Live email addresses')
                        : (s.configured ? 'Temporarily unreachable' : 'Not configured yet')}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 bg-mk-blue hover:bg-mk-blue/90 text-white font-bold shrink-0"
                    disabled={!canRent || renting === s.id}
                    onClick={() => rent(s)}
                  >
                    {renting === s.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : pricing || (price === undefined)
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : `Rent · ${formatNaira(price || 0)}`}
                  </Button>
                </div>
              );
            })}
            {catalog.length === 0 && (
              <div className="text-xs text-slate-500 py-2">No OTP servers configured yet.</div>
            )}
            {catalog.length > 0 && !anyOnline && (
              <div className="text-[11px] text-slate-500">Both servers are offline right now — try again shortly.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}