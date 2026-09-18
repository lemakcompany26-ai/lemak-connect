// Google Ads conversion helpers for Lemak Connect.
// The send_to values come from this app's Google Ads account — they were
// fetched from the platform's conversion tag tool; do not edit by hand.

export const GADS_CONVERSION_ID = 'AW-18458743728';
export const GADS_PURCHASE_SEND_TO = 'AW-18458743728/rRkMCOSkx_scELCn6OFE';

// Fire a PURCHASE conversion. Call from a purchase success handler only.
// Optional value (naira amount) and stable transaction id are included
// when available so Google can optimize value-based bidding and de-dup.
export function firePurchaseConversion({ value, transactionId, currency = 'NGN' } = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  const payload = { send_to: GADS_PURCHASE_SEND_TO };
  const amount = Number(value);
  if (Number.isFinite(amount) && amount > 0) {
    payload.value = amount;
    payload.currency = currency;
  }
  if (transactionId) payload.transaction_id = String(transactionId);
  window.gtag('event', 'conversion', payload);
}