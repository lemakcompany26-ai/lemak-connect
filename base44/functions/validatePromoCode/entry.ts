import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validatePromo, calculatePrice } from '../../shared/lemak.ts';

// Server-side promo validation. The frontend only shows the green check
// when this returns valid: true. Never trusts frontend validation.
// with forSignup: true it checks a signup welcome-bonus code instead —
// usable before the user is logged in (registration forms).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const forSignup = body.forSignup === true;
    const user = await base44.auth.me().catch(() => null);
    if (!user && !forSignup) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const { code, serviceSlug, providerCost } = body;
    if (!code) return Response.json({ valid: false, reason: 'Enter a promo code' }, { status: 200 });

    // Signup bonus code: is this code live and usable right now?
    if (forSignup) {
      const clean = String(code).trim().toUpperCase();
      const promos = await service.entities.PromoCode.filter({ code: clean }, '-created_date', 10);
      const promo = promos && promos[0];
      if (!promo) return Response.json({ valid: false, reason: 'This promo code is invalid' });
      if (!promo.isActive) return Response.json({ valid: false, reason: 'This promo code is not active' });
      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
        return Response.json({ valid: false, reason: 'This promo code has expired' });
      }
      if (promo.totalUsageLimit != null && (promo.totalUsageCount || 0) >= Number(promo.totalUsageLimit)) {
        return Response.json({ valid: false, reason: 'This promo code has reached its usage limit' });
      }
      if (user) {
        const redemptions = await service.entities.PromoRedemption.filter({ userId: user.id }, '-created_date', 100);
        if (redemptions && redemptions.some(r => r.promoCodeId === promo.id)) {
          return Response.json({ valid: false, reason: 'You have already used this promo code' });
        }
      }
      return Response.json({
        valid: true, active: true,
        signupBonus: Number(promo.signupBonus) || 0,
        description: promo.description || null
      });
    }

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
      customerPrice,
      signupBonus: result.promo ? (Number(result.promo.signupBonus) || 0) : 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}