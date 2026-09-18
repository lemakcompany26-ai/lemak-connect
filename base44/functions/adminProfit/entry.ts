import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail } from '../../shared/lemak.ts';

// Admin-only profit calculator & analytics. Server-side authorization:
// only admin / super_admin profiles (or the platform owner emails) may
// access profit data — customers and sellers are always rejected.

const SERVICE_TYPES = ['airtime', 'data', 'electricity', 'cable', 'betting', 'education', 'epin', 'broadband', 'virtual_number', 'smm', 'marketplace'];

function round2(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

// Paystack local NGN fee: 1.5% + ₦100, capped at ₦2,000 (amount in kobo).
function paymentFeeKobo(amountKobo) {
  const amt = Number(amountKobo) || 0;
  if (amt <= 0) return 0;
  return Math.min(Math.ceil(amt * 0.015 + 10000), 200000);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    // Server-side authorization — never rely on hiding the menu.
    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    const role = (profile && profile.role) || '';
    if (!(role === 'admin' || role === 'super_admin' || isAdminEmail(user.email))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'summary');

    // Currently configured server-side pricing rules, for calculator presets.
    if (action === 'rules') {
      const rules = await service.entities.FeeRule.filter({ isActive: true }, '-priority', 100);
      return Response.json({
        ok: true,
        rules: (rules || []).map(r => ({
          name: r.name, scope: r.scope, serviceSlug: r.serviceSlug || null,
          fixedFee: Number(r.fixedFee) || 0, percentageFee: Number(r.percentageFee) || 0,
          providerCharge: Number(r.providerCharge) || 0, adminMarkup: Number(r.adminMarkup) || 0,
          minimumFee: Number(r.minimumFee) || 0, maximumFee: r.maximumFee == null ? null : Number(r.maximumFee),
          priority: Number(r.priority) || 0
        }))
      });
    }

    // Real transaction profit, computed only from authoritative backend records.
    if (action === 'transactions') {
      const txs = await service.entities.Transaction.list('-created_date', 300);
      const rows = (txs || [])
        .filter(t => SERVICE_TYPES.includes(t.type))
        .map(t => {
          const paid = Number(t.customerPrice) || 0;
          const cost = Number(t.providerCost) || 0;
          const refund = ['refunded', 'reversed'].includes(t.status) ? paid : 0;
          const gross = round2(paid - cost);
          return {
            transactionId: t.transactionId || t.id,
            date: t.created_date,
            service: t.service || t.type,
            provider: t.provider || '',
            providerCost: round2(cost),
            providerCharge: round2((t.metadata && t.metadata.providerCharge) || 0),
            customerPaid: round2(paid),
            paymentFee: 0,
            refund: round2(refund),
            grossProfit: gross,
            netProfit: round2(gross - refund),
            status: t.status
          };
        });
      return Response.json({ ok: true, transactions: rows });
    }

    // Profit summary over completed transactions only — failed and
    // cancelled orders are never counted as revenue or profit.
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const [okTxs, refundedTxs, payments] = await Promise.all([
      service.entities.Transaction.filter({ status: 'successful' }, '-created_date', 1000),
      service.entities.Transaction.filter({ status: 'refunded' }, '-created_date', 1000),
      service.entities.Payment.filter({ status: 'successful' }, '-created_date', 1000)
    ]);

    const serviceTxs = arr => (arr || []).filter(t => SERVICE_TYPES.includes(t.type));
    const period = (fromIso) => {
      const successes = serviceTxs(okTxs).filter(t => t.created_date >= fromIso);
      const refunds = serviceTxs(refundedTxs).filter(t => t.created_date >= fromIso);
      const revenue = successes.reduce((s, t) => s + (Number(t.customerPrice) || 0), 0);
      const cost = successes.reduce((s, t) => s + (Number(t.providerCost) || 0), 0);
      const refundTotal = refunds.reduce((s, t) => s + (Number(t.customerPrice) || 0), 0);
      const fees = (payments || [])
        .filter(p => String(p.paidAt || p.created_date) >= fromIso)
        .reduce((s, p) => s + paymentFeeKobo(p.amount) / 100, 0);
      const gross = revenue - cost;
      return {
        revenue: round2(revenue),
        providerCost: round2(cost),
        grossProfit: round2(gross),
        paymentFees: round2(fees),
        refunds: round2(refundTotal),
        netProfit: round2(gross - fees - refundTotal)
      };
    };

    return Response.json({
      ok: true,
      summary: {
        today: period(startOfDay),
        '7days': period(d7),
        '30days': period(d30),
        thisMonth: period(startOfMonth),
        allTime: period('')
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}