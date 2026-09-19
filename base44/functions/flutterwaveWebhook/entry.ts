import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { generateTransactionId, creditWallet, notifyUser, round2, applySignupPromoBonus } from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';
import { sendTransactionalSms } from '../../shared/sms.ts';

// Flutterwave wallet-funding webhook. Public endpoint — the verif-hash header
// must match the configured webhook secret, then the transaction is re-queried
// on Flutterwave (status, amount, currency AND reference verified) before the
// wallet is credited exactly once.
export default async function(req: Request): Promise<Response> {
  try {
    const webhookSecret = secrets.get('FLW_WEBHOOK_SECRET');
    if (!webhookSecret) return Response.json({ error: 'Not configured' }, { status: 503 });

    const signature = req.headers.get('verif-hash') || '';
    if (!signature || signature !== webhookSecret) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = await req.json().catch(() => null);
    if (!event) return Response.json({ received: true });
    const txRef = String(event.tx_ref || event.txRef || '');
    if (!txRef) return Response.json({ received: true });

    const service = createClientFromRequest(req).asServiceRole;
    const payments = await service.entities.Payment.filter({ reference: txRef }, '-created_date', 1);
    const payment = payments && payments[0] ? payments[0] : null;
    if (!payment) return Response.json({ received: true });
    if (payment.creditedWallet) return Response.json({ received: true });

    const secretKey = secrets.get('FLW_SECRET_KEY');
    if (!secretKey) return Response.json({ error: 'Not configured' }, { status: 503 });

    // Re-query Flutterwave — the webhook payload alone is never trusted
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` }
    });
    const verify = await res.json().catch(() => null);
    const tx = verify && verify.data ? verify.data : null;
    const expected = round2(payment.amount / 100);
    const ok = res.ok && verify && verify.status === 'success' && tx &&
      tx.status === 'successful' &&
      String(tx.currency || '').toUpperCase() === 'NGN' &&
      String(tx.tx_ref || '') === txRef &&
      round2(Number(tx.amount)) >= expected;
    if (!ok) return Response.json({ received: true });

    // Credit the wallet exactly once — idempotent on the transaction reference
    const idempotencyKey = `FLW-DEPOSIT:${txRef}`;
    const transactionId = generateTransactionId();
    const credited = await creditWallet(service, {
      userId: payment.userId, transactionId, type: 'deposit', amount: expected,
      reference: txRef, description: 'Wallet funding via card payment (Flutterwave)',
      idempotencyKey
    });
    if (credited.duplicated) return Response.json({ received: true });

    await service.entities.Payment.update(payment.id, {
      status: 'successful', creditedWallet: true, paidAt: new Date().toISOString(),
      channel: 'flutterwave',
      gatewayResponse: { status: tx.status, flw_ref: tx.flw_ref || null, id: tx.id || null }
    });
    await service.entities.Transaction.create({
      transactionId, userId: payment.userId, type: 'wallet_funding',
      service: 'Wallet Funding — Card (Flutterwave)', provider: 'Flutterwave',
      amount: expected, fee: 0, providerCost: expected, customerPrice: expected,
      status: 'successful', providerReference: String(tx.id || txRef),
      metadata: { fundingMethod: 'card', webhookVerified: true, verification: 'verify_by_reference' },
      idempotencyKey, completedAt: new Date().toISOString()
    });

    const users = await service.entities.User.filter({ id: payment.userId }, '-created_date', 1);
    const owner = users && users[0] ? users[0] : null;

    await notifyUser(service, {
      userId: payment.userId, type: 'wallet',
      title: 'Wallet funded successfully',
      message: `₦${expected.toLocaleString()} was added to your wallet. Reference: ${transactionId}`,
      actionUrl: '/app/wallet'
    });
    if (owner && owner.email) {
      await sendTransactionalEmail(service, {
        emailType: 'WALLET_FUNDING_SUCCESS', userId: payment.userId,
        recipientEmail: owner.email, recipientName: owner.full_name || null,
        transactionId,
        data: {
          amount: expected, transactionId, reference: txRef,
          status: 'Successful', date: new Date().toISOString(),
          balance: credited.wallet ? credited.wallet.balance : null
        }
      });
    }
    await sendTransactionalSms(service, {
      smsType: 'WALLET_FUNDING_SUCCESS', userId: payment.userId, transactionId,
      data: { amount: expected, transactionId, balance: credited.wallet ? credited.wallet.balance : null }
    });
    await applySignupPromoBonus(service, payment.userId);

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}