import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateTransactionId, isAdminEmail, notifyUser, sendUserEmail, emailTemplate } from '../../shared/lemak.ts';

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

    const emailResult = await sendUserEmail({
      to: user.email,
      subject: 'Welcome to Lemak Connect',
      html: emailTemplate('Welcome to Lemak Connect 🎉',
        `<p>Hi ${fullName},</p><p>Your Lemak Connect account is ready. Your wallet has been created with a starting balance of ₦0.00.</p>
         <p>Fund your wallet to enjoy instant airtime top-ups, data bundles, electricity tokens, cable subscriptions and more.</p>`)
    });
    if (emailResult.sent) {
      await service.entities.Notification.update(
        (await service.entities.Notification.filter({ userId: user.id }, '-created_date', 1))[0].id,
        { sentEmail: true }
      ).catch(() => {});
    }

    return Response.json({ profile, wallet, alreadyOnboarded: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}