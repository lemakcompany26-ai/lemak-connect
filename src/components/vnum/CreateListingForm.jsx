import { useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const OTP_SERVICES = ['WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'TikTok', 'Twitter / X', 'Google', 'Binance', 'Other'];
const RENTAL_WINDOWS = [10, 15, 30, 60, 120];

export default function CreateListingForm({ onCreated }) {
  const { toast } = useToast();
  const [service, setService] = useState('');
  const [number, setNumber] = useState('');
  const [price, setPrice] = useState('');
  const [rentalMinutes, setRentalMinutes] = useState('15');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!service) return toast({ title: 'Choose a service', variant: 'destructive' });
    setBusy(true);
    try {
      const res = await base44.functions.invoke('virtualNumbers', {
        action: 'create_listing',
        service, number, price: Number(price), rentalMinutes: Number(rentalMinutes), description
      });
      const d = res.data || res;
      if (d.ok !== true) throw new Error(d.error || 'Could not list this number');
      toast({ title: 'Number listed 🎉', description: 'It is now live in Browse.' });
      setService(''); setNumber(''); setPrice(''); setDescription('');
      if (onCreated) onCreated();
    } catch (err) {
      const d = err.response && err.response.data;
      toast({ title: 'Listing failed', description: (d && d.error) || err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-mk-card border border-mk-border p-5 space-y-4">
      <h3 className="text-sm font-bold text-white">List a number</h3>
      <p className="text-xs text-slate-400 -mt-2">Renters pay per rental window. Deliver OTPs in the private chat and get paid when they confirm.</p>

      <div className="space-y-2">
        <Label className="text-slate-200">Service</Label>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="bg-mk-card2 border-mk-border text-slate-100 h-11"><SelectValue placeholder="What is this number for?" /></SelectTrigger>
          <SelectContent>
            {OTP_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-slate-200" htmlFor="vn-number">Phone number</Label>
          <Input id="vn-number" value={number} onChange={(e) => setNumber(e.target.value.slice(0, 16))} placeholder="+2348012345678" className="bg-mk-card2 border-mk-border text-slate-100 h-11 font-mono" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-200" htmlFor="vn-price">Price (₦)</Label>
          <Input id="vn-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="200" className="bg-mk-card2 border-mk-border text-slate-100 h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Rental window</Label>
        <div className="grid grid-cols-5 gap-2">
          {RENTAL_WINDOWS.map(m => (
            <button key={m} type="button" onClick={() => setRentalMinutes(String(m))}
              className={'rounded-xl border-2 py-2 text-xs font-bold transition-all ' + (rentalMinutes === String(m) ? 'border-mk-blue bg-mk-blue/10 text-mk-blue-soft' : 'border-mk-border text-slate-400 hover:border-mk-blue/40')}>
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200" htmlFor="vn-desc">Description (optional)</Label>
        <Textarea id="vn-desc" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 300))} placeholder="e.g. Fresh number, works for new account signups" className="bg-mk-card2 border-mk-border text-slate-100 min-h-[70px]" />
      </div>

      <Button type="submit" className="w-full h-11 bg-mk-blue hover:bg-mk-blue/90 text-white font-bold" disabled={busy || !service || !number || !price}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
        List this number
      </Button>
    </form>
  );
}