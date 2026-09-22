import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ensureWallet, generateReferralIdentity, finalizeReferralReward } from '../../shared/lemak.ts';

// Returns the caller's profile, wallet and notification preferences.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    let profile = profiles && profiles[0] ? profiles[0] : null;
    if (profile && (!profile.referralCode || !profile.referralLink)) {
      const identity = generateReferralIdentity();
      profile = await service.entities.UserProfile.update(profile.id, {
        referralCode: profile.referralCode || identity.code,
        referralLink: profile.referralLink || `https://www.lemakconnect.com/signup?ref=${encodeURIComponent(profile.referralCode || identity.code)}`
      });
    }
    if (profile) await finalizeReferralReward(service, profile);
    const wallet = await ensureWallet(service, user.id);
    const prefsList = await service.entities.NotificationPreference.filter({ userId: user.id }, '-created_date', 1);
    const preferences = prefsList && prefsList[0] ? prefsList[0] : null;

    return Response.json({ user: { id: user.id, email: user.email, full_name: user.full_name }, profile, wallet, preferences });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}