import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole } from '../../shared/lemak.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;
    const admins = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    if (!((admins && admins[0] && isStaffRole(admins[0].role)) || isAdminEmail(user.email))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || '').trim();
    if (!userId) return Response.json({ error: 'User ID is required' }, { status: 400 });

    const [profiles, wallets, transactions, ledger, promos, referrals, notifications, securityEvents] = await Promise.all([
      service.entities.UserProfile.filter({ userId }, '-created_date', 1),
      service.entities.Wallet.filter({ userId }, '-created_date', 5),
      service.entities.Transaction.filter({ userId }, '-created_date', 500),
      service.entities.WalletLedger.filter({ userId }, '-created_date', 500),
      service.entities.PromoRedemption.filter({ userId }, '-created_date', 200),
      service.entities.Referral.filter({ referrerUserId: userId }, '-created_date', 200),
      service.entities.Notification.filter({ userId }, '-created_date', 200),
      service.entities.SecurityEvent.filter({ userId }, '-created_date', 200)
    ]);
    const profile = profiles && profiles[0];
    if (!profile) return Response.json({ error: 'User not found' }, { status: 404 });

    const events = [
      ...(transactions || []).map(row => ({
        id: `transaction-${row.id}`, kind: 'transaction', at: row.created_date || row.completedAt,
        title: row.service || row.type || 'Transaction',
        detail: row.transactionId || '', status: row.status || null,
        amount: row.amount, metadata: row.metadata || {}, row
      })),
      ...(ledger || []).map(row => ({
        id: `ledger-${row.id}`, kind: 'wallet', at: row.created_date,
        title: row.description || 'Wallet balance change', detail: row.transactionId || '',
        status: row.freezeStatus || null, amount: row.amount, metadata: {}, row
      })),
      ...(promos || []).map(row => ({
        id: `promo-${row.id}`, kind: 'promo', at: row.redeemedAt || row.created_date,
        title: `Promo code used: ${row.promoCode || 'Unknown'}`,
        detail: row.transactionId || '', status: 'redeemed', amount: row.discountApplied || 0,
        metadata: { promoCode: row.promoCode, promoCodeId: row.promoCodeId }, row
      })),
      ...(referrals || []).map(row => ({
        id: `referral-${row.id}`, kind: 'referral', at: row.created_date,
        title: 'Referral registration', detail: row.referredUserId || '',
        status: row.status || null, amount: row.referrerReward || 0, metadata: {}, row
      })),
      ...(notifications || []).map(row => ({
        id: `notification-${row.id}`, kind: 'notification', at: row.created_date,
        title: row.title || 'Notification', detail: row.message || '',
        status: row.isRead ? 'read' : 'unread', amount: null, metadata: {}, row
      })),
      ...(securityEvents || []).map(row => ({
        id: `security-${row.id}`, kind: 'security', at: row.created_date,
        title: row.eventType || 'Security event', detail: row.description || '',
        status: row.severity || null, amount: null, metadata: row.metadata || {}, row
      }))
    ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());

    return Response.json({
      user: { ...profile, userId },
      wallet: wallets && wallets[0] ? wallets[0] : null,
      promoRedemptions: promos || [],
      referrals: referrals || [],
      transactions: transactions || [],
      ledger: ledger || [],
      events
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
