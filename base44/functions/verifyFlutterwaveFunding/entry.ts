import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { generateTransactionId, creditWallet, notifyUser, round2, applySignupPromoBonus, getFundingSettlement, finalizeReferralReward } from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';
import { sendTransactionalSms } from '../../shared/sms.ts';

// Verifies a Flutterwave payment server-side and credits the wallet exactly
// once. The frontend's claim of success is never trusted — Flutterwave's
// verify endpoint is the source of truth, and idempotency prevents a double
// credit if the webhook already processed the same payment.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const reference = String(body.reference || '').trim();
    if (!reference) return Response.json({ error: 'Missing payment reference' }, { status: 400 });

    const payments = await service.entities.Payment.filter({ reference }, '-created_date', 1);
    const payment = payments && payments[0] ? payments[0] : null;
    if (!payment || payment.userId !== user.id) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    const settlement = getFundingSettlement(payment.amount / 100);
    const expected = settlement.paidAmount;
    if (payment.creditedWallet) {
      return Response.json({ credited: true, alreadyCredited: true, amount: expected });
    }

    const secretKey = secrets.get('FLW_SECRET_KEY');
    if (!secretKey) {
      return Response.json({ error: 'Flutterwave funding temporarily unavailable.' }, { status: 503 });
    }

    // Re-query Flutterwave — check reference, status, currency AND amount
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` }
    });
    const verify = await res.json().catch(() => null);
    const tx = verify && verify.data ? verify.data : null;
    const ok = res.ok && verify && verify.status === 'success' && tx &&
      tx.status === 'successful' &&
      String(tx.currency || '').toUpperCase() === 'NGN' &&
      String(tx.tx_ref || '') === reference &&
      round2(Number(tx.amount)) >= expected;

    if (!ok) {
      const gatewayStatus = tx ? tx.status : 'unknown';
      if (payment.status !== 'successful') {
        await service.entities.Payment.update(payment.id, {
          status: gatewayStatus === 'failed' ? 'failed' : 'pending',
          gatewayResponse: tx ? { status: tx.status } : null
        });
      }
      return Response.json({ credited: false, status: gatewayStatus, message: 'Payment not completed yet.' }, { status: 200 });
    }

    // Credit wallet — idempotent on the reference (webhook may have beaten us)
    const transactionId = generateTransactionId();
    const credited = await creditWallet(service, {
      userId: user.id, transactionId, type: 'deposit', amount: settlement.creditedAmount,
      reference, description: 'Wallet funding via card payment (Flutterwave)',
      idempotencyKey: `FLW-DEPOSIT:${reference}`
    });
    await service.entities.Payment.update(payment.id, {
      status: 'successful', creditedWallet: true, paidAt: new Date().toISOString(),
      channel: 'flutterwave',
      gatewayResponse: { status: tx.status, flw_ref: tx.flw_ref || null, id: tx.id || null }
    });
    if (!credited.duplicated) {
      await service.entities.Transaction.create({
        transactionId, userId: user.id, type: 'wallet_funding',
        service: 'Wallet Funding — Card (Flutterwave)', provider: 'Flutterwave',
        amount: settlement.creditedAmount, fee: settlement.fee, providerCost: settlement.paidAmount, customerPrice: settlement.paidAmount,
        status: 'successful', providerReference: String(tx.id || reference),
        metadata: { fundingMethod: 'card', verified: true, verification: 'verify_by_reference', fundingFee: settlement.fee, paidAmount: settlement.paidAmount, creditedAmount: settlement.creditedAmount },
        idempotencyKey: `FLW-DEPOSIT:${reference}`, completedAt: new Date().toISOString()
      });
    }
    await notifyUser(service, {
      userId: user.id, type: 'wallet',
      title: 'Wallet funded successfully',
      message: `₦${settlement.creditedAmount.toLocaleString()} was credited after a ₦${settlement.fee} funding fee. You paid ₦${settlement.paidAmount.toLocaleString()}. Reference: ${transactionId}`,
      actionUrl: '/app/wallet'
    });
    await sendTransactionalEmail(service, {
      emailType: 'WALLET_FUNDING_SUCCESS', userId: user.id, recipientEmail: user.email,
      recipientName: user.full_name, transactionId,
      data: {
        amount: settlement.creditedAmount, paidAmount: settlement.paidAmount, fee: settlement.fee, transactionId, reference,
        status: 'Successful', date: new Date().toISOString(),
        balance: credited.wallet ? credited.wallet.balance : null
      }
    });
    await sendTransactionalSms(service, {
      smsType: 'WALLET_FUNDING_SUCCESS', userId: user.id, transactionId,
      data: { amount: settlement.creditedAmount, paidAmount: settlement.paidAmount, fee: settlement.fee, transactionId, balance: credited.wallet ? credited.wallet.balance : null }
    });
    await applySignupPromoBonus(service, user.id);
    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    await finalizeReferralReward(service, profiles && profiles[0]);

    return Response.json({ credited: true, amount: settlement.creditedAmount, paidAmount: settlement.paidAmount, fee: settlement.fee, reference });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}