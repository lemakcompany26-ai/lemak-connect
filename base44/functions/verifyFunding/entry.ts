import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { generateTransactionId, creditWallet, notifyUser, round2, applySignupPromoBonus, getFundingSettlement, finalizeReferralReward } from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';
import { sendTransactionalSms } from '../../shared/sms.ts';

// Verifies a Paystack payment server-side and credits the wallet exactly once.
// The frontend's claim of success is never trusted — the Paystack verify API
// is the source of truth, plus an idempotency key prevents double crediting.
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

    const secretKey = secrets.get('PAYSTACK_SECRET_KEY');
    if (!secretKey) return Response.json({ error: 'Could not verify payment right now.' }, { status: 503 });

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` }
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.status || data.data.status !== 'success') {
      const gatewayStatus = data && data.data ? data.data.status : 'unknown';
      if (payment.status !== 'successful') {
        await service.entities.Payment.update(payment.id, { status: gatewayStatus === 'failed' ? 'failed' : 'pending', gatewayResponse: data && data.data ? { status: data.data.status, channel: data.data.channel } : null });
      }
      return Response.json({ credited: false, status: gatewayStatus, message: 'Payment not completed yet.' }, { status: 200 });
    }

    // Already credited? (webhook may have beaten us here)
    if (payment.creditedWallet) {
      return Response.json({ credited: true, alreadyCredited: true, amount: round2(payment.amount / 100) });
    }

    // Credit wallet — idempotent on the reference
    const settlement = getFundingSettlement(payment.amount / 100);
    const nairaAmount = settlement.creditedAmount;
    const transactionId = generateTransactionId();
    const credited = await creditWallet(service, {
      userId: user.id, transactionId, type: 'deposit', amount: nairaAmount,
      reference, description: 'Wallet funding via card payment',
      idempotencyKey: `fund-${reference}`
    });
    await service.entities.Payment.update(payment.id, {
      status: 'successful', creditedWallet: true, paidAt: new Date().toISOString(),
      channel: data.data.channel || 'card', gatewayResponse: { status: 'success', channel: data.data.channel }
    });
    await service.entities.Transaction.create({
      transactionId, userId: user.id, type: 'wallet_funding', service: 'Wallet Funding',
      provider: 'Paystack', amount: nairaAmount, fee: settlement.fee, providerCost: settlement.paidAmount,
      customerPrice: settlement.paidAmount, status: 'successful', providerReference: reference,
      metadata: { fundingFee: settlement.fee, paidAmount: settlement.paidAmount, creditedAmount: nairaAmount },
      idempotencyKey: `fund-${reference}`, completedAt: new Date().toISOString()
    });
    await notifyUser(service, {
      userId: user.id, type: 'wallet',
      title: 'Wallet funded successfully',
      message: `₦${nairaAmount.toLocaleString()} was credited after a ₦${settlement.fee} funding fee. You paid ₦${settlement.paidAmount.toLocaleString()}. Reference: ${reference}`,
      actionUrl: '/app/wallet'
    });
    await sendTransactionalEmail(service, {
      emailType: 'WALLET_FUNDING_SUCCESS', userId: user.id, recipientEmail: user.email,
      recipientName: user.full_name, transactionId,
      data: {
        amount: nairaAmount, paidAmount: settlement.paidAmount, fee: settlement.fee, transactionId, reference,
        status: 'Successful', date: new Date().toISOString(),
        balance: credited && credited.wallet ? credited.wallet.balance : null
      }
    });
    await sendTransactionalSms(service, {
      smsType: 'WALLET_FUNDING_SUCCESS', userId: user.id, transactionId,
      data: {
        amount: nairaAmount, paidAmount: settlement.paidAmount, fee: settlement.fee, transactionId,
        balance: credited && credited.wallet ? credited.wallet.balance : null
      }
    });
    // ₦1,000 welcome bonus for new users who signed up with a live promo
    // code — credited once, right after their first real funding.
    await applySignupPromoBonus(service, user.id);
    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    await finalizeReferralReward(service, profiles && profiles[0]);

    return Response.json({ credited: true, amount: nairaAmount, paidAmount: settlement.paidAmount, fee: settlement.fee, reference });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}