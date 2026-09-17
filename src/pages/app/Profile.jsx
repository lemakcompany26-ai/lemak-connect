import { useState } from 'react';
import { UserCircle, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/AppContext';
import { formatDate } from '@/lib/format';

export default function Profile() {
  const { profile, setProfile } = useApp();
  const [fullName, setFullName] = useState(profile ? profile.fullName : '');
  const [phone, setPhone] = useState(profile ? profile.phone : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await base44.entities.UserProfile.update(profile.id, { fullName: fullName.trim(), phone: phone.trim() });
      setProfile({ ...profile, ...updated });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="py-16 text-center text-sm text-muted-foreground">Loading profile…</div>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><UserCircle className="w-6 h-6 text-primary" /> Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Your Lemak Connect identity.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full brand-gradient-soft flex items-center justify-center text-white text-2xl font-extrabold">
            {profile.fullName ? profile.fullName[0].toUpperCase() : '?'}
          </div>
          <div>
            <div className="font-heading font-bold">{profile.fullName}</div>
            <div className="text-sm text-muted-foreground">@{profile.username}</div>
          </div>
          <span className="ml-auto text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border bg-primary/5 border-primary/20 text-primary">{profile.role.replace('_', ' ')}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="font-semibold truncate mt-0.5">{profile.email}</div>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">Member since</div>
            <div className="font-semibold mt-0.5">{formatDate(profile.created_date)}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading font-bold text-sm">Editable details</h3>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="h-12" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <Input value={profile.username} disabled className="h-12 bg-muted/50" />
          <p className="text-xs text-muted-foreground">Username can't be changed after registration.</p>
        </div>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        {saved && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">Profile updated.</div>}
        <Button type="submit" className="h-12 font-semibold" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save changes</>}
        </Button>
      </form>
    </div>
  );
}