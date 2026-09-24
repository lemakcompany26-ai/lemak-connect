import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ClipboardList, Hash, Loader2, Mail, MessageCircle, Phone, RefreshCw, Search, Server } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';
import CatalogRow from '@/components/vnum/CatalogRow';
import CatalogSection from '@/components/vnum/CatalogSection';
import BuySheet from '@/components/vnum/BuySheet';
import RentSheet from '@/components/vnum/RentSheet';
import RentalCard from '@/components/vnum/RentalCard';
import RentalChatDialog from '@/components/vnum/RentalChatDialog';

const SOCIAL = new Set([
  'whatsapp', 'telegram', 'facebook', 'instagram', 'tiktok', 'twitter', 'x',
  'youtube', 'snapchat', 'discord', 'linkedin', 'reddit', 'pinterest', 'twitch',
  'threads', 'signal', 'wechat', 'line', 'viber', 'imo', 'kik'
]);
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'social', label: 'Social Media' },
  { id: 'other', label: 'Other Services' },
  { id: 'rental', label: 'Rental' },
  { id: 'email', label: 'Email' }
];
const flag = code => code.replace(/./g, ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65));
const cleanName = id => id.replace(/\.(com|net|org|io|co|me|app|email)$/i, '');
const QUOTE_BATCH = 12;
const QUOTE_LIMIT = 48;
const MAX_OTHER_ROWS = 60;

