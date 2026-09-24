import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { round2 } from '../../shared/lemak.ts';
import { completeKoraFunding, notifyKoraFunding } from '../../shared/funding.ts';

// Verifies a Kora online-checkout payment server-side and credits the wallet
// exactly once. The frontend's claim of success is never trusted — Kora's
// transaction API is the source of truth, and idempotency prevents a double
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

    const expected = round2(payment.amount / 100);
    if (payment.creditedWallet) {
      return Response.json({ credited: true, alreadyCredited: true, amount: expected });
    }

    const secretKey = secrets.get('KORA_SECRET_KEY');
    if (!secretKey) {
      return Response.json({ error: 'Online funding temporarily unavailable.' }, { status: 503 });
    }

    // Re-query Kora — check reference, status, currency AND amount
    const res = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` }
    });
    const verify = await res.json().catch(() => null);
    const tx = verify && verify.data ? verify.data : null;
    const paidAmount = tx ? round2(Number(tx.amount_paid != null ? tx.amount_paid : tx.amount) || 0) : 0;
    const ok = res.ok && verify && verify.status === true && tx &&
      tx.status === 'success' &&
      String(tx.currency || '').toUpperCase() === 'NGN' &&
      String(tx.reference || '') === reference &&
      paidAmount >= expected;

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
    const result = await completeKoraFunding(service, {
      userId: user.id, amount: expected, reference,
      idempotencyKey: `KORA-DEPOSIT:${reference}`,
      fundingMethod: 'card', providerReference: String(tx.reference || reference)
    });
    await service.entities.Payment.update(payment.id, {
      status: 'successful', creditedWallet: true, paidAt: new Date().toISOString(),
      channel: 'kora', gatewayResponse: { status: tx.status, reference }
    });
    if (!result.duplicated) {
      await notifyKoraFunding(service, {
        userId: user.id, ownerEmail: user.email, ownerName: user.full_name || null,
        amount: result.creditedAmount, paidAmount: result.paidAmount, fee: result.fee,
        transactionId: result.transactionId, reference,
        balance: result.balance
      });
    }

    return Response.json({ credited: true, amount: result.creditedAmount, paidAmount: result.paidAmount, fee: result.fee, reference });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}