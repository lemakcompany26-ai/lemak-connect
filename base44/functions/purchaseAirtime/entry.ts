import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateTransactionId, calculatePrice, validatePromo, redeemPromo, debitWallet, creditWallet, notifyUser, round2 } from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';
import { sendTransactionalSms } from '../../shared/sms.ts';
import { getVtuConfig, purchaseAirtimeViaProvider, isProviderSuccess, extractProviderReference } from '../../shared/vtu.ts';
import { assertPinForPurchase } from '../../shared/security.ts';

// Airtime purchase flow:
// authenticate -> validate -> price (backend) -> promo (backend) -> check wallet
// -> create transaction -> debit wallet -> call provider -> verify result
// -> update transaction -> refund on failure -> notify customer.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const { network, phoneNumber, amount, promoCode, idempotencyKey, pin } = body;

    if (!['MTN', 'Airtel', 'Glo', '9mobile'].includes(network)) {
      return Response.json({ error: 'Select a valid network' }, { status: 400 });
    }
    if (!/^0\d{10}$/.test(String(phoneNumber || ''))) {
      return Response.json({ error: 'Enter a valid 11-digit Nigerian phone number' }, { status: 400 });
    }
    const nairaAmount = Number(amount);
    if (!nairaAmount || nairaAmount < 50) {
      return Response.json({ error: 'Minimum airtime amount is ₦50' }, { status: 400 });
    }

    // Account status check
    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    if (profile && profile.accountStatus !== 'active') {
      return Response.json({ error: 'Your account is ' + profile.accountStatus + '. Contact support for help.' }, { status: 403 });
    }

    // Transaction PIN gate (active only when enabled in Settings → Security)
    try {
      await assertPinForPurchase(service, user.id, pin, body.biometricToken);
    } catch (e) {
      return Response.json({ error: e.message }, { status: e.statusCode || 403 });
    }

    // Authoritative backend pricing
    const pricing = await calculatePrice(service, 'airtime', nairaAmount);
    let payable = pricing.customerPrice;
    let promoResult = null;
    if (promoCode) {
      promoResult = await validatePromo(service, { code: promoCode, userId: user.id, serviceSlug: 'airtime', customerPrice: pricing.customerPrice });
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
      transactionId, userId: user.id, type: 'airtime', service: 'Airtime',
      provider: 'Bigisubs', amount: payable, fee: pricing.fee,
      providerCost: pricing.providerCost, customerPrice: pricing.customerPrice,
      status: 'processing', recipient: phoneNumber,
      metadata: { network, requestedAmount: nairaAmount, promoCode: promoResult ? promoResult.code : null, discount: promoResult ? promoResult.discount : 0 },
      idempotencyKey: idem
    });

    // Debit wallet
    let debit;
    try {
      debit = await debitWallet(service, {
        userId: user.id, transactionId, type: 'purchase', amount: payable,
        reference: transactionId, description: `Airtime purchase — ${network} ${phoneNumber}`,
        idempotencyKey: `debit-${idem}`
      });
    } catch (e) {
      transaction = await service.entities.Transaction.update(transaction.id, { status: 'failed', failureReason: e.message });
      return Response.json({ error: e.message, transaction }, { status: e.statusCode || 400 });
    }
    if (debit.duplicated) {
      return Response.json({ transaction, duplicated: true });
    }

    // Provider availability
    const config = getVtuConfig();
    if (!config.configured || !config.pin) {
      await creditWallet(service, {
        userId: user.id, transactionId, type: 'refund', amount: payable,
        reference: transactionId, description: 'Refund — airtime service unavailable',
        idempotencyKey: `refund-${idem}`
      });
      transaction = await service.entities.Transaction.update(transaction.id, { status: 'failed', failureReason: 'Service temporarily unavailable. You have been refunded.' });
      return Response.json({ error: 'Airtime service is temporarily unavailable. Your wallet has been refunded.', transaction }, { status: 503 });
    }

    // Call provider
    let response;
    try {
      response = await purchaseAirtimeViaProvider({ network, phoneNumber, amount: nairaAmount, reference: transactionId });
    } catch (e) {
      response = { ok: false, data: null, error: e.message };
    }

    if (response && (isProviderSuccess(response) || (response.ok && response.status && response.status < 300 && response.data))) {
      const providerReference = extractProviderReference(response.data);
      transaction = await service.entities.Transaction.update(transaction.id, {
        status: 'successful', providerReference, completedAt: new Date().toISOString()
      });
      await service.entities.AirtimeOrder.create({
        transactionId, userId: user.id, network, phoneNumber,
        amount: nairaAmount, customerPrice: payable, status: 'successful', providerReference
      });
      if (promoResult) {
        await redeemPromo(service, promoResult, user.id, transactionId, promoResult.discount);
      }
      await notifyUser(service, {
        userId: user.id, type: 'transaction',
        title: 'Airtime purchase successful',
        message: `₦${payable.toLocaleString()} airtime sent to ${phoneNumber} (${network}). Reference: ${transactionId}`,
        actionUrl: '/app/transactions'
      });
      await sendTransactionalEmail(service, {
        emailType: 'TRANSACTION_SUCCESS', userId: user.id, recipientEmail: user.email,
        recipientName: (profile && profile.fullName) || user.full_name,
        transactionId,
        data: {
          service: `Airtime (${network})`, recipient: phoneNumber,
          amount: payable, transactionId, status: 'Successful',
          date: new Date().toISOString(), providerReference
        }
      });
      await sendTransactionalSms(service, {
        smsType: 'TRANSACTION_SUCCESS', userId: user.id,
        phone: (profile && profile.phone) || null, transactionId,
        data: { service: `Airtime (${network})`, amount: payable, recipient: phoneNumber, transactionId }
      });
      return Response.json({ transaction, wallet: debit.wallet });
    }

    // Provider failed — refund
    const failureReason = (response && response.data && response.data.message) || 'Provider could not process this purchase. You have been refunded.';
    const refund = await creditWallet(service, {
      userId: user.id, transactionId, type: 'refund', amount: payable,
      reference: transactionId, description: 'Refund — failed airtime purchase',
      idempotencyKey: `refund-${idem}`
    });
    transaction = await service.entities.Transaction.update(transaction.id, { status: 'refunded', failureReason });
    await notifyUser(service, {
      userId: user.id, type: 'transaction',
      title: 'Airtime purchase failed — refunded',
      message: `We could not complete your airtime purchase. ₦${payable.toLocaleString()} has been refunded to your wallet. Reference: ${transactionId}`,
      actionUrl: '/app/transactions'
    });
    await sendTransactionalEmail(service, {
      emailType: 'TRANSACTION_FAILED', userId: user.id, recipientEmail: user.email,
      recipientName: (profile && profile.fullName) || user.full_name,
      transactionId,
      data: {
        service: `Airtime (${network})`, recipient: phoneNumber,
        amount: payable, transactionId, status: 'Failed — refunded',
        date: new Date().toISOString(), reason: failureReason,
        refundStatus: 'Refunded to your wallet'
      }
    });
    return Response.json({ error: failureReason, transaction, wallet: refund.wallet }, { status: 502 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}