import { useEffect, useState } from 'react';
import { Store, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { formatNaira, formatDate } from '@/lib/format';

const ACCOUNT_TYPES = ['Individual', 'Business', 'Agency', 'Freelancer', 'Service Provider', 'Digital Product Seller'];
const CATEGORIES = ['Digital Growth', 'Social Media Marketing', 'SEO', 'Content Creation', 'Graphic Design', 'Branding', 'Video Editing', 'Website Development', 'App Development', 'Influencer Marketing', 'Digital Advertising', 'Email Marketing', 'Consulting', 'Other'];

function SellerApplication({ onSubmitted }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', phone: '', accountType: '', category: '', serviceTitle: '', description: '', price: '', currency: 'NGN', deliveryTime: '', portfolioUrl: '', sellerTerms: '', verificationInfo: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const required = ['fullName', 'username', 'email', 'phone', 'accountType', 'category', 'serviceTitle', 'description', 'price'];
    if (required.some(k => !form[k])) return setError('Please fill all required fields');
    setLoading(true);
    try {
      await base44.entities.MarketplaceSeller.create({ ...form, price: Number(form.price), status: 'pending' });
      toast({ title: 'Application submitted!', description: 'Our team will review your application and contact you.' });
      onSubmitted();
    } catch (err) {
      setError(err.message || 'Could not submit application');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, placeholder, type = 'text', required = true) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}{required ? '' : ' (optional)'}</Label>
      <Input id={key} type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} className="h-11" required={required} />
    </div>
  );

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 space-y-4">
      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        {field('fullName', 'Full Name', 'Adaeze Okafor')}
        {field('username', 'Username', 'adaeze_o')}
        {field('email', 'Email', 'you@example.com', 'email')}
        {field('phone', 'Phone / WhatsApp', '08012345678')}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Account Type</Label>
          <Select value={form.accountType} onValueChange={v => set('accountType', v)}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Service Category</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {field('serviceTitle', 'Service Title', 'e.g. Professional logo design in 48 hours')}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe what you offer, what's included, and why buyers should choose you." required />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {field('price', 'Price (₦)', '15000', 'number')}
        {field('currency', 'Currency', 'NGN', 'text')}
        {field('deliveryTime', 'Delivery Time', 'e.g. 3 days')}
      </div>
      {field('portfolioUrl', 'Portfolio URL', 'https://…', 'url', false)}
      <div className="space-y-2">
        <Label htmlFor="sellerTerms">Seller Terms (optional)</Label>
        <Textarea id="sellerTerms" value={form.sellerTerms} onChange={e => set('sellerTerms', e.target.value)} rows={2} placeholder="Revisions policy, communication expectations…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="verificationInfo">Verification Information (optional)</Label>
        <Textarea id="verificationInfo" value={form.verificationInfo} onChange={e => set('verificationInfo', e.target.value)} rows={2} placeholder="Any links or info that helps us verify you (LinkedIn, past work, business reg…)" />
      </div>
      <p className="text-xs text-muted-foreground">Applications are reviewed by our admin team. Listings only go public after approval. A platform fee applies to completed orders.</p>
      <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Application'}
      </Button>
    </form>
  );
}

export default function Marketplace() {
  const [tab, setTab] = useState('browse');
  const [listings, setListings] = useState(null);
  const [myApplications, setMyApplications] = useState(null);

  const load = () => {
    base44.entities.MarketplaceListing.list('-created_date', 50).then(l => setListings(l.filter(x => x.status === 'approved'))).catch(() => setListings([]));
    base44.entities.MarketplaceSeller.list('-created_date', 10).then(setMyApplications).catch(() => setMyApplications([]));
  };
  useEffect(load, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Store className="w-6 h-6 text-primary" /> Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">Buy and sell trusted digital services.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="sell">Become a Seller</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-5">
          {listings === null && <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}
          {listings && listings.length === 0 && (
            <div className="py-16 text-center border border-dashed border-border rounded-3xl">
              <Store className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">No public listings yet — new sellers are being verified.</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {listings && listings.map(l => (
              <div key={l.id} className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-sm">{l.title}</h3>
                    <span className="text-xs text-muted-foreground">{l.category}</span>
                  </div>
                  <div className="font-heading font-extrabold text-primary">{formatNaira(l.price)}</div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">{l.description}</p>
                <div className="mt-3 text-xs font-semibold text-muted-foreground">Delivery: {l.deliveryTime || '—'}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sell" className="mt-5">
          <SellerApplication onSubmitted={() => { setTab('applications'); load(); }} />
        </TabsContent>

        <TabsContent value="applications" className="mt-5">
          {myApplications && myApplications.length === 0 && (
            <div className="py-16 text-center border border-dashed border-border rounded-3xl text-sm text-muted-foreground">
              You haven't submitted a seller application yet.
            </div>
          )}
          <div className="space-y-3">
            {(myApplications || []).map(a => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{a.serviceTitle || a.accountType}</div>
                  <div className="text-xs text-muted-foreground">Submitted {formatDate(a.created_date)}</div>
                </div>
                <span className={'text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ' +
                  (a.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                   a.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                   a.status === 'suspended' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                   'bg-blue-50 text-blue-700 border-blue-200')}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}