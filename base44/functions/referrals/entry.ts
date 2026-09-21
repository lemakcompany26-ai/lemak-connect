import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;
    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0];
    if (!profile) return Response.json({ error: 'Profile is not ready yet.' }, { status: 409 });
    const referrals = await service.entities.Referral.filter({ referrerUserId: user.id }, '-created_date', 100);
    let code = profile.referralCode || null;
    if (!code) {
      code = `LEMAK${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
      await service.entities.UserProfile.update(profile.id, { referralCode: code });
    }
    return Response.json({
      code,
      link: code ? `https://www.lemakconnect.com/signup?ref=${encodeURIComponent(code)}` : null,
      totalReferrals: (referrals || []).length,
      rewards: (referrals || []).reduce((sum, row) => sum + Number(row.referrerReward || 0), 0),
      history: (referrals || []).map(row => ({
        id: row.id, date: row.created_date, reward: Number(row.referrerReward || 0), status: row.status
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}