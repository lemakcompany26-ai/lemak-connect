import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateTransactionId, calculatePrice, validatePromo, redeemPromo, debitWallet, creditWallet, notifyUser, sendUserEmail, emailTemplate, round2 } from '../../shared/lemak.ts';
import { getVtuConfig, isProviderSuccess, isProviderPending, extractProviderReference, extractProviderError, fetchCablePlans, purchaseCableViaProvider, BETTING_PROVIDERS, validateBettingCustomer, fundBettingViaProvider, fetchRechargePinPlans, purchaseRechargePinViaProvider, fetchServicePlans, normalizeServicePlan, purchaseServiceViaProvider, validateElectricityCustomer } from '../../shared/vtu.ts';
import { assertPinForPurchase } from '../../shared/security.ts';
import { sendTransactionalSms } from '../../shared/sms.ts';

// Purchases for Cable TV, Betting and ePIN. Same flow as airtime/data:
// authenticate -> validate -> price (backend, provider catalogue re-verified)
// -> promo -> idempotent transaction -> debit wallet -> provider call
// -> verify -> notify / refund on failure.

const LABELS = { cable: 'Cable TV', betting: 'Betting', epin: 'ePIN / Recharge', electricity: 'Electricity', education: 'Education', broadband: 'Broadband' };

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const action = String(body.action || '');
    if (!['cable', 'betting', 'epin', 'electricity', 'education', 'broadband'].includes(action)) {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Account status check
    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    if (profile && profile.accountStatus !== 'active') {
      return Response.json({ error: 'Your account is ' + profile.accountStatus + '. Contact support for help.' }, { status: 403 });
    }

    // Transaction PIN gate (active only when enabled in Settings → Security)
    try {
      await assertPinForPurchase(service, user.id, body.pin, body.biometricToken);
    } catch (e) {
      return Response.json({ error: e.message }, { status: e.statusCode || 403 });
    }

    const config = getVtuConfig();
    if (!config.configured || !config.pin) {
      return Response.json({ error: 'This service is temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    // Validate inputs + re-verify provider cost from the live catalogue
    let providerCost = 0;
    let itemLabel = '';
    let recipient = '';
    let metadata = {};
    let providerCall = null;

    if (action === 'cable') {
      const cableName = String(body.cableName || '').toLowerCase();
      const cardNo = String(body.cardNo || '').replace(/\s/g, '');
      const planId = body.planId;
      if (!['dstv', 'gotv', 'startimes'].includes(cableName)) {
        return Response.json({ error: 'Select a valid cable provider' }, { status: 400 });
      }
      if (!/^\d{5,15}$/.test(cardNo)) {
        return Response.json({ error: 'Enter a valid smartcard / decoder number' }, { status: 400 });
      }
      if (!planId) return Response.json({ error: 'Select a package' }, { status: 400 });
      const rawPlans = await fetchCablePlans();
      const rawPlan = rawPlans.find(p => String(p.id) === String(planId));
      if (!rawPlan || String(rawPlan.cable_name || '').toLowerCase() !== cableName) {
        return Response.json({ error: 'That package is no longer available. Please refresh and pick another.' }, { status: 400 });
      }
      providerCost = Number(rawPlan.amount || 0);
      itemLabel = String(rawPlan.product_name || 'Cable package');
      recipient = cardNo;
      metadata = {
        cableName, planId: String(planId), planName: itemLabel,
        variationCode: rawPlan.variation_code || String(planId),
        customerName: body.customerName || null
      };
      providerCall = () => purchaseCableViaProvider({
        cableName, cardNo, variationCode: rawPlan.variation_code || String(planId), amount: providerCost
      });
    }

    if (action === 'betting') {
      const billerCode = String(body.billerCode || '').toLowerCase();
      const customerId = String(body.customerId || '').replace(/\s/g, '');
      const nairaAmount = Number(body.amount);
      const providerInfo = BETTING_PROVIDERS.find(p => p.code === billerCode);
      if (!providerInfo) return Response.json({ error: 'Select a valid betting platform' }, { status: 400 });
      if (!/^[A-Za-z0-9._-]{3,50}$/.test(customerId)) {
        return Response.json({ error: 'Enter a valid betting account / user ID' }, { status: 400 });
      }
      if (!nairaAmount || nairaAmount < 100) {
        return Response.json({ error: 'Minimum betting funding is ₦100' }, { status: 400 });
      }
      providerCost = nairaAmount;
      itemLabel = `${providerInfo.name} wallet funding`;
      recipient = customerId;
      let validation;
      try {
        validation = await validateBettingCustomer({ billerCode, customerId });
      } catch (e) {
        return Response.json({ error: e.message || 'Could not validate this betting ID. Please try again.' }, { status: e.statusCode || 502 });
      }
      const validationData = validation && validation.data && validation.data.data;
      if (!isProviderSuccess(validation) || (validationData && validationData.valid === false)) {
        return Response.json({
          error: extractProviderError(validation, 'Could not validate this betting ID. Please check your account ID and try again.')
        }, { status: 400 });
      }
      metadata = {
        billerCode, providerName: providerInfo.name, customerId,
        customerName: body.customerName || null
      };
      providerCall = () => fundBettingViaProvider({ billerCode, customerId, amount: nairaAmount });
    }

    if (action === 'epin') {
      const planId = body.planId;
      if (!planId) return Response.json({ error: 'Select an ePIN package' }, { status: 400 });
      const rawPlans = await fetchRechargePinPlans();
      const rawPlan = rawPlans.find(p => String(p.id) === String(planId));
      if (!rawPlan) {
        return Response.json({ error: 'That ePIN package is no longer available. Please refresh and pick another.' }, { status: 400 });
      }
      providerCost = Number(rawPlan.regular_price || rawPlan.cost || rawPlan.price || 0);
      const network = String(rawPlan.network_name || '').toUpperCase();
      itemLabel = `${network} ${rawPlan.size || ''} recharge pin`.replace(/\s+/g, ' ').trim();
      recipient = user.email;
      metadata = { network, planId: String(planId), size: rawPlan.size ? String(rawPlan.size) : '' };
      providerCall = () => purchaseRechargePinViaProvider({ planId: String(planId) });
    }

    if (['electricity', 'education', 'broadband'].includes(action)) {
      const planId = String(body.planId || '');
      const rawPlans = await fetchServicePlans(action);
      const rawPlan = rawPlans.map((item, index) => normalizeServicePlan(item, index))
        .find(plan => String(plan.id) === planId);
      const requestedAmount = Number(body.amount);
      if (!rawPlan || (action === 'electricity' ? (!requestedAmount || requestedAmount < 100) : !rawPlan.amount)) {
        return Response.json({ error: 'That plan is no longer available. Please refresh and pick another.' }, { status: 400 });
      }
      providerCost = action === 'electricity' ? requestedAmount : rawPlan.amount;
      itemLabel = rawPlan.name;
      recipient = String(body.recipient || user.email).trim();
      if (!recipient || recipient.length < 3) return Response.json({ error: 'Enter a valid recipient.' }, { status: 400 });
      metadata = { planId, planName: rawPlan.name, providerName: rawPlan.providerName || null, variationCode: rawPlan.variationCode || planId };
      if (action === 'electricity') {
        const validation = await validateElectricityCustomer({
          meterNumber: recipient, meterType: body.meterType || 'prepaid',
          planId, variationCode: rawPlan.variationCode || planId
        });
        if (!validation || !isProviderSuccess(validation)) {
          return Response.json({ error: extractProviderError(validation, 'Could not validate this meter number. Please check it and try again.') }, { status: 400 });
        }
      }
      providerCall = () => purchaseServiceViaProvider({
        serviceType: action, planId, variationCode: rawPlan.variationCode || planId,
        recipient, amount: providerCost, customerName: body.customerName || null, meterType: body.meterType || null
      });
    }

    // Authoritative backend pricing
    const pricing = await calculatePrice(service, action, providerCost);
    let payable = pricing.customerPrice;
    let promoResult = null;
    if (body.promoCode) {
      promoResult = await validatePromo(service, { code: body.promoCode, userId: user.id, serviceSlug: action, customerPrice: pricing.customerPrice });
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
      transactionId, userId: user.id, type: action, service: LABELS[action],
      provider: 'Bigisubs', amount: payable, fee: pricing.fee,
      providerCost: pricing.providerCost, customerPrice: pricing.customerPrice,
      status: 'processing', recipient,
      metadata: { ...metadata, promoCode: promoResult ? promoResult.code : null, discount: promoResult ? promoResult.discount : 0 },
      idempotencyKey: idem
    });

    // Debit wallet
    let debit;
    try {
      debit = await debitWallet(service, {
        userId: user.id, transactionId, type: 'purchase', amount: payable,
        reference: transactionId, description: `${LABELS[action]} — ${itemLabel}`,
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
      response = await providerCall();
    } catch (e) {
      response = { ok: false, data: null, error: e.message };
    }

    if (response && isProviderSuccess(response)) {
      const providerReference = extractProviderReference(response.data);
      const d = (response.data && response.data.data) || response.data;
      // ePIN purchases return the pin details — save them on the transaction
      if (action === 'epin' && d && typeof d === 'object') {
        const epin = {};
        for (const [k, v] of Object.entries(d)) {
          if (v === null || v === undefined || typeof v === 'object') continue;
          epin[k] = String(v).slice(0, 200);
        }
        metadata = { ...metadata, promoCode: promoResult ? promoResult.code : null, epin };
        transaction = await service.entities.Transaction.update(transaction.id, { metadata });
      }
      transaction = await service.entities.Transaction.update(transaction.id, {
        status: 'successful', providerReference, completedAt: new Date().toISOString()
      });
      if (promoResult) {
        await redeemPromo(service, promoResult, user.id, transactionId, promoResult.discount);
      }
      const epinNote = action === 'epin' && transaction.metadata && transaction.metadata.epin
        ? ' Your pin details are saved with this transaction.' : '';
      await notifyUser(service, {
        userId: user.id, type: 'transaction',
        title: `${LABELS[action]} purchase successful`,
        message: `${itemLabel} — ₦${payable.toLocaleString()}. Reference: ${transactionId}.${epinNote}`,
        actionUrl: '/app/transactions'
      });
      await sendUserEmail({
        to: user.email,
        subject: `${LABELS[action]} purchase successful — ` + transactionId,
        html: emailTemplate(LABELS[action] + ' Purchase Successful',
          `<p>Your purchase was successful.</p>
           <p><b>Item:</b> ${itemLabel}<br/><b>Recipient:</b> ${recipient}<br/>
           <b>Amount:</b> ₦${payable.toLocaleString()}<br/><b>Reference:</b> ${transactionId}</p>
           ${action === 'epin' && transaction.metadata && transaction.metadata.epin ? `<p><b>Your ePIN details:</b><br/>${Object.entries(transaction.metadata.epin).map(([k, v]) => `${k}: ${v}`).join('<br/>')}</p>` : ''}`)
      });
      await sendTransactionalSms(service, {
        smsType: 'TRANSACTION_SUCCESS', userId: user.id,
        phone: (profile && profile.phone) || null, transactionId,
        data: {
          service: itemLabel, amount: payable,
          recipient: action === 'epin' ? null : recipient, transactionId
        }
      });
      return Response.json({ transaction, wallet: debit.wallet });
    }

    if (response && isProviderPending(response)) {
      const providerReference = extractProviderReference(response.data);
      transaction = await service.entities.Transaction.update(transaction.id, {
        status: 'processing', providerReference: providerReference || null,
        failureReason: 'The provider is still processing this request.'
      });
      return Response.json({ transaction, wallet: debit.wallet, processing: true }, { status: 202 });
    }

    // Provider failed — refund
    const failureReason = (response && response.data && (response.data.message || (response.data.data && response.data.data.error))) || 'Provider could not process this purchase. You have been refunded.';
    const refund = await creditWallet(service, {
      userId: user.id, transactionId, type: 'refund', amount: payable,
      reference: transactionId, description: `Refund — failed ${LABELS[action]} purchase`,
      idempotencyKey: `refund-${idem}`
    });
    transaction = await service.entities.Transaction.update(transaction.id, { status: 'refunded', failureReason });
    await notifyUser(service, {
      userId: user.id, type: 'transaction',
      title: `${LABELS[action]} purchase failed — refunded`,
      message: `We could not complete your purchase. ₦${payable.toLocaleString()} has been refunded to your wallet. Reference: ${transactionId}`,
      actionUrl: '/app/transactions'
    });
    await sendUserEmail({
      to: user.email,
      subject: `${LABELS[action]} purchase refunded — ` + transactionId,
      html: emailTemplate(LABELS[action] + ' Purchase Refunded',
        `<p>We could not complete your purchase and have refunded ₦${payable.toLocaleString()} to your wallet.</p>
         <p><b>Reference:</b> ${transactionId}</p>`)
    });
    return Response.json({ error: failureReason, transaction, wallet: refund.wallet }, { status: 502 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}