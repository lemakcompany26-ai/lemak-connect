import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, formatNaira } from '@/lib/format';

const SERVICE_SLUGS = ['airtime', 'data', 'electricity', 'cable', 'betting', 'education', 'epin', 'broadband', 'virtual_number', 'smm', 'marketplace'];

function PromoForm({ onSaved }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discountType: 'percentage', discountValue: '', signupBonus: '', qualifyingFundingAmount: '1000', minimumTransaction: '0', maximumDiscount: '', expiresAt: '', totalUsageLimit: '', perUserLimit: '1', restrictedToService: 'any', newUsersOnly: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.PromoCode.create({
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        signupBonus: form.signupBonus === '' ? 0 : Number(form.signupBonus) || 0,
        qualifyingFundingAmount: Number(form.qualifyingFundingAmount) || 1000,
        minimumTransaction: Number(form.minimumTransaction) || 0,
        maximumDiscount: form.maximumDiscount === '' ? null : Number(form.maximumDiscount),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        totalUsageLimit: form.totalUsageLimit === '' ? null : Number(form.totalUsageLimit),
        perUserLimit: Number(form.perUserLimit) || 1,
        restrictedToService: form.restrictedToService === 'any' ? null : form.restrictedToService,
        newUsersOnly: form.newUsersOnly,
        isActive: true
      });
      toast({ title: 'Promo code created' });
      setOpen(false);
      setForm(f => ({ ...f, code: '', discountValue: '' }));
      onSaved();
    } catch (err) {
      toast({ title: 'Could not create promo', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 font-semibold"><Plus className="w-4 h-4 mr-1.5" /> New Promo Code</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="WELCOME10" required /></div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={form.discountType} onValueChange={v => set('discountType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (₦)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{form.discountType === 'percentage' ? 'Discount (%)' : 'Discount (₦)'}</Label><Input type="number" step="0.01" value={form.discountValue} onChange={e => set('discountValue', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Minimum Transaction (₦)</Label><Input type="number" value={form.minimumTransaction} onChange={e => set('minimumTransaction', e.target.value)} /></div>
            <div className="space-y-2"><Label>Max Discount (₦, for %)</Label><Input type="number" value={form.maximumDiscount} onChange={e => set('maximumDiscount', e.target.value)} placeholder="No cap" /></div>
            <div className="space-y-2"><Label>Per-User Limit</Label><Input type="number" value={form.perUserLimit} onChange={e => set('perUserLimit', e.target.value)} /></div>
            <div className="space-y-2"><Label>Signup Bonus (₦)</Label><Input type="number" value={form.signupBonus} onChange={e => set('signupBonus', e.target.value)} placeholder="0 — none" /></div>
            <div className="space-y-2"><Label>Qualifying Funding (₦)</Label><Input type="number" value={form.qualifyingFundingAmount} onChange={e => set('qualifyingFundingAmount', e.target.value)} /></div>
            <div className="space-y-2"><Label>Total Usage Limit</Label><Input type="number" value={form.totalUsageLimit} onChange={e => set('totalUsageLimit', e.target.value)} placeholder="Unlimited" /></div>
            <div className="space-y-2"><Label>Expires</Label><Input type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Restrict to Service</Label>
            <Select value={form.restrictedToService} onValueChange={v => set('restrictedToService', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="any">Any service</SelectItem>{SERVICE_SLUGS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. 10% off for new customers" /></div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label className="text-sm">New users only</Label>
            <Switch checked={form.newUsersOnly} onCheckedChange={v => set('newUsersOnly', v)} />
          </div>
          <Button type="submit" className="w-full h-11 font-semibold" disabled={saving || !form.code || (!form.discountValue && !form.signupBonus)}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Create Promo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPromos() {
  const { toast } = useToast();
  const [promos, setPromos] = useState(null);

  const load = () => base44.entities.PromoCode.list('-created_date', 100).then(setPromos).catch(() => setPromos([]));
  useEffect(() => { load(); }, []);

  const toggle = async (p) => {
    try {
      await base44.entities.PromoCode.update(p.id, { isActive: !p.isActive });
      load();
    } catch (err) {
      toast({ title: 'Could not update promo', description: err.message, variant: 'destructive' });
    }
  };

  const remove = async (p) => {
    try {
      await base44.entities.PromoCode.delete(p.id);
      toast({ title: 'Promo deleted' });
      load();
    } catch (err) {
      toast({ title: 'Could not delete promo', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Promo Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">Validated server-side on every purchase — only these codes give discounts.</p>
        </div>
        <PromoForm onSaved={load} />
      </div>

      <div className="space-y-3">
        {promos === null && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {promos && promos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No promo codes yet.</div>
        )}
        {promos && promos.map(p => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-primary">{p.code}</span>
                <span className="text-xs font-semibold">
                  {p.discountType === 'percentage' ? `${p.discountValue}% off` : `${formatNaira(p.discountValue)} off`}
                </span>
                {p.signupBonus ? <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{formatNaira(p.signupBonus)} signup bonus</span> : null}
                {p.restrictedToService && <span className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded-full">{p.restrictedToService}</span>}
                {p.newUsersOnly && <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">New users</span>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Used {p.totalUsageCount || 0}{p.totalUsageLimit ? `/${p.totalUsageLimit}` : ''} times · {p.perUserLimit || 1} per user
                {p.expiresAt ? ` · expires ${formatDate(p.expiresAt)}` : ' · no expiry'}
                {p.minimumTransaction ? ` · min ${formatNaira(p.minimumTransaction)}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Switch checked={p.isActive} onCheckedChange={() => toggle(p)} />
                {p.isActive ? 'Active' : 'Disabled'}
              </div>
              <button onClick={() => remove(p)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" aria-label="Delete promo">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}