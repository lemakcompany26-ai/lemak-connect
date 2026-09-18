import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useToast } from '@/components/ui/use-toast';
import ServiceList from '@/components/vnum/ServiceList';
import RentDurationPicker from '@/components/vnum/RentDurationPicker';
import { firePurchaseConversion } from '@/lib/ads';

const flag = code => code.replace(/./g, ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65));
const RENT_POPULAR = ['whatsapp', 'telegram', 'facebook', 'instagram', 'tiktok', 'google', 'amazon', 'openai'];

// Rent-a-number drawer: pick the rentable service, country and duration
// (1 / 3 / 12 months). Prices are final customer prices from the backend.
export default function RentSheet({ open, onOpen, service, rentServices, rentAreas, onDone }) {
  const { toast } = useToast();
  const [svc, setSvc] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [months, setMonths] = useState(1);
  const [autoRenew, setAutoRenew] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSvc(service || (rentServices || [])[0] || '');
    setAreaCode(((rentAreas || [])[0] || {}).code || '');
    setMonths(1);
    setAutoRenew(false);
    setBusy(false);
  }, [open, service, rentServices, rentAreas]);

  const area = (rentAreas || []).find(a => a.code === areaCode) || null;
  const durations = area ? (area.durations || []) : [];

  const buy = async () => {
    if (!svc || !area) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('virtualNumbers', {
        action: 'provider_rent', product: 'rent',
        serviceName: svc, country: areaCode, months, autoRenew
      });
      const d = res.data || res;
      firePurchaseConversion({ value: d.rental ? d.rental.amount : null, transactionId: d.rental ? d.rental.id : null });
      toast({ title: 'Number rented 🎉', description: 'Opening your number screen — every SMS it receives appears there automatically.' });
      if (onDone && d.rental) onDone({ id: d.rental.id });
    } catch (e) {
      const d = e.response && e.response.data;
      toast({
        title: 'Purchase failed',
        description: (d && d.error) || 'Rentals are temporarily unavailable. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpen}>
      <DrawerContent className="bg-mk-bg border-mk-border max-h-[88vh] overflow-y-auto">
        <DrawerHeader className="pb-2 sm:pb-2 text-left">
          <DrawerTitle className="font-heading text-sm font-extrabold text-white uppercase tracking-wide">
            RENT A NUMBER
          </DrawerTitle>
          <DrawerDescription className="text-[11px] text-slate-400">
            Keep a dedicated number for 1, 3 or 12 months.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-5 space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Service</div>
            <ServiceList
              options={rentServices || []}
              value={svc}
              onChange={setSvc}
              popular={RENT_POPULAR}
              placeholder="Search services"
            />
          </div>
          {(rentAreas || []).length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Country</div>
              <div className="flex gap-1.5 flex-wrap">
                {(rentAreas || []).map(a => (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => setAreaCode(a.code)}
                    className={'rounded-full border px-3 py-1 text-[11px] font-bold ' + (areaCode === a.code
                      ? 'border-mk-blue bg-mk-blue text-white'
                      : 'border-mk-border bg-mk-card2 text-slate-300')}
                  >
                    {flag(a.code)} {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {durations.length > 0 ? (
            <RentDurationPicker
              durations={durations}
              months={months}
              onMonths={setMonths}
              autoRenew={autoRenew}
              onAutoRenew={setAutoRenew}
              busy={busy}
              onRent={buy}
            />
          ) : (
            <p className="text-xs text-slate-500">Rentals are not available right now.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}