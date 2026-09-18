import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNaira } from '@/lib/format';

// Service presets — the slug loads the currently configured server-side
// pricing rule for that service (airtime 3%, others 20% by default).
const PRESETS = [
  { label: 'Airtime', slug: 'airtime' },
  { label: 'Data', slug: 'data' },
  { label: 'Electricity', slug: 'electricity' },
  { label: 'Cable TV', slug: 'cable' },
  { label: 'Betting', slug: 'betting' },
  { label: 'Education', slug: 'education' },
  { label: 'ePIN / Recharge', slug: 'epin' },
  { label: 'Broadband', slug: 'broadband' },
  { label: 'Virtual Numbers', slug: 'virtual_number' },
  { label: 'Email OTP', slug: 'virtual_number' },
  { label: 'Rental Numbers', slug: 'virtual_number' },
  { label: 'SMM', slug: 'smm' },
  { label: 'Marketplace', slug: 'marketplace' },
  { label: 'Other', slug: null }
];

const num = v => {
  const x = parseFloat(v);
  return isFinite(x) ? x : 0;
};

// Simulation calculator — hypothetical values only. Changing inputs here
// never touches production pricing.
export default function ProfitCalculatorForm({ rules }) {
  const [preset, setPreset] = useState('Airtime');
  const [f, setF] = useState({
    providerCost: '1000', providerCharge: '0', fixedFee: '0', percentageFee: '0',
    adminMarkup: '3', promoDiscount: '0', paymentFee: '0', refundAmount: '0', otherCosts: '0'
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const applyPreset = (label) => {
    setPreset(label);
    const p = PRESETS.find(x => x.label === label);
    const rule = (p && p.slug
      ? (rules || []).find(r => r.scope === 'service' && r.serviceSlug === p.slug)
      : null) || (rules || []).find(r => r.scope === 'global');
    setF(prev => ({
      ...prev,
      providerCharge: rule ? String(rule.providerCharge ?? 0) : '0',
      fixedFee: rule ? String(rule.fixedFee ?? 0) : '0',
      percentageFee: rule ? String(rule.percentageFee ?? 0) : '0',
      adminMarkup: rule ? String(rule.adminMarkup ?? 0) : prev.adminMarkup
    }));
  };

  const calc = useMemo(() => {
    const providerCost = num(f.providerCost);
    const providerCharge = num(f.providerCharge);
    const fixedFee = num(f.fixedFee);
    const pctFeeAmt = (providerCost * num(f.percentageFee)) / 100;
    const baseCost = providerCost + providerCharge + fixedFee + pctFeeAmt;
    const markupAmt = (baseCost * num(f.adminMarkup)) / 100;
    const customerPrice = baseCost + markupAmt - num(f.promoDiscount);
    const grossProfit = customerPrice - providerCost - providerCharge;
    const netProfit = grossProfit - num(f.paymentFee) - num(f.refundAmount) - num(f.otherCosts);
    const margin = customerPrice > 0 ? (netProfit / customerPrice) * 100 : null;
    return { baseCost, customerPrice, grossProfit, netProfit, margin, pctFeeAmt, markupAmt };
  }, [f]);

  const INPUTS = [
    ['providerCost', 'Provider Cost (₦)'],
    ['providerCharge', 'Provider Charge (₦)'],
    ['fixedFee', 'Fixed Fee (₦)'],
    ['percentageFee', 'Percentage Fee (%)'],
    ['adminMarkup', 'Admin Markup (%)'],
    ['promoDiscount', 'Promo Discount (₦)'],
    ['paymentFee', 'Payment Fee (₦)'],
    ['refundAmount', 'Refund Amount (₦)'],
    ['otherCosts', 'Other Costs (₦)']
  ];

  const RESULTS = [
    ['Base Cost', formatNaira(calc.baseCost), 'text-foreground'],
    ['Customer Price', formatNaira(calc.customerPrice), 'text-primary font-extrabold'],
    ['Gross Profit', formatNaira(calc.grossProfit), calc.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'],
    ['Net Profit', formatNaira(calc.netProfit), 'font-extrabold ' + (calc.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')],
    ['Profit Margin', calc.margin === null ? 'N/A' : `${calc.margin.toFixed(2)}%`, calc.margin === null ? 'text-muted-foreground' : (calc.margin >= 0 ? 'text-emerald-600' : 'text-red-600')]
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" /> Profit Calculator
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Presets load the live server-side pricing rule for the selected service. Enter any hypothetical values to simulate.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-3 py-1.5">
          Simulation — not a real transaction
        </span>
      </div>

      <div className="space-y-2">
        <Label>Service preset</Label>
        <Select value={preset} onValueChange={applyPreset}>
          <SelectTrigger className="w-full sm:w-80"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => (
              <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INPUTS.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={'calc-' + key}>{label}</Label>
            <Input
              id={'calc-' + key}
              type="number"
              min="0"
              step="any"
              value={f[key]}
              onChange={e => set(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border overflow-hidden">
        {RESULTS.map(([label, value, cls]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={'font-bold ' + cls}>{value}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Customer Price = Base Cost + Admin Markup − Promo Discount · Net Profit = Gross Profit − Payment Fee − Refund − Other Costs.
        Changing these inputs never changes production pricing.
      </p>
    </div>
  );
}