// Full-screen Virtual Numbers catalogue. ONE customer-facing list — the
// backend resolves availability and final prices and picks the supplier
// invisibly. No server, provider or markup information is ever displayed.
export default function VirtualNumbers() {
  const { toast } = useToast();
  const { refresh } = useApp();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [servers, setServers] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [country, setCountry] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [prices, setPrices] = useState({}); // serviceId -> { available, customerPrice }
  const requestedRef = useRef(new Set());
  const [orders, setOrders] = useState(null);
  const [view, setView] = useState('catalog'); // catalog | orders
  const [buy, setBuy] = useState(null); // { product, service, country, countryName, price }
  const [rentService, setRentService] = useState(null);
  const [chat, setChat] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCatalog = useCallback(() => {
    base44.functions.invoke('virtualNumbers', { action: 'provider_catalog' })
      .then(res => {
        const d = res.data || res;
        setServers(d.servers || []);
        setSelectedServer(prev => {
          const next = (d.servers || []).find(s => s.id === prev) || (d.servers || []).find(s => s.online) || null;
          setCatalog(next);
          return next ? next.id : null;
        });
        setCountry(prev => {
          const active = (d.servers || []).find(s => s.id === selectedServer) || (d.servers || []).find(s => s.online);
          const codes = (active && active.countries || []).map(c => c.code);
          return prev && codes.includes(prev) ? prev : (codes.includes('NG') ? 'NG' : codes[0] || null);
        });
      })
      .catch(() => { setServers([]); setCatalog(null); });
  }, [selectedServer]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Keep availability and prices fresh while the page is open.
  useEffect(() => {
    const t = setInterval(loadCatalog, 60000);
    return () => clearInterval(t);
  }, [loadCatalog]);

  const loadOrders = useCallback(() => {
    base44.functions.invoke('virtualNumbers', { action: 'my_rentals' })
      .then(res => setOrders((res.data || res).rentals || []))
      .catch(() => setOrders([]));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const sms = catalog && catalog.smsServices ? catalog.smsServices : [];
  const q = search.trim().toLowerCase();

  const socialRows = useMemo(
    () => sms.filter(s => SOCIAL.has(s.id) && (!q || s.id.includes(q))),
    [sms, q]
  );
  const otherRows = useMemo(
    () => sms.filter(s => !SOCIAL.has(s.id) && (!q || s.id.includes(q))),
    [sms, q]
  );
  const rentRows = useMemo(
    () => (catalog && catalog.rentServices ? catalog.rentServices : []).filter(id => !q || id.includes(q)),
    [catalog, q]
  );
  const emailRows = useMemo(
    () => (catalog && catalog.emailProducts ? catalog.emailProducts : []).filter(p => !q || p.id.includes(q) || cleanName(p.id).includes(q)),
    [catalog, q]
  );

  // Batched final-price quotes for the services currently on screen.
  const visibleIds = useMemo(() => {
    let ids = [];
    if (filter === 'all' || filter === 'social') ids = ids.concat(socialRows.map(s => s.id));
    if (filter === 'all' || filter === 'other') ids = ids.concat(otherRows.slice(0, MAX_OTHER_ROWS).map(s => s.id));
    return ids;
  }, [filter, socialRows, otherRows]);

  useEffect(() => {
    if (!catalog || !selectedServer || !country || !catalog.online) return;
    const missing = visibleIds.filter(id => !requestedRef.current.has(country + ':' + id)).slice(0, QUOTE_LIMIT);
    if (!missing.length) return;
    for (const id of missing) requestedRef.current.add(country + ':' + id);
    let cancelled = false;
    (async () => {
      for (let i = 0; i < missing.length; i += QUOTE_BATCH) {
        if (cancelled) return;
        const batch = missing.slice(i, i + QUOTE_BATCH);
        try {
          const res = await base44.functions.invoke('virtualNumbers', { action: 'quote', serverId: selectedServer, country, services: batch });
          if (cancelled) return;
          setPrices(prev => ({ ...prev, ...((res.data || res).prices || {}) }));
        } catch (e) {
          if (cancelled) return;
          const failed = {};
          batch.forEach(id => { failed[id] = { available: false, customerPrice: null }; });
          setPrices(prev => ({ ...prev, ...failed }));
          return;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [catalog, country, selectedServer, visibleIds]);

  const onCountryChange = (code) => {
    setCountry(code);
    setPrices({});
    requestedRef.current = new Set();
  };

  const chooseServer = (server) => {
    if (!server.online) return;
    setSelectedServer(server.id);
    setCatalog(server);
    setCountry((server.countries || []).some(c => c.code === country) ? country : ((server.countries || [])[0] || {}).code || null);
    setPrices({});
    requestedRef.current = new Set();
  };

  const priceFor = (id) => {
    const p = prices[id];
    if (!p) return null; // still checking
    return p.available && p.customerPrice ? formatNaira(p.customerPrice) : false;
  };

  const countryName = ((catalog && catalog.countries) || []).find(c => c.code === country) || {};
  const rentAreas = (catalog && catalog.rentAreas) || [];
  const rentFromPrice = useMemo(() => {
    let min = null;
    for (const a of rentAreas) {
      const one = (a.durations || []).find(d => d.months === 1);
      if (one && (min === null || one.customerPrice < min)) min = one.customerPrice;
    }
    return min;
  }, [rentAreas]);

  const call = async (payload, okTitle, okDesc) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('virtualNumbers', payload);
      loadOrders();
      refresh();
      if (okTitle) toast({ title: okTitle, description: okDesc });
      return res.data || res;
    } catch (e) {
      const d = e.response && e.response.data;
      toast({ title: 'Action failed', description: (d && d.error) || e.message, variant: 'destructive' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const complete = async (rental) => {
    await call({ action: 'complete', rentalId: rental.id }, 'Rental complete ✅', 'The seller has been paid.');
  };

  const cancel = async (rental) => {
    await call(
      rental.isLive
        ? { action: 'provider_cancel', rentalId: rental.id }
        : { action: 'cancel', rentalId: rental.id },
      'Order cancelled', 'You were refunded in full.'
    );
  };

  const activeOrders = (orders || []).filter(r => r.status === 'active').length;
  const showSms = filter === 'all' || filter === 'social' || filter === 'other';
  const otherShown = otherRows.slice(0, MAX_OTHER_ROWS);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Phone className="w-6 h-6 text-amber-400" /> Virtual Numbers
          </h1>
          <p className="text-sm text-slate-400 mt-1">Choose a service and get a verification number.</p>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 border-mk-border text-slate-400 hover:text-white shrink-0"
          onClick={loadCatalog}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <Server className="h-3.5 w-3.5 text-amber-400" /> Choose a server
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(servers || []).map(server => (
            <button
              key={server.id}
              type="button"
              disabled={!server.online}
              onClick={() => chooseServer(server)}
              className={'rounded-2xl border p-4 text-left transition-colors ' + (selectedServer === server.id
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-mk-border bg-mk-card2 hover:border-amber-400/60') + (!server.online ? ' opacity-60' : '')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-white">Server {server.id === 'a' ? '1' : '2'}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-400">
                    {server.id === 'a' ? 'Social OTP, email verification and number renting' : 'Virtual-number OTP and rental services'}
                  </div>
                </div>
                {selectedServer === server.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-400" />}
              </div>
              <div className="mt-3 text-[11px] font-bold text-slate-400">
                {server.online ? `${server.smsStock} live services · ${(server.countries || []).length} countries` : 'Currently unavailable'}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value.slice(0, 40))}
          placeholder="Search service"
          className="bg-mk-card2 border-mk-border text-slate-100 h-12 pl-10 rounded-2xl placeholder:text-slate-500"
        />
      </div>

      {/* Filters + My Orders */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={'shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold ' + (filter === f.id
              ? 'border-amber-400 bg-amber-400 text-slate-900'
              : 'border-mk-border bg-mk-card2 text-slate-300')}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setView(v => (v === 'catalog' ? 'orders' : 'catalog'))}
          className={'shrink-0 ml-auto inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold ' + (view === 'orders'
            ? 'border-amber-400 bg-amber-400 text-slate-900'
            : 'border-mk-border bg-mk-card2 text-slate-300')}
        >
          <ClipboardList className="w-3.5 h-3.5" /> My Orders
          {activeOrders > 0 && (
            <span className="min-w-4 h-4 px-1 rounded-full bg-mk-blue text-white text-[9px] font-bold inline-flex items-center justify-center">
              {activeOrders}
            </span>
          )}
        </button>
      </div>

      {/* ---------- Catalogue ---------- */}
      {view === 'catalog' && (
        <div className="space-y-7">
          {catalog === null && (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
          )}

          {servers !== null && servers.length > 0 && !selectedServer && (
            <div className="rounded-2xl border border-mk-border bg-mk-card2 px-4 py-6 text-center">
              <p className="text-sm text-slate-400">Choose an available server to view live services.</p>
            </div>
          )}

          {catalog !== null && catalog.online && selectedServer && (
            <>
              {/* Country selector — only countries the backend supports */}
              {showSms && (catalog.countries || []).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Country</div>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                    {(catalog.countries || []).map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => onCountryChange(c.code)}
                        className={'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ' + (country === c.code
                          ? 'border-mk-blue bg-mk-blue text-white'
                          : 'border-mk-border bg-mk-card2 text-slate-300')}
                      >
                        <span aria-hidden>{flag(c.code)}</span> {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SOCIAL MEDIA OTP */}
              {showSms && (
                <CatalogSection
                  icon={MessageCircle}
                  title="Social Media OTP"
                  count={socialRows.length}
                  empty={socialRows.length === 0}
                  emptyText={q ? 'No social media services match your search.' : 'No social media services available right now.'}
                >
                  {socialRows.map(s => (
                    <CatalogRow
                      key={s.id}
                      name={s.id}
                      availability={s.available === null ? 'Available on demand' : `Available numbers: ${s.available}`}
                      price={priceFor(s.id)}
                      onAction={() => setBuy({ product: 'sms', service: s.id, country, countryName: countryName.name, serverId: selectedServer })}
                    />
                  ))}
                </CatalogSection>
              )}

              {/* OTHER OTP SERVICES */}
              {(filter === 'all' || filter === 'other') && (
                <CatalogSection
                  icon={Hash}
                  title="Other OTP Services"
                  count={otherRows.length}
                  empty={otherRows.length === 0}
                  emptyText={q ? 'No other services match your search.' : 'No other services available right now.'}
                >
                  {otherShown.map(s => (
                    <CatalogRow
                      key={s.id}
                      name={s.id}
                      availability={s.available === null ? 'Available on demand' : `Available numbers: ${s.available}`}
                      price={priceFor(s.id)}
                      onAction={() => setBuy({ product: 'sms', service: s.id, country, countryName: countryName.name, serverId: selectedServer })}
                    />
                  ))}
                  {otherRows.length > MAX_OTHER_ROWS && (
                    <p className="text-[11px] text-slate-500 pt-1">
                      +{otherRows.length - MAX_OTHER_ROWS} more — use the search to find a specific service.
                    </p>
                  )}
                </CatalogSection>
              )}

              {/* RENT A NUMBER */}
              {(filter === 'all' || filter === 'rental') && (
                <CatalogSection
                  icon={CalendarClock}
                  title="Rent a Number"
                  count={rentRows.length}
                  empty={rentRows.length === 0}
                  emptyText={q ? 'No rental services match your search.' : 'Rentals are not available right now.'}
                >
                  {rentRows.map(id => (
                    <CatalogRow
                      key={id}
                      name={id}
                      availability="Dedicated number · 1-12 months"
                      price={rentFromPrice ? `from ${formatNaira(rentFromPrice)}` : null}
                      actionLabel="Rent Number"
                      onAction={() => setRentService(id)}
                    />
                  ))}
                </CatalogSection>
              )}

              {/* EMAIL VERIFICATION */}
              {(filter === 'all' || filter === 'email') && (
                <CatalogSection
                  icon={Mail}
                  title="Email Verification"
                  count={emailRows.length}
                  empty={emailRows.length === 0}
                  emptyText={q ? 'No email options match your search.' : 'Email verification is not available right now.'}
                >
                  {emailRows.map(p => (
                    <CatalogRow
                      key={p.id}
                      name={cleanName(p.id)}
                      availability="Temporary email address"
                      price={p.customerPrice ? formatNaira(p.customerPrice) : false}
                      actionLabel="Get Email"
                      onAction={() => setBuy({ product: 'email', service: p.id, price: p.customerPrice || null, serverId: selectedServer })}
                    />
                  ))}
                </CatalogSection>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------- My Orders ---------- */}
      {view === 'orders' && (
        <div className="space-y-3">
          {orders === null && <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-amber-400" /></div>}
          {orders !== null && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-mk-border px-4 py-10 text-center">
              <p className="text-sm text-slate-400">You have no orders yet — pick a service above to get started.</p>
            </div>
          )}
          {orders !== null && orders.map(r => (
            <RentalCard
              key={r.id}
              rental={r}
              role="buyer"
              busy={busy}
              onComplete={complete}
              onCancel={cancel}
              onChat={(rental) => rental.isLive
                ? navigate('/app/virtual-numbers/order/' + rental.id)
                : setChat({ rental, role: 'buyer' })}
            />
          ))}
        </div>
      )}

      {/* Sheets */}
      <BuySheet
        open={!!buy}
        onOpen={(o) => { if (!o) setBuy(null); }}
        product={buy ? buy.product : 'sms'}
        service={buy ? buy.service : ''}
        country={buy ? buy.country : null}
        countryName={buy ? buy.countryName : null}
        price={buy ? buy.price : null}
        serverId={buy ? buy.serverId : selectedServer}
        onDone={(rental) => {
          setBuy(null);
          refresh();
          loadOrders();
          if (rental && rental.id) navigate('/app/virtual-numbers/order/' + rental.id);
        }}
      />

      <RentSheet
        open={!!rentService}
        onOpen={(o) => { if (!o) setRentService(null); }}
        service={rentService}
        rentServices={catalog ? catalog.rentServices || [] : []}
        rentAreas={rentAreas}
        onDone={(rental) => {
          setRentService(null);
          refresh();
          loadOrders();
          if (rental && rental.id) navigate('/app/virtual-numbers/order/' + rental.id);
        }}
      />

      <RentalChatDialog
        rental={chat ? chat.rental : null}
        role={chat ? chat.role : 'buyer'}
        onClose={() => setChat(null)}
      />
    </div>
  );
}