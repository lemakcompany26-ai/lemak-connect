import { secrets, waitUntil } from 'base44:runtime';

// Admin bootstrap emails — these get super_admin on profile creation.
const ADMIN_EMAILS = ['lemakcompany26@gmail.com', 'dammyqueen107@gmail.com'];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || '').toLowerCase());
}

export function isStaffRole(role) {
  return ['admin', 'super_admin', 'moderator'].includes(role);
}

// Unique server-generated transaction reference: LEM-YYYYMMDD-XXXXXXXX
export function generateTransactionId() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').toUpperCase().padEnd(8, 'X').slice(0, 8);
  return `LEM-${y}${m}${d}-${rand}`;
}

export function generateReferralIdentity() {
  const code = `LEMAK${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  return { code, link: `https://www.lemakconnect.com/signup?ref=${encodeURIComponent(code)}` };
}

export const REFERRAL_REWARD_AMOUNT = 100;
export const WALLET_FUNDING_FEE = 50;

export function getFundingSettlement(amount) {
  const paidAmount = round2(amount);
  const fee = WALLET_FUNDING_FEE;
  return { paidAmount, fee, creditedAmount: round2(Math.max(0, paidAmount - fee)) };
}

export async function finalizeReferralReward(service, referredProfile) {
  const referrerUserId = String(referredProfile && referredProfile.referredByUserId || '').trim();
  const referredUserId = String(referredProfile && referredProfile.userId || '').trim();
  if (!referrerUserId || !referredUserId || referrerUserId === referredUserId) return { credited: false };
  const referrers = await service.entities.UserProfile.filter({ userId: referrerUserId }, '-created_date', 1);
  if (!referrers || !referrers[0]) return { credited: false };

  const referralCode = String(referredProfile.referralCode || '').trim();
  const idempotencyKey = `referral-referrer-${referredUserId}`;
  const transactions = await service.entities.Transaction.filter({ idempotencyKey }, '-created_date', 1);
  const referrals = await service.entities.Referral.filter({ referredUserId }, '-created_date', 1);
  const existingReferral = referrals && referrals[0] ? referrals[0] : null;
  if (existingReferral && existingReferral.status === 'completed' && transactions && transactions[0]) {
    return { credited: false, referral: existingReferral, transaction: transactions[0] };
  }

  const transactionId = transactions && transactions[0] ? transactions[0].transactionId : generateTransactionId();
  const credit = await creditWallet(service, {
    userId: referrerUserId, transactionId, type: 'promo', amount: REFERRAL_REWARD_AMOUNT,
    reference: transactionId, description: 'Referral reward', idempotencyKey
  });
  const actualTransactionId = credit.ledger && credit.ledger.transactionId ? credit.ledger.transactionId : transactionId;
  const transaction = transactions && transactions[0] ? transactions[0] : await service.entities.Transaction.create({
    transactionId: actualTransactionId, userId: referrerUserId, type: 'adjustment',
    service: 'Referral reward', provider: 'LEMAK', amount: REFERRAL_REWARD_AMOUNT,
    fee: 0, providerCost: 0, customerPrice: REFERRAL_REWARD_AMOUNT, status: 'successful',
    providerReference: actualTransactionId, metadata: { referredUserId, referralCode },
    completedAt: new Date().toISOString(), idempotencyKey
  });
  const referral = existingReferral || await service.entities.Referral.create({
    referrerUserId, referredUserId, referralCode, welcomeReward: 0,
    referrerReward: REFERRAL_REWARD_AMOUNT, welcomeTransactionId: null,
    referrerTransactionId: actualTransactionId, status: 'completed'
  });
  if (existingReferral && existingReferral.status !== 'completed') {
    await service.entities.Referral.update(existingReferral.id, {
      referrerReward: REFERRAL_REWARD_AMOUNT, referrerTransactionId: actualTransactionId, status: 'completed'
    });
  }
  return { credited: !credit.duplicated, referral, transaction, wallet: credit.wallet };
}

