import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole, getMarketplaceSettings, generateListingId, notifyAdmins } from '../../shared/lemak.ts';

// Secure server-side synchronization of marketplace seller submissions from the
// Google Form response sheet. Never run from the browser; Google credentials
// stay on the backend.

// Candidates are matched as substrings of the normalized header, so numbered
// question headers like "16.Full Name" or "3.Wattsapp/phone number" still map.
const FIELD_KEYS = {
  email: ['2emailaddress', 'emailaddress', 'email'],
  collectedEmail: ['emailaddress'],
  fullName: ['fullname'],
  username: ['username'],
  phone: ['wattsapp', 'whatsapp', 'phone'],
  accountType: ['accounttype'],
  category: ['servicecategory', 'category'],
  serviceTitle: ['servicetitle'],
  description: ['servicedescription', 'description'],
  price: ['price'],
  currency: ['currency'],
  deliveryTime: ['deliverytime', 'delivery'],
  portfolioUrl: ['portfolio'],
  sellerTerms: ['sellerterms'],
  verificationInfo: ['verification'],
  timestamp: ['timestamp']
};

function parsePrice(raw) {
  const n = parseFloat(String(raw || '').replace(/[^0-9.]/g, ''));
  return isFinite(n) ? n : 0;
}

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function rowHash(values) {
  const str = JSON.stringify(values);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return String(hash);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    if (!((profile && isStaffRole(profile.role)) || isAdminEmail(user.email))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await getMarketplaceSettings(service);
    const sheetMatch = String(settings.google_form_response_sheet_url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetMatch) return Response.json({ ok: false, error: 'Seller form response sheet URL is not configured' }, { status: 400 });
    const sheetId = sheetMatch[1];

    let accessToken;
    try {
      const connection = await service.connectors.getConnection('googlesheets');
      accessToken = connection.accessToken;
    } catch (e) {
      return Response.json({
        ok: false,
        requiresGoogleIntegration: true,
        message: 'GOOGLE INTEGRATION REQUIRED — connect the Google Sheets integration so Lemak Connect can read seller submissions.'
      });
    }

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ1000`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      await service.entities.MarketplaceSyncLog.create({
        ranAt: new Date().toISOString(), trigger: 'manual', status: 'error',
        errorMessage: `Google Sheets API ${res.status}: ${errText.slice(0, 300)}`
      }).catch(() => null);
      return Response.json({ ok: false, error: `Could not read the response sheet (Google API ${res.status}). Make sure the sheet is shared with your connected Google account.` }, { status: 502 });
    }

    const payload = await res.json();
    const rows = payload.values || [];
    if (!rows.length) {
      await service.entities.MarketplaceSyncLog.create({ ranAt: new Date().toISOString(), trigger: 'manual', status: 'success', importedCount: 0, skippedCount: 0 }).catch(() => null);
      return Response.json({ ok: true, imported: 0, updated: 0, skipped: 0 });
    }

    const header = (rows[0] || []).map(normalizeHeader);
    const colIndex = {};
    for (const [field, candidates] of Object.entries(FIELD_KEYS)) {
      for (const c of candidates) {
        const idx = header.findIndex(h => h === c || h.includes(c));
        if (idx !== -1) { colIndex[field] = idx; break; }
      }
    }
    const get = (row, field) => (colIndex[field] !== undefined ? String(row[colIndex[field]] || '').trim() : '');

    let imported = 0, updated = 0, skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.length || row.every(c => String(c || '').trim() === '')) continue;
      const submissionId = `${sheetId}#r${i + 1}`;
      const hash = rowHash(row);
      const submittedAtRaw = get(row, 'timestamp');
      const submittedAt = submittedAtRaw ? new Date(submittedAtRaw).toISOString() : new Date().toISOString();
      const email = get(row, 'email') || get(row, 'collectedEmail');
      const fullName = get(row, 'fullName');
      if (!email && !fullName) { skipped++; continue; }

      const existing = await service.entities.MarketplaceListing.filter({ submissionId }, '-created_date', 1);
      if (existing && existing[0]) {
        const listing = existing[0];
        if (listing.syncHash !== hash && listing.status === 'changes_requested') {
          await service.entities.MarketplaceListing.update(listing.id, {
            title: get(row, 'serviceTitle') || listing.title,
            description: get(row, 'description') || listing.description,
            category: get(row, 'category') || listing.category,
            price: parsePrice(get(row, 'price')) || listing.price,
            currency: get(row, 'currency') || listing.currency,
            deliveryTime: get(row, 'deliveryTime') || listing.deliveryTime,
            portfolioUrl: get(row, 'portfolioUrl') || listing.portfolioUrl,
            status: 'pending', syncHash: hash, adminMessage: null, reviewedAt: null
          });
          const sellerRows = await service.entities.MarketplaceSeller.filter({ listingId: listing.listingId }, '-created_date', 1);
          if (sellerRows && sellerRows[0]) {
            await service.entities.MarketplaceSeller.update(sellerRows[0].id, { status: 'pending', submittedAt, reviewNotes: null }).catch(() => null);
          }
          updated++;
        } else skipped++;
        continue;
      }

      // Link to an app account by email where possible (contact email first,
      // then the Google account that submitted the form)
      let sellerUserId = null;
      for (const em of [email, get(row, 'collectedEmail')]) {
        if (!em || sellerUserId) continue;
        const users = await service.entities.User.filter({ email: em }, '-created_date', 1);
        if (users && users[0]) sellerUserId = users[0].id;
      }
      const listingId = generateListingId();
      const sellerRecord = await service.entities.MarketplaceSeller.create({
        userId: sellerUserId, fullName, username: get(row, 'username'), email,
        phone: get(row, 'phone'),
        accountType: get(row, 'accountType') || 'Individual',
        category: get(row, 'category'),
        serviceTitle: get(row, 'serviceTitle'),
        description: get(row, 'description'),
        price: parsePrice(get(row, 'price')),
        currency: get(row, 'currency') || 'NGN',
        deliveryTime: get(row, 'deliveryTime'),
        portfolioUrl: get(row, 'portfolioUrl'),
        sellerTerms: get(row, 'sellerTerms'),
        verificationInfo: get(row, 'verificationInfo'),
        status: 'pending', source: 'google_form', submissionId, submittedAt, listingId
      });
      await service.entities.MarketplaceListing.create({
        listingId, sellerId: sellerRecord.id, sellerUserId,
        title: get(row, 'serviceTitle') || `${fullName} - marketplace service`,
        description: get(row, 'description'),
        category: get(row, 'category') || 'Other',
        price: parsePrice(get(row, 'price')),
        currency: get(row, 'currency') || 'NGN',
        deliveryTime: get(row, 'deliveryTime'),
        portfolioUrl: get(row, 'portfolioUrl'),
        status: 'pending', isActive: true, source: 'google_form',
        submissionId, submittedAt, syncHash: hash
      });
      await notifyAdmins(service, {
        type: 'marketplace',
        title: 'New marketplace seller submission received.',
        message: `${fullName || email} submitted "${get(row, 'serviceTitle') || 'a new service'}" (${listingId}) on ${new Date(submittedAt).toDateString()}.`,
        actionUrl: '/admin/marketplace'
      });
      imported++;
    }

    await service.entities.MarketplaceSyncLog.create({
      ranAt: new Date().toISOString(), trigger: 'manual', status: 'success',
      importedCount: imported, updatedCount: updated, skippedCount: skipped,
      details: { sheetId, totalRows: rows.length - 1 }
    }).catch(() => null);

    return Response.json({ ok: true, imported, updated, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}