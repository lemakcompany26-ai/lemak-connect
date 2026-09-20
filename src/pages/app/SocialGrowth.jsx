import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Loader2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/lib/AppContext';
import { formatNaira } from '@/lib/format';
import PurchaseFormFooter from '@/components/app/PurchaseFormFooter';
import PurchaseSuccess from '@/components/app/PurchaseSuccess';
import TransactionProcessingOverlay, { PROCESSING_DURATION_MS } from '@/components/app/TransactionProcessingOverlay';

export default function SocialGrowth() {
  const { setWalletLocal } = useApp();
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [services, setServices] = useState(null);
  const [servicesError, setServicesError] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [preview, setPreview] = useState(null);
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [pin, setPin] = useState('');
  const [biometricToken, setBiometricToken] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    base44.functions.invoke('smmService', { action: 'categories' })
      .then(res => {
        const d = res.data || res;
        setCategories(d.categories || []);
      })
      .catch(() => setCategories([]));
  }, []);

  const loadServices = async (searchOverride) => {
    const searchTerm = searchOverride !== undefined ? searchOverride : search;
    setServices(null); setServicesError(''); setSelectedService(null);
    try {
      const res = await base44.functions.invoke('smmService', { action: 'services', category: category || null, search: searchTerm || null, limit: 300 });
      const d = res.data || res;
      setServices(d.services || []);
    } catch (err) {
      const d = err.response && err.response.data;
      setServicesError((d && d.error) || err.message || 'Could not load services');
      setServices([]);
    }
  };

  useEffect(() => { loadServices(); }, [category]);

  // Price preview (authoritative recalculation happens again at purchase)
  useEffect(() => {
    const qty = Math.floor(Number(quantity) || 0);
    if (!selectedService || !qty) { setPreview(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('smmService', { action: 'preview', serviceId: selectedService.id, quantity: qty });
        const d = res.data || res;
        if (!cancelled) setPreview(d);
      } catch (err) {
        if (!cancelled) setPreview(null);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [selectedService, quantity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedService) return setError('Select a service');
    if (!link) return setError('Enter the link the order should be delivered to');
    if (!quantity || Number(quantity) < selectedService.min) return setError(`Minimum quantity is ${selectedService.min.toLocaleString()}`);
    setLoading(true); setProcessing(true);
    // Branded pre-provider preparation window. No provider request is made during this animation.
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DURATION_MS));
    try {
      const res = await base44.functions.invoke('smmService', {
        action: 'purchase', serviceId: selectedService.id, link, quantity: Math.floor(Number(quantity)),
        promoCode: promo ? promo.code : null,
        pin: pin || null, biometricToken: biometricToken || null
      });
      const d = res.data || res;
      if (d.wallet) setWalletLocal(d.wallet);
      setSuccess(d.transaction);
    } catch (err) {
      const d = err.response && err.response.data;
      setError((d && (d.error || d.message)) || err.message || 'Order failed');
      if (d && d.wallet) setWalletLocal(d.wallet);
    } finally {
      setProcessing(false); setLoading(false); setBiometricToken('');
    }
  };

  if (success) {
    const m = success.metadata || {};
    return (
      <PurchaseSuccess
        title="Order placed!"
        subtitle={`${m.serviceName} × ${(m.quantity || 0).toLocaleString()} is being delivered to ${success.recipient}.`}
        transaction={success}
        onReset={() => { setSuccess(null); setSelectedService(null); setQuantity(''); setLink(''); }}
        resetLabel="New order"
      />
    );
  }

  const qtyNum = Math.floor(Number(quantity) || 0);
  const validQty = selectedService && qtyNum >= selectedService.min && qtyNum <= selectedService.max;
  const displayPrice = preview && validQty ? preview.customerPrice : null;

  return (
    <div className="max-w-lg space-y-6">
      <TransactionProcessingOverlay visible={processing} />
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><TrendingUp className="w-6 h-6 text-primary" /> Social Growth</h1>
        <p className="text-sm text-muted-foreground mt-1">Real likes, views, followers & more — order straight from your wallet.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={v => setCategory(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name} ({c.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input id="search" value={search} onChange={e => {
                const v = e.target.value;
                setSearch(v);
                if (searchTimer.current) clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(() => loadServices(v), 400);
              }} placeholder="Search services…" className="h-11 pl-9" />
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-2.5 block">Select Service</Label>
          {services === null && <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading services…</div>}
          {servicesError && <div className="py-6 text-center text-sm text-destructive">{servicesError}</div>}
          {services && services.length === 0 && !servicesError && (
            <div className="py-6 text-center text-sm text-muted-foreground">No services match{search ? ` "${search}"` : ''}. Try another search.</div>
          )}
          <div className="max-h-72 overflow-y-auto scrollbar-thin space-y-2 pr-1">
            {services && services.map(s => (
              <button key={s.id} type="button" onClick={() => { setSelectedService(s); setQuantity(''); setPreview(null); }}
                className={'w-full rounded-xl border-2 p-4 text-left transition-all ' + (selectedService && selectedService.id === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                <div className="text-sm font-bold">{s.name}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate pr-2">{s.category}</span>
                  <span className="shrink-0">₦{(s.rate).toFixed(2)} / 1,000 · min {s.min.toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedService && (
          <>
            <div className="space-y-2">
              <Label htmlFor="link">Link / Username</Label>
              <Input id="link" value={link} onChange={e => setLink(e.target.value.trim().slice(0, 300))} placeholder={selectedService.category.toLowerCase().includes('follower') || selectedService.category.toLowerCase().includes('like') ? 'https://instagram.com/yourprofile' : 'https://…'} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity ({selectedService.min.toLocaleString()} – {selectedService.max.toLocaleString()})</Label>
              <Input id="quantity" inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value.replace(/\D/g, ''))} placeholder={`e.g. ${selectedService.min.toLocaleString()}`} className="h-12 text-base" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {displayPrice != null && (
            <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Total for {qtyNum.toLocaleString()}</span>
              <span className="font-extrabold text-primary">{formatNaira(displayPrice)}</span>
            </div>
          )}
          <PurchaseFormFooter
            serviceSlug="smm"
            providerCost={preview && validQty ? preview.providerCost : 0}
            promo={promo} setPromo={setPromo}
            pin={pin} setPin={setPin}
            biometricToken={biometricToken} setBiometricToken={setBiometricToken}
            error={error}
            submitLabel={displayPrice != null ? `Place order — ${formatNaira(displayPrice)}` : 'Select a service & quantity'}
            disabled={!selectedService || !link || !validQty}
            loading={loading}
          />
        </form>
        <p className="text-xs text-muted-foreground">Delivery speed depends on the service — some complete within minutes, others take longer. Your order reference appears on your receipt immediately.</p>
      </div>
    </div>
  );
}