export function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export async function getWallet(service, userId) {
  const wallets = await service.entities.Wallet.filter({ userId }, '-created_date', 5);
  return wallets && wallets.length > 0 ? wallets[0] : null;
}

export async function ensureWallet(service, userId) {
  const wallet = await getWallet(service, userId);
  if (wallet) return wallet;
  return await service.entities.Wallet.create({ userId, currency: 'NGN', balance: 0, status: 'active' });
}

async function findLedgerByIdempotencyKey(service, idempotencyKey) {
  const rows = await service.entities.WalletLedger.filter({ idempotencyKey }, '-created_date', 1);
  return rows && rows[0] ? rows[0] : null;
}

// Credit a wallet. Idempotent when idempotencyKey provided. Always writes a ledger row.
export async function creditWallet(service, opts) {
  const { userId, transactionId, type, amount, reference, description, idempotencyKey } = opts;
  if (idempotencyKey) {
    const existing = await findLedgerByIdempotencyKey(service, idempotencyKey);
    if (existing) {
      return { ledger: existing, duplicated: true, wallet: await getWallet(service, userId) };
    }
  }
  const wallet = await ensureWallet(service, userId);
  if (wallet.status !== 'active') {
    const err = new Error('Wallet is not active');
    err.statusCode = 403;
    throw err;
  }
  const balanceBefore = round2(wallet.balance || 0);
  const creditAmount = round2(amount);
  const balanceAfter = round2(balanceBefore + creditAmount);
  const walletPatch = { balance: balanceAfter };
  if (type === 'promo') {
    walletPatch.promotionalBalance = round2(Number(wallet.promotionalBalance) || 0) + creditAmount;
  }
  await service.entities.Wallet.update(wallet.id, walletPatch);
  const ledger = await service.entities.WalletLedger.create({
    userId, walletId: wallet.id, transactionId: transactionId || null,
    type, amount: creditAmount, balanceBefore, balanceAfter,
    reference: reference || null, description: description || null, idempotencyKey: idempotencyKey || null
  });
  return { ledger, duplicated: false, wallet: { ...wallet, ...walletPatch } };
}

// Debit a wallet. Refuses insufficient balance and frozen wallets. Idempotent when idempotencyKey provided.
export async function debitWallet(service, opts) {
  const { userId, transactionId, type, amount, reference, description, idempotencyKey } = opts;
  if (idempotencyKey) {
    const existing = await findLedgerByIdempotencyKey(service, idempotencyKey);
    if (existing) {
      return { ledger: existing, duplicated: true, wallet: await getWallet(service, userId) };
    }
  }
  const wallet = await ensureWallet(service, userId);
  if (wallet.status !== 'active') {
    const err = new Error('Wallet is not active');
    err.statusCode = 403;
    throw err;
  }
  const debitAmount = round2(amount);
  const balanceBefore = round2(wallet.balance || 0);
  if (balanceBefore < debitAmount) {
    const err = new Error('Insufficient wallet balance. Please fund your wallet.');
    err.statusCode = 402;
    throw err;
  }
  const balanceAfter = round2(balanceBefore - debitAmount);
  await service.entities.Wallet.update(wallet.id, { balance: balanceAfter });
  const ledger = await service.entities.WalletLedger.create({
    userId, walletId: wallet.id, transactionId: transactionId || null,
    type, amount: -debitAmount, balanceBefore, balanceAfter,
    reference: reference || null, description: description || null, idempotencyKey: idempotencyKey || null
  });
  return { ledger, duplicated: false, wallet: { ...wallet, balance: balanceAfter } };
}

