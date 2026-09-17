import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateTransactionId, calculatePrice, validatePromo, redeemPromo, debitWallet, creditWallet, notifyUser, sendUserEmail, emailTemplate, round2 } from '../../shared/lemak.ts';
import { getVtuConfig, purchaseDataViaProvider, fetchDataPlans, isProviderSuccess, extractProviderReference } from '../../shared/vtu.ts';

// Data purchase flow. The plan's cost is re-verified against the provider
// catalogue — the frontend price is never trusted.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const { network, phoneNumber, planId, promoCode, idempotencyKey } = body;

    if (!['MTN', 'Airtel', 'Glo', '9mobile'].includes(network)) {
      return Response.json({ error: 'Select a valid network' }, { status: 400 });
    }
    if (!/^0\d{10}$/.test(String(phoneNumber || ''))) {
      return Response.json({ error: 'Enter a valid 11-digit Nigerian phone number' }, { status: 400 });
    }
    if (!planId) return Response.json({ error: 'Select a data plan' }, { status: 400 });

    // Account status check
    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    if (profile && profile.accountStatus !== 'active') {
      return Response.json({ error: 'Your account is ' + profile.accountStatus + '. Contact support for help.' }, { status: 403 });
    }

    // Re-verify plan and cost against the provider catalogue (authoritative)
    const config = getVtuConfig();
    if (!config.configured) {
      return Response.json({ error: 'Data service is temporarily unavailable. Please try again later.' }, { status: 503 });
    }
    const rawPlans = await fetchDataPlans(network);
    const rawPlan = rawPlans.find(p => String(p.id || p.plan_id || p.planId || p.code || '') === String(planId));
    if (!rawPlan) {
      return Response.json({ error: 'That data plan is no longer available. Please refresh and pick another plan.' }, { status: 400 });
    }
    const providerCost = Number(rawPlan.cost || rawPlan.price || rawPlan.amount || 0);
    const planName = String(rawPlan.name || rawPlan.plan_name || rawPlan.planName || rawPlan.title || 'Data Plan');
    const planSize = String(rawPlan.size || rawPlan.volume || rawPlan.data_amount || planName);
    const validity = String(rawPlan.validity || rawPlan.duration || rawPlan.expiry || '');

    // Authoritative backend pricing
    const pricing = await calculatePrice(service, 'data', providerCost);
    let payable = pricing.customerPrice;
    let promoResult = null;
    if (promoCode) {
      promoResult = await validatePromo(service, { code: promoCode, userId: user.id, serviceSlug: 'data', customerPrice: pricing.customerPrice });
      if (!promoResult.valid) {
        return Response.json({ error: promoResult.reason }, { status: 400 });
      }
      payable = round2(payable - promoResult.discount);
    }

    // Idempotent transaction creation
    const idem = String(idempotencyKey || '').trim() || generateTransactionId();
    const existingTx = await service.entities.Transaction.filter({ idempotencyKey: idem }, '-created_date', 1);
    if (existingTx && existingTx[0]) {
      return Response.json({ transaction: existingTx[0], duplicated: true });
    }

    const transactionId = generateTransactionId();
    let transaction = await service.entities.Transaction.create({
      transactionId, userId: user.id, type: 'data', service: 'Data Bundle',
      provider: 'Bigisubs', amount: payable, fee: pricing.fee,
      providerCost: pricing.providerCost, customerPrice: pricing.customerPrice,
      status: 'processing', recipient: phoneNumber,
      metadata: { network, planId: String(planId), planName, planSize, validity, promoCode: promoResult ? promoResult.code : null, discount: promoResult ? promoResult.discount : 0 },
      idempotencyKey: idem
    });

    // Debit wallet
    let debit;
    try {
      debit = await debitWallet(service, {
        userId: user.id, transactionId, type: 'purchase', amount: payable,
        reference: transactionId, description: `Data purchase — ${planName} for ${phoneNumber}`,
        idempotencyKey: `debit-${idem}`
      });
    } catch (e) {
      transaction = await service.entities.Transaction.update(transaction.id, { status: 'failed', failureReason: e.message });
      return Response.json({ error: e.message, transaction }, { status: e.statusCode || 400 });
    }
    if (debit.duplicated) {
      return Response.json({ transaction, duplicated: true });
    }

    // Call provider
    let response;
    try {
      response = await purchaseDataViaProvider({ network, phoneNumber, planId: String(planId), reference: transactionId });
    } catch (e) {
      response = { ok: false, data: null, error: e.message };
    }

    if (response && (isProviderSuccess(response) || (response.ok && response.status && response.status < 300 && response.data))) {
      const providerReference = extractProviderReference(response.data);
      transaction = await service.entities.Transaction.update(transaction.id, {
        status: 'successful', providerReference, completedAt: new Date().toISOString()
      });
      await service.entities.DataOrder.create({
        transactionId, userId: user.id, network, phoneNumber, planId: String(planId),
        planName, planSize, validity, amount: providerCost, customerPrice: payable,
        status: 'successful', providerReference
      });
      if (promoResult) {
        await redeemPromo(service, promoResult, user.id, transactionId, promoResult.discount);
      }
      await notifyUser(service, {
        userId: user.id, type: 'transaction',
        title: 'Data purchase successful',
        message: `${planName} sent to ${phoneNumber} (${network}) for ₦${payable.toLocaleString()}. Reference: ${transactionId}`,
        actionUrl: '/app/transactions'
      });
      await sendUserEmail({
        to: user.email,
        subject: 'Data purchase successful — ' + transactionId,
        html: emailTemplate('Data Purchase Successful',
          `<p>Your data purchase was successful.</p>
           <p><b>Plan:</b> ${planName}<br/><b>Phone:</b> ${phoneNumber}<br/>
           <b>Amount:</b> ₦${payable.toLocaleString()}<br/><b>Reference:</b> ${transactionId}</p>`)
      });
      return Response.json({ transaction, wallet: debit.wallet });
    }

    // Provider failed — refund
    const failureReason = (response && response.data && response.data.message) || 'Provider could not process this purchase. You have been refunded.';
    const refund = await creditWallet(service, {
      userId: user.id, transactionId, type: 'refund', amount: payable,
      reference: transactionId, description: 'Refund — failed data purchase',
      idempotencyKey: `refund-${idem}`
    });
    transaction = await service.entities.Transaction.update(transaction.id, { status: 'refunded', failureReason });
    await notifyUser(service, {
      userId: user.id, type: 'transaction',
      title: 'Data purchase failed — refunded',
      message: `We could not complete your data purchase. ₦${payable.toLocaleString()} has been refunded to your wallet. Reference: ${transactionId}`,
      actionUrl: '/app/transactions'
    });
    await sendUserEmail({
      to: user.email,
      subject: 'Data purchase refunded — ' + transactionId,
      html: emailTemplate('Data Purchase Refunded',
        `<p>We could not complete your data purchase and have refunded ₦${payable.toLocaleString()} to your wallet.</p>
         <p><b>Reference:</b> ${transactionId}</p>`)
    });
    return Response.json({ error: failureReason, transaction, wallet: refund.wallet }, { status: 502 });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message }, { status });
  }
}