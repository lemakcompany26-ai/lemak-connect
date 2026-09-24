import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { generateTransactionId, creditWallet, notifyUser, round2, applySignupPromoBonus, getFundingSettlement, finalizeReferralReward } from '../../shared/lemak.ts';
import { sendTransactionalSms } from '../../shared/sms.ts';

// Paystack webhook. No user auth — authenticity is verified with the
// PAYSTACK_WEBHOOK_SECRET HMAC-SHA512 signature, then the payment is
// re-verified against the Paystack API before crediting (idempotent).
export default async function(req: Request): Promise<Response> {
  try {
    const secret = secrets.get('PAYSTACK_WEBHOOK_SECRET');
    if (!secret) return Response.json({ error: 'Not configured' }, { status: 503 });

    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(raw));
    const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (expected !== signature) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(raw);
    if (event.event !== 'charge.success' || !event.data || !event.data.reference) {
      return Response.json({ received: true });
    }

    const service = createClientFromRequest(req).asServiceRole;
    const reference = String(event.data.reference);

    const payments = await service.entities.Payment.filter({ reference }, '-created_date', 1);
    const payment = payments && payments[0] ? payments[0] : null;
    if (!payment) return Response.json({ received: true });
    if (payment.creditedWallet) return Response.json({ received: true });

    // Defensive re-verification against Paystack
    const secretKey = secrets.get('PAYSTACK_SECRET_KEY');
    if (secretKey) {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { 'Authorization': `Bearer ${secretKey}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.status || data.data.status !== 'success') {
        return Response.json({ received: true });
      }
    }

    const settlement = getFundingSettlement(payment.amount / 100);
    const nairaAmount = settlement.creditedAmount;
    const transactionId = generateTransactionId();
    await creditWallet(service, {
      userId: payment.userId, transactionId, type: 'deposit', amount: nairaAmount,
      reference, description: 'Wallet funding via card payment (webhook)',
      idempotencyKey: `fund-${reference}`
    });
    await service.entities.Payment.update(payment.id, {
      status: 'successful', creditedWallet: true, paidAt: new Date().toISOString()
    });
    await service.entities.Transaction.create({
      transactionId, userId: payment.userId, type: 'wallet_funding', service: 'Wallet Funding',
      provider: 'Paystack', amount: nairaAmount, fee: settlement.fee, providerCost: settlement.paidAmount,
      customerPrice: settlement.paidAmount, status: 'successful', providerReference: reference,
      metadata: { fundingFee: settlement.fee, paidAmount: settlement.paidAmount, creditedAmount: nairaAmount },
      idempotencyKey: `fund-${reference}`, completedAt: new Date().toISOString()
    });
    await notifyUser(service, {
      userId: payment.userId, type: 'wallet',
      title: 'Wallet funded successfully',
      message: `₦${nairaAmount.toLocaleString()} was credited after a ₦${settlement.fee} funding fee. You paid ₦${settlement.paidAmount.toLocaleString()}. Reference: ${reference}`,
      actionUrl: '/app/wallet'
    });
    await sendTransactionalSms(service, {
      smsType: 'WALLET_FUNDING_SUCCESS', userId: payment.userId, transactionId,
      data: { amount: nairaAmount, paidAmount: settlement.paidAmount, fee: settlement.fee, transactionId, balance: null }
    });
    // ₦1,000 welcome bonus for new users who signed up with a live promo
    // code — credited once, right after their first real funding.
    await applySignupPromoBonus(service, payment.userId);
    const profiles = await service.entities.UserProfile.filter({ userId: payment.userId }, '-created_date', 1);
    await finalizeReferralReward(service, profiles && profiles[0]);

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}