// Authoritative price calculation from FeeRule config.
// customerPrice = providerCost + providerCharge + fixedFee + percentage + markup, fee clamped to [min,max]
export async function calculatePrice(service, serviceSlug, providerCost) {
  const rules = await service.entities.FeeRule.filter({ isActive: true }, '-priority', 100);
  const serviceRule = rules.find(r => r.scope === 'service' && r.serviceSlug === serviceSlug);
  const globalRule = rules.find(r => r.scope === 'global');
  const rule = serviceRule || globalRule;
  const cost = round2(providerCost);
  if (!rule) {
    const defaultMarkup = serviceSlug === 'airtime' ? 3 : serviceSlug === 'virtual_number' ? 30 : 20;
    const fee = round2((cost * defaultMarkup) / 100);
    return { providerCost: cost, fee, customerPrice: round2(cost + fee), feeRuleId: null };
  }
  const providerCharge = Number(rule.providerCharge) || 0;
  const fixedFee = Number(rule.fixedFee) || 0;
  const pctFee = (cost * (Number(rule.percentageFee) || 0)) / 100;
  const markup = (cost * (Number(rule.adminMarkup) || 0)) / 100;
  let fee = providerCharge + fixedFee + pctFee + markup;
  if (rule.minimumFee != null) fee = Math.max(fee, Number(rule.minimumFee));
  if (rule.maximumFee != null) fee = Math.min(fee, Number(rule.maximumFee));
  fee = round2(fee);
  return { providerCost: cost, fee, customerPrice: round2(cost + fee), feeRuleId: rule.id };
}

export async function ensureNeyoIbadanPromo(service) {
  const code = 'NEYOIBADAN1';
  const rows = await service.entities.PromoCode.filter({ code }, '-created_date', 1);
  if (rows && rows[0]) return rows[0];
  return service.entities.PromoCode.create({
    code, description: '₦1,000 signup bonus after verified funding of ₦5,000 or more',
    discountType: 'fixed', discountValue: 0, signupBonus: 1000,
    qualifyingFundingAmount: 5000, perUserLimit: 1, newUsersOnly: true, isActive: true
  });
}

// Signup offers are configuration, not client input. Keep the active promo
// terms authoritative when older records contain previous reward values.
export async function normalizeSignupPromo(service, promo) {
  if (!promo || !promo.isActive) return promo;
  const code = String(promo.code || '').trim().toUpperCase();
  const expected = code === 'NEYOIBADAN1'
    ? { signupBonus: 1000, qualifyingFundingAmount: 5000 }
    : { signupBonus: 500, qualifyingFundingAmount: 1000 };
  if (Number(promo.signupBonus) !== expected.signupBonus || Number(promo.qualifyingFundingAmount) !== expected.qualifyingFundingAmount) {
    await service.entities.PromoCode.update(promo.id, expected).catch(() => null);
    return { ...promo, ...expected };
  }
  return promo;
}

// Server-side promo validation. Returns { valid, discount, promoId, code, reason }
export async function validatePromo(service, opts) {
  const { code, userId, serviceSlug, customerPrice, isNewUser } = opts;
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { valid: false, reason: 'Enter a promo code' };
  const promos = await service.entities.PromoCode.filter({ code: clean, isActive: true }, '-created_date', 10);
  const promo = promos[0];
  if (!promo) return { valid: false, reason: 'This promo code is invalid' };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { valid: false, reason: 'This promo code has expired' };
  }
  if (promo.totalUsageLimit != null && (promo.totalUsageCount || 0) >= Number(promo.totalUsageLimit)) {
    return { valid: false, reason: 'This promo code has reached its usage limit' };
  }
  if (promo.newUsersOnly && isNewUser === false) {
    return { valid: false, reason: 'This promo code is only for new users' };
  }
  if (promo.restrictedToService && promo.restrictedToService !== serviceSlug) {
    return { valid: false, reason: 'This promo code is not valid for this service' };
  }
  if (promo.minimumTransaction && customerPrice < Number(promo.minimumTransaction)) {
    return { valid: false, reason: 'Minimum transaction amount for this code is ' + promo.minimumTransaction };
  }
  if (userId && promo.perUserLimit != null) {
    const redemptions = await service.entities.PromoRedemption.filter({ promoCodeId: promo.id, userId }, '-created_date', 100);
    if (redemptions.length >= Number(promo.perUserLimit)) {
      return { valid: false, reason: 'You have already used this promo code' };
    }
  }
  let discount = 0;
  if (promo.discountType === 'percentage') {
    discount = (customerPrice * (Number(promo.discountValue) || 0)) / 100;
    if (promo.maximumDiscount != null) discount = Math.min(discount, Number(promo.maximumDiscount));
  } else {
    discount = Number(promo.discountValue) || 0;
  }
  discount = Math.min(round2(discount), customerPrice);
  return { valid: true, discount, promoId: promo.id, code: clean, promo };
}

