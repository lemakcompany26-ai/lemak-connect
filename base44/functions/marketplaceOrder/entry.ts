import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  generateTransactionId, debitWallet, creditWallet,
  computeMarketplaceFees, notifyUser, notifyAdmins, round2
} from '../../shared/lemak.ts';

// Marketplace escrow order flow. All fees are calculated on the backend from
// admin-configured charges; the frontend never supplies a price.
// purchase -> escrow debit; deliver -> seller marks delivered;
// confirm -> buyer confirms, seller payout, transaction completed.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'preview') {
      const listings = await service.entities.MarketplaceListing.filter({ id: body.listingId }, '-created_date', 1);
      const listing = listings && listings[0];
      if (!listing || listing.status !== 'approved' || listing.isActive === false) {
        return Response.json({ error: 'Listing not available' }, { status: 404 });
      }
      const f = await computeMarketplaceFees(service, listing.price);
      return Response.json({ ok: true, breakdown: { saleAmount: f.saleAmount, buyerFee: f.buyerFee, buyerTotal: f.buyerTotal, currency: f.currency } });
    }

    if (action === 'purchase') {
      const listings = await service.entities.MarketplaceListing.filter({ id: body.listingId }, '-created_date', 1);
      const listing = listings && listings[0];
      if (!listing || listing.status !== 'approved' || listing.isActive === false) {
        return Response.json({ error: 'Listing not available' }, { status: 404 });
      }
      const sellerRows = await service.entities.MarketplaceSeller.filter({ id: listing.sellerId }, '-created_date', 1);
      const seller = (sellerRows && sellerRows[0]) || null;
      const sellerUserId = (seller && seller.userId) || listing.sellerUserId || null;
      if (sellerUserId && sellerUserId === user.id) {
        return Response.json({ error: 'You cannot purchase your own listing' }, { status: 400 });
      }
      const f = await computeMarketplaceFees(service, listing.price);
      const transactionId = generateTransactionId();
      await debitWallet(service, {
        userId: user.id, transactionId, type: 'purchase',
        amount: f.buyerTotal, reference: transactionId,
        description: `Marketplace order: ${listing.title}`,
        idempotencyKey: `mkt-escrow-${user.id}-${listing.id}`
      });
      const order = await service.entities.MarketplaceOrder.create({
        transactionId, buyerUserId: user.id,
        sellerId: listing.sellerId, sellerUserId,
        listingId: listing.id, listingTitle: listing.title,
        listingPrice: f.saleAmount, buyerFee: f.buyerFee,
        commission: f.commission, platformFee: f.commissionPercent,
        amount: f.buyerTotal, sellerPayout: f.sellerReceives,
        payoutStatus: 'pending', status: 'in_progress'
      });
      await service.entities.Transaction.create({
        transactionId, userId: user.id, type: 'marketplace',
        service: listing.title, provider: 'marketplace',
        amount: f.buyerTotal, fee: f.buyerFee,
        providerCost: f.saleAmount, customerPrice: f.buyerTotal,
        status: 'processing',
        recipient: (seller && (seller.username || seller.fullName)) || '',
        metadata: { orderId: order.id, listingId: listing.id, listingRef: listing.listingId, commission: f.commission, sellerPayout: f.sellerReceives }
      });
      await notifyUser(service, {
        userId: user.id, type: 'marketplace',
        title: 'Marketplace order placed',
        message: `Your order ${transactionId} for "${listing.title}" is in escrow. ${round2(f.buyerTotal)} will be released to the seller after you confirm delivery.`,
        actionUrl: '/app/marketplace'
      });
      if (sellerUserId) {
        await notifyUser(service, {
          userId: sellerUserId, type: 'marketplace',
          title: 'New marketplace order 🎉',
          message: `${user.full_name || 'A buyer'} ordered "${listing.title}" (${transactionId}). Deliver, and your payout of ${round2(f.sellerReceives)} is released when the buyer confirms.`,
          actionUrl: '/app/marketplace'
        });
      }
      return Response.json({ ok: true, order, transactionId });
    }

    if (action === 'deliver' || action === 'confirm') {
      const orders = await service.entities.MarketplaceOrder.filter({ id: body.orderId }, '-created_date', 1);
      const order = orders && orders[0];
      if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
      const now = new Date().toISOString();

      if (action === 'deliver') {
        if (!order.sellerUserId || order.sellerUserId !== user.id) {
          return Response.json({ error: 'Only the seller can deliver this order' }, { status: 403 });
        }
        if (!['in_progress', 'paid', 'pending'].includes(order.status)) {
          return Response.json({ error: `Order cannot be delivered (status: ${order.status})` }, { status: 400 });
        }
        await service.entities.MarketplaceOrder.update(order.id, { status: 'delivered', deliveredAt: now });
        await notifyUser(service, {
          userId: order.buyerUserId, type: 'marketplace',
          title: 'Marketplace order delivered',
          message: `"${order.listingTitle}" (${order.transactionId}) has been delivered. Confirm to release the seller's payout.`,
          actionUrl: '/app/marketplace'
        });
        return Response.json({ ok: true });
      }

      // confirm — buyer releases escrow
      if (order.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can confirm this order' }, { status: 403 });
      }
      if (order.status !== 'delivered') {
        return Response.json({ error: 'Order has not been delivered yet' }, { status: 400 });
      }
      if (order.sellerUserId) {
        await creditWallet(service, {
          userId: order.sellerUserId, transactionId: order.transactionId, type: 'deposit',
          amount: order.sellerPayout, reference: order.transactionId,
          description: `Marketplace payout: ${order.listingTitle}`,
          idempotencyKey: `mkt-payout-${order.id}`
        });
        await service.entities.MarketplaceOrder.update(order.id, {
          status: 'completed', confirmedAt: now, payoutAt: now, payoutStatus: 'paid'
        });
        await notifyUser(service, {
          userId: order.sellerUserId, type: 'marketplace',
          title: 'Marketplace payout received 💰',
          message: `Buyer confirmed "${order.listingTitle}". ${round2(order.sellerPayout)} has been paid to your wallet.`,
          actionUrl: '/app/wallet'
        });
      } else {
        // Sheet sellers may not have a Lemak account — flag for manual payout
        await service.entities.MarketplaceOrder.update(order.id, {
          status: 'completed', confirmedAt: now, payoutStatus: 'manual'
        });
        await notifyAdmins(service, {
          type: 'marketplace',
          title: 'Manual seller payout required',
          message: `Order ${order.transactionId} was completed, but the seller has no Lemak account. Pay ${round2(order.sellerPayout)} to the seller manually.`,
          actionUrl: '/admin/marketplace'
        });
      }
      if (order.transactionId) {
        const txs = await service.entities.Transaction.filter({ transactionId: order.transactionId }, '-created_date', 1);
        if (txs && txs[0]) {
          await service.entities.Transaction.update(txs[0].id, { status: 'successful', completedAt: now }).catch(() => null);
        }
      }
      await notifyUser(service, {
        userId: order.buyerUserId, type: 'marketplace',
        title: 'Order complete ✅',
        message: `You confirmed "${order.listingTitle}" (${order.transactionId}). The seller has been paid. Thank you for using Lemak Connect Marketplace.`,
        actionUrl: '/app/transactions'
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}