import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateTransactionId, calculatePrice, validatePromo, redeemPromo, debitWallet, creditWallet, notifyUser, sendUserEmail, emailTemplate, round2 } from '../../shared/lemak.ts';
import { fetchSmmServices, findSmmService, addSmmOrder } from '../../shared/smm.ts';
import { assertPinForPurchase } from '../../shared/security.ts';

// Social media growth (SMM panel) service: catalogue, price preview,
// and wallet-purchased orders. Rates and prices are always recomputed
// server-side from the live panel catalogue.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'categories') {
      const services = await fetchSmmServices();
      const counts = {};
      for (const s of services) {
        counts[s.category] = (counts[s.category] || 0) + 1;
      }
      const categories = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return Response.json({ categories });
    }

    if (action === 'services') {
      const category = String(body.category || '').trim();
      const search = String(body.search || '').trim().toLowerCase();
      const limit = Math.min(Math.max(Number(body.limit) || 200, 1), 500);
      let services = await fetchSmmServices();
      if (category) services = services.filter(s => s.category === category);
      if (search) services = services.filter(s => s.name.toLowerCase().includes(search) || s.category.toLowerCase().includes(search));
      return Response.json({ services: services.slice(0, limit) });
    }

    if (action === 'preview') {
      const svc = await findSmmService(body.serviceId);
      if (!svc) return Response.json({ error: 'That service is no longer available.' }, { status: 400 });
      const quantity = Math.floor(Number(body.quantity) || 0);
      if (quantity < svc.min || quantity > svc.max) {
        return Response.json({ error: `Quantity must be between ${svc.min} and ${svc.max}` }, { status: 400 });
      }
      const providerCost = round2((svc.rate * quantity) / 1000);
      const pricing = await calculatePrice(service, 'smm', providerCost);
      return Response.json({ providerCost: pricing.providerCost, customerPrice: pricing.customerPrice, min: svc.min, max: svc.max });
    }

    if (action === 'purchase') {
      const link = String(body.link || '').trim();
      const quantity = Math.floor(Number(body.quantity) || 0);
      if (!link || link.length < 4 || link.length > 300) {
        return Response.json({ error: 'Enter the link (or username) the order should be delivered to' }, { status: 400 });
      }

      // Account status check
      const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
      const profile = profiles && profiles[0] ? profiles[0] : null;
      if (profile && profile.accountStatus !== 'active') {
        return Response.json({ error: 'Your account is ' + profile.accountStatus + '. Contact support for help.' }, { status: 403 });
      }

      // Transaction PIN gate
      try {
        await assertPinForPurchase(service, user.id, body.pin, body.biometricToken);
      } catch (e) {
        return Response.json({ error: e.message }, { status: e.statusCode || 403 });
      }

      // Authoritative re-check against the live panel catalogue
      const svc = await findSmmService(body.serviceId);
      if (!svc) return Response.json({ error: 'That service is no longer available.' }, { status: 400 });
      if (quantity < svc.min || quantity > svc.max) {
        return Response.json({ error: `Quantity must be between ${svc.min} and ${svc.max}` }, { status: 400 });
      }
      const providerCost = round2((svc.rate * quantity) / 1000);
      const pricing = await calculatePrice(service, 'smm', providerCost);
      let payable = pricing.customerPrice;
      let promoResult = null;
      if (body.promoCode) {
        promoResult = await validatePromo(service, { code: body.promoCode, userId: user.id, serviceSlug: 'smm', customerPrice: pricing.customerPrice });
        if (!promoResult.valid) {
          return Response.json({ error: promoResult.reason }, { status: 400 });
        }
        payable = round2(payable - promoResult.discount);
      }

      // Idempotent transaction creation
      const idem = String(body.idempotencyKey || '').trim() || generateTransactionId();
      const existingTx = await service.entities.Transaction.filter({ idempotencyKey: idem }, '-created_date', 1);
      if (existingTx && existingTx[0]) {
        return Response.json({ transaction: existingTx[0], duplicated: true });
      }

      const transactionId = generateTransactionId();
      let transaction = await service.entities.Transaction.create({
        transactionId, userId: user.id, type: 'smm', service: 'Social Growth',
        provider: 'SMM Panel', amount: payable, fee: pricing.fee,
        providerCost: pricing.providerCost, customerPrice: pricing.customerPrice,
        status: 'processing', recipient: link,
        metadata: {
          serviceId: svc.id, serviceName: svc.name, category: svc.category,
          link, quantity, promoCode: promoResult ? promoResult.code : null,
          discount: promoResult ? promoResult.discount : 0
        },
        idempotencyKey: idem
      });

      // Debit wallet
      let debit;
      try {
        debit = await debitWallet(service, {
          userId: user.id, transactionId, type: 'purchase', amount: payable,
          reference: transactionId, description: `Social growth — ${svc.name}`,
          idempotencyKey: `debit-${idem}`
        });
      } catch (e) {
        transaction = await service.entities.Transaction.update(transaction.id, { status: 'failed', failureReason: e.message });
        return Response.json({ error: e.message, transaction }, { status: e.statusCode || 400 });
      }
      if (debit.duplicated) {
        return Response.json({ transaction, duplicated: true });
      }

      // Place the order on the panel
      let panelOrderId = null;
      try {
        panelOrderId = await addSmmOrder({ serviceId: svc.id, link, quantity });
      } catch (e) {
        panelOrderId = null;
      }

      if (panelOrderId) {
        transaction = await service.entities.Transaction.update(transaction.id, {
          status: 'successful', providerReference: panelOrderId,
          completedAt: new Date().toISOString()
        });
        if (promoResult) {
          await redeemPromo(service, promoResult, user.id, transactionId, promoResult.discount);
        }
        await notifyUser(service, {
          userId: user.id, type: 'transaction',
          title: 'Social growth order placed',
          message: `${svc.name} × ${quantity.toLocaleString()} is being delivered to ${link}. Reference: ${transactionId}`,
          actionUrl: '/app/transactions'
        });
        await sendUserEmail({
          to: user.email,
          subject: 'Social growth order placed — ' + transactionId,
          html: emailTemplate('Social Growth Order Placed',
            `<p>Your order was accepted and is being delivered.</p>
             <p><b>Service:</b> ${svc.name}<br/><b>Link:</b> ${link}<br/>
             <b>Quantity:</b> ${quantity.toLocaleString()}<br/><b>Amount:</b> ₦${payable.toLocaleString()}<br/>
             <b>Reference:</b> ${transactionId}</p>
             <p>Delivery speed depends on the service — some complete within minutes, others take longer.</p>`)
        });
        return Response.json({ transaction, wallet: debit.wallet });
      }

      // Panel rejected the order — refund
      const failureReason = 'The provider could not accept this order. You have been refunded.';
      const refund = await creditWallet(service, {
        userId: user.id, transactionId, type: 'refund', amount: payable,
        reference: transactionId, description: 'Refund — failed social growth order',
        idempotencyKey: `refund-${idem}`
      });
      transaction = await service.entities.Transaction.update(transaction.id, { status: 'refunded', failureReason });
      await notifyUser(service, {
        userId: user.id, type: 'transaction',
        title: 'Social growth order failed — refunded',
        message: `We could not place your order. ₦${payable.toLocaleString()} has been refunded to your wallet. Reference: ${transactionId}`,
        actionUrl: '/app/transactions'
      });
      return Response.json({ error: failureReason, transaction, wallet: refund.wallet }, { status: 502 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}