// Record a promo redemption and bump usage counter.
export async function redeemPromo(service, promo, userId, transactionId, discountApplied) {
  if (!promo || !promo.valid) return;
  try {
    await service.entities.PromoRedemption.create({
      promoCodeId: promo.promoId, promoCode: promo.code,
      userId, transactionId: transactionId || null, discountApplied: round2(discountApplied), redeemedAt: new Date().toISOString()
    });
    await service.entities.PromoCode.update(promo.promoId, { totalUsageCount: (promo.promo && (promo.promo.totalUsageCount || 0) || 0) + 1 });
  } catch (e) { /* non-fatal */ }
}

// Which preference flag gates push delivery per notification type.
const PUSH_PREF_FLAG = {
  transaction: 'transactionAlerts', wallet: 'walletAlerts', payment: 'paymentAlerts',
  marketplace: 'marketplaceAlerts', virtual_number: 'virtualNumberAlerts', smm: 'smmAlerts',
  security: 'securityAlerts', system: 'systemAlerts', promotional: 'promotionalAlerts'
};

// In-app notification + native mobile push (delivered once the app has a
// native iOS/Android build with push credentials). Push runs after the
// response and never blocks the main transaction flow; failures are silent.
export async function notifyUser(service, opts) {
  const { userId, type, title, message, actionUrl } = opts;
    const { idempotencyKey } = opts; // Added idempotencyKey to destructuring
  try {
      if (idempotencyKey) {
        const existing = await service.entities.Notification.filter({ userId, idempotencyKey }, '-created_date', 1);
        if (existing && existing[0]) return; // Return if notification already exists
      }
      await service.entities.Notification.create({
        userId, type, title, message,
        actionUrl: actionUrl || null, isRead: false, sentEmail: false,
        idempotencyKey: idempotencyKey || null // Include idempotencyKey in the notification
      });
  } catch (e) { /* non-fatal */ }
  try {
    let allowed = true;
    const flag = PUSH_PREF_FLAG[type];
    if (flag) {
      const prefs = await service.entities.NotificationPreference.filter({ userId }, '-created_date', 1);
      if (prefs && prefs[0] && prefs[0][flag] === false) allowed = false;
    }
    if (allowed) {
      waitUntil(
        service.integrations.Core.SendPushNotification({
          user_id: userId,
          title: String(title || '').slice(0, 100),
          content: String(message || '').slice(0, 240),
          ...(actionUrl ? { action_url: actionUrl } : {})
        }).catch(() => { /* no native build / no device registered — silent */ })
      );
    }
  } catch (e) { /* push never blocks the main flow */ }
}

// Transactional email via Resend. Non-fatal, logs status by returning sent flag.
export async function sendUserEmail(opts) {
  const { to, subject, html } = opts;
  try {
    const resendKey = secrets.get('RESEND_API_KEY');
    if (!resendKey) return { sent: false, reason: 'not_configured' };
    const from = secrets.get('RESEND_FROM_EMAIL') || 'Lemak Connect <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html })
    });
    return { sent: res.ok, status: res.status };
  } catch (e) {
    return { sent: false, reason: 'error' };
  }
}

// ---------- Marketplace ----------

// Authoritative marketplace charge + Google link settings, with defaults.
export const MARKETPLACE_SETTING_DEFAULTS = {
  marketplace_commission_percent: '15',
  marketplace_buyer_fee_percent: '0',
  marketplace_buyer_fixed_fee: '0',
  marketplace_seller_listing_fee: '0',
  marketplace_fixed_fee: '0',
  marketplace_minimum_fee: '0',
  marketplace_maximum_fee: '0',
  marketplace_currency: 'NGN',
  google_sell_form_url: 'https://docs.google.com/forms/d/e/1FAIpQLScImMvathwSUGku7WKY_R4E9eo2Ps9k23Fs8qWpU0GmneNAIQ/viewform?usp=headers',
  google_buy_sheet_url: 'https://docs.google.com/spreadsheets/d/1JJcLb_Nw2C-witaftZYpVqp6pW0RlCo9h967yzhcDc/edit?usp=drivesdk',
  google_form_response_sheet_url: 'https://docs.google.com/spreadsheets/d/1xIItGN3jRwTqymNdHq5RJK2EvwlHOOIccu20DhjmVJ8/edit?usp=drivesdk'
};

export async function getMarketplaceSettings(service) {
  const rows = await service.entities.AdminSetting.list('-created_date', 200);
  const map = { ...MARKETPLACE_SETTING_DEFAULTS };
  for (const row of rows || []) {
    if (row.key && row.value !== undefined && row.value !== null && String(row.value) !== '') {
      map[row.key] = String(row.value);
    }
  }
  return map;
}

// All marketplace fee calculation happens here, on the backend.
export async function computeMarketplaceFees(service, saleAmount) {
  const s = await getMarketplaceSettings(service);
  const sale = round2(Math.max(0, Number(saleAmount) || 0));
  const commissionPct = Number(s.marketplace_commission_percent) || 0;
  const fixedFee = Number(s.marketplace_fixed_fee) || 0;
  const buyerFeePct = Number(s.marketplace_buyer_fee_percent) || 0;
  const buyerFixedFee = Number(s.marketplace_buyer_fixed_fee) || 0;
  const minFee = Number(s.marketplace_minimum_fee) || 0;
  const maxFee = Number(s.marketplace_maximum_fee) || 0;
  let commission = round2((sale * commissionPct) / 100 + fixedFee);
  if (commission < minFee) commission = minFee;
  if (maxFee > 0 && commission > maxFee) commission = maxFee;
  commission = round2(commission);
  const buyerFee = round2((sale * buyerFeePct) / 100 + buyerFixedFee);
  const buyerTotal = round2(sale + buyerFee);
  const sellerReceives = round2(Math.max(0, sale - commission));
  const platformReceives = round2(commission + buyerFee);
  return {
    saleAmount: sale,
    commission,
    commissionPercent: commissionPct,
    buyerFee,
    buyerTotal,
    sellerReceives,
    platformReceives,
    sellerListingFee: Number(s.marketplace_seller_listing_fee) || 0,
    currency: s.marketplace_currency || 'NGN'
  };
}

export function generateListingId() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X');
  return `MKT-${y}${m}${d}-${rand}`;
}

// Notify every staff member (admin / super_admin / moderator).
export async function notifyAdmins(service, opts) {
  try {
    const profiles = await service.entities.UserProfile.list('-created_date', 500);
    const staff = (profiles || []).filter(p => isStaffRole(p.role));
    for (const p of staff) {
      await notifyUser(service, { ...opts, userId: p.userId });
    }
  } catch (e) { /* non-fatal */ }
}

export function emailTemplate(title, bodyHtml) {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:24px">
      <h1 style="color:#ffffff;font-size:20px;margin:0">Lemak Connect</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px">${title}</h2>
      <div style="color:#334155;font-size:14px;line-height:1.6">${bodyHtml}</div>
    </div>
    <div style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">
      Lemak Connect &middot; Support: lemakcompany26@gmail.com &middot; 09022143559
    </div>
  </div></body></html>`;
}

// Credit the signup promo bonus (PromoCode.signupBonus) to a user's wallet
// once, after their first real funding. Called from the funding webhook and
// the verify endpoint — idempotent per user+code and recorded as a
// PromoRedemption so the bonus can never be paid twice.
export async function applySignupPromoBonus(service, userId) {
  try {
    const profiles = await service.entities.UserProfile.filter({ userId }, '-created_date', 1);
    const profile = profiles && profiles[0];
    if (!profile || !profile.referredByPromoCode) return { credited: false };
    const code = String(profile.referredByPromoCode).trim().toUpperCase();
    const promos = await service.entities.PromoCode.filter({ code }, '-created_date', 10);
    const promo = await normalizeSignupPromo(service, promos && promos[0]);
    if (!promo || !promo.isActive) return { credited: false };
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { credited: false };
    if (promo.totalUsageLimit != null && (promo.totalUsageCount || 0) >= Number(promo.totalUsageLimit)) {
      return { credited: false };
    }
    const isNeyoIbadan = code === 'NEYOIBADAN1';
    const bonus = round2(isNeyoIbadan ? 1000 : (Number(promo.signupBonus) > 0 ? 500 : 0));
    const qualifyingAmount = round2(isNeyoIbadan ? 5000 : (Number(promo.qualifyingFundingAmount) || 1000));
    if (bonus <= 0) return { credited: false };
    const fundingTransactions = await service.entities.Transaction.filter({ userId, type: 'wallet_funding', status: 'successful' }, '-created_date', 500);
    const qualifyingFunding = (fundingTransactions || []).find(tx => Number(tx.amount || 0) >= qualifyingAmount);
    const verifiedFunding = qualifyingFunding ? round2(Number(qualifyingFunding.amount || 0)) : 0;
    if (!qualifyingFunding) return { credited: false, qualifyingAmount, verifiedFunding };
    const idempotencyKey = `signup-bonus-${userId}-${promo.id}`;
    const redemptions = await service.entities.PromoRedemption.filter({ userId, promoCodeId: promo.id }, '-created_date', 10);
    if (redemptions && redemptions[0]) return { credited: false };
    const transactionId = generateTransactionId();
    const credited = await creditWallet(service, {
      userId, transactionId, type: 'promo', amount: bonus,
      reference: code, description: `Welcome bonus — promo code ${code}`,
      idempotencyKey
    });
    if (credited.duplicated) return { credited: false };
    await service.entities.Transaction.create({
      transactionId, userId, type: 'adjustment', service: 'Signup promo reward', provider: 'LEMAK',
      amount: bonus, fee: 0, providerCost: 0, customerPrice: bonus, status: 'successful',
      providerReference: transactionId,
      metadata: { promoCode: code, qualifyingFundingAmount: qualifyingAmount, verifiedFunding },
      completedAt: new Date().toISOString(), idempotencyKey
    });
    await service.entities.PromoRedemption.create({
      promoCodeId: promo.id, promoCode: code, userId,
      transactionId, discountApplied: 0, description: `Verified funding of ₦${verifiedFunding.toLocaleString()} qualified this signup reward`, redeemedAt: new Date().toISOString()
    });
    await service.entities.PromoCode.update(promo.id, { totalUsageCount: (promo.totalUsageCount || 0) + 1 });
    await notifyUser(service, {
      userId, type: 'wallet',
      title: 'Welcome bonus received 🎁',
      message: `₦${bonus.toLocaleString()} welcome bonus from promo code ${code} was added to your wallet.`,
      actionUrl: '/app/wallet'
    });
    return { credited: true, bonus, code };
  } catch (e) {
    return { credited: false };
  }
}