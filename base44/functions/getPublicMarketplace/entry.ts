import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public marketplace browse: approved, active listings with the seller's
// public details only. No authentication required; bounded to the most
// recent 100 listings.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    const listings = await service.entities.MarketplaceListing.filter(
      { status: 'approved', isActive: true }, '-created_date', 100
    );

    const sellerMap = {};
    for (const listing of listings || []) {
      if (!listing.sellerId || sellerMap[listing.sellerId]) continue;
      try {
        const rows = await service.entities.MarketplaceSeller.filter({ id: listing.sellerId }, '-created_date', 1);
        if (rows && rows[0]) sellerMap[listing.sellerId] = rows[0];
      } catch (e) { /* seller details are optional for the public view */ }
    }

    const result = (listings || []).map(l => {
      const s = sellerMap[l.sellerId] || null;
      return {
        id: l.id,
        listingId: l.listingId,
        title: l.title,
        description: l.description,
        category: l.category,
        price: l.price,
        currency: l.currency || 'NGN',
        deliveryTime: l.deliveryTime,
        seller: s ? {
          fullName: s.fullName,
          accountType: s.accountType,
          category: s.category,
          serviceTitle: s.serviceTitle,
          portfolioUrl: s.portfolioUrl
        } : null
      };
    });

    return Response.json({ ok: true, listings: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}