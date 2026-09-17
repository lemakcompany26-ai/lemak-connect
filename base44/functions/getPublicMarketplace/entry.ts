import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public marketplace catalogue. Only listings that are approved AND active
// AND whose seller is approved are ever exposed here, and only public
// customer-safe fields are returned — no internal pricing or admin data.
// No authentication required.

function publicDto(l, s) {
  return {
    id: l.id,
    listingId: l.listingId,
    title: l.title,
    description: l.description,
    category: l.category,
    platform: l.platform || null,
    accountKind: l.accountKind || null,
    followersCount: l.followersCount != null ? l.followersCount : null,
    monetised: l.monetised === true,
    niche: l.niche || null,
    audienceCountry: l.audienceCountry || null,
    accountAgeYears: l.accountAgeYears != null ? l.accountAgeYears : null,
    averageViews: l.averageViews != null ? l.averageViews : null,
    averageLikes: l.averageLikes != null ? l.averageLikes : null,
    averageComments: l.averageComments != null ? l.averageComments : null,
    audienceAgeRange: l.audienceAgeRange || null,
    audienceGender: l.audienceGender || null,
    revenueInfo: l.revenueInfo || null,
    verificationStatus: l.verificationStatus || 'unverified',
    deliveryMethod: l.deliveryMethod || null,
    price: l.price,
    currency: l.currency || 'NGN',
    deliveryTime: l.deliveryTime,
    createdDate: l.created_date,
    seller: s ? {
      fullName: s.fullName,
      accountType: s.accountType,
      category: s.category,
      serviceTitle: s.serviceTitle,
      portfolioUrl: s.portfolioUrl
    } : null,
    sellerName: s ? (s.fullName || s.username) : null
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const loadSeller = async (sellerId) => {
      if (!sellerId) return null;
      try {
        const rows = await service.entities.MarketplaceSeller.filter({ id: sellerId }, '-created_date', 1);
        return rows && rows[0] ? rows[0] : null;
      } catch (e) {
        return null;
      }
    };

    // Single listing detail — only if approved, active and the seller is approved
    if (body.action === 'detail' && body.listingId) {
      const rows = await service.entities.MarketplaceListing.filter({ id: body.listingId }, '-created_date', 1);
      const listing = rows && rows[0];
      if (!listing || listing.status !== 'approved' || listing.isActive === false) {
        return Response.json({ error: 'Listing not available' }, { status: 404 });
      }
      const seller = await loadSeller(listing.sellerId);
      if (!seller || seller.status !== 'approved') {
        return Response.json({ error: 'Listing not available' }, { status: 404 });
      }
      return Response.json({ ok: true, listing: publicDto(listing, seller) });
    }

    // Catalogue browse — approved + active listings from approved sellers only
    const listings = await service.entities.MarketplaceListing.filter(
      { status: 'approved', isActive: true }, '-created_date', 100
    );

    const sellerCache = {};
    const result = [];
    for (const l of listings || []) {
      if (!sellerCache[l.sellerId]) {
        sellerCache[l.sellerId] = await loadSeller(l.sellerId);
      }
      const seller = sellerCache[l.sellerId];
      // A listing only goes public when its seller is approved as well
      if (!seller || seller.status !== 'approved') continue;
      result.push(publicDto(l, seller));
    }

    return Response.json({ ok: true, listings: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}