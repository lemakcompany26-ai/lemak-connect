import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole, notifyUser } from '../../shared/lemak.ts';

// Admin-only actions, each one audited. Roles are verified server-side
// from the profile — never trusted from the frontend.
const ACTIONS = {
  approve_seller: 'seller',
  reject_seller: 'seller',
  suspend_seller: 'seller',
  reinstate_seller: 'seller',
  approve_listing: 'listing',
  reject_listing: 'listing',
  delist_listing: 'listing',
  update_user_status: 'profile',
  update_user_role: 'profile'
};

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

    const body = await req.json();
    const { action, targetId, data } = body;
    const entityKind = ACTIONS[action];
    if (!entityKind) return Response.json({ error: 'Unknown action' }, { status: 400 });

    const audit = (entityType, entityId, details) =>
      service.entities.AdminAuditLog.create({
        adminUserId: user.id, adminEmail: user.email, action,
        entityType, entityId, details: details || {}
      }).catch(() => null);

    if (entityKind === 'seller') {
      const statusMap = { approve_seller: 'approved', reject_seller: 'rejected', suspend_seller: 'suspended', reinstate_seller: 'approved' };
      const sellers = await service.entities.MarketplaceSeller.filter({ id: targetId }, '-created_date', 1);
      const seller = sellers && sellers[0];
      if (!seller) return Response.json({ error: 'Seller not found' }, { status: 404 });
      await service.entities.MarketplaceSeller.update(targetId, {
        status: statusMap[action],
        reviewNotes: (data && data.reviewNotes) || null,
        reviewedBy: user.email
      });
      if (action === 'approve_seller' || action === 'reject_seller') {
        await notifyUser(service, {
          userId: seller.userId, type: 'marketplace',
          title: action === 'approve_seller' ? 'Seller application approved 🎉' : 'Seller application not approved',
          message: action === 'approve_seller'
            ? 'Your marketplace seller application has been approved. You can now create listings.'
            : 'Your seller application was not approved this time. ' + ((data && data.reviewNotes) || 'Contact support for details.'),
          actionUrl: '/app/marketplace'
        });
      }
      await audit('MarketplaceSeller', targetId, { status: statusMap[action], reviewNotes: (data && data.reviewNotes) || null });
      return Response.json({ ok: true });
    }

    if (entityKind === 'listing') {
      const statusMap = { approve_listing: 'approved', reject_listing: 'rejected', delist_listing: 'delisted' };
      const listings = await service.entities.MarketplaceListing.filter({ id: targetId }, '-created_date', 1);
      if (!listings || !listings[0]) return Response.json({ error: 'Listing not found' }, { status: 404 });
      await service.entities.MarketplaceListing.update(targetId, { status: statusMap[action] });
      await audit('MarketplaceListing', targetId, { status: statusMap[action] });
      return Response.json({ ok: true });
    }

    if (entityKind === 'profile') {
      const targets = await service.entities.UserProfile.filter({ id: targetId }, '-created_date', 1);
      const target = targets && targets[0];
      if (!target) return Response.json({ error: 'User not found' }, { status: 404 });
      // Only super_admin can change roles
      const isSuperAdmin = (profile && profile.role === 'super_admin') || isAdminEmail(user.email);
      if (action === 'update_user_role') {
        if (!isSuperAdmin) return Response.json({ error: 'Only super admins can change roles' }, { status: 403 });
        const newRole = String((data || {}).role || '');
        if (!['customer', 'seller', 'moderator', 'admin', 'super_admin'].includes(newRole)) {
          return Response.json({ error: 'Invalid role' }, { status: 400 });
        }
        await service.entities.UserProfile.update(targetId, { role: newRole });
        await service.entities.SecurityEvent.create({
          userId: target.userId, eventType: 'role_change', severity: 'warning',
          description: `Role changed to ${newRole} by ${user.email}`,
          metadata: { newRole, by: user.email }
        });
      } else {
        const newStatus = String((data || {}).accountStatus || '');
        if (!['active', 'suspended', 'pending', 'blocked'].includes(newStatus)) {
          return Response.json({ error: 'Invalid status' }, { status: 400 });
        }
        await service.entities.UserProfile.update(targetId, { accountStatus: newStatus });
        await service.entities.SecurityEvent.create({
          userId: target.userId,
          eventType: newStatus === 'active' ? 'login' : 'account_suspended',
          severity: newStatus === 'active' ? 'info' : 'critical',
          description: `Account status set to ${newStatus} by ${user.email}`,
          metadata: { newStatus, by: user.email }
        });
      }
      await audit('UserProfile', targetId, data || {});
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}