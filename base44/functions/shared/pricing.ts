const USD_TO_NGN = Number(Deno.env.get("USD_TO_NGN") || "1550");

type FeeRule = {
  type: 'percentage' | 'fixed' | 'tiered';
  value: number; // e.g 35 for 35%
  minFee?: number;
};

export function calculateCustomerPrice(
  providerPrice: number, // in USD or already NGN depending on provider
  feeRule?: FeeRule | null,
  isUsdPrice = true
): { providerPriceNGN: number; fee: number; customerPrice: number } {

  const providerNGN = isUsdPrice? Math.round(providerPrice * USD_TO_NGN) : Math.round(providerPrice);

  // Default 35% if no admin rule
  let fee = 0;
  if (!feeRule) {
    fee = Math.round(providerNGN * 0.35);
  } else if (feeRule.type === 'percentage') {
    fee = Math.round(providerNGN * (feeRule.value / 100));
    if (feeRule.minFee && fee < feeRule.minFee) fee = feeRule.minFee;
  } else if (feeRule.type === 'fixed') {
    fee = feeRule.value;
  }

  const customerPrice = providerNGN + fee;

  // Never show 0 - minimum ₦100
  return {
    providerPriceNGN: providerNGN,
    fee,
    customerPrice: customerPrice < 100? 100 : customerPrice
  };
}

export function applyPromoDiscount(price: number, promo: any) {
  if (!promo ||!promo.isActive) return price;

  const now = new Date();
  if (promo.expiresAt && new Date(promo.expiresAt) < now) return price;
  if (promo.maxUses && promo.currentUses >= promo.maxUses) return price;

  let discounted = price;
  if (promo.discountType === 'percentage') {
    discounted = price - Math.round(price * (promo.discountValue / 100));
  } else if (promo.discountType === 'fixed') {
    discounted = price - promo.discountValue;
  }

  return discounted < 50? 50 : discounted;
}

// Helper to get admin FeeRule from DB
export async function getFeeRule(base44: any, serverId: string, serviceId?: string) {
  try {
    // Try specific service rule first
    if (serviceId) {
      const rules = await base44.entities.FeeRule.filter({
        serverId,
        serviceId,
        isActive: true
      });
      if (rules && rules[0]) return rules[0];
    }
    // Then server global rule
    const serverRules = await base44.entities.FeeRule.filter({
      serverId,
      isActive: true
    });
    if (serverRules && serverRules[0]) return serverRules[0];

    // Global fallback
    const all = await base44.entities.FeeRule.filter({ isActive: true });
    return all?.[0] || null;
  } catch {
    return null;
  }
    }
