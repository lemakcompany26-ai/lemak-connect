import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { useApp } from '@/lib/AppContext';

// Lets every user (buyer, seller or admin) set a profile photo. The image is
// uploaded to permanent public storage and saved on their profile.
export default function ProfileAvatarCard() {
  const { profile, setProfile } = useApp();
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current && inputRef.current.click();

  const upload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast({ title: 'Choose an image', description: 'PNG, JPG or WebP up to 5MB.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const updated = await base44.entities.UserProfile.update(profile.id, { avatar: file_url });
      setProfile({ ...profile, ...updated });
      toast({ title: 'Profile photo updated' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await base44.entities.UserProfile.update(profile.id, { avatar: null });
      setProfile({ ...profile, avatar: null });
      toast({ title: 'Profile photo removed' });
    } catch (err) {
      toast({ title: 'Could not remove photo', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-heading font-bold text-sm">Profile photo</h3>
        <p className="mt-1 text-xs text-muted-foreground">Shown on your profile across Lemak Connect.</p>
      </div>
      <div className="flex items-center gap-4">
        {profile.avatar ? (
          <Image
            src={profile.avatar}
            alt="Profile photo"
            className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
          />
        ) : (
          <div className="w-16 h-16 rounded-full brand-gradient-soft flex items-center justify-center text-white text-2xl font-extrabold">
            {profile.fullName ? profile.fullName[0].toUpperCase() : '?'}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />
        <div className="flex flex-col gap-2 ml-auto">
          <Button size="sm" className="h-9 font-semibold" disabled={busy} onClick={pick}>
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1.5" />}
            {profile.avatar ? 'Change photo' : 'Upload photo'}
          </Button>
          {profile.avatar && (
            <Button size="sm" variant="outline" className="h-9 font-semibold" disabled={busy} onClick={remove}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}