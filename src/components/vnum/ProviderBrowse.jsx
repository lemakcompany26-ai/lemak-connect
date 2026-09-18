import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Phone, RefreshCw, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';

// Most-requested verification services, shown as quick picks.
const POPULAR = [
  'whatsapp', 'telegram', 'facebook', 'tiktok', 'instagram', 'snapchat',
  'google', 'gmail', 'discord', 'openai', 'tinder', 'binance', 'paypal',
  'amazon', 'netflix', 'spotify', 'uber', 'bolt', 'twitter', 'youtube'
];

// Countries shown first in the picker.
const PREFERRED_COUNTRIES = ['US', 'NG', 'GB', 'CA', 'DE', 'FR', 'IN', 'ZA'];

// Live provider flow, row by row: choose a country → choose the service
// (WhatsApp, Telegram, Facebook, TikTok…) → see each live provider
// (Fleexa and SMSPool) with its own row showing live availability and the
// exact price → buy → pay from your wallet → straight into the private
// OTP chat where the code arrives automatically.
export default function ProviderBrowse({ onRented }) {
  const { toast } = useToast();
  const { refresh } = useApp();
  const [catalog, setCatalog] = useState(null); // servers[]
  const [product, setProduct] = useState('sms');
  const [country, setCountry] = useState('US');
  const [service, setService] = useState('whatsapp');
  const [search, setSearch] = useState('');
  const [offers, setOffers] = useState({}); // serverId -> { customerPrice, successRate } | 'unavailable'
  const [pricing, setPricing] = useState(false);
  const [renting, setRenting] = useState(null);

  const loadCatalog = useCallback(() => {
    setCatalog(null);
    setOffers({});
    base44.functions.invoke('virtualNumbers', { action: 'provider_catalog' })
      .then(res => { setCatalog((res.data || res).servers || []); })
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Countries served by at least one online provider.
  const countries = useMemo(() => {
    const map = {};
    for (const s of catalog || []) {
      if (!s.online) continue;
      for (const c of s.countries || []) map[c.code] = c.name || c.code;
    }
    return Object.entries(map)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => {
        const ia = PREFERRED_COUNTRIES.indexOf(a.code);
        const ib = PREFERRED_COUNTRIES.indexOf(b.code);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.name.localeCompare(b.name);
      });
  }, [catalog]);

  // Service options: popular picks first + the providers' live service lists.
  const serviceOptions = useMemo(() => {
    if (product === 'email') {
      const domains = new Set();
      for (const s of catalog || []) for (const p of s.emailProducts || []) domains.add(p.id);
      return [...domains].sort();
    }
    const ids = new Set(POPULAR);
    for (const s of catalog || []) for (const svc of s.smsServices || []) ids.add(svc.id);
    const q = search.trim().toLowerCase();
    return [...ids].filter(id => !q || id.includes(q)).sort();
  }, [product, catalog, search]);

  const loadOffers = useCallback(() => {
    if (!catalog) return;
    const online = catalog.filter(s => s.online && (
      product === 'email' ? s.id === 'a' : (s.countries || []).some(c => c.code === country)
    ));
    if (!online.length || !service) { setOffers({}); return; }
    setPricing(true);
    setOffers({});
    Promise.all(online.map(s =>
      base44.functions.invoke('virtualNumbers', {
        action: 'provider_price', serverId: s.id, product,
        ...(product === 'sms' ? { serviceName: service, country } : { domain: service })
      }).then(res => ({ s, d: res.data || res })).catch(() => ({ s, d: null }))
    )).then(rows => {
      const map = {};
      for (const r of rows) {
        map[r.s.id] = r.d && r.d.customerPrice
          ? { customerPrice: r.d.customerPrice, successRate: r.d.successRate || null }
          : 'unavailable';
      }
      setOffers(map);
    }).finally(() => setPricing(false));
  }, [catalog, product, country, service]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  // Live stock for the selected service on one provider.
  // null = available on demand; 0 = out of stock.
  const serverStock = (s) => {
    const svc = (s.smsServices || []).find(x => x.id === service);
    return svc ? svc.quantity : (s.providerName === 'SMSPool' ? null : 0);
  };

  const rent = async (server) => {
    if (!service) {
      toast({ title: 'Choose a service first', description: 'Pick what you need the OTP for — e.g. WhatsApp.' });
      return;
    }
    setRenting(server.id);
    try {
      const res = await base44.functions.invoke('virtualNumbers', {
        action: 'provider_rent', serverId: server.id, product,
        ...(product === 'sms' ? { serviceName: service, country } : { domain: service })
      });
      const d = res.data || res;
      toast({
        title: product === 'sms' ? 'Live number ready 🎉' : 'Email address ready 🎉',
        description: 'Opening your private chat — your verification code will arrive there automatically.'
      });
      refresh();
      if (onRented) onRented(d.rental);
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Purchase failed', description: (d && d.error) || e.message, variant: 'destructive' });
    } finally {
      setRenting(null);
    }
  };

  const countryName = (countries.find(c => c.code === country) || {}).name || country;
  const anyOnline = (catalog || []).some(s => s.online);

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-blue/25 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-extrabold text-white flex items-center gap-2">
            <Phone className="w-4 h-4 text-mk-blue" /> Live OTP numbers & emails
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Pick a country and service — see live availability and the exact price from our providers before you pay.
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
          {/* Step 1 — country (numbers only) */}
          {product === 'sms' && countries.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">1 · Choose a country</div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                {countries.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountry(c.code)}
                    className={'shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ' + (country === c.code ? 'border-mk-blue bg-mk-blue text-white' : 'border-mk-border bg-mk-card2 text-slate-300')}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — service picker */}
          {product === 'sms' ? (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">2 · Choose a service</div>
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
                    <span className="text-[10px] text-slate-500">{(catalog || []).some(s => {
                      const svc = (s.smsServices || []).find(x => x.id === id);
                      return svc && (svc.quantity === null || svc.quantity > 0);
                    }) ? 'available' : ''}</span>
                  </button>
                ))}
                {serviceOptions.length === 0 && (
                  <div className="px-3 py-3 text-xs text-slate-500">No services match your search.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Choose an email domain</div>
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

          {/* Step 3 — provider rows, one row per provider with live price */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {product === 'sms' ? '3 · Numbers available in ' + countryName : 'Available providers'}
            </div>
            {(catalog || []).map(s => {
              const supportsCountry = product === 'email' || (s.countries || []).some(c => c.code === country);
              const offer = offers[s.id];
              const stock = serverStock(s);
              const inStock = product === 'email'
                ? (s.emailProducts || []).length > 0
                : stock === null || stock > 0;
              const canRent = s.online && service && supportsCountry && inStock &&
                offer && offer !== 'unavailable' && !pricing;
              const priceValue = offer && offer !== 'unavailable' ? offer.customerPrice : null;

              let statusText;
              if (!s.online) statusText = s.configured ? 'Temporarily unreachable' : 'Not configured yet';
              else if (product === 'sms' && !supportsCountry) statusText = `Not available in ${countryName}`;
              else if (!inStock) statusText = product === 'sms' ? 'Out of stock — check back soon' : 'Not available right now';
              else if (offer === undefined) statusText = 'Checking availability…';
              else if (offer === 'unavailable') statusText = 'Unavailable for this service';
              else statusText = product === 'sms'
                ? (stock === null ? 'Available on demand' : `${stock} ${stock === 1 ? 'number' : 'numbers'} in stock`)
                : 'Live email addresses';

              return (
                <div key={s.id} className="rounded-xl border border-mk-border bg-mk-card2 px-3.5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{s.providerName || `Server ${s.id.toUpperCase()}`}</span>
                      <span className={'inline-block w-2 h-2 rounded-full shrink-0 ' + (s.online ? 'bg-emerald-400' : 'bg-slate-600')} />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {statusText}
                      {offer && offer !== 'unavailable' && offer.successRate
                        ? ` · ${offer.successRate}% success rate` : ''}
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
                      : pricing || (offer === undefined && s.online && supportsCountry)
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : priceValue !== null
                          ? `Buy · ${formatNaira(priceValue)}`
                          : 'Unavailable'}
                  </Button>
                </div>
              );
            })}
            {catalog.length === 0 && (
              <div className="text-xs text-slate-500 py-2">No OTP providers configured yet.</div>
            )}
            {catalog.length > 0 && !anyOnline && (
              <div className="text-[11px] text-slate-500">Both providers are offline right now — try again shortly.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}