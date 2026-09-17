import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  generateTransactionId, debitWallet, creditWallet,
  computeMarketplaceFees, notifyUser
} from '../../shared/lemak.ts';

// Virtual number rental market. Sellers list numbers for a fixed rental
// window; buyers rent with wallet escrow. OTPs are delivered in a private
// rental chat. Expired rentals are auto-refunded by a scheduled workflow.
// The number itself is never exposed publicly — only to an active renter.

function pad(n) { return String(n).padStart(2, '0'); }

function makeRef(prefix) {
  const d = new Date();
  const date = d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)), b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${date}-${rand.toUpperCase()}`;
}

function bad(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode || 400;
  return err;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const action = String(body.action || '');

    // ---------- Public browse (numbers hidden) ----------
    if (action === 'browse') {
      const listings = await service.entities.VirtualNumberListing.filter({ status: 'approved' }, '-created_date', 100);
      const live = (listings || []).filter(l => l.isActive !== false);
      const rentals = await service.entities.NumberRental.filter({ status: 'active' }, '-created_date', 500);
      const busyIds = new Set((rentals || []).map(r => r.listingId));
      return Response.json({
        ok: true,
        listings: live.map(l => ({
          id: l.id,
          listingRef: l.listingRef,
          service: l.service,
          country: l.country || 'Nigeria',
          price: l.price,
          rentalMinutes: l.rentalMinutes,
          description: l.description || '',
          sellerName: l.sellerName || 'Verified seller',
          available: !busyIds.has(l.id)
        }))
      });
    }

    // ---------- Seller listing management ----------
    if (action === 'my_listings') {
      const listings = await service.entities.VirtualNumberListing.filter({ sellerUserId: user.id }, '-created_date', 100);
      return Response.json({ ok: true, listings: listings || [] });
    }

    if (action === 'create_listing') {
      const sellers = await service.entities.MarketplaceSeller.filter({ userId: user.id, status: 'approved' }, '-created_date', 5);
      const seller = sellers && sellers[0];
      if (!seller) {
        return Response.json({ error: 'Become an approved marketplace seller first (Marketplace → Sell).' }, { status: 403 });
      }
      const serviceName = String(body.service || '').trim().slice(0, 40);
      const number = String(body.number || '').replace(/[\s-]/g, '');
      const price = Number(body.price);
      const rentalMinutes = Number(body.rentalMinutes) || 15;
      if (!serviceName) return Response.json({ error: 'Choose the service this number works with' }, { status: 400 });
      if (!/^\+?\d{7,15}$/.test(number)) return Response.json({ error: 'Enter a valid phone number (7-15 digits)' }, { status: 400 });
      if (!price || price < 50) return Response.json({ error: 'Price must be at least ₦50' }, { status: 400 });
      if (rentalMinutes < 5 || rentalMinutes > 240) return Response.json({ error: 'Rental window must be 5-240 minutes' }, { status: 400 });
      const listing = await service.entities.VirtualNumberListing.create({
        listingRef: makeRef('VN'),
        sellerUserId: user.id,
        sellerName: seller.fullName || seller.username || user.full_name || 'Seller',
        sellerRecordId: seller.id,
        service: serviceName,
        country: String(body.country || 'Nigeria').slice(0, 40),
        number,
        price,
        rentalMinutes,
        description: String(body.description || '').slice(0, 300),
        status: 'approved',
        isActive: true
      });
      return Response.json({ ok: true, listing });
    }

    if (action === 'update_listing') {
      const listings = await service.entities.VirtualNumberListing.filter({ id: body.listingId }, '-created_date', 1);
      const listing = listings && listings[0];
      if (!listing || listing.sellerUserId !== user.id) {
        return Response.json({ error: 'Listing not found' }, { status: 404 });
      }
      const patch: any = {};
      if (body.price !== undefined) {
        const price = Number(body.price);
        if (!price || price < 50) return Response.json({ error: 'Price must be at least ₦50' }, { status: 400 });
        patch.price = price;
      }
      if (body.rentalMinutes !== undefined) {
        const m = Number(body.rentalMinutes);
        if (m < 5 || m > 240) return Response.json({ error: 'Rental window must be 5-240 minutes' }, { status: 400 });
        patch.rentalMinutes = m;
      }
      if (body.isActive !== undefined) patch.isActive = !!body.isActive;
      if (body.description !== undefined) patch.description = String(body.description).slice(0, 300);
      await service.entities.VirtualNumberListing.update(listing.id, patch);
      return Response.json({ ok: true });
    }

    // ---------- Rent ----------
    if (action === 'rent') {
      const listings = await service.entities.VirtualNumberListing.filter({ id: body.listingId }, '-created_date', 1);
      const listing = listings && listings[0];
      if (!listing || listing.status !== 'approved' || listing.isActive === false) {
        return Response.json({ error: 'This listing is not available' }, { status: 404 });
      }
      if (listing.sellerUserId === user.id) {
        return Response.json({ error: 'You cannot rent your own number' }, { status: 400 });
      }
      const active = await service.entities.NumberRental.filter({ listingId: listing.id, status: 'active' }, '-created_date', 1);
      if (active && active[0]) {
        return Response.json({ error: 'This number is currently rented. Try again shortly.' }, { status: 409 });
      }
      const f = await computeMarketplaceFees(service, listing.price);
      const transactionId = generateTransactionId();
      let debit;
      try {
        debit = await debitWallet(service, {
          userId: user.id, transactionId, type: 'purchase',
          amount: f.buyerTotal, reference: transactionId,
          description: `Virtual number rental — ${listing.service}`,
          idempotencyKey: `vn-rent-${user.id}-${listing.id}-${Date.now()}`
        });
      } catch (e) {
        return Response.json({ error: e.message }, { status: e.statusCode || 400 });
      }
      if (debit.duplicated) {
        return Response.json({ error: 'This rental is already being processed. Refresh and try again.' }, { status: 409 });
      }
      const rentalRef = makeRef('VN');
      const expiresAt = new Date(Date.now() + Number(listing.rentalMinutes || 15) * 60 * 1000).toISOString();
      const rental = await service.entities.NumberRental.create({
        rentalRef, transactionId, listingId: listing.id,
        buyerUserId: user.id, sellerUserId: listing.sellerUserId,
        service: listing.service, amount: f.buyerTotal,
        sellerPayout: f.sellerReceives, commission: f.commission,
        status: 'active', expiresAt
      });
      await service.entities.Transaction.create({
        transactionId, userId: user.id, type: 'virtual_number',
        service: `Virtual Number — ${listing.service}`, provider: 'marketplace',
        amount: f.buyerTotal, fee: f.buyerFee, providerCost: f.saleAmount,
        customerPrice: f.buyerTotal, status: 'processing',
        recipient: listing.number,
        metadata: { rentalId: rental.id, rentalRef, listingId: listing.id, service: listing.service, rentalMinutes: listing.rentalMinutes }
      });
      await notifyUser(service, {
        userId: listing.sellerUserId, type: 'marketplace',
        title: 'New number rental 🔔',
        message: `${user.full_name || 'A customer'} just rented your ${listing.service} number for ${listing.rentalMinutes} minutes (${rentalRef}). Send their OTP in the rental chat now.`,
        actionUrl: '/app/virtual-numbers'
      });
      return Response.json({ ok: true, rental, number: listing.number, wallet: debit.wallet });
    }

    // ---------- Rentals + private chat ----------
    if (action === 'my_rentals' || action === 'seller_rentals') {
      const key = action === 'my_rentals' ? 'buyerUserId' : 'sellerUserId';
      const rentals = await service.entities.NumberRental.filter({ [key]: user.id }, '-created_date', 100);
      const ids = [...new Set((rentals || []).map(r => r.listingId))];
      const numbers = {};
      for (const id of ids) {
        const rows = await service.entities.VirtualNumberListing.filter({ id }, '-created_date', 1);
        if (rows && rows[0]) numbers[id] = rows[0].number;
      }
      return Response.json({
        ok: true,
        rentals: (rentals || []).map(r => ({ ...r, number: numbers[r.listingId] || null }))
      });
    }

    const loadRental = async (id) => {
      const rows = await service.entities.NumberRental.filter({ id }, '-created_date', 1);
      const rental = rows && rows[0];
      if (!rental) throw bad('Rental not found', 404);
      if (rental.buyerUserId !== user.id && rental.sellerUserId !== user.id) {
        throw bad('You are not part of this rental', 403);
      }
      return rental;
    };

    if (action === 'messages') {
      const rental = await loadRental(body.rentalId);
      const messages = await service.entities.RentalMessage.filter({ rentalId: rental.id }, 'created_date', 200);
      return Response.json({ ok: true, messages });
    }

    if (action === 'send_message') {
      const rental = await loadRental(body.rentalId);
      const content = String(body.content || '').trim().slice(0, 1000);
      if (!content) return Response.json({ error: 'Message cannot be empty' }, { status: 400 });
      if (rental.status !== 'active') {
        return Response.json({ error: 'This rental has ended' }, { status: 400 });
      }
      const isBuyer = rental.buyerUserId === user.id;
      const isOtp = !isBuyer && !!body.isOtp;
      const message = await service.entities.RentalMessage.create({
        rentalId: rental.id,
        buyerUserId: rental.buyerUserId,
        sellerUserId: rental.sellerUserId,
        senderRole: isBuyer ? 'buyer' : 'seller',
        senderName: user.full_name || user.email || 'User',
        content, isOtp
      });
      const recipient = isBuyer ? rental.sellerUserId : rental.buyerUserId;
      await notifyUser(service, {
        userId: recipient, type: 'marketplace',
        title: isOtp ? 'OTP received 🔑' : 'New rental message',
        message: isOtp
          ? `Your OTP for ${rental.service} is ready — order ${rental.rentalRef}.`
          : `${user.full_name || 'A customer'}: "${content.slice(0, 80)}" — rental ${rental.rentalRef}`,
        actionUrl: '/app/virtual-numbers'
      });
      return Response.json({ ok: true, message });
    }

    if (action === 'complete') {
      const rental = await loadRental(body.rentalId);
      if (rental.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can complete this rental' }, { status: 403 });
      }
      if (rental.status !== 'active') {
        return Response.json({ error: `Rental already ${rental.status}` }, { status: 400 });
      }
      const now = new Date().toISOString();
      await creditWallet(service, {
        userId: rental.sellerUserId, transactionId: rental.transactionId,
        type: 'deposit', amount: rental.sellerPayout, reference: rental.rentalRef,
        description: `Virtual number payout — ${rental.service}`,
        idempotencyKey: `vn-payout-${rental.id}`
      });
      await service.entities.NumberRental.update(rental.id, { status: 'completed', completedAt: now });
      const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
      if (txs && txs[0]) {
        await service.entities.Transaction.update(txs[0].id, { status: 'successful', completedAt: now }).catch(() => null);
      }
      await notifyUser(service, {
        userId: rental.sellerUserId, type: 'marketplace',
        title: 'Rental payout received 💰',
        message: `The buyer confirmed the ${rental.service} rental (${rental.rentalRef}). ₦${Number(rental.sellerPayout).toLocaleString()} has been paid to your wallet.`,
        actionUrl: '/app/wallet'
      });
      return Response.json({ ok: true });
    }

    if (action === 'cancel') {
      const rental = await loadRental(body.rentalId);
      if (rental.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can cancel this rental' }, { status: 403 });
      }
      if (rental.status !== 'active') {
        return Response.json({ error: `Rental already ${rental.status}` }, { status: 400 });
      }
      const otps = await service.entities.RentalMessage.filter({ rentalId: rental.id, isOtp: true }, '-created_date', 1);
      if (otps && otps[0]) {
        return Response.json({ error: 'An OTP was already delivered for this rental, so it cannot be cancelled.' }, { status: 400 });
      }
      await creditWallet(service, {
        userId: rental.buyerUserId, transactionId: rental.transactionId,
        type: 'refund', amount: rental.amount, reference: rental.rentalRef,
        description: `Refund — cancelled virtual number rental ${rental.rentalRef}`,
        idempotencyKey: `vn-refund-${rental.id}`
      });
      await service.entities.NumberRental.update(rental.id, { status: 'cancelled' });
      const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
      if (txs && txs[0]) {
        await service.entities.Transaction.update(txs[0].id, { status: 'refunded', failureReason: 'Rental cancelled by buyer' }).catch(() => null);
      }
      await notifyUser(service, {
        userId: rental.sellerUserId, type: 'marketplace',
        title: 'Rental cancelled',
        message: `The buyer cancelled rental ${rental.rentalRef} before any OTP was sent. They were refunded.`,
        actionUrl: '/app/virtual-numbers'
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}