import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, notifyUser } from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';

// Creates the user's profile, wallet (NGN, 0.00) and notification preferences
// after registration. Idempotent — safe to call on every login.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const existingProfiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    if (existingProfiles && existingProfiles[0]) {
      return Response.json({ profile: existingProfiles[0], alreadyOnboarded: true });
    }

    const body = await req.json().catch(() => ({}));
    const fullName = String(body.fullName || user.full_name || '').trim();
    const username = String(body.username || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const promoCode = String(body.promoCode || '').trim().toUpperCase();

    // Server-side promo verification: only live, active codes are accepted.
    if (promoCode) {
      const promos = await service.entities.PromoCode.filter({ code: promoCode }, '-created_date', 10);
      const promo = promos && promos[0];
      const promoInvalid = () => Response.json({ error: 'That promo code is not valid or active. Please clear it and try again.' }, { status: 400 });
      if (!promo || !promo.isActive) return promoInvalid();
      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return promoInvalid();
      if (promo.totalUsageLimit != null && (promo.totalUsageCount || 0) >= Number(promo.totalUsageLimit)) return promoInvalid();
    }

    if (!fullName) return Response.json({ error: 'Full name is required' }, { status: 400 });
    if (!username || username.length < 3) return Response.json({ error: 'Username must be at least 3 characters' }, { status: 400 });

    const dupUsernames = await service.entities.UserProfile.filter({ username }, '-created_date', 1);
    if (dupUsernames && dupUsernames[0] && dupUsernames[0].userId !== user.id) {
      return Response.json({ error: 'That username is already taken' }, { status: 409 });
    }

    const role = isAdminEmail(user.email) ? 'super_admin' : 'customer';
    const profile = await service.entities.UserProfile.create({
      userId: user.id, fullName, username, email: user.email,
      phone, role, accountStatus: 'active',
      referredByPromoCode: promoCode || null,
      lastLoginAt: new Date().toISOString()
    });

    let wallet = null;
    const existingWallets = await service.entities.Wallet.filter({ userId: user.id }, '-created_date', 1);
    if (existingWallets && existingWallets[0]) {
      wallet = existingWallets[0];
    } else {
      wallet = await service.entities.Wallet.create({ userId: user.id, currency: 'NGN', balance: 0, status: 'active' });
    }

    const existingPrefs = await service.entities.NotificationPreference.filter({ userId: user.id }, '-created_date', 1);
    if (!existingPrefs || !existingPrefs[0]) {
      await service.entities.NotificationPreference.create({ userId: user.id });
    }

    await notifyUser(service, {
      userId: user.id, type: 'system',
      title: 'Welcome to Lemak Connect',
      message: 'Your account is ready. Fund your wallet to start enjoying instant airtime, data, bills and more.',
      actionUrl: '/app/wallet'
    });

    await sendTransactionalEmail(service, {
      emailType: 'WELCOME', userId: user.id, recipientEmail: user.email,
      recipientName: fullName, transactionId: `signup-${user.id}`,
      data: { name: fullName }
    });

    return Response.json({ profile, wallet, alreadyOnboarded: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}