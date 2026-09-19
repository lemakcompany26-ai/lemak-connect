import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { round2 } from '../../shared/lemak.ts';

// Initializes a Kora online checkout for wallet funding (server-side). The
// secret key never reaches the frontend. The wallet is never credited here —
// only after server-side verification (verifyKoraFunding / koraWebhook).
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

    const secretKey = secrets.get('KORA_SECRET_KEY');
    if (!secretKey) {
      return Response.json({ error: 'Online funding temporarily unavailable.' }, { status: 503 });
    }

    const reference = `LMK-KORA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await service.entities.Payment.create({
      userId: user.id, reference, amount: Math.round(amount * 100),
      status: 'initialized', channel: 'kora', creditedWallet: false,
      idempotencyKey: reference
    });

    const origin = new URL(req.url).origin;
    const callbackUrl = String(body.callbackUrl || '');
    const payload = {
      reference,
      amount: round2(amount),
      currency: 'NGN',
      redirect_url: (callbackUrl.startsWith('http://') || callbackUrl.startsWith('https://')) ? callbackUrl : `${origin}/app/wallet`,
      notification_url: `${origin}/functions/koraWebhook`,
      customer: { email: user.email, name: user.full_name || '' }
    };

    const res = await fetch('https://api.korapay.com/merchant/api/v1/charges/initialize', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || data.status !== true || !data.data || !data.data.checkout_url) {
      return Response.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
    }

    return Response.json({ checkoutUrl: data.data.checkout_url, reference, amount: round2(amount) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}