import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validatePromo, calculatePrice } from '../../shared/lemak.ts';

// Server-side promo validation. The frontend only shows the green check
// when this returns valid: true. Never trusts frontend validation.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const { code, serviceSlug, providerCost } = body;
    if (!code) return Response.json({ valid: false, reason: 'Enter a promo code' }, { status: 200 });

    const cost = Number(providerCost) || 0;
    let customerPrice = cost;
    if (cost > 0) {
      const pricing = await calculatePrice(service, serviceSlug || 'airtime', cost);
      customerPrice = pricing.customerPrice;
    }

    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    const redemptions = profile
      ? await service.entities.PromoRedemption.filter({ userId: user.id }, '-created_date', 100)
      : [];
    const transactions = profile
      ? await service.entities.Transaction.filter({ userId: user.id }, '-created_date', 100)
      : [];
    const isNewUser = transactions.length === 0 && redemptions.length === 0;

    const result = await validatePromo(service, {
      code, userId: user.id, serviceSlug: serviceSlug || null,
      customerPrice, isNewUser
    });
    return Response.json({
      valid: result.valid, reason: result.reason || null,
      discount: result.discount || 0,
      customerPrice
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}