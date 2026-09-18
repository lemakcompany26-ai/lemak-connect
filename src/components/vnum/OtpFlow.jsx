import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Loader2, Mail, Phone, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';
import ServiceList from '@/components/vnum/ServiceList';
import ServerSelectSheet from '@/components/vnum/ServerSelectSheet';
import RentDurationPicker from '@/components/vnum/RentDurationPicker';

const PREFERRED_COUNTRIES = ['US', 'NG', 'GB', 'CA', 'DE', 'FR', 'IN', 'ZA'];
const POPULAR = ['whatsapp', 'telegram', 'facebook', 'tiktok', 'instagram', 'snapchat', 'google', 'gmail'];

// Three services, step by step: SMS OTP · Email OTP · Rent Number.
// Choose a service → choose a server (A or B, provider names hidden) →
// confirm (rent numbers add duration + auto-renew) → private OTP chat.
export default function OtpFlow({ onRented }) {
  const { toast } = useToast();
  const { refresh } = useApp();
  const [catalog, setCatalog] = useState(null); // servers[]
  const [product, setProduct] = useState(null);
  const [country, setCountry] = useState('US');
  const [service, setService] = useState('');
  const [rentOpts, setRentOpts] = useState(null); // { apps, areas }
  const [sheetOpen, setSheetOpen] = useState(false);
  const [serverId, setServerId] = useState(null);
  const [price, setPrice] = useState(undefined); // sms/email: undefined checking · null unavailable · number
  const [months, setMonths] = useState(1);
  const [autoRenew, setAutoRenew] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadCatalog = useCallback(() => {
    setCatalog(null);
    setRentOpts(null);
    base44.functions.invoke('virtualNumbers', { action: 'provider_catalog' })
      .then(res => { setCatalog((res.data || res).servers || []); })
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Rentable service list comes from the rental-capable server.
  useEffect(() => {
    if (product !== 'rent' || rentOpts !== null) return;
    const rentServer = (catalog || []).find(s => s.online && s.supportsRent);
    if (!rentServer) { setRentOpts({ apps: [], areas: [] }); return; }
    let cancelled = false;
    base44.functions.invoke('virtualNumbers', { action: 'rent_options', serverId: rentServer.id })
      .then(res => { if (!cancelled) setRentOpts(res.data || res); })
      .catch(() => { if (!cancelled) setRentOpts({ apps: [], areas: [] }); });
    return () => { cancelled = true; };
  }, [product, catalog, rentOpts]);

  const pickProduct = (id) => {
    setProduct(id);
    setService(id === 'email' ? '' : 'whatsapp');
    setServerId(null);
    setPrice(undefined);
    setRentOpts(null);
    setSheetOpen(false);
  };

  const goBack = () => {
    if (serverId) { setServerId(null); setPrice(undefined); return; }
    setProduct(null);
    setService('');
    setRentOpts(null);
  };

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

  const countryName = (countries.find(c => c.code === country) || {}).name || country;

  const serviceOptions = product === 'email'
    ? [...new Set((catalog || []).flatMap(s => (s.emailProducts || []).map(p => p.id)))].sort()
    : product === 'rent'
      ? ((rentOpts && rentOpts.apps) || [])
      : [...new Set([...POPULAR, ...(catalog || []).flatMap(s => (s.smsServices || []).map(x => x.id))])].sort();

  const rentArea = product === 'rent' && rentOpts && rentOpts.areas && rentOpts.areas[0] ? rentOpts.areas[0] : null;

  const serverRows = (catalog || []).map(s => {
    const supports = product === 'sms'
      ? (s.countries || []).some(c => c.code === country)
      : product === 'email' ? s.id === 'a'
        : !!s.supportsRent;
    const svc = product === 'sms' ? (s.smsServices || []).find(x => x.id === service) : null;
    const stock = svc ? svc.quantity : (product === 'sms' ? (s.id === 'b' ? null : 0) : null);
    let subtitle;
    if (!s.online) subtitle = 'Offline right now';
    else if (!supports) subtitle = product === 'sms' ? `Not available in ${countryName}` : 'Not available for this service';
    else if (product === 'sms') subtitle = stock === null ? 'Available on demand' : `${stock} ${stock === 1 ? 'number' : 'numbers'} in stock`;
    else if (product === 'email') subtitle = 'Temporary email addresses';
    else subtitle = 'Long-term rentals · 1-12 months';
    return { id: s.id, label: s.label, subtitle, disabled: !s.online || !supports };
  });

  const onServerSelect = (row) => {
    setSheetOpen(false);
    setServerId(row.id);
    if (product === 'rent') return; // durations come from rent_options
    setPrice(undefined);
    base44.functions.invoke('virtualNumbers', {
      action: 'provider_price', serverId: row.id, product,
      ...(product === 'sms' ? { serviceName: service, country } : { domain: service })
    }).then(res => {
      const d = res.data || res;
      setPrice(d && d.customerPrice ? d.customerPrice : null);
    }).catch(() => setPrice(null));
  };

  const buy = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('virtualNumbers', {
        action: 'provider_rent', serverId, product,
        ...(product === 'sms' ? { serviceName: service, country } : {}),
        ...(product === 'email' ? { domain: service } : {}),
        ...(product === 'rent' ? { serviceName: service, country: rentArea && rentArea.code, months, autoRenew } : {})
      });
      const d = res.data || res;
      toast({
        title: product === 'sms' ? 'Live number ready 🎉' : product === 'email' ? 'Email address ready 🎉' : 'Number rented 🎉',
        description: 'Opening your private chat — your verification code will arrive there automatically.'
      });
      refresh();
      if (onRented) onRented(d.rental);
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Purchase failed', description: (d && d.error) || e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const anyOnline = (catalog || []).some(s => s.online);
  const selectedServer = (catalog || []).find(s => s.id === serverId);

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-blue/25 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-extrabold text-white flex items-center gap-2">
            <Phone className="w-4 h-4 text-mk-blue" /> {product ? 'Select Service' : 'Verification services'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {product
              ? 'Choose a service to receive verification.'
              : 'Pick what you need — everything is delivered privately in your own chat.'}
          </p>
        </div>
        <Button size="icon" variant="outline" className="h-8 w-8 border-mk-border text-slate-400 hover:text-white shrink-0" onClick={loadCatalog} disabled={catalog === null}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Step 1 — service type */}
      {!product && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { id: 'sms', title: 'SMS OTP', icon: Phone, desc: 'One-time number for WhatsApp, Telegram & more' },
            { id: 'email', title: 'Email OTP', icon: Mail, desc: 'Temporary email address for verification codes' },
            { id: 'rent', title: 'Rent Number', icon: CalendarClock, desc: 'Keep the same number for 1, 3 or 12 months' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickProduct(p.id)}
              className="rounded-xl border border-mk-border bg-mk-card2 px-4 py-4 text-left hover:border-mk-blue/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-mk-blue/15 text-mk-blue shrink-0">
                  <p.icon className="w-4.5 h-4.5 w-5 h-5" />
                </span>
                {p.title}
              </span>
              <span className="block text-[11px] text-slate-400 mt-1.5">{p.desc}</span>
            </button>
          ))}
        </div>
      )}

      {catalog === null && (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>
      )}

      {catalog !== null && !anyOnline && !product && (
        <div className="text-[11px] text-slate-500">All servers are offline right now — try again shortly.</div>
      )}

      {/* Step 2 — country + service */}
      {product && !serverId && (
        <div className="space-y-4">
          <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-xs font-bold text-mk-blue-soft">
            <ArrowLeft className="w-3.5 h-3.5" /> BACK
          </button>

          {product === 'sms' && countries.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Selected country</div>
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

          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {product === 'email' ? 'Choose an email domain' : 'Choose a service'}
            </div>
            <ServiceList
              options={serviceOptions}
              value={service}
              onChange={setService}
              popular={product === 'email' ? [] : POPULAR.slice(0, 8)}
              placeholder={product === 'rent' ? 'Search services — whatsapp, telegram, banks…' : 'Search services — whatsapp, telegram, binance…'}
              loading={product === 'rent' && rentOpts === null}
            />
          </div>

          <Button
            className="w-full h-12 rounded-full bg-mk-blue hover:bg-mk-blue/90 text-white font-extrabold"
            disabled={!service}
            onClick={() => setSheetOpen(true)}
          >
            CONTINUE
          </Button>
        </div>
      )}

      {/* Step 3 — confirm (after server selection) */}
      {product && serverId && (
        <div className="space-y-4">
          <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-xs font-bold text-mk-blue-soft">
            <ArrowLeft className="w-3.5 h-3.5" /> BACK
          </button>

          <div className="rounded-2xl border border-mk-border bg-mk-card2 px-4 py-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Service</span>
              <span className="text-sm font-bold text-white capitalize">{service}</span>
            </div>
            {product !== 'email' && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Country</span>
                <span className="text-sm font-bold text-white">{product === 'rent' ? (rentArea ? rentArea.name : '—') : countryName}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Server</span>
              <span className="text-sm font-bold text-white">{selectedServer ? selectedServer.label : '—'}</span>
            </div>
          </div>

          {product === 'rent' ? (
            rentArea ? (
              <RentDurationPicker
                durations={rentArea.durations || []}
                months={months}
                onMonths={setMonths}
                autoRenew={autoRenew}
                onAutoRenew={setAutoRenew}
                busy={busy}
                onRent={buy}
              />
            ) : (
              <div className="text-xs text-slate-500 py-2">Rentals are not available right now.</div>
            )
          ) : (
            <div className="space-y-4">
              {price === undefined && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-mk-blue" /> Checking price…
                </div>
              )}
              {price === null && (
                <div className="text-xs text-slate-500">This service is unavailable on the selected server right now.</div>
              )}
              <Button
                className="w-full h-12 rounded-full bg-mk-blue hover:bg-mk-blue/90 text-white font-extrabold"
                disabled={busy || typeof price !== 'number'}
                onClick={buy}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : typeof price === 'number' ? `BUY NOW · ${formatNaira(price)}` : 'UNAVAILABLE'}
              </Button>
            </div>
          )}
        </div>
      )}

      <ServerSelectSheet
        open={sheetOpen}
        onOpen={setSheetOpen}
        title={product === 'sms' ? `${countryName} · SELECT SERVER` : 'SELECT SERVER'}
        rows={serverRows}
        onSelect={onServerSelect}
      />
    </div>
  );
}