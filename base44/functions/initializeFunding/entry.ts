import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { generateTransactionId } from '../../shared/lemak.ts';

// Initializes a Paystack transaction for wallet funding.
// The secret key never reaches the frontend. Wallet is never credited here —
// only after server-side verification (verifyFunding / paystackWebhook).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount < 100) {
      return Response.json({ error: 'Minimum funding amount is ₦100' }, { status: 400 });
    }
    if (amount > 5000000) {
      return Response.json({ error: 'Maximum funding amount is ₦5,000,000' }, { status: 400 });
    }

    const secretKey = secrets.get('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      return Response.json({ error: 'Card funding is temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    const reference = `LMK-FUND-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await service.entities.Payment.create({
      userId: user.id, reference, amount: Math.round(amount * 100),
      status: 'initialized', creditedWallet: false,
      idempotencyKey: reference
    });

    const initPayload = {
      email: user.email,
      amount: Math.round(amount * 100),
      reference,
      currency: 'NGN',
      metadata: { userId: user.id, purpose: 'wallet_funding', app: 'lemak-connect' }
    };
    const callbackUrl = String(body.callbackUrl || '');
    if (callbackUrl.startsWith('http://') || callbackUrl.startsWith('https://')) {
      initPayload.callback_url = callbackUrl;
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(initPayload)
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.status || !data.data || !data.data.authorization_url) {
      return Response.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
    }

    return Response.json({ authorizationUrl: data.data.authorization_url, reference, amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}