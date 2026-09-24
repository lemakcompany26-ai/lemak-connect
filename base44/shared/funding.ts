import { generateTransactionId, creditWallet, notifyUser, applySignupPromoBonus, getFundingSettlement, finalizeReferralReward } from './lemak.ts';
import { sendTransactionalEmail } from './emails.ts';
import { sendTransactionalSms } from './sms.ts';

// Shared completion for Kora wallet funding (online checkout + virtual
// account). Credits the wallet exactly once — idempotent on the payment
// reference — and records the matching funding Transaction. Callers must
// re-verify the payment against Kora's API BEFORE calling this.
export async function completeKoraFunding(service, opts) {
  const { userId, amount, reference, idempotencyKey, fundingMethod, providerReference } = opts;
  const settlement = getFundingSettlement(amount);
  const transactionId = generateTransactionId();
  const credited = await creditWallet(service, {
    userId, transactionId, type: 'deposit', amount: settlement.creditedAmount, reference,
    description: fundingMethod === 'card' ? 'Wallet funding via online payment (Kora)' : 'Wallet funding via bank transfer',
    idempotencyKey
  });
  if (!credited.duplicated) {
    await service.entities.Transaction.create({
      transactionId, userId, type: 'wallet_funding',
      service: fundingMethod === 'card' ? 'Wallet Funding — Online Payment (Kora)' : 'Wallet Funding — Bank Transfer',
      provider: 'Kora',
      amount: settlement.creditedAmount, fee: settlement.fee, providerCost: settlement.paidAmount, customerPrice: settlement.paidAmount,
      status: 'successful', providerReference: String(providerReference || reference),
      metadata: { fundingMethod, verified: true, fundingFee: settlement.fee, paidAmount: settlement.paidAmount, creditedAmount: settlement.creditedAmount },
      idempotencyKey, completedAt: new Date().toISOString()
    });
    const profiles = await service.entities.UserProfile.filter({ userId }, '-created_date', 1);
    await finalizeReferralReward(service, profiles && profiles[0]);
  }
  return {
    duplicated: credited.duplicated, transactionId,
    wallet: credited.wallet,
    balance: credited.wallet ? credited.wallet.balance : null,
    ...settlement
  };
}

// Customer notifications for a successful wallet funding (in-app, email, SMS
// and the new-signup promo bonus).
export async function notifyKoraFunding(service, opts) {
  const { userId, ownerEmail, ownerName, amount, transactionId, reference, balance, fee = 50, paidAmount = amount } = opts;
  await notifyUser(service, {
    userId, type: 'wallet',
    title: 'Wallet funded successfully',
    message: `₦${amount.toLocaleString()} was credited after a ₦${fee.toLocaleString()} funding fee. You paid ₦${paidAmount.toLocaleString()}. Reference: ${transactionId}`,
    actionUrl: '/app/wallet'
  });
  if (ownerEmail) {
    await sendTransactionalEmail(service, {
      emailType: 'WALLET_FUNDING_SUCCESS', userId, recipientEmail: ownerEmail,
      recipientName: ownerName || null, transactionId,
      data: { amount, paidAmount, fee, transactionId, reference, status: 'Successful', date: new Date().toISOString(), balance }
    });
  }
  await sendTransactionalSms(service, {
    smsType: 'WALLET_FUNDING_SUCCESS', userId, transactionId,
    data: { amount, paidAmount, fee, transactionId, balance }
  });
  await applySignupPromoBonus(service, userId);
}