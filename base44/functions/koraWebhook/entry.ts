import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { generateTransactionId, creditWallet, notifyUser, round2, applySignupPromoBonus } from '../../shared/lemak.ts';
import { sendTransactionalEmail } from '../../shared/emails.ts';
import { sendTransactionalSms } from '../../shared/sms.ts';

// Kora virtual-account deposit webhook. Public endpoint — authenticity is
// verified with the x-korapay-signature HMAC-SHA256 header (computed over the
// data object with the Kora secret key), then the payment is re-verified
// against Kora's Charge Query API before the wallet is credited exactly once.
export default async function(req: Request): Promise<Response> {
  try {
    const secretKey = secrets.get('KORA_SECRET_KEY');
    if (!secretKey) return Response.json({ error: 'Not configured' }, { status: 503 });

    const raw = await req.text();
    let event = null;
    try { event = JSON.parse(raw); } catch (e) { event = null; }
    if (!event || event.event !== 'charge.success' || !event.data || !event.data.reference) {
      return Response.json({ received: true });
    }
    const data = event.data;
    const reference = String(data.reference);
    const idempotencyKey = `KORA-DEPOSIT:${reference}`;

    // Validate the request signature: HMAC-SHA256 of ONLY the data object
    const signature = req.headers.get('x-korapay-signature') || '';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(data)));
    const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (expected !== signature) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const service = createClientFromRequest(req).asServiceRole;

    // Already processed? Do nothing except return success.
    const existingTx = await service.entities.Transaction.filter({ idempotencyKey }, '-created_date', 1);
    if (existingTx && existingTx[0]) return Response.json({ received: true });

    // Never credit on the webhook payload alone — re-verify with Kora.
    const res = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` }
    });
    const verify = await res.json().catch(() => null);
    const charge = verify && verify.data ? verify.data : null;
    if (!res.ok || !charge || charge.status !== 'success' || String(charge.currency || '') !== 'NGN') {
      return Response.json({ received: true });
    }

    // Identify the customer's permanent virtual account
    const vba = charge.virtual_bank_account || null;
    const accountReference = vba ? String(vba.account_reference || '') : '';
    if (!accountReference) return Response.json({ received: true });
    const accounts = await service.entities.VirtualBankAccount.filter({ accountReference }, '-created_date', 5);
    const account = accounts && accounts[0] ? accounts[0] : null;
    if (!account) return Response.json({ received: true });

    const nairaAmount = round2(Number(charge.amount_paid != null ? charge.amount_paid : charge.amount) || 0);
    if (!nairaAmount || nairaAmount <= 0) return Response.json({ received: true });

    // Credit the wallet exactly once — idempotent on the payment reference
    const transactionId = generateTransactionId();
    const credited = await creditWallet(service, {
      userId: account.userId, transactionId, type: 'deposit', amount: nairaAmount,
      reference, description: 'Wallet funding via bank transfer',
      idempotencyKey
    });
    if (credited.duplicated) return Response.json({ received: true });

    await service.entities.Transaction.create({
      transactionId, userId: account.userId, type: 'wallet_funding',
      service: 'Wallet Funding — Bank Transfer', provider: 'Kora',
      amount: nairaAmount, fee: 0, providerCost: nairaAmount, customerPrice: nairaAmount,
      status: 'successful', providerReference: reference,
      metadata: {
        fundingMethod: 'bank_transfer', virtualAccountReference: accountReference,
        providerFee: charge.fee != null ? Number(charge.fee) : null,
        webhookVerified: true, verification: 'charge_query'
      },
      idempotencyKey, completedAt: new Date().toISOString()
    });

    const users = await service.entities.User.filter({ id: account.userId }, '-created_date', 1);
    const owner = users && users[0] ? users[0] : null;

    await notifyUser(service, {
      userId: account.userId, type: 'wallet',
      title: 'Wallet funded successfully',
      message: `₦${nairaAmount.toLocaleString()} was added to your wallet. Reference: ${transactionId}`,
      actionUrl: '/app/wallet'
    });
    if (owner && owner.email) {
      await sendTransactionalEmail(service, {
        emailType: 'WALLET_FUNDING_SUCCESS', userId: account.userId,
        recipientEmail: owner.email, recipientName: owner.full_name || null,
        transactionId,
        data: {
          amount: nairaAmount, transactionId, reference,
          status: 'Successful', date: new Date().toISOString(),
          balance: credited.wallet ? credited.wallet.balance : null
        }
      });
    }
    await sendTransactionalSms(service, {
      smsType: 'WALLET_FUNDING_SUCCESS', userId: account.userId, transactionId,
      data: { amount: nairaAmount, transactionId, balance: credited.wallet ? credited.wallet.balance : null }
    });
    await applySignupPromoBonus(service, account.userId);

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}