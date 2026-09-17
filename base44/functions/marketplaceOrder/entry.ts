import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  generateTransactionId, debitWallet, creditWallet,
  computeMarketplaceFees, notifyUser, notifyAdmins, round2
} from '../../shared/lemak.ts';

// Marketplace escrow order flow. All fees are calculated on the backend from
// admin-configured charges; the frontend never supplies a price.
// purchase -> escrow debit + order (paid, awaiting delivery) + automatic
// chat open with system messages + admin notification;
// deliver -> seller submits the account URL for delivery;
// confirm -> buyer releases escrow, seller payout (idempotent).

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
      const debit = await debitWallet(service, {
        userId: user.id, transactionId, type: 'purchase',
        amount: f.buyerTotal, reference: transactionId,
        description: `Marketplace order: ${listing.title}`,
        idempotencyKey: `mkt-escrow-${user.id}-${listing.id}`
      });
      // Idempotency: the same buyer cannot be charged twice for the same listing
      if (debit.duplicated) {
        return Response.json({ error: 'You have already purchased this listing.' }, { status: 409 });
      }
      // Payment verified against the wallet -> order is PAID, awaiting delivery.
      // Funds stay in escrow; nothing is released to the seller yet.
      const order = await service.entities.MarketplaceOrder.create({
        transactionId, buyerUserId: user.id,
        sellerId: listing.sellerId, sellerUserId,
        listingId: listing.id, listingTitle: listing.title,
        listingPrice: f.saleAmount, buyerFee: f.buyerFee,
        commission: f.commission, platformFee: f.commissionPercent,
        amount: f.buyerTotal, sellerPayout: f.sellerReceives,
        payoutStatus: 'pending', status: 'paid'
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

      // The private order chat opens only now — after payment — seeded with
      // automatic system messages for the buyer and seller.
      const sysMsg = (content) => service.entities.OrderMessage.create({
        orderId: order.id, buyerUserId: user.id, sellerUserId: sellerUserId || null,
        senderRole: 'system', senderName: 'Lemak Connect', content
      });
      await sysMsg(
        `Payment received successfully. Your order has been created.\n\n` +
        `The seller has been notified. Please use this chat for delivery and testing.\n\n` +
        `Your order ID is: ${order.id}\nYour transaction ID is: ${transactionId}`
      );
      await sysMsg(
        `We received your payment.\n\nThe seller has been notified and delivery is now in progress.\n\n` +
        `Expected delivery: ${listing.deliveryTime || 'as agreed with the seller'}\n\n` +
        `You can use this chat to communicate with the seller and Lemak Connect support.\n` +
        `Do not release or confirm completion until you have tested the delivered account.`
      );
      await sysMsg(
        `New marketplace order received.\n\nA buyer has completed payment for your listing.\n\n` +
        `Please provide the agreed account delivery information through the approved secure delivery process.\n\n` +
        `Order ID: ${order.id}`
      );

      await notifyUser(service, {
        userId: user.id, type: 'marketplace',
        title: 'Marketplace order placed',
        message: `Your order ${transactionId} for "${listing.title}" is in escrow. ${round2(f.buyerTotal)} will be released to the seller only after you confirm delivery.`,
        actionUrl: '/app/marketplace'
      });
      if (sellerUserId) {
        await notifyUser(service, {
          userId: sellerUserId, type: 'marketplace',
          title: 'New marketplace order 🎉',
          message: `${user.full_name || 'A buyer'} paid for "${listing.title}" (${transactionId}). Submit the account delivery from My Orders — your payout of ${round2(f.sellerReceives)} is released when the buyer confirms.`,
          actionUrl: '/app/marketplace'
        });
      }
      await notifyAdmins(service, {
        type: 'marketplace',
        title: 'New marketplace payment received',
        message:
          `Listing: ${listing.title}\n` +
          `Platform: ${listing.platform || listing.category}\n` +
          `Account Type: ${listing.accountKind || '—'}\n` +
          `Buyer: ${user.full_name || user.email}\n` +
          `Seller: ${(seller && (seller.fullName || seller.email)) || '—'}\n` +
          `Amount: ${round2(f.buyerTotal)}\n` +
          `Transaction ID: ${transactionId}\n` +
          `Order ID: ${order.id}\n\nAwaiting seller delivery.`,
        actionUrl: '/admin/marketplace'
      });
      return Response.json({ ok: true, order, transactionId });
    }

    // Buyer starts the testing period on a delivered order
    if (action === 'start_test') {
      const orders = await service.entities.MarketplaceOrder.filter({ id: body.orderId }, '-created_date', 1);
      const order = orders && orders[0];
      if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
      if (order.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can start testing' }, { status: 403 });
      }
      if (order.status !== 'delivered') {
        return Response.json({ error: `Testing can only start after delivery (status: ${order.status})` }, { status: 400 });
      }
      if (order.testingStartedAt) return Response.json({ ok: true, already: true });
      const now = new Date().toISOString();
      await service.entities.MarketplaceOrder.update(order.id, { testingStartedAt: now });
      await service.entities.OrderMessage.create({
        orderId: order.id, buyerUserId: order.buyerUserId, sellerUserId: order.sellerUserId || null,
        senderRole: 'system', senderName: 'Lemak Connect',
        content: `Your testing period has started.\n\nPlease test the account before confirming completion:\n· the account/page URL works\n· the account type matches the listing\n· the follower/subscriber count is reasonably consistent with the listing\n· agreed delivery requirements are satisfied\n\nIf anything differs, use Report Problem — funds stay in escrow until the dispute is resolved.`
      });
      if (order.sellerUserId) {
        await notifyUser(service, {
          userId: order.sellerUserId, type: 'marketplace',
          title: 'Buyer testing started',
          message: `The buyer started testing "${order.listingTitle}" (${order.transactionId}). Your payout is released once they confirm.`,
          actionUrl: '/app/marketplace'
        });
      }
      return Response.json({ ok: true });
    }

    // Buyer reports a problem — opens a dispute, escrow stays locked
    if (action === 'report_problem') {
      const REASONS = ['account_inaccessible', 'wrong_account', 'follower_count_differs', 'monetisation_differs', 'account_type_differs', 'seller_did_not_deliver', 'other'];
      const REASON_LABELS = {
        account_inaccessible: 'Account inaccessible',
        wrong_account: 'Wrong account',
        follower_count_differs: 'Follower count differs',
        monetisation_differs: 'Monetisation differs',
        account_type_differs: 'Account type differs',
        seller_did_not_deliver: 'Seller did not deliver',
        other: 'Other'
      };
      const reason = String(body.reason || '');
      if (!REASONS.includes(reason)) return Response.json({ error: 'Select a valid reason' }, { status: 400 });
      const details = String(body.details || '').slice(0, 500);
      const orders = await service.entities.MarketplaceOrder.filter({ id: body.orderId }, '-created_date', 1);
      const order = orders && orders[0];
      if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
      if (order.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can report a problem' }, { status: 403 });
      }
      if (order.status !== 'delivered') {
        return Response.json({ error: `Problems can only be reported on delivered orders (status: ${order.status})` }, { status: 400 });
      }
      const existing = await service.entities.MarketplaceDispute.filter({ orderId: order.id }, '-created_date', 1);
      if (existing && existing[0] && ['open', 'under_review'].includes(existing[0].status)) {
        return Response.json({ error: 'A dispute is already open for this order' }, { status: 409 });
      }
      const now = new Date().toISOString();
      const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const d = new Date();
      const disputeId = `DSP-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}-${rand}`;
      const dispute = await service.entities.MarketplaceDispute.create({
        disputeId, orderId: order.id, transactionId: order.transactionId,
        listingId: order.listingId, buyerUserId: order.buyerUserId, sellerUserId: order.sellerUserId || null,
        reason, details, status: 'open'
      });
      await service.entities.MarketplaceOrder.update(order.id, { status: 'disputed', disputedAt: now });
      await service.entities.OrderMessage.create({
        orderId: order.id, buyerUserId: order.buyerUserId, sellerUserId: order.sellerUserId || null,
        senderRole: 'system', senderName: 'Lemak Connect',
        content: `Buyer reported an issue.\n\nReason: ${REASON_LABELS[reason]}\n${details ? `Details: ${details}\n` : ''}Dispute ID: ${disputeId}\n\nLemak Connect support has been notified and will review this order. Funds remain in escrow until the dispute is resolved.`
      });
      if (order.sellerUserId) {
        await notifyUser(service, {
          userId: order.sellerUserId, type: 'marketplace',
          title: 'Order dispute opened',
          message: `The buyer reported an issue with "${order.listingTitle}" (${order.transactionId}): ${REASON_LABELS[reason]}. Our team will review it.`,
          actionUrl: '/app/marketplace'
        });
      }
      await notifyAdmins(service, {
        type: 'marketplace',
        title: 'Marketplace dispute opened',
        message: `Dispute ${disputeId}\nOrder: ${order.transactionId}\nListing: ${order.listingTitle}\nReason: ${REASON_LABELS[reason]}\nBuyer reported a problem after delivery. Escrow is locked pending review.`,
        actionUrl: '/admin/marketplace'
      });
      return Response.json({ ok: true, disputeId });
    }

    // Seller payout settings — stored on the seller's own record, never in chat
    if (action === 'save_payout_settings') {
      const sellers = await service.entities.MarketplaceSeller.filter({ userId: user.id }, '-created_date', 5);
      const seller = (sellers || [])[0];
      if (!seller) return Response.json({ error: 'Seller record not found' }, { status: 404 });
      const accountNumber = String(body.payoutAccountNumber || '').replace(/\s/g, '');
      const method = String(body.payoutMethod || '').trim().slice(0, 40);
      if (!method) return Response.json({ error: 'Choose a payout method' }, { status: 400 });
      if (!/^\d{6,20}$/.test(accountNumber)) {
        return Response.json({ error: 'Enter a valid account number (6-20 digits)' }, { status: 400 });
      }
      const patch: any = {
        payoutMethod: method,
        payoutAccountNumber: accountNumber
      };
      if (body.payoutBank !== undefined) patch.payoutBank = String(body.payoutBank || '').trim().slice(0, 60);
      if (body.payoutAccountName !== undefined) patch.payoutAccountName = String(body.payoutAccountName || '').trim().slice(0, 80);
      await service.entities.MarketplaceSeller.update(seller.id, patch);
      return Response.json({ ok: true, masked: `****${accountNumber.slice(-4)}` });
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
        // Optional account/page/channel URL, validated server-side.
        const accountUrl = String(body.accountUrl || '').trim();
        if (accountUrl && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(accountUrl)) {
          return Response.json({ error: 'Account URL must be a valid http(s) link' }, { status: 400 });
        }
        await service.entities.MarketplaceOrder.update(order.id, {
          status: 'delivered', deliveredAt: now,
          ...(accountUrl ? { accountUrl } : {})
        });
        await service.entities.OrderMessage.create({
          orderId: order.id, buyerUserId: order.buyerUserId, sellerUserId: order.sellerUserId || null,
          senderRole: 'system', senderName: 'Lemak Connect',
          content: `Seller has submitted the account for delivery.${accountUrl ? `\n\nAccount URL: ${accountUrl}` : ''}\n\nThe buyer can now test the account before confirming completion.`
        });
        await notifyUser(service, {
          userId: order.buyerUserId, type: 'marketplace',
          title: 'Marketplace order delivered',
          message: `"${order.listingTitle}" (${order.transactionId}) has been delivered. Test the account, then confirm to release the seller's payout.`,
          actionUrl: '/app/marketplace'
        });
        await notifyAdmins(service, {
          type: 'marketplace',
          title: 'Seller delivery submitted',
          message: `Seller delivered order ${order.transactionId} (${order.listingTitle}).${accountUrl ? `\nAccount URL: ${accountUrl}` : ''} The buyer can now test before confirming.`,
          actionUrl: '/admin/marketplace'
        });
        return Response.json({ ok: true });
      }

      // confirm — buyer releases escrow AFTER testing the delivered account
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
        await service.entities.OrderMessage.create({
          orderId: order.id, buyerUserId: order.buyerUserId, sellerUserId: order.sellerUserId || null,
          senderRole: 'system', senderName: 'Lemak Connect',
          content: `Buyer confirmed completion.\n\nSeller payout is now being processed. Marketplace fees have been deducted from the sale amount.`
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
        await service.entities.OrderMessage.create({
          orderId: order.id, buyerUserId: order.buyerUserId, sellerUserId: null,
          senderRole: 'system', senderName: 'Lemak Connect',
          content: `Buyer confirmed completion.\n\nSeller payout is being processed according to the seller's configured payout method.`
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