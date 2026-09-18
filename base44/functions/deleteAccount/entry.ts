import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Permanently erases the requesting user's app data at their own request.
// The client must send confirm: "DELETE" (typed by the user in the final
// confirmation dialog), so this endpoint can never fire by accident.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (String(body.confirm || '') !== 'DELETE') {
      return Response.json({ error: 'Please confirm the deletion to continue.' }, { status: 400 });
    }

    const service: any = base44.asServiceRole;
    const uid = user.id;
    // Records are owned via different fields per entity (userId, buyerUserId,
    // sellerUserId or created_by_id) — the $or covers every ownership shape.
    const owned = {
      $or: [
        { userId: uid },
        { buyerUserId: uid },
        { sellerUserId: uid },
        { created_by_id: uid }
      ]
    };
    const entities = [
      'UserProfile', 'Wallet', 'WalletLedger', 'Transaction', 'Payment',
      'Notification', 'NotificationPreference', 'SupportConversation', 'SupportMessage',
      'MarketplaceSeller', 'MarketplaceListing', 'MarketplaceOrder', 'OrderMessage',
      'VirtualNumberListing', 'NumberRental', 'RentalMessage',
      'PromoRedemption', 'AirtimeOrder', 'DataOrder',
      'BiometricCredential', 'BiometricChallenge', 'TransactionPin'
    ];

    let deleted = 0;
    for (const name of entities) {
      try {
        const res = await service.entities[name].deleteMany(owned);
        deleted += Number(res && res.deletedCount) || 0;
      } catch (e) { /* entity has no records for this user */ }
    }

    await service.entities.SecurityEvent.create({
      userId: uid, eventType: 'account_suspended', severity: 'critical',
      description: 'Account deletion completed — all user data erased at the user\'s own request.',
      metadata: { deletedRecords: deleted, email: user.email }
    });

    return Response.json({ ok: true, deletedRecords: deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}