import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { randomHex } from '../../shared/security.ts';

// Kora permanent NGN virtual bank accounts. Every customer gets exactly one
// permanent account tied to their Base44 user. The Kora secret key stays
// server-side; customers only ever see real bank details — no provider API
// names, references or internal routing.
const KORA_API = 'https://api.korapay.com/merchant/api/v1';

function sanitizeAccount(record) {
  return {
    bankName: record.bankName,
    accountNumber: record.accountNumber,
    accountName: record.accountName,
    status: record.status
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'status');

    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    const accounts = await service.entities.VirtualBankAccount.filter({ userId: user.id }, '-created_date', 5);
    const account = accounts && accounts[0] ? accounts[0] : null;

    if (action === 'status') {
      return Response.json({
        account: account ? sanitizeAccount(account) : null,
        kycComplete: !!(profile && profile.fullName && profile.email && profile.bvn)
      });
    }

    if (action === 'save_kyc') {
      if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
      const bvn = String(body.bvn || '').replace(/\D/g, '');
      const nin = String(body.nin || '').replace(/\D/g, '');
      if (!/^\d{11}$/.test(bvn)) {
        return Response.json({ error: 'Enter a valid 11-digit BVN' }, { status: 400 });
      }
      if (nin && !/^\d{11}$/.test(nin)) {
        return Response.json({ error: 'Enter a valid 11-digit NIN' }, { status: 400 });
      }
      await service.entities.UserProfile.update(profile.id, { bvn, nin: nin || null });
      return Response.json({ ok: true });
    }

    if (action === 'create') {
      // Duplicate protection: one permanent account per customer, ever.
      if (account) return Response.json({ account: sanitizeAccount(account) });

      if (!profile || !profile.fullName || !profile.email || !profile.bvn) {
        return Response.json({ error: 'Complete your verification information before creating your dedicated account.' }, { status: 400 });
      }

      const secretKey = secrets.get('KORA_SECRET_KEY');
      if (!secretKey) {
        return Response.json({ error: 'Dedicated account temporarily unavailable. Please try again.' }, { status: 503 });
      }

      const bankCode = secrets.get('KORA_BANK_CODE') || '070';
      const accountReference = `LEM-VBA-${String(user.id).slice(0, 12)}-${randomHex(4).toUpperCase()}`;

      const res = await fetch(`${KORA_API}/virtual-bank-account`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: profile.fullName,
          account_reference: accountReference,
          permanent: true,
          bank_code: bankCode,
          customer: { name: profile.fullName, email: profile.email },
          kyc: { bvn: profile.bvn, ...(profile.nin ? { nin: profile.nin } : {}) }
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.status || !data.data || !data.data.account_number) {
        return Response.json({ error: 'Dedicated account temporarily unavailable. Please try again.' }, { status: 503 });
      }

      const d = data.data;
      const record = await service.entities.VirtualBankAccount.create({
        userId: user.id,
        accountReference,
        koraUniqueId: d.unique_id || null,
        accountNumber: String(d.account_number),
        accountName: String(d.account_name || profile.fullName),
        bankName: String(d.bank_name || ''),
        bankCode: String(d.bank_code || bankCode),
        status: d.account_status === 'active' ? 'active' : 'pending',
        lastCheckedAt: new Date().toISOString()
      });
      return Response.json({ account: sanitizeAccount(record) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'Dedicated account temporarily unavailable. Please try again.' }, { status: 500 });
  }
}