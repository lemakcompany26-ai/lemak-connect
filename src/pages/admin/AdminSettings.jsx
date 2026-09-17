import { useEffect, useState } from 'react';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';

// Default platform settings, seeded on first load so admins can edit
// the Google marketplace links and marketplace fee from one place.
const DEFAULT_SETTINGS = [
  { key: 'marketplace_fee_percent', value: '15', label: 'Marketplace platform fee (%)', category: 'marketplace' },
  {
    key: 'google_sell_form_url',
    value: 'https://docs.google.com/forms/d/e/1FAIpQLScImMvathwSUGku7WKY_R4E9eo2Ps9k23Fs8qWpU0GmneNAIQ/viewform?usp=headers',
    label: 'Google Form — SELL NOW link',
    category: 'google_links'
  },
  {
    key: 'google_application_sheet_url',
    value: 'https://docs.google.com/spreadsheets/d/1xIItGN3jRwTqymNdHq5RJK2EvwlHOOIccu20DhjmVJ8/edit?usp=drivesdk',
    label: 'Google Sheet — Application responses',
    category: 'google_links'
  },
  {
    key: 'google_buy_sheet_url',
    value: 'https://docs.google.com/spreadsheets/d/1JJcLb_Nw2C-witaftZYpVqp6pW0RlCo9h967yzhcDc/edit?usp=drivesdk',
    label: 'Google Sheet — BUY NOW catalogue',
    category: 'google_links'
  },
  { key: 'support_email', value: 'lemakcompany26@gmail.com', label: 'Support email', category: 'general' },
  { key: 'support_phone', value: '09022143559', label: 'Support phone / WhatsApp', category: 'general' }
];

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const load = async () => {
    const existing = await base44.entities.AdminSetting.list('-created_date', 100).catch(() => []);
    const byKey = {};
    for (const s of existing) byKey[s.key] = s;
    const merged = DEFAULT_SETTINGS.map(d => byKey[d.key] || d);
    setSettings(merged);
    setDrafts(Object.fromEntries(merged.map(s => [s.key, s.value])));
    // seed any missing defaults
    for (const d of DEFAULT_SETTINGS) {
      if (!byKey[d.key]) {
        await base44.entities.AdminSetting.create(d).catch(() => {});
      }
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (s) => {
    setSavingKey(s.key);
    try {
      const existing = await base44.entities.AdminSetting.filter({ key: s.key }, '-created_date', 1);
      const value = drafts[s.key];
      if (existing && existing[0]) {
        await base44.entities.AdminSetting.update(existing[0].id, { value, updatedBy: 'admin' });
      } else {
        await base44.entities.AdminSetting.create({ ...s, value, updatedBy: 'admin' });
      }
      toast({ title: 'Setting saved' });
      load();
    } catch (err) {
      toast({ title: 'Could not save', description: err.message, variant: 'destructive' });
    } finally {
      setSavingKey(null);
    }
  };

  const groups = ['marketplace', 'google_links', 'general'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform configuration. Changes apply immediately everywhere they're used.</p>
      </div>

      {settings === null && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

      {settings !== null && groups.map(group => {
        const rows = settings.filter(s => s.category === group);
        if (rows.length === 0) return null;
        return (
          <div key={group} className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-heading font-bold text-sm mb-4 capitalize">{group.replace('_', ' ')}</h3>
            <div className="space-y-5">
              {rows.map(s => (
                <div key={s.key} className="space-y-2">
                  <Label htmlFor={s.key}>{s.label}</Label>
                  <div className="flex gap-2">
                    <Input id={s.key} value={drafts[s.key] || ''} onChange={e => setDrafts(d => ({ ...d, [s.key]: e.target.value }))} className="flex-1" />
                    {String(drafts[s.key] || '').startsWith('http') && (
                      <a href={drafts[s.key]} target="_blank" rel="noreferrer" className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-primary" aria-label="Open link">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button className="h-10 font-semibold shrink-0" onClick={() => save(s)} disabled={savingKey === s.key}>
                      {savingKey === s.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />} Save
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground/70">{s.updated_date ? `Last updated ${formatDate(s.updated_date)}` : 'Default value'}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}