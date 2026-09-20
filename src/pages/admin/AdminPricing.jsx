import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira } from '@/lib/format';

const SERVICE_SLUGS = ['airtime', 'data', 'electricity', 'cable', 'betting', 'education', 'epin', 'broadband', 'virtual_number', 'smm', 'marketplace'];

const EMPTY_FORM = { name: '', scope: 'global', serviceSlug: '', fixedFee: '0', percentageFee: '0', providerCharge: '0', adminMarkup: '0', minimumFee: '0', maximumFee: '', priority: '0' };

function FeeRuleForm({ onSaved, rule, open, onOpenChange }) {
  const { toast } = useToast();
  const setOpen = onOpenChange;
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setForm(rule ? {
      name: rule.name || '',
      scope: rule.scope || 'global',
      serviceSlug: rule.serviceSlug || '',
      fixedFee: String(rule.fixedFee ?? 0),
      percentageFee: String(rule.percentageFee ?? 0),
      providerCharge: String(rule.providerCharge ?? 0),
      adminMarkup: String(rule.adminMarkup ?? 0),
      minimumFee: String(rule.minimumFee ?? 0),
      maximumFee: rule.maximumFee == null ? '' : String(rule.maximumFee),
      priority: String(rule.priority ?? 0)
    } : EMPTY_FORM);
  }, [open, rule]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        scope: form.scope,
        serviceSlug: form.scope === 'service' ? form.serviceSlug : null,
        fixedFee: Number(form.fixedFee) || 0,
        percentageFee: Number(form.percentageFee) || 0,
        providerCharge: Number(form.providerCharge) || 0,
        adminMarkup: Number(form.adminMarkup) || 0,
        minimumFee: Number(form.minimumFee) || 0,
        maximumFee: form.maximumFee === '' ? null : Number(form.maximumFee),
        priority: Number(form.priority) || 0,
        isActive: rule ? rule.isActive : true
      };
      if (rule) {
        await base44.entities.FeeRule.update(rule.id, payload);
        toast({ title: 'Fee rule updated' });
      } else {
        await base44.entities.FeeRule.create(payload);
        toast({ title: 'Fee rule created' });
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast({ title: 'Could not save rule', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{rule ? 'Edit Fee Rule' : 'Create Fee Rule'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Airtime 5% + ₦20" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={v => set('scope', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all services)</SelectItem>
                  <SelectItem value="service">Specific service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope === 'service' && (
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={form.serviceSlug} onValueChange={v => set('serviceSlug', v)}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>{SERVICE_SLUGS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg p-3">
            Customer price = provider cost + provider charge + fixed fee + % fee + markup (clamped to min/max).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Provider Charge (₦)</Label><Input type="number" step="0.01" value={form.providerCharge} onChange={e => set('providerCharge', e.target.value)} /></div>
            <div className="space-y-2"><Label>Fixed Fee (₦)</Label><Input type="number" step="0.01" value={form.fixedFee} onChange={e => set('fixedFee', e.target.value)} /></div>
            <div className="space-y-2"><Label>Percentage Fee (%)</Label><Input type="number" step="0.1" value={form.percentageFee} onChange={e => set('percentageFee', e.target.value)} /></div>
            <div className="space-y-2"><Label>Admin Markup (%)</Label><Input type="number" step="0.1" value={form.adminMarkup} onChange={e => set('adminMarkup', e.target.value)} /></div>
            <div className="space-y-2"><Label>Minimum Fee (₦)</Label><Input type="number" step="0.01" value={form.minimumFee} onChange={e => set('minimumFee', e.target.value)} /></div>
            <div className="space-y-2"><Label>Maximum Fee (₦)</Label><Input type="number" step="0.01" value={form.maximumFee} onChange={e => set('maximumFee', e.target.value)} placeholder="No cap" /></div>
          </div>
          <Button type="submit" className="w-full h-11 font-semibold" disabled={saving || !form.name}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (rule ? 'Save Changes' : 'Create Rule')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPricing() {
  const { toast } = useToast();
  const [rules, setRules] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (rule) => { setEditing(rule); setFormOpen(true); };

  const load = () => base44.entities.FeeRule.list('-priority', 100).then(setRules).catch(() => setRules([]));
  useEffect(() => { load(); }, []);

  const toggle = async (rule) => {
    try {
      await base44.entities.FeeRule.update(rule.id, { isActive: !rule.isActive });
      load();
    } catch (err) {
      toast({ title: 'Could not update rule', description: err.message, variant: 'destructive' });
    }
  };

  const remove = async (rule) => {
    try {
      await base44.entities.FeeRule.delete(rule.id);
      toast({ title: 'Rule deleted' });
      load();
    } catch (err) {
      toast({ title: 'Could not delete rule', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Pricing & Fees</h1>
          <p className="text-sm text-muted-foreground mt-1">All customer prices are calculated on the backend from these rules.</p>
        </div>
        <Button onClick={openNew} className="h-10 font-semibold"><Plus className="w-4 h-4 mr-1.5" /> New Fee Rule</Button>
      </div>

      <FeeRuleForm
        rule={editing}
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        onSaved={load}
      />

      <div className="space-y-3">
        {rules === null && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {rules && rules.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No fee rules yet — customers currently pay exact provider cost. Create a rule to start earning.
          </div>
        )}
        {rules && rules.map(r => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{r.name}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-muted border-border text-muted-foreground">
                  {r.scope === 'service' ? r.serviceSlug : 'global'}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Charge {formatNaira(r.providerCharge || 0)} · Fixed {formatNaira(r.fixedFee || 0)} · {r.percentageFee || 0}% fee · {r.adminMarkup || 0}% markup
                {r.minimumFee ? ` · min ${formatNaira(r.minimumFee)}` : ''}{r.maximumFee ? ` · max ${formatNaira(r.maximumFee)}` : ''} · priority {r.priority || 0}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Switch checked={r.isActive} onCheckedChange={() => toggle(r)} />
                {r.isActive ? 'Active' : 'Off'}
              </div>
              <button onClick={() => openEdit(r)} className="p-2 rounded-lg text-primary hover:bg-primary/10" aria-label="Edit rule">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(r)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" aria-label="Delete rule">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}