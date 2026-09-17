import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  generateTransactionId, debitWallet, creditWallet,
  computeMarketplaceFees, notifyUser, calculatePrice
} from '../../shared/lemak.ts';
import {
  getOtpServers, getOtpServer, otpServerStatus, listSmsServices, getSmsPrice,
  buySmsNumber, checkSmsRequest, cancelSmsRequest, listEmailProducts,
  buyEmailOtp, checkEmailOtp, cancelEmailOtp
} from '../../shared/otp.ts';

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
        rentals: (rentals || []).map(r => ({ ...r, number: r.deliveredHandle || numbers[r.listingId] || null }))
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
      if (recipient && recipient !== 'system') {
        await notifyUser(service, {
          userId: recipient, type: 'marketplace',
          title: isOtp ? 'OTP received 🔑' : 'New rental message',
          message: isOtp
            ? `Your OTP for ${rental.service} is ready — order ${rental.rentalRef}.`
            : `${user.full_name || 'A customer'}: "${content.slice(0, 80)}" — rental ${rental.rentalRef}`,
          actionUrl: '/app/virtual-numbers'
        });
      }
      return Response.json({ ok: true, message });
    }

    // Typing indicator for the rental chat — see orderChat 'typing'.
    if (action === 'typing') {
      const rental = await loadRental(body.rentalId);
      const now = new Date().toISOString();
      await service.entities.NumberRental.update(rental.id, rental.buyerUserId === user.id ? { buyerTypingAt: now } : { sellerTypingAt: now });
      return Response.json({ ok: true });
    }

    if (action === 'complete') {
      const rental = await loadRental(body.rentalId);
      if (rental.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can complete this rental' }, { status: 403 });
      }
      if (rental.status !== 'active') {
        return Response.json({ error: `Rental already ${rental.status}` }, { status: 400 });
      }
      if (rental.provider) {
        return Response.json({ error: 'Live provider rentals complete automatically when your OTP arrives.' }, { status: 400 });
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

    // ---------- Live provider numbers (Fleexa-compatible: Server A / B) ----------

    // Live provider rental prices (SMS + email OTP) follow the same backend
    // fee engine as every other service — Admin → Pricing fee rules apply to
    // the provider cost under the 'virtual_number' service.

    if (action === 'provider_catalog') {
      const servers = [];
      for (const s of getOtpServers()) {
        const entry = {
          id: s.id,
          label: s.label,
          configured: Boolean(s.url && s.key),
          online: false,
          smsStock: 0,
          smsServices: [],
          emailProducts: []
        };
        if (entry.configured) {
          try {
            await otpServerStatus(s);
            entry.online = true;
            try {
              const apps = await listSmsServices(s);
              const inStock = (apps || []).filter(a => a.quantity === null || Number(a.quantity) > 0);
              entry.smsStock = inStock.length;
              entry.smsServices = inStock.slice(0, 150).map(a => ({ id: a.id, quantity: Number(a.quantity) }));
            } catch (e) { /* stock list unavailable on this server */ }
            try {
              const products = await listEmailProducts(s);
              entry.emailProducts = (products || []).slice(0, 60).map(p => ({ id: p.id, price: Number(p.price_ngn) || 0 }));
            } catch (e) { /* email list unavailable on this server */ }
          } catch (e) { /* server offline */ }
        }
        servers.push(entry);
      }
      return Response.json({ ok: true, servers });
    }

    if (action === 'provider_price') {
      const server = getOtpServer(body.serverId);
      if (!server) return Response.json({ error: 'Unknown server' }, { status: 400 });
      const product = body.product === 'email' ? 'email' : 'sms';
      if (product === 'sms') {
        const serviceName = String(body.serviceName || '').trim().toLowerCase().slice(0, 40);
        if (!serviceName) return Response.json({ error: 'Choose a service first' }, { status: 400 });
        const price = await getSmsPrice(server, serviceName);
        const providerPrice = Number(price.price_ngn) || 0;
        if (!providerPrice) return Response.json({ error: 'No price available for this service right now' }, { status: 502 });
        const pricing = await calculatePrice(service, 'virtual_number', providerPrice);
        return Response.json({ ok: true, customerPrice: pricing.customerPrice });
      }
      const domain = String(body.domain || '').trim().slice(0, 80);
      const products = await listEmailProducts(server);
      const match = (products || []).find(p => p.id === domain);
      if (!match) return Response.json({ error: 'That email domain is not available' }, { status: 400 });
      const providerPrice = Number(match.price_ngn) || 0;
      if (!providerPrice) return Response.json({ error: 'No price available for this domain right now' }, { status: 502 });
      const pricing = await calculatePrice(service, 'virtual_number', providerPrice);
      return Response.json({ ok: true, customerPrice: pricing.customerPrice });
    }

    if (action === 'provider_rent') {
      const server = getOtpServer(body.serverId);
      if (!server || !server.url || !server.key) {
        return Response.json({ error: 'Choose an available server' }, { status: 400 });
      }
      const product = body.product === 'email' ? 'email' : 'sms';
      let serviceName = '';
      let providerCost = 0;
      let customerPrice = 0;

      if (product === 'sms') {
        serviceName = String(body.serviceName || '').trim().toLowerCase().slice(0, 40);
        if (!serviceName) return Response.json({ error: 'Choose the service you need the number for' }, { status: 400 });
        const price = await getSmsPrice(server, serviceName);
        providerCost = Number(price.price_ngn) || 0;
        if (!providerCost) return Response.json({ error: 'This service is not available right now' }, { status: 502 });
      } else {
        serviceName = String(body.domain || '').trim().slice(0, 80);
        const products = await listEmailProducts(server);
        const match = (products || []).find(p => p.id === serviceName);
        if (!match) return Response.json({ error: 'That email domain is not available' }, { status: 400 });
        providerCost = Number(match.price_ngn) || 0;
        if (!providerCost) return Response.json({ error: 'This email domain is not available right now' }, { status: 502 });
      }
      const pricing = await calculatePrice(service, 'virtual_number', providerCost);
      customerPrice = pricing.customerPrice;

      const transactionId = generateTransactionId();
      let debit;
      try {
        debit = await debitWallet(service, {
          userId: user.id, transactionId, type: 'purchase',
          amount: customerPrice, reference: transactionId,
          description: `Virtual ${product === 'sms' ? 'number' : 'email OTP'} — ${serviceName}`,
          idempotencyKey: `vnp-${transactionId}`
        });
      } catch (e) {
        return Response.json({ error: e.message }, { status: e.statusCode || 400 });
      }
      if (debit.duplicated) {
        return Response.json({ error: 'This rental is already being processed. Refresh and try again.' }, { status: 409 });
      }

      let handle = '';
      let providerOrderId = '';
      let providerExpiresIn = 0;
      try {
        if (product === 'sms') {
          const order = await buySmsNumber(server, serviceName);
          handle = String((order && (order.phone || order.number)) || '');
          providerExpiresIn = Number(order && order.expires_in) || 0;
          providerOrderId = String((order && (order.id || order.activation_id || order.requestId)) || '');
          const paid = Number(order && order.amount_paid) || 0;
          if (paid > providerCost) {
            // price changed at the provider — stop and refund
            try { await cancelSmsRequest(server, providerOrderId); } catch (e) { /* best effort */ }
            await creditWallet(service, {
              userId: user.id, transactionId, type: 'refund',
              amount: customerPrice, reference: transactionId,
              description: `Refund — provider price changed (${serviceName})`,
              idempotencyKey: `vnpr-${transactionId}`
            });
            return Response.json({ error: 'The provider price just changed. Please try again — you were refunded.' }, { status: 409 });
          }
          if (paid > 0) providerCost = paid;
        } else {
          const order = await buyEmailOtp(server, serviceName);
          handle = String((order && (order.email || order.address)) || '');
          providerOrderId = String((order && (order.id || order.emailId)) || '');
        }
      } catch (e) {
        await creditWallet(service, {
          userId: user.id, transactionId, type: 'refund',
          amount: customerPrice, reference: transactionId,
          description: `Refund — provider order failed (${serviceName})`,
          idempotencyKey: `vnpr-${transactionId}`
        });
        return Response.json({ error: e.message }, { status: e.statusCode || 502 });
      }

      if (!handle || !providerOrderId) {
        try { await cancelSmsRequest(server, providerOrderId); } catch (e) { /* best effort */ }
        await creditWallet(service, {
          userId: user.id, transactionId, type: 'refund',
          amount: customerPrice, reference: transactionId,
          description: `Refund — provider order incomplete (${serviceName})`,
          idempotencyKey: `vnpr-${transactionId}`
        });
        return Response.json({ error: 'The provider did not return your number. You were refunded — please try again.' }, { status: 502 });
      }

      const minutes = product === 'sms'
        ? (providerExpiresIn > 60 ? Math.min(20, Math.max(3, Math.ceil(providerExpiresIn / 60))) : 20)
        : 60;
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      const rental = await service.entities.NumberRental.create({
        rentalRef: makeRef('VN'), transactionId,
        listingId: `PROVIDER-${server.id.toUpperCase()}`,
        buyerUserId: user.id, sellerUserId: 'system',
        service: product === 'sms' ? `${serviceName} (live number)` : `${serviceName} (email OTP)`,
        amount: customerPrice, sellerPayout: 0, commission: 0,
        product, provider: (server.provider || (server.id === 'b' ? 'smspool' : 'fleexa')), serverId: server.id,
        providerOrderId, deliveredHandle: handle,
        status: 'active', expiresAt, sellerTypingAt: now
      });
      await service.entities.Transaction.create({
        transactionId, userId: user.id, type: 'virtual_number',
        service: `Virtual ${product === 'sms' ? 'Number' : 'Email OTP'} — ${serviceName}`,
        provider: (server.provider || (server.id === 'b' ? 'smspool' : 'fleexa')), amount: customerPrice,
        fee: customerPrice - providerCost, providerCost, customerPrice,
        status: 'processing', recipient: handle,
        metadata: {
          rentalId: rental.id, rentalRef: rental.rentalRef,
          product, serverId: server.id, providerOrderId
        }
      });
      await service.entities.RentalMessage.create({
        rentalId: rental.id, buyerUserId: user.id,
        senderRole: 'system', senderName: 'Lemak OTP Bot',
        content: product === 'sms'
          ? `Your live ${serviceName} number is ${handle}. Use it now — your OTP code will appear here automatically within ${minutes} minutes.`
          : `Your temporary email address is ${handle}. Use it to receive your OTP code — it will appear here automatically.`
      });
      return Response.json({ ok: true, rental, handle, wallet: debit.wallet });
    }

    if (action === 'provider_check') {
      const rental = await loadRental(body.rentalId);
      if (rental.status !== 'active') {
        return Response.json({ ok: true, status: rental.status });
      }
      const server = getOtpServer(rental.serverId);
      if (!server) return Response.json({ error: 'Provider server not found' }, { status: 400 });

      let data = null;
      try {
        data = rental.product === 'email'
          ? await checkEmailOtp(server, rental.providerOrderId)
          : await checkSmsRequest(server, rental.providerOrderId);
      } catch (e) {
        return Response.json({ error: e.message }, { status: e.statusCode || 502 });
      }

      const d = data || {};
      // Provider status markers (e.g. "WAITING") must never be treated as an OTP.
      const NON_CODE_VALUES = ['RECEIVED', 'WAIT', 'WAITING', 'PENDING', 'CANCELLED', 'CANCELED', 'EXPIRED', 'NULL', 'NONE', ''];
      const code = d.sms_code || d.otp || d.email_code ||
        (d.code && !NON_CODE_VALUES.includes(String(d.code).toUpperCase()) ? d.code : null);

      if ((d.status === 'cancelled' || d.status === 'canceled') && !code) {
        const nowIso = new Date().toISOString();
        await creditWallet(service, {
          userId: rental.buyerUserId, transactionId: rental.transactionId,
          type: 'refund', amount: rental.amount, reference: rental.rentalRef,
          description: `Refund — provider cancelled rental ${rental.rentalRef}`,
          idempotencyKey: `vn-refund-${rental.id}`
        });
        await service.entities.NumberRental.update(rental.id, { status: 'cancelled', sellerTypingAt: null });
        const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
        if (txs && txs[0]) {
          await service.entities.Transaction.update(txs[0].id, { status: 'refunded', failureReason: 'Cancelled by provider — auto-refund' }).catch(() => null);
        }
        await notifyUser(service, {
          userId: rental.buyerUserId, type: 'transaction',
          title: 'Rental cancelled — refunded',
          message: `The provider cancelled your ${rental.service} rental (${rental.rentalRef}). ₦${Number(rental.amount).toLocaleString()} was refunded to your wallet.`,
          actionUrl: '/app/wallet'
        });
        return Response.json({ ok: true, status: 'cancelled' });
      }

      if (code) {
        const existing = await service.entities.RentalMessage.filter({ rentalId: rental.id, isOtp: true }, '-created_date', 1);
        if (!existing || !existing[0]) {
          const nowIso = new Date().toISOString();
          await service.entities.RentalMessage.create({
            rentalId: rental.id, buyerUserId: rental.buyerUserId,
            senderRole: 'system', senderName: 'Lemak OTP Bot',
            content: String(code).slice(0, 50), isOtp: true
          });
          await service.entities.NumberRental.update(rental.id, { status: 'completed', completedAt: nowIso, sellerTypingAt: null });
          const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
          if (txs && txs[0]) {
            await service.entities.Transaction.update(txs[0].id, { status: 'successful', completedAt: nowIso }).catch(() => null);
          }
          await notifyUser(service, {
            userId: rental.buyerUserId, type: 'transaction',
            title: 'OTP received 🔑',
            message: `Your OTP code for ${rental.service} (${rental.rentalRef}) is ready — open the rental chat to view it.`,
            actionUrl: '/app/virtual-numbers'
          });
        }
        return Response.json({ ok: true, status: 'completed', otp: true });
      }

      // still waiting — refresh the typing indicator so the buyer sees it live
      await service.entities.NumberRental.update(rental.id, { sellerTypingAt: new Date().toISOString() });
      return Response.json({ ok: true, status: 'waiting' });
    }

    if (action === 'provider_cancel') {
      const rental = await loadRental(body.rentalId);
      if (rental.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can cancel this rental' }, { status: 403 });
      }
      if (!rental.provider) {
        return Response.json({ error: 'Not a live provider rental' }, { status: 400 });
      }
      if (rental.status !== 'active') {
        return Response.json({ error: `Rental already ${rental.status}` }, { status: 400 });
      }
      const otps = await service.entities.RentalMessage.filter({ rentalId: rental.id, isOtp: true }, '-created_date', 1);
      if (otps && otps[0]) {
        return Response.json({ error: 'An OTP was already delivered for this rental, so it cannot be cancelled.' }, { status: 400 });
      }
      const server = getOtpServer(rental.serverId);
      if (server) {
        try {
          if (rental.product === 'email') await cancelEmailOtp(server, rental.providerOrderId);
          else await cancelSmsRequest(server, rental.providerOrderId);
        } catch (e) { /* provider-side refund handled by them */ }
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
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}