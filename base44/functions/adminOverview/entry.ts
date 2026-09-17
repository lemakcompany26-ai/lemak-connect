import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole, round2 } from '../../shared/lemak.ts';

// Admin-only aggregate stats for the admin dashboard overview.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    const authorized = (profile && isStaffRole(profile.role)) || isAdminEmail(user.email);
    if (!authorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [users, transactions, payments, sellers, notifications] = await Promise.all([
      service.entities.UserProfile.list('-created_date', 500),
      service.entities.Transaction.list('-created_date', 500),
      service.entities.Payment.list('-created_date', 200),
      service.entities.MarketplaceSeller.list('-created_date', 200),
      service.entities.Notification.list('-created_date', 50)
    ]);

    const successful = transactions.filter(t => t.status === 'successful');
    const pending = transactions.filter(t => ['pending', 'processing'].includes(t.status));
    const failed = transactions.filter(t => ['failed', 'refunded', 'reversed'].includes(t.status));
    const revenue = successful.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const fees = successful.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);
    const walletFunded = payments.filter(p => p.status === 'successful').reduce((sum, p) => sum + (Number(p.amount) || 0) / 100, 0);

    const byType = {};
    for (const t of successful) {
      byType[t.type] = (byType[t.type] || 0) + 1;
    }

    return Response.json({
      totals: {
        users: users.length,
        customers: users.filter(u => (u.role || 'customer') === 'customer').length,
        staff: users.filter(u => ['admin', 'super_admin', 'moderator'].includes(u.role)).length,
        transactions: transactions.length,
        successful: successful.length,
        pending: pending.length,
        failed: failed.length,
        revenue: round2(revenue),
        fees: round2(fees),
        walletFunded: round2(walletFunded),
        pendingSellers: sellers.filter(s => s.status === 'pending').length,
        approvedSellers: sellers.filter(s => s.status === 'approved').length
      },
      byType,
      recentTransactions: transactions.slice(0, 10).map(t => ({
        transactionId: t.transactionId, type: t.type, amount: t.amount,
        status: t.status, recipient: t.recipient, created_date: t.created_date
      })),
      recentUsers: users.slice(0, 10).map(u => ({
        fullName: u.fullName, username: u.username, email: u.email,
        role: u.role, accountStatus: u.accountStatus, created_date: u.created_date
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}