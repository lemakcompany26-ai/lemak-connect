import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { creditWallet, notifyUser } from '../../shared/lemak.ts';
import { getOtpServer, cancelSmsRequest, cancelEmailOtp } from '../../shared/otp.ts';

// Sweeper invoked every 5 minutes by the "Expire Virtual Number Rentals"
// workflow. Expires overdue rentals and auto-refunds the buyer — fully
// idempotent, and bounded to already-expired rentals, so an early or
// repeated call is harmless.
export default async function(req: Request): Promise<Response> {
  try {
    const service = createClientFromRequest(req).asServiceRole;
    const now = new Date();
    const rentals = await service.entities.NumberRental.filter({ status: 'active' }, '-created_date', 500);
    const expired = (rentals || []).filter(r => r.expiresAt && new Date(r.expiresAt) <= now);

    let refunded = 0;
    const failures = [];
    for (const rental of expired) {
      try {
        if (rental.provider && rental.serverId) {
          const server = getOtpServer(rental.serverId);
          if (server) {
            try {
              if (rental.product === 'email') await cancelEmailOtp(server, rental.providerOrderId);
              else await cancelSmsRequest(server, rental.providerOrderId);
            } catch (e) { /* provider-side refund handled by them */ }
          }
        }
        await creditWallet(service, {
          userId: rental.buyerUserId, transactionId: rental.transactionId,
          type: 'refund', amount: rental.amount, reference: rental.rentalRef,
          description: `Refund — expired virtual number rental ${rental.rentalRef}`,
          idempotencyKey: `vn-refund-${rental.id}`
        });
        await service.entities.NumberRental.update(rental.id, { status: 'expired' });
        const txs = await service.entities.Transaction.filter({ transactionId: rental.transactionId }, '-created_date', 1);
        if (txs && txs[0]) {
          await service.entities.Transaction.update(txs[0].id, {
            status: 'refunded', failureReason: 'Rental window expired — auto-refund'
          }).catch(() => null);
        }
        await notifyUser(service, {
          userId: rental.buyerUserId, type: 'transaction',
          title: 'Rental expired — refunded',
          message: `Your ${rental.service} number rental (${rental.rentalRef}) expired. ₦${Number(rental.amount).toLocaleString()} has been refunded to your wallet.`,
          actionUrl: '/app/wallet'
        });
        if (!rental.provider) {
          await notifyUser(service, {
            userId: rental.sellerUserId, type: 'marketplace',
            title: 'Rental expired',
            message: `Rental ${rental.rentalRef} expired without buyer confirmation. The buyer was refunded automatically.`,
            actionUrl: '/app/virtual-numbers'
          });
        }
        refunded++;
      } catch (e) {
        failures.push({ rentalRef: rental.rentalRef, error: e.message });
      }
    }

    return Response.json({
      ok: true, checked: (rentals || []).length, expired: expired.length, refunded, failures
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}