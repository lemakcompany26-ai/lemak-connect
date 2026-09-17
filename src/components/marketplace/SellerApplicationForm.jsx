import { useState } from 'react';
import { Loader2, Send, Store, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const ACCOUNT_TYPES = ['Individual', 'Business', 'Agency', 'Freelancer', 'Service Provider', 'Digital Product Seller'];
const inputCls = 'h-10 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500 focus-visible:ring-mk-blue';
const textareaCls = 'bg-mk-card2 border-mk-border text-white placeholder:text-slate-500 focus-visible:ring-mk-blue min-h-[90px]';

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-300">
        {label}{required && <span className="text-mk-blue"> *</span>}
      </Label>
      {children}
    </div>
  );
}

export default function SellerApplicationForm({ profile, sellUrl, onSubmitted }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: (profile && profile.fullName) || '',
    username: (profile && profile.username) || '',
    email: (profile && profile.email) || '',
    phone: (profile && profile.phone) || '',
    accountType: '',
    category: '',
    serviceTitle: '',
    description: '',
    price: '',
    deliveryTime: '',
    portfolioUrl: '',
    sellerTerms: '',
    verificationInfo: ''
  });

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('submitSellerApplication', {
        ...form,
        price: Number(String(form.price).replace(/[^0-9.]/g, ''))
      });
      const data = (res && res.data) || {};
      toast({
        title: 'Application submitted 🎉',
        description: data.sheetSaved === false
          ? `Saved with reference ${data.listingId}, but we could not reach your records sheet just now.`
          : `Reference ${data.listingId}. Your details have been saved and your application is pending review.`
      });
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: (err.response && err.response.data && err.response.data.error) || err.message,
        variant: 'destructive'
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-5 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-mk-blue/15 flex items-center justify-center">
          <Store className="w-6 h-6 text-mk-blue" />
        </div>
        <h3 className="font-heading font-extrabold text-white text-lg">Sell your digital service on Lemak Connect</h3>
        <p className="text-xs text-slate-400">
          Apply below — your details are saved automatically to our records. Every submission is reviewed by our team, and only approved listings become publicly available.
        </p>
      </div>

      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4 text-left">
        <Field label="Full name" required>
          <Input className={inputCls} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Adewale Johnson" required />
        </Field>
        <Field label="Username">
          <Input className={inputCls} value={form.username} onChange={e => set('username', e.target.value)} placeholder="Your handle" />
        </Field>
        <Field label="Email address" required>
          <Input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required />
        </Field>
        <Field label="Phone / WhatsApp">
          <Input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="080..." />
        </Field>
        <Field label="Account type" required>
          <Select value={form.accountType} onValueChange={v => set('accountType', v)}>
            <SelectTrigger className={inputCls}><SelectValue placeholder="Select account type" /></SelectTrigger>
            <SelectContent className="bg-mk-card border-mk-border">
              {ACCOUNT_TYPES.map(t => (
                <SelectItem key={t} value={t} className="text-white focus:bg-mk-blue focus:text-white">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Service category" required>
          <Input className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Graphic Design, Social Media" required />
        </Field>
        <Field label="Service title" required>
          <Input className={inputCls} value={form.serviceTitle} onChange={e => set('serviceTitle', e.target.value)} placeholder="e.g. Logo design for brands" required />
        </Field>
        <Field label="Price (₦)" required>
          <Input type="number" min="0" step="any" className={inputCls} value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 5000" required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Service description" required>
            <Textarea className={textareaCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What do you offer, what is included, and what do you need from the buyer?" required />
          </Field>
        </div>
        <Field label="Delivery time" required>
          <Input className={inputCls} value={form.deliveryTime} onChange={e => set('deliveryTime', e.target.value)} placeholder="e.g. 3 days" required />
        </Field>
        <Field label="Portfolio link (optional)">
          <Input className={inputCls} value={form.portfolioUrl} onChange={e => set('portfolioUrl', e.target.value)} placeholder="https://..." />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Seller terms (optional)">
            <Textarea className={textareaCls} value={form.sellerTerms} onChange={e => set('sellerTerms', e.target.value)} placeholder="Cancellation policy, revisions, support..." />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Verification info (optional)">
            <Input className={inputCls} value={form.verificationInfo} onChange={e => set('verificationInfo', e.target.value)} placeholder="Anything that helps us verify you" />
          </Field>
        </div>
        <div className="sm:col-span-2 flex flex-col gap-3 pt-1">
          <Button type="submit" disabled={busy} className="h-12 font-bold bg-mk-blue hover:bg-mk-blue/90 text-white">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {busy ? 'Submitting…' : 'SUBMIT APPLICATION'}
          </Button>
          <p className="text-xs text-mk-brown-soft text-center">Every order is protected by escrow and a fair platform commission.</p>
          <p className="text-xs text-slate-500 text-center">
            Prefer the online form?{' '}
            <a href={sellUrl} target="_blank" rel="noreferrer" className="text-mk-blue-soft underline">
              Apply via Google Form <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}