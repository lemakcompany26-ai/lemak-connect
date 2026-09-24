import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole, notifyUser, notifyAdmins, creditWallet, debitWallet, computeMarketplaceFees, round2, generateTransactionId } from '../../shared/lemak.ts';

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
  suspend_listing: 'listing',
  request_changes_listing: 'listing',
  save_marketplace_charges: 'charges',
  preview_marketplace_charges: 'charges',
  refund_marketplace_order: 'order',
  resolve_dispute: 'dispute',
  update_user_status: 'profile',
  update_user_role: 'profile',
  freeze_promo_funds: 'promo'
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
      const statusMap = {
        approve_listing: 'approved',
        reject_listing: 'rejected',
        delist_listing: 'delisted',
        suspend_listing: 'suspended',
        request_changes_listing: 'changes_requested'
      };
      const listings = await service.entities.MarketplaceListing.filter({ id: targetId }, '-created_date', 1);
      const listing = listings && listings[0];
      if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
      const newStatus = statusMap[action];
      const now = new Date().toISOString();
      const reason = (data && (data.reason || data.message)) || '';
      const update = { status: newStatus, reviewedBy: user.email, reviewedAt: now };
      if (action === 'reject_listing') update.rejectionReason = reason || null;
      if (action === 'request_changes_listing') update.adminMessage = reason || null;
      await service.entities.MarketplaceListing.update(targetId, update);

      // Keep the seller record aligned with the listing decision
      const sellerRows = await service.entities.MarketplaceSeller.filter({ id: listing.sellerId }, '-created_date', 1);
      const seller = (sellerRows && sellerRows[0]) || null;
      if (seller) {
        const sellerStatusMap = { approved: 'approved', rejected: 'rejected', suspended: 'suspended', changes_requested: 'pending' };
        const sellerUpdate = { reviewedBy: user.email, reviewedAt: now };
        if (sellerStatusMap[newStatus]) sellerUpdate.status = sellerStatusMap[newStatus];
        if (reason) sellerUpdate.reviewNotes = reason;
        await service.entities.MarketplaceSeller.update(seller.id, sellerUpdate).catch(() => null);
      }
      if (seller && seller.userId) {
        const notices = {
          approve_listing: ['Listing approved 🎉', `Your listing "${listing.title}" is now live on the Lemak Connect marketplace.`],
          reject_listing: ['Listing not approved', `Your listing "${listing.title}" was not approved. ${reason || 'Contact support for details.'}`],
          request_changes_listing: ['Changes requested on your listing', `Admin feedback on "${listing.title}": ${reason || 'Please update your submission.'} Resubmit through the seller form to return to review.`],
          suspend_listing: ['Listing suspended', `Your listing "${listing.title}" has been suspended by an administrator.`]
        };
        const n = notices[action];
        if (n) await notifyUser(service, { userId: seller.userId, type: 'marketplace', title: n[0], message: n[1], actionUrl: '/app/marketplace' });
      }
      await audit('MarketplaceListing', targetId, { status: newStatus, reason: reason || null });
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

    if (entityKind === 'promo') {
      const ledgerId = String(targetId || '').trim();
      const reason = String((data || {}).reason || '').trim().slice(0, 1000);
      if (!ledgerId || !reason) return Response.json({ error: 'A promotional ledger entry and freeze reason are required' }, { status: 400 });
      const ledgers = await service.entities.WalletLedger.filter({ id: ledgerId }, '-created_date', 1);
      const ledger = ledgers && ledgers[0];
      if (!ledger || ledger.type !== 'promo' || Number(ledger.amount || 0) <= 0) {
        return Response.json({ error: 'Only positive promotional credits can be frozen' }, { status: 400 });
      }
      const existing = await service.entities.PromoFundFreeze.filter({ walletLedgerId: ledger.id }, '-created_date', 1);
      if (existing && existing[0]) return Response.json({ ok: true, alreadyFrozen: true, freeze: existing[0] });
      const amount = round2(ledger.amount);
      const transactionId = generateTransactionId();
      const debit = await debitWallet(service, {
        userId: ledger.userId, transactionId, type: 'adjustment', amount,
        reference: ledger.transactionId || ledger.id,
        description: `Promotional funds frozen: ${reason}`,
        idempotencyKey: `promo-freeze-${ledger.id}`
      });
      if (debit.duplicated) return Response.json({ ok: true, alreadyFrozen: true });
      const freeze = await service.entities.PromoFundFreeze.create({
        userId: ledger.userId, walletLedgerId: ledger.id, transactionId, amount,
        reason, frozenAt: new Date().toISOString(), frozenBy: user.email
      });
      await service.entities.Transaction.create({
        transactionId, userId: ledger.userId, type: 'adjustment', service: 'Promotional funds freeze',
        provider: 'LEMAK', amount, fee: 0, providerCost: 0, customerPrice: amount,
        status: 'successful', providerReference: ledger.transactionId || ledger.id,
        metadata: { sourceLedgerId: ledger.id, reason, action: 'freeze_promo_funds' },
        completedAt: new Date().toISOString(), idempotencyKey: `promo-freeze-${ledger.id}`
      });
      await audit('WalletLedger', ledger.id, { action: 'freeze_promo_funds', amount, reason, transactionId });
      return Response.json({ ok: true, freeze, wallet: debit.wallet });
    }

    if (entityKind === 'charges') {
      if (action === 'preview_marketplace_charges') {
        const saleAmount = Number((data || {}).saleAmount);
        if (!isFinite(saleAmount) || saleAmount < 0) return Response.json({ error: 'Invalid sale amount' }, { status: 400 });
        const breakdown = await computeMarketplaceFees(service, saleAmount);
        return Response.json({ ok: true, breakdown });
      }
      const d = data || {};
      const nums = {
        marketplace_commission_percent: d.commissionPercent,
        marketplace_buyer_fee_percent: d.buyerFeePercent,
        marketplace_buyer_fixed_fee: d.buyerFixedFee,
        marketplace_seller_listing_fee: d.sellerListingFee,
        marketplace_fixed_fee: d.fixedFee,
        marketplace_minimum_fee: d.minimumFee,
        marketplace_maximum_fee: d.maximumFee
      };
      const cleaned = {};
      for (const [key, raw] of Object.entries(nums)) {
        if (raw === undefined || raw === null || String(raw) === '') continue;
        const n = Number(raw);
        if (!isFinite(n) || n < 0) return Response.json({ error: 'Fees cannot be negative' }, { status: 400 });
        if ((key === 'marketplace_commission_percent' || key === 'marketplace_buyer_fee_percent') && n > 100) {
          return Response.json({ error: 'Percentage fees cannot exceed 100' }, { status: 400 });
        }
        cleaned[key] = n;
      }
      const currency = d.currency ? String(d.currency).toUpperCase().slice(0, 3) : null;
      for (const [key, value] of Object.entries(cleaned)) {
        const rows = await service.entities.AdminSetting.filter({ key }, '-created_date', 1);
        if (rows && rows[0]) await service.entities.AdminSetting.update(rows[0].id, { value: String(value), updatedBy: user.email });
        else await service.entities.AdminSetting.create({ key, value: String(value), category: 'marketplace', updatedBy: user.email });
      }
      if (currency) {
        const rows = await service.entities.AdminSetting.filter({ key: 'marketplace_currency' }, '-created_date', 1);
        if (rows && rows[0]) await service.entities.AdminSetting.update(rows[0].id, { value: currency, updatedBy: user.email });
        else await service.entities.AdminSetting.create({ key: 'marketplace_currency', value: currency, label: 'Marketplace Currency', category: 'marketplace', updatedBy: user.email });
      }
      await audit('AdminSetting', 'marketplace_charges', { ...cleaned, currency });
      return Response.json({ ok: true, saved: { ...cleaned, currency } });
    }

    if (entityKind === 'order') {
      const orders = await service.entities.MarketplaceOrder.filter({ id: targetId }, '-created_date', 1);
      const order = orders && orders[0];
      if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
      if (['completed', 'refunded', 'cancelled'].includes(order.status)) {
        return Response.json({ error: `Order is already ${order.status}` }, { status: 400 });
      }
      await creditWallet(service, {
        userId: order.buyerUserId, transactionId: order.transactionId, type: 'refund',
        amount: order.amount, reference: order.transactionId,
        description: `Marketplace order refund: ${order.listingTitle || ''}`,
        idempotencyKey: `mkt-refund-${order.id}`
      });
      await service.entities.MarketplaceOrder.update(order.id, { status: 'refunded' });
      if (order.transactionId) {
        const txs = await service.entities.Transaction.filter({ transactionId: order.transactionId }, '-created_date', 1);
        if (txs && txs[0]) await service.entities.Transaction.update(txs[0].id, { status: 'refunded' }).catch(() => null);
      }
      await notifyUser(service, { userId: order.buyerUserId, type: 'marketplace', title: 'Marketplace order refunded', message: `Order ${order.transactionId} has been refunded to your wallet.`, actionUrl: '/app/marketplace' });
      if (order.sellerUserId) {
        await notifyUser(service, { userId: order.sellerUserId, type: 'marketplace', title: 'Marketplace order cancelled', message: `Order ${order.transactionId} was refunded to the buyer.`, actionUrl: '/app/marketplace' });
      }
      await audit('MarketplaceOrder', order.id, { refunded: order.amount, reason: (data && data.reason) || null });
      return Response.json({ ok: true });
    }

    if (entityKind === 'dispute') {
      const disputes = await service.entities.MarketplaceDispute.filter({ id: targetId }, '-created_date', 1);
      const dispute = disputes && disputes[0];
      if (!dispute) return Response.json({ error: 'Dispute not found' }, { status: 404 });
      if (!['open', 'under_review'].includes(dispute.status)) {
        return Response.json({ error: `Dispute is already ${dispute.status}` }, { status: 400 });
      }
      const orders = await service.entities.MarketplaceOrder.filter({ id: dispute.orderId }, '-created_date', 1);
      const order = orders && orders[0];
      if (!order) return Response.json({ error: 'Linked order not found' }, { status: 404 });
      const decision = String((data || {}).decision || '');
      const notes = String((data || {}).notes || '').slice(0, 500);
      const now = new Date().toISOString();
      const sysMsg = (content) => service.entities.OrderMessage.create({
        orderId: order.id, buyerUserId: order.buyerUserId, sellerUserId: order.sellerUserId || null,
        senderRole: 'system', senderName: 'Lemak Connect', content
      }).catch(() => null);

      if (decision === 'refund_buyer') {
        await creditWallet(service, {
          userId: order.buyerUserId, transactionId: order.transactionId, type: 'refund',
          amount: order.amount, reference: order.transactionId,
          description: `Marketplace dispute refund: ${order.listingTitle || ''}`,
          idempotencyKey: `mkt-refund-${order.id}`
        });
        await service.entities.MarketplaceOrder.update(order.id, { status: 'refunded' });
        if (order.transactionId) {
          const txs = await service.entities.Transaction.filter({ transactionId: order.transactionId }, '-created_date', 1);
          if (txs && txs[0]) await service.entities.Transaction.update(txs[0].id, { status: 'refunded' }).catch(() => null);
        }
        await service.entities.MarketplaceDispute.update(dispute.id, {
          status: 'refunded', adminDecision: decision, adminNotes: notes || null,
          decidedBy: user.email, decidedAt: now, resolvedAt: now
        });
        await sysMsg(`Admin decision: buyer favoured.\n\n${round2(order.amount)} has been refunded to the buyer's wallet and the order is closed.`);
        await notifyUser(service, {
          userId: order.buyerUserId, type: 'marketplace',
          title: 'Dispute resolved — refund issued',
          message: `Dispute ${dispute.disputeId || ''} on "${order.listingTitle}" was resolved in your favour. ${round2(order.amount)} has been refunded to your wallet.`,
          actionUrl: '/app/wallet'
        });
        if (order.sellerUserId) {
          await notifyUser(service, {
            userId: order.sellerUserId, type: 'marketplace',
            title: 'Dispute resolved — order refunded',
            message: `Dispute on "${order.listingTitle}" (${order.transactionId}) was resolved in the buyer's favour. The escrow was refunded to the buyer.`,
            actionUrl: '/app/marketplace'
          });
        }
      } else if (decision === 'release_seller') {
        if (order.sellerUserId) {
          await creditWallet(service, {
            userId: order.sellerUserId, transactionId: order.transactionId, type: 'deposit',
            amount: order.sellerPayout, reference: order.transactionId,
            description: `Marketplace dispute payout: ${order.listingTitle || ''}`,
            idempotencyKey: `mkt-payout-${order.id}`
          });
          await service.entities.MarketplaceOrder.update(order.id, {
            status: 'completed', confirmedAt: now, payoutAt: now, payoutStatus: 'paid'
          });
        } else {
          await service.entities.MarketplaceOrder.update(order.id, {
            status: 'completed', confirmedAt: now, payoutStatus: 'manual'
          });
        }
        await service.entities.MarketplaceDispute.update(dispute.id, {
          status: 'seller_favoured', adminDecision: decision, adminNotes: notes || null,
          decidedBy: user.email, decidedAt: now, resolvedAt: now
        });
        await sysMsg(`Admin decision: seller favoured.\n\nThe order is complete and the seller's payout has been released.`);
        await notifyUser(service, {
          userId: order.buyerUserId, type: 'marketplace',
          title: 'Dispute resolved',
          message: `Dispute on "${order.listingTitle}" (${order.transactionId}) was resolved. The order is complete and the seller has been paid.`,
          actionUrl: '/app/marketplace'
        });
        if (order.sellerUserId) {
          await notifyUser(service, {
            userId: order.sellerUserId, type: 'marketplace',
            title: 'Dispute resolved — payout released 💰',
            message: `Dispute on "${order.listingTitle}" was resolved in your favour. ${round2(order.sellerPayout)} has been paid to your wallet.`,
            actionUrl: '/app/wallet'
          });
        } else {
          await notifyAdmins(service, {
            type: 'marketplace',
            title: 'Manual seller payout required',
            message: `Dispute ${dispute.disputeId} resolved in the seller's favour, but the seller has no Lemak account. Pay ${round2(order.sellerPayout)} manually.`,
            actionUrl: '/admin/marketplace'
          });
        }
      } else if (decision === 'resume_testing') {
        await service.entities.MarketplaceOrder.update(order.id, { status: 'delivered' });
        await service.entities.MarketplaceDispute.update(dispute.id, {
          status: 'resolved', adminDecision: decision, adminNotes: notes || null,
          decidedBy: user.email, decidedAt: now, resolvedAt: now
        });
        await sysMsg(`Admin reviewed the reported issue and re-opened the buyer testing period.\n\nThe buyer can continue testing and confirm, or report a problem again if the issue persists.`);
        await notifyUser(service, {
          userId: order.buyerUserId, type: 'marketplace',
          title: 'Testing re-opened',
          message: `Our team reviewed your report on "${order.listingTitle}". Testing has been re-opened — continue and confirm, or report a problem again if needed.`,
          actionUrl: '/app/marketplace'
        });
        if (order.sellerUserId) {
          await notifyUser(service, {
            userId: order.sellerUserId, type: 'marketplace',
            title: 'Buyer testing re-opened',
            message: `The dispute on "${order.listingTitle}" (${order.transactionId}) was dismissed. The buyer's testing period has resumed.`,
            actionUrl: '/app/marketplace'
          });
        }
      } else {
        return Response.json({ error: 'Invalid decision (refund_buyer | release_seller | resume_testing)' }, { status: 400 });
      }
      await audit('MarketplaceDispute', dispute.id, { decision, notes: notes || null, orderStatus: order.status });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}