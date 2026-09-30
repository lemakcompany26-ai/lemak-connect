export const PROMOS = {
  BABAALADO1: {
    code: "BABAALADO1",
    minFunding: 5000,
    benefit: "INSTANT_SIGNUP",
    description: "Fund 5000 to activate instantly - no approval wait"
  }
}

export const checkPromoAfterFunding = async (user, walletBalance, promoCode) => {
  if (!promoCode) return false
  const code = promoCode.toUpperCase().trim()

  if (code === "BABAALADO1" && walletBalance >= 5000) {
    // Instant activation
    const { supabase } = await import("../lib/supabase")
    await supabase.from("profiles").update({
      is_approved: true,
      promo_used: "BABAALADO1",
      approved_at: new Date().toISOString(),
      status: "active"
    }).eq("id", user.id)

    return true
  }
  return false
      }
