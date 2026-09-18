import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  generateTransactionId, debitWallet, creditWallet,
  computeMarketplaceFees, notifyUser, calculatePrice, isAdminEmail, isStaffRole
} from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';
import {
  getOtpServers, getOtpServer, otpServerStatus, listSmsServices, listSmsCountries, getSmsPrice,
  buySmsNumber, checkSmsRequest, cancelSmsRequest, listEmailProducts,
  buyEmailOtp, checkEmailOtp, cancelEmailOtp,
  listRentAreas, listRentServices, buyRentNumber, listRentSms
} from '../../shared/otp.ts';

// Virtual number rental market + unified live OTP service.
// Customers see ONE "Virtual Numbers" service — the backend picks the
// eligible provider (internal Server A / Server B) and never exposes
// provider names, URLs, request ids or costs to the customer.
// Seller-listed numbers use wallet escrow; expired rentals are auto-refunded
// by a scheduled workflow. The number itself is never exposed publicly —
// only to an active renter, inside their private order screen.

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

    // ---------- Rent (seller-listed numbers) ----------
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
      // Internal provider fields are stripped; isLive marks provider orders.
      return Response.json({
        ok: true,
        rentals: (rentals || []).map(r => {
          const { provider, serverId, providerOrderId, ...safe } = r;
          return { ...safe, isLive: !!r.provider, number: r.deliveredHandle || numbers[r.listingId] || null };
        })
      });
    }

    const loadRental = async (id) => {
      const rows = await service.entities.NumberRental.filter({ id: id || body.rentalId || body.orderId }, '-created_date', 1);
      const rental = rows && rows[0];
      if (!rental) throw bad('Order not found', 404);
      if (rental.buyerUserId !== user.id && rental.sellerUserId !== user.id) {
        throw bad('You are not part of this order', 403);
      }
      return rental;
    };

    if (action === 'messages') {
      const rental = await loadRental();
      const messages = await service.entities.RentalMessage.filter({ rentalId: rental.id }, 'created_date', 200);
      return Response.json({ ok: true, messages });
    }

    if (action === 'send_message') {
      const rental = await loadRental();
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
      const rental = await loadRental();
      const now = new Date().toISOString();
      await service.entities.NumberRental.update(rental.id, rental.buyerUserId === user.id ? { buyerTypingAt: now } : { sellerTypingAt: now });
      return Response.json({ ok: true });
    }

    if (action === 'complete') {
      const rental = await loadRental();
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
      const rental = await loadRental();
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
      await service.entities.NumberRental.update(rental.id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
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

    // ---------- Unified live Virtual Numbers (providers fully hidden) ----------

    // Unified customer catalogue: ONE normalized list across every configured
    // server — services, real availability, countries, email products and
    // rental options with final prices. No server/provider details, costs or
    // markups ever leave the backend.
    // One fee-rule read per request, reused for every price computed below —
    // avoids hammering the database with repeated pricing lookups.
    const makePricer = async () => {
      const rules = await service.entities.FeeRule.filter({ isActive: true }, '-priority', 100);
      const rule = (rules || []).find(r => r.scope === 'service' && r.serviceSlug === 'virtual_number') ||
        (rules || []).find(r => r.scope === 'global') || null;
      return (costInput) => {
        const cost = Math.round(Number(costInput) * 100) / 100;
        if (!rule) return { customerPrice: cost };
        const providerCharge = Number(rule.providerCharge) || 0;
        const fixedFee = Number(rule.fixedFee) || 0;
        const pctFee = (cost * (Number(rule.percentageFee) || 0)) / 100;
        const markup = (cost * (Number(rule.adminMarkup) || 0)) / 100;
        let fee = providerCharge + fixedFee + pctFee + markup;
        if (rule.minimumFee != null) fee = Math.max(fee, Number(rule.minimumFee));
        if (rule.maximumFee != null) fee = Math.min(fee, Number(rule.maximumFee));
        fee = Math.round(fee * 100) / 100;
        return { customerPrice: Math.round((cost + fee) * 100) / 100 };
      };
    };

    if (action === 'catalog') {
      const pricer = await makePricer();
      const PREFERRED = ['NG', 'US', 'GB', 'CA', 'DE', 'FR', 'IN', 'ZA', 'GH', 'KE'];
      const countries = [];
      const seenCountries = new Set();
      const smsMap = new Map();
      const emailProducts = [];
      let rentAreas = [];
      let rentServices = [];
      let online = 0;
      for (const server of getOtpServers()) {
        if (!server.url || !server.key) continue;
        try { await otpServerStatus(server); } catch (e) { continue; }
        online++;
        const [apps, cts, products] = await Promise.all([
          listSmsServices(server).catch(() => []),
          listSmsCountries(server).catch(() => []),
          listEmailProducts(server).catch(() => [])
        ]);
        for (const c of cts || []) {
          if (c.code && !seenCountries.has(c.code)) {
            seenCountries.add(c.code);
            countries.push({ code: c.code, name: c.name });
          }
        }
        for (const a of apps || []) {
          const id = String(a.id || '').toLowerCase();
          if (!id) continue;
          const qty = (a.quantity === null || a.quantity === undefined) ? null : Number(a.quantity);
          if (qty === 0) continue; // confirmed out of stock on this server
          const prev = smsMap.get(id) || { available: 0, onDemand: false };
          if (qty === null) prev.onDemand = true;
          else prev.available += qty;
          smsMap.set(id, prev);
        }
        for (const p of products || []) {
          const id = String(p.id || '');
          const cost = Number(p.price_ngn) || 0;
          if (!id || !cost || emailProducts.some(e => e.id === id)) continue;
          const pricing = pricer(cost);
          emailProducts.push({ id, customerPrice: pricing.customerPrice });
        }
        if (server.provider !== 'smspool') {
          const [rApps, rAreas] = await Promise.all([
            listRentServices(server).catch(() => []),
            listRentAreas(server).catch(() => [])
          ]);
          rentServices = [...new Set((rApps || [])
            .map(a => String(a.serviceName || a.id || a.name || '').toLowerCase())
            .filter(Boolean))].sort();
          const areaResults = [];
          for (const a of rAreas || []) {
            const unit = Number(a.unit_price_ngn) || 0;
            if (!unit) continue;
            const durations = [];
            for (const m of [1, 3, 12]) {
              const pricing = pricer(unit * m);
              durations.push({ months: m, customerPrice: pricing.customerPrice });
            }
            areaResults.push({
              code: String(a.area_code || a.id || '').toUpperCase(),
              name: a.name || a.area_title || a.full_name || 'United States',
              minMonth: Number(a.min_month) || 1,
              durations
            });
          }
          rentAreas = areaResults;
        }
      }
      countries.sort((a, b) => {
        const ia = PREFERRED.indexOf(a.code);
        const ib = PREFERRED.indexOf(b.code);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.name.localeCompare(b.name);
      });
      return Response.json({
        ok: true,
        available: online > 0,
        countries,
        smsServices: [...smsMap.entries()]
          .map(([id, v]) => ({ id, available: v.onDemand ? null : v.available }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        emailProducts,
        rentServices,
        rentAreas
      });
    }

    // Batched final-price quotes for SMS services. The backend picks the
    // eligible server invisibly; the response carries only availability and
    // the final customer price — never costs, markups or server details.
    if (action === 'quote') {
      const country = String(body.country || 'NG').trim().toUpperCase().slice(0, 2);
      const services = [...new Set(
        (Array.isArray(body.services) ? body.services : [body.service])
          .map(s => String(s || '').trim().toLowerCase().slice(0, 40))
          .filter(Boolean)
      )].slice(0, 12);
      if (!services.length) return Response.json({ error: 'Choose a service first' }, { status: 400 });
      const pricer = await makePricer();
      const serverLists = new Map();
      const loadServerLists = async (server) => {
        if (serverLists.has(server.id)) return serverLists.get(server.id);
        const [apps, cts] = await Promise.all([
          listSmsServices(server).catch(() => []),
          listSmsCountries(server).catch(() => [])
        ]);
        const entry = { apps: apps || [], countries: cts || [] };
        serverLists.set(server.id, entry);
        return entry;
      };
      const prices = {};
      for (const name of services) {
        prices[name] = { available: false, customerPrice: null };
        for (const server of getOtpServers()) {
          if (!server.url || !server.key) continue;
          try {
            const lists = await loadServerLists(server);
            if (lists.countries.length && !lists.countries.some(c => c.code === country)) continue;
            const svc = lists.apps.find(a => String(a.id).toLowerCase() === name);
            if (svc && Number(svc.quantity) === 0) continue; // out of stock here
            const price = await getSmsPrice(server, name, country);
            const p = Number(price && price.price_ngn) || 0;
            if (p > 0) {
              const pricing = pricer(p);
              prices[name] = { available: true, customerPrice: pricing.customerPrice };
              break;
            }
          } catch (e) { /* try the next server */ }
        }
      }
      return Response.json({ ok: true, country, prices });
    }

    // Unified catalogue: only services genuinely available from a configured
    // provider are listed. No provider names, no server ids, no fake data.
    if (action === 'unified_catalogue') {
      const servers = getOtpServers().filter(s => s.url && s.key);
      const smsSet = new Set();
      const emailSet = new Set();
      let online = 0;
      for (const s of servers) {
        try {
          await otpServerStatus(s);
          online++;
        } catch (e) { continue; }
        try {
          const apps = await listSmsServices(s);
          for (const a of apps || []) {
            if (a.quantity === null || Number(a.quantity) > 0) smsSet.add(String(a.id).toLowerCase());
          }
        } catch (e) { /* service list unavailable on this provider */ }
        try {
          const products = await listEmailProducts(s);
          for (const p of products || []) emailSet.add(String(p.id));
        } catch (e) { /* email list unavailable on this provider */ }
      }
      return Response.json({
        ok: true,
        available: online > 0,
        smsAvailable: smsSet.size > 0,
        emailAvailable: emailSet.size > 0,
        smsServices: [...smsSet].sort(),
        emailDomains: [...emailSet].sort()
      });
    }

    // Unified price: the backend resolves the eligible provider and returns
    // only the final customer price.
    if (action === 'unified_price') {
      const product = body.product === 'email' ? 'email' : 'sms';
      const serviceName = String(body.service || '').trim().toLowerCase().slice(0, 80);
      if (!serviceName) return Response.json({ error: 'Choose a service first' }, { status: 400 });
      for (const server of getOtpServers()) {
        if (!server.url || !server.key) continue;
        if (product === 'email' && server.id !== 'a') continue;
        try {
          let providerPrice = 0;
          if (product === 'sms') {
            const price = await getSmsPrice(server, serviceName);
            providerPrice = Number(price.price_ngn) || 0;
          } else {
            const products = await listEmailProducts(server);
            const match = (products || []).find(p => String(p.id) === serviceName);
            providerPrice = match ? Number(match.price_ngn) || 0 : 0;
          }
          if (providerPrice > 0) {
            const pricing = await calculatePrice(service, 'virtual_number', providerPrice);
            return Response.json({ ok: true, available: true, customerPrice: pricing.customerPrice });
          }
        } catch (e) { /* try the next provider */ }
      }
      return Response.json({ ok: true, available: false });
    }

    // Create a live provider order — shared by the unified buy flow and the
    // legacy per-server rent action. Provider details stay strictly internal.
    const createLiveOrder = async ({ server, product, serviceName, providerCostInput, customerPrice, country, months = 1, autoRenew = false }) => {
      let providerCost = providerCostInput;
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
        throw bad(e.message, e.statusCode || 400);
      }
      if (debit.duplicated) {
        throw bad('This order is already being processed. Refresh and try again.', 409);
      }

      let handle = '';
      let providerOrderId = '';
      let providerExpiresIn = 0;
      let rentExpiresAt = '';
      try {
        if (product === 'sms') {
          const order = await buySmsNumber(server, serviceName, country && country.code);
          handle = String((order && (order.phone || order.number)) || '');
          providerExpiresIn = Number(order && order.expires_in) || 0;
          providerOrderId = String((order && (order.id || order.activation_id || order.requestId)) || '');
          const paid = Number(order && order.amount_paid) || 0;
          if (paid > providerCost) {
            // provider price changed — stop and refund
            try { await cancelSmsRequest(server, providerOrderId); } catch (e) { /* best effort */ }
            await creditWallet(service, {
              userId: user.id, transactionId, type: 'refund',
              amount: customerPrice, reference: transactionId,
              description: `Refund — price changed (${serviceName})`,
              idempotencyKey: `vnpr-${transactionId}`
            });
            return { ok: false, error: 'The price just changed. Please try again — you were refunded.', status: 409 };
          }
          if (paid > 0) providerCost = paid;
        } else if (product === 'email') {
          const order = await buyEmailOtp(server, serviceName);
          handle = String((order && (order.email || order.address)) || '');
          providerOrderId = String((order && (order.id || order.emailId)) || '');
        } else {
          // Long-term rented number (1-12 months, pre-paid, not cancellable)
          const order = await buyRentNumber(server, serviceName, months);
          handle = String((order && order.number) || '');
          providerOrderId = String((order && order.order_id) || '');
          rentExpiresAt = String((order && order.expire_at) || '');
          if (order && order.cost_ngn > 0) providerCost = order.cost_ngn;
        }
      } catch (e) {
        await creditWallet(service, {
          userId: user.id, transactionId, type: 'refund',
          amount: customerPrice, reference: transactionId,
          description: `Refund — order failed (${serviceName})`,
          idempotencyKey: `vnpr-${transactionId}`
        });
        // Never surface raw provider/API errors to the customer.
        return { ok: false, error: 'We could not complete your order. You were refunded — please try again.', status: 502 };
      }

      if (!handle || !providerOrderId) {
        try { await cancelSmsRequest(server, providerOrderId); } catch (e) { /* best effort */ }
        await creditWallet(service, {
          userId: user.id, transactionId, type: 'refund',
          amount: customerPrice, reference: transactionId,
          description: `Refund — order incomplete (${serviceName})`,
          idempotencyKey: `vnpr-${transactionId}`
        });
        return { ok: false, error: 'We could not get your number. You were refunded — please try again.', status: 502 };
      }

      // OTP waiting window: maximum 7 minutes for numbers; 60 for email OTP.
      const minutes = product === 'sms'
        ? (providerExpiresIn > 0 ? Math.min(7, Math.max(1, Math.ceil(providerExpiresIn / 60))) : 7)
        : 60;
      const nowIso = new Date().toISOString();
      const expiresAt = product === 'rent'
        ? (rentExpiresAt || new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString())
        : new Date(Date.now() + minutes * 60 * 1000).toISOString();
      const rental = await service.entities.NumberRental.create({
        rentalRef: makeRef('VN'), transactionId,
        listingId: `PROVIDER-${server.id.toUpperCase()}`,
        buyerUserId: user.id, sellerUserId: 'system',
        ...(product === 'rent' ? { duration: String(months), autoRenew } : {}),
        service: product === 'sms' ? `${serviceName} (live number)` : product === 'email' ? `${serviceName} (email OTP)` : `${serviceName} (rented number)`,
        country: (country && country.name) || (server.id === 'b' ? 'United States' : null),
        amount: customerPrice, sellerPayout: 0, commission: 0,
        product, provider: (server.provider || (server.id === 'b' ? 'smspool' : 'fleexa')), serverId: server.id,
        providerOrderId, deliveredHandle: handle,
        status: 'active', expiresAt, sellerTypingAt: nowIso,
        otpReceived: false, refundStatus: null, refundAmount: 0
      });
      await service.entities.Transaction.create({
        transactionId, userId: user.id, type: 'virtual_number',
        service: product === 'sms' ? `Virtual Number — ${serviceName}` : product === 'email' ? `Email OTP — ${serviceName}` : `Rented Number — ${serviceName} (${months} month${months > 1 ? 's' : ''})`,
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
        senderRole: 'system', senderName: 'Lemak Connect',
        content: product === 'sms'
          ? `Your live ${serviceName} number is ${handle}. Use it now — your verification message will appear here automatically within ${minutes} minutes.`
          : product === 'email'
            ? `Your temporary email address is ${handle}. Use it to receive your verification code — it will appear here automatically.`
            : `Your dedicated ${serviceName} number is ${handle}. It is yours for ${months} month${months > 1 ? 's' : ''} — every SMS it receives appears here automatically.`
      });
      return { ok: true, rental, handle, wallet: debit.wallet };
    };

    // Unified buy: the customer picks a service; the backend chooses the
    // eligible provider. The response never contains provider details.
    if (action === 'vn_buy') {
      const product = body.product === 'email' ? 'email' : 'sms';
      const serviceName = String(body.service || '').trim().toLowerCase().slice(0, 80);
      if (!serviceName) return Response.json({ error: 'Choose a service first' }, { status: 400 });

      let chosen = null;
      let providerCost = 0;
      for (const server of getOtpServers()) {
        if (!server.url || !server.key) continue;
        if (product === 'email' && server.id !== 'a') continue;
        try {
          if (product === 'sms') {
            const price = await getSmsPrice(server, serviceName);
            const p = Number(price.price_ngn) || 0;
            if (p > 0) { chosen = server; providerCost = p; break; }
          } else {
            const products = await listEmailProducts(server);
            const match = (products || []).find(p => String(p.id) === serviceName);
            if (match && Number(match.price_ngn) > 0) {
              chosen = server; providerCost = Number(match.price_ngn); break;
            }
          }
        } catch (e) { /* try the next provider */ }
      }
      if (!chosen) {
        return Response.json({ error: 'This option is currently unavailable. Please try another service.' }, { status: 502 });
      }
      const pricing = await calculatePrice(service, 'virtual_number', providerCost);
      const result = await createLiveOrder({
        server: chosen, product, serviceName,
        providerCostInput: providerCost, customerPrice: pricing.customerPrice
      });
      if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
      const rental = result.rental;
      await sendTransactionalEmail(service, {
        emailType: 'OTP_NUMBER_PURCHASED', userId: user.id, recipientEmail: user.email,
        recipientName: user.full_name, transactionId: rental.transactionId,
        data: {
          service: rental.service, country: rental.country || '',
          transactionId: rental.transactionId,
          status: 'Active — waiting for your verification message'
        }
      }).catch(() => null);
      return Response.json({
        ok: true, orderId: rental.id, handle: result.handle,
        expiresAt: rental.expiresAt, wallet: result.wallet
      });
    }

    // Sanitized customer order screen — internal provider fields stripped.
    if (action === 'vn_order') {
      const rental = await loadRental();
      const messages = await service.entities.RentalMessage.filter({ rentalId: rental.id }, 'created_date', 200);
      return Response.json({
        ok: true,
        order: {
          id: rental.id, rentalRef: rental.rentalRef, transactionId: rental.transactionId,
          service: rental.service, country: rental.country || '',
          product: rental.product || null, handle: rental.deliveredHandle || null,
          amount: rental.amount, status: rental.status,
          duration: rental.duration || null, autoRenew: !!rental.autoRenew,
          otpReceived: !!rental.otpReceived,
          refundStatus: rental.refundStatus || null, refundAmount: rental.refundAmount || 0,
          expiresAt: rental.expiresAt, createdAt: rental.created_date
        },
        messages: (messages || []).map(m => ({
          id: m.id, senderRole: m.senderRole, senderName: m.senderName,
          content: m.content, isOtp: !!m.isOtp, createdAt: m.created_date
        }))
      });
    }

    // Admin virtual-number dashboard: staff only. Admins CAN see provider,
    // server, request id, cost and markup; customers never can.
    if (action === 'vn_admin_stats') {
      const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
      const profile = profiles && profiles[0] ? profiles[0] : null;
      const authorized = (profile && isStaffRole(profile.role)) || isAdminEmail(user.email);
      if (!authorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const rentals = await service.entities.NumberRental.list('-created_date', 500);
      const live = (rentals || []).filter(r => r.provider);
      const txs = await service.entities.Transaction.filter({ type: 'virtual_number' }, '-created_date', 500);
      const successful = (txs || []).filter(t => t.status === 'successful');
      const revenue = successful.reduce((s, t) => s + Number(t.customerPrice || 0), 0);
      const providerCost = successful.reduce((s, t) => s + Number(t.providerCost || 0), 0);
      return Response.json({
        ok: true,
        stats: {
          total: live.length,
          active: live.filter(r => r.status === 'active').length,
          waiting: live.filter(r => r.status === 'active' && !r.otpReceived).length,
          completed: live.filter(r => r.status === 'completed').length,
          expired: live.filter(r => r.status === 'expired').length,
          cancelled: live.filter(r => r.status === 'cancelled').length,
          refunded: live.filter(r => r.refundStatus === 'REFUNDED').length,
          revenue: Math.round(revenue * 100) / 100,
          providerCost: Math.round(providerCost * 100) / 100,
          profit: Math.round((revenue - providerCost) * 100) / 100
        },
        orders: live.slice(0, 100).map(r => ({
          id: r.id, rentalRef: r.rentalRef, transactionId: r.transactionId,
          provider: r.provider, serverId: r.serverId, providerOrderId: r.providerOrderId,
          service: r.service, country: r.country || '', product: r.product,
          handle: r.deliveredHandle, customerPrice: r.amount,
          status: r.status, otpReceived: !!r.otpReceived,
          refundStatus: r.refundStatus || null, refundAmount: r.refundAmount || 0,
          createdAt: r.created_date
        }))
      });
    }

    // ---------- Legacy live-provider actions (kept for existing flows) ----------

    if (action === 'provider_catalog') {
      const servers = [];
      for (const s of getOtpServers()) {
        const entry = {
          id: s.id,
          label: `Server ${s.id.toUpperCase()}`,
          supportsRent: s.provider !== 'smspool',
          configured: Boolean(s.url && s.key),
          online: false,
          smsStock: 0,
          smsServices: [],
          emailProducts: [],
          countries: []
        };
        if (entry.configured) {
          try {
            await otpServerStatus(s);
            entry.online = true;
            try {
              const apps = await listSmsServices(s);
              entry.smsStock = (apps || []).filter(a => a.quantity === null || Number(a.quantity) > 0).length;
              entry.smsServices = (apps || []).slice(0, 200).map(a => ({ id: a.id, quantity: a.quantity === null ? null : Number(a.quantity) }));
            } catch (e) { /* stock list unavailable on this server */ }
            try {
              const products = await listEmailProducts(s);
              entry.emailProducts = (products || []).slice(0, 60).map(p => ({ id: p.id, price: Number(p.price_ngn) || 0 }));
            } catch (e) { /* email list unavailable on this server */ }
            try {
              const countries = await listSmsCountries(s);
              entry.countries = (countries || []).map(c => ({ code: c.code, name: c.name }));
            } catch (e) { /* country list unavailable on this server */ }
          } catch (e) { /* server offline */ }
        }
        servers.push(entry);
      }
      return Response.json({ ok: true, servers });
    }

    // Rent Number catalogue for one server: rentable apps and areas with
    // duration pricing. Customers only ever see our final price.
    if (action === 'rent_options') {
      const server = getOtpServer(body.serverId);
      if (!server || !server.url || !server.key) return Response.json({ error: 'Choose an available server' }, { status: 400 });
      if (server.provider === 'smspool') {
        return Response.json({ error: 'Long-term rentals are not available on this server.' }, { status: 400 });
      }
      const [apps, areas] = await Promise.all([
        listRentServices(server).catch(() => []),
        listRentAreas(server).catch(() => [])
      ]);
      const areaResults = [];
      for (const a of areas || []) {
        const unit = Number(a.unit_price_ngn) || 0;
        const durations = [];
        for (const m of [1, 3, 12]) {
          if (!unit) continue;
          const pricing = await calculatePrice(service, 'virtual_number', unit * m);
          durations.push({ months: m, customerPrice: pricing.customerPrice });
        }
        areaResults.push({
          code: String(a.area_code || a.id || '').toUpperCase(),
          name: a.name || a.area_title || a.full_name || 'United States',
          minMonth: Number(a.min_month) || 1,
          durations
        });
      }
      return Response.json({
        ok: true,
        apps: [...new Set((apps || []).map(a => String(a.serviceName || a.id || a.name || '').toLowerCase()).filter(Boolean))].sort(),
        areas: areaResults
      });
    }

    if (action === 'provider_price') {
      const server = getOtpServer(body.serverId);
      if (!server) return Response.json({ error: 'Unknown server' }, { status: 400 });
      const product = body.product === 'email' ? 'email' : 'sms';
      if (product === 'sms') {
        const serviceName = String(body.serviceName || '').trim().toLowerCase().slice(0, 40);
        if (!serviceName) return Response.json({ error: 'Choose a service first' }, { status: 400 });
        const country = String(body.country || 'US').trim().toUpperCase().slice(0, 2);
        const supported = await listSmsCountries(server).catch(() => []);
        if (supported.length && !supported.some(c => c.code === country)) {
          return Response.json({ ok: true, available: false });
        }
        const price = await getSmsPrice(server, serviceName, country);
        const providerPrice = Number(price.price_ngn) || 0;
        if (!providerPrice) return Response.json({ error: 'No price available for this service right now' }, { status: 502 });
        const pricing = await calculatePrice(service, 'virtual_number', providerPrice);
        return Response.json({ ok: true, customerPrice: pricing.customerPrice, successRate: price.success_rate || null });
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
      // Server selection is fully automatic: the backend picks the eligible
      // server based on availability, country, stock and price. Customers
      // never choose — or see — which server served the order.
      const product = ['email', 'rent'].includes(body.product) ? body.product : 'sms';
      let serviceName = '';
      if (product === 'email') {
        serviceName = String(body.domain || '').trim().slice(0, 80);
        if (!serviceName) return Response.json({ error: 'Choose an email domain first' }, { status: 400 });
      } else {
        serviceName = String(body.serviceName || '').trim().toLowerCase().slice(0, 40);
        if (!serviceName) return Response.json({ error: 'Choose the service you need the number for' }, { status: 400 });
      }
      const months = product === 'rent'
        ? Math.min(12, Math.max(1, Math.floor(Number(body.months) || 1)))
        : 1;
      const autoRenew = !!body.autoRenew;
      const countryCode = String(body.country || 'NG').trim().toUpperCase().slice(0, 2);
      const explicit = body.serverId ? getOtpServer(body.serverId) : null;
      const candidates = explicit ? [explicit] : getOtpServers().filter(s => s.url && s.key);

      let chosen = null;
      let providerCost = 0;
      let country = null;
      for (const server of candidates) {
        if (!server.url || !server.key) continue;
        try {
          if (product === 'sms') {
            const supported = await listSmsCountries(server).catch(() => []);
            if (supported.length && !supported.some(c => c.code === countryCode)) continue;
            const apps = await listSmsServices(server).catch(() => []);
            const svc = (apps || []).find(a => String(a.id).toLowerCase() === serviceName);
            if (svc && Number(svc.quantity) === 0) continue; // out of stock here
            const price = await getSmsPrice(server, serviceName, countryCode);
            const p = Number(price.price_ngn) || 0;
            if (p > 0) {
              chosen = server;
              providerCost = p;
              country = { code: countryCode, name: (supported.find(c => c.code === countryCode) || {}).name || countryCode };
              break;
            }
          } else if (product === 'email') {
            if (server.provider === 'smspool') continue;
            const products = await listEmailProducts(server);
            const match = (products || []).find(p => String(p.id) === serviceName);
            const cost = match ? Number(match.price_ngn) || 0 : 0;
            if (cost > 0) { chosen = server; providerCost = cost; break; }
          } else {
            if (server.provider === 'smspool') continue;
            const areas = await listRentAreas(server).catch(() => []);
            const area = (areas || []).find(a => String(a.area_code || a.id || '').toUpperCase() === countryCode) || (areas || [])[0];
            const unit = area ? Number(area.unit_price_ngn) || 0 : 0;
            if (unit > 0) {
              chosen = server;
              providerCost = unit * months;
              country = {
                code: String(area.area_code || area.id || countryCode).toUpperCase(),
                name: area.name || area.area_title || 'United States'
              };
              break;
            }
          }
        } catch (e) { /* try the next server */ }
      }
      if (!chosen) {
        return Response.json({ error: 'This service is currently unavailable. Please try another service.' }, { status: 502 });
      }
      const pricing = await calculatePrice(service, 'virtual_number', providerCost);
      const result = await createLiveOrder({
        server: chosen, product, serviceName, country,
        providerCostInput: providerCost, customerPrice: pricing.customerPrice,
        months, autoRenew
      });
      if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
      // Sanitized response: internal provider/server/request fields never
      // reach the browser — only what the customer's receipt needs.
      const r = result.rental;
      return Response.json({
        ok: true,
        rental: {
          id: r.id, rentalRef: r.rentalRef, service: r.service,
          country: r.country || null, product: r.product || null,
          amount: r.amount, status: r.status, expiresAt: r.expiresAt,
          duration: r.duration || null
        },
        handle: result.handle, wallet: result.wallet
      });
    }

    if (action === 'provider_check') {
      const rental = await loadRental();
      if (rental.status !== 'active') {
        return Response.json({ ok: true, status: rental.status });
      }
      const server = getOtpServer(rental.serverId);
      if (!server) return Response.json({ error: 'Order server not found' }, { status: 400 });

      // Rented numbers: every SMS the dedicated number receives is posted to
      // the private chat. The rental stays active for its full period.
      if (rental.product === 'rent') {
        const items = await listRentSms(server, rental.providerOrderId);
        const existing = await service.entities.RentalMessage.filter({ rentalId: rental.id }, 'created_date', 200);
        const seen = new Set((existing || []).map(m => m.content));
        let added = 0;
        for (const item of items || []) {
          const text = String(item.sms_text || item.text || item.message || item.sms || item.code || '').trim();
          if (!text || seen.has(text)) continue;
          await service.entities.RentalMessage.create({
            rentalId: rental.id, buyerUserId: rental.buyerUserId,
            senderRole: 'system', senderName: 'Lemak Connect',
            content: text.slice(0, 500), isOtp: true
          });
          seen.add(text);
          added++;
        }
        if (added > 0 && !rental.otpReceived) {
          await service.entities.NumberRental.update(rental.id, {
            otpReceived: true, otpReceivedAt: new Date().toISOString()
          }).catch(() => null);
          await notifyUser(service, {
            userId: rental.buyerUserId, type: 'virtual_number',
            title: 'New message on your rented number 🔑',
            message: `A message arrived on your rented number (${rental.rentalRef}) — open your order screen to view it.`,
            actionUrl: '/app/virtual-numbers/order/' + rental.id
          });
        }
        return Response.json({ ok: true, status: added > 0 ? 'completed' : 'waiting', otp: added > 0 });
      }

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
          description: `Refund — provider cancelled order ${rental.rentalRef}`,
          idempotencyKey: `vn-refund-${rental.id}`
        });
        await service.entities.NumberRental.update(rental.id, {
          status: 'cancelled', sellerTypingAt: null,
          cancelledAt: nowIso, refundStatus: 'REFUNDED', refundAmount: rental.amount
        });
        const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
        if (txs && txs[0]) {
          await service.entities.Transaction.update(txs[0].id, { status: 'refunded', failureReason: 'Cancelled by provider — auto-refund' }).catch(() => null);
        }
        await notifyUser(service, {
          userId: rental.buyerUserId, type: 'transaction',
          title: 'Order cancelled — refunded',
          message: `Your ${rental.service} order (${rental.rentalRef}) was cancelled. ₦${Number(rental.amount).toLocaleString()} was refunded to your wallet.`,
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
            senderRole: 'system', senderName: 'Lemak Connect',
            content: String(code).slice(0, 50), isOtp: true
          });
          await service.entities.NumberRental.update(rental.id, {
            status: 'completed', completedAt: nowIso, sellerTypingAt: null,
            otpReceived: true, otpReceivedAt: nowIso
          });
          const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
          if (txs && txs[0]) {
            await service.entities.Transaction.update(txs[0].id, { status: 'successful', completedAt: nowIso }).catch(() => null);
          }
          await notifyUser(service, {
            userId: rental.buyerUserId, type: 'transaction',
            title: 'Verification message received 🔑',
            message: `Your verification code for ${rental.service} (${rental.rentalRef}) is ready — open your order screen to view it.`,
            actionUrl: '/app/virtual-numbers'
          });
          // Notification email only — never the code itself.
          await sendTransactionalEmail(service, {
            emailType: 'OTP_RECEIVED', userId: rental.buyerUserId, recipientEmail: user.email,
            recipientName: user.full_name, transactionId: rental.transactionId,
            data: { service: rental.service, transactionId: rental.transactionId }
          }).catch(() => null);
        }
        return Response.json({ ok: true, status: 'completed', otp: true });
      }

      // still waiting — refresh the typing indicator so the buyer sees it live
      await service.entities.NumberRental.update(rental.id, { sellerTypingAt: new Date().toISOString() });
      return Response.json({ ok: true, status: 'waiting' });
    }

    if (action === 'provider_cancel') {
      const rental = await loadRental();
      if (rental.buyerUserId !== user.id) {
        return Response.json({ error: 'Only the buyer can cancel this order' }, { status: 403 });
      }
      if (!rental.provider) {
        return Response.json({ error: 'Not a live provider order' }, { status: 400 });
      }
      if (rental.status !== 'active') {
        return Response.json({ error: `Order already ${rental.status}` }, { status: 400 });
      }
      if (rental.product === 'rent') {
        return Response.json({ error: 'Long-term rentals cannot be cancelled once purchased.' }, { status: 400 });
      }
      const otps = await service.entities.RentalMessage.filter({ rentalId: rental.id, isOtp: true }, '-created_date', 1);
      if (otps && otps[0]) {
        return Response.json({ error: 'This request has already received a verification message and may no longer be eligible for cancellation.' }, { status: 400 });
      }
      // 50-second rule: cancellation opens shortly after the order starts.
      const ageSeconds = (Date.now() - new Date(rental.created_date).getTime()) / 1000;
      if (ageSeconds < 50) {
        return Response.json({ error: 'Cancellation will become available shortly.' }, { status: 400 });
      }
      const nowIso = new Date().toISOString();
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
        description: `Refund — cancelled virtual number order ${rental.rentalRef}`,
        idempotencyKey: `vn-refund-${rental.id}`
      });
      await service.entities.NumberRental.update(rental.id, {
        status: 'cancelled', cancelRequestedAt: nowIso, cancelledAt: nowIso,
        refundStatus: 'REFUNDED', refundAmount: rental.amount
      });
      const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
      if (txs && txs[0]) {
        await service.entities.Transaction.update(txs[0].id, { status: 'refunded', failureReason: 'Order cancelled by buyer' }).catch(() => null);
      }
      await notifyUser(service, {
        userId: rental.buyerUserId, type: 'transaction',
        title: 'Order cancelled — refunded',
        message: `Your ${rental.service} order (${rental.rentalRef}) was cancelled. ₦${Number(rental.amount).toLocaleString()} was refunded to your wallet.`,
        actionUrl: '/app/wallet'
      });
      await sendTransactionalEmail(service, {
        emailType: 'OTP_REFUNDED', userId: rental.buyerUserId, recipientEmail: user.email,
        recipientName: user.full_name, transactionId: rental.transactionId,
        data: {
          service: rental.service, refundAmount: rental.amount,
          transactionId: rental.transactionId, refundStatus: 'REFUNDED'
        }
      }).catch(() => null);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}