import { useState, useEffect } from 'react';
import { Loader2, Calculator, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira } from '@/lib/format';

const FIELDS = [
  ['commissionPercent', 'Marketplace Commission %', '15'],
  ['buyerFeePercent', 'Buyer Fee %', '0'],
  ['buyerFixedFee', 'Buyer Fixed Fee (₦)', '0'],
  ['sellerListingFee', 'Seller Listing Fee (₦)', '0'],
  ['fixedFee', 'Fixed Marketplace Fee (₦)', '0'],
  ['minimumFee', 'Minimum Marketplace Fee (₦)', '0'],
  ['maximumFee', 'Maximum Marketplace Fee (₦, 0 = no cap)', '0']
];

const PREVIEW_ROWS = (b) => [
  ['Sale Amount', formatNaira(b.saleAmount)],
  ['Commission', formatNaira(b.commission)],
  ['Buyer Fee', formatNaira(b.buyerFee)],
  ['Seller Receives', formatNaira(b.sellerReceives)],
  ['Platform Receives', formatNaira(b.platformReceives)],
  ['Final Amount (Buyer Pays)', formatNaira(b.buyerTotal)]
];

export default function ChargesPanel({ settings, saving, onSave, onPreview }) {
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [currency, setCurrency] = useState('NGN');
  const [amount, setAmount] = useState('10000');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      commissionPercent: settings.marketplace_commission_percent ?? '15',
      buyerFeePercent: settings.marketplace_buyer_fee_percent ?? '0',
      buyerFixedFee: settings.marketplace_buyer_fixed_fee ?? '0',
      sellerListingFee: settings.marketplace_seller_listing_fee ?? '0',
      fixedFee: settings.marketplace_fixed_fee ?? '0',
      minimumFee: settings.marketplace_minimum_fee ?? '0',
      maximumFee: settings.marketplace_maximum_fee ?? '0'
    });
    setCurrency(settings.marketplace_currency || 'NGN');
  }, [settings]);

  useEffect(() => {
    if (settings) onPreview(10000).then(setPreview).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const runPreview = async () => {
    setPreviewing(true);
    try {
      setPreview(await onPreview(Number(amount) || 0));
    } catch (err) {
      toast({ title: 'Preview failed', description: err.message, variant: 'destructive' });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-2xl bg-mk-card border border-mk-border p-5 space-y-4">
        <div>
          <h3 className="font-heading font-bold text-white">Marketplace Charges</h3>
          <p className="text-xs text-slate-400 mt-1">All marketplace fees are calculated on the backend. Default commission: 15%.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map(([key, label, ph]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-slate-300">{label}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form[key] ?? ''}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="h-11 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Currency</Label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="NGN"
              className="h-11 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500"
            />
          </div>
        </div>
        <Button className="w-full h-12 font-bold bg-mk-blue hover:bg-mk-blue/90 text-white" onClick={() => onSave({ ...form, currency })} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving…' : 'Save Charges'}
        </Button>
      </div>

      <div className="rounded-2xl bg-mk-card border border-mk-border p-5 space-y-4">
        <div>
          <h3 className="font-heading font-bold text-white">Admin Preview</h3>
          <p className="text-xs text-slate-400 mt-1">See exactly how charges apply — computed by the backend with current settings.</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 bg-mk-card2 border-mk-border text-white"
            placeholder="Sale amount"
          />
          <Button variant="outline" className="h-11 px-5 border-mk-border text-slate-200 hover:bg-mk-card2 font-semibold" onClick={runPreview} disabled={previewing}>
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
          </Button>
        </div>
        <div className="rounded-xl bg-mk-card2 border border-mk-border divide-y divide-mk-border overflow-hidden">
          {preview ? PREVIEW_ROWS(preview).map(([label, value], i) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-slate-400">{label}</span>
              <span className={`font-bold ${i === 3 ? 'text-mk-brown-soft' : i === 5 ? 'text-mk-blue-soft' : 'text-white'}`}>{value}</span>
            </div>
          )) : (
            <div className="px-4 py-6 text-center text-xs text-slate-500">Enter a sale amount to preview the charges.</div>
          )}
        </div>
      </div>
    </div>
  );
}