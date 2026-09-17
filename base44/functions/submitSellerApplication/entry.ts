import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getMarketplaceSettings, generateListingId, notifyAdmins } from '../../shared/lemak.ts';
import { mapColumns, rowHash } from '../../shared/sheetFields.ts';

// In-app marketplace seller application. Creates the pending seller + listing
// records AND appends the submission into the owner's Google Form response
// sheet, so every application lands in their spreadsheet automatically.
// Google credentials stay on the backend; never run from the browser.

const ACCOUNT_TYPES = ['Individual', 'Business', 'Agency', 'Freelancer', 'Service Provider', 'Digital Product Seller'];
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

function clean(v) {
  return String(v == null ? '' : v).trim();
}

// Append the submission to the configured response sheet. Returns
// { saved, submissionId, syncHash, warning } — never throws: a sheet failure
// must not block the application itself.
async function appendToSheet(service, values) {
  const result = { saved: false, submissionId: null, syncHash: null, warning: null };
  try {
    const settings = await getMarketplaceSettings(service);
    const sheetMatch = String(settings.google_form_response_sheet_url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetMatch) {
      result.warning = 'Seller form response sheet URL is not configured';
      return result;
    }
    const sheetId = sheetMatch[1];
    const { accessToken } = await service.connectors.getConnection('googlesheets');

    const headerRes = await fetch(`${SHEETS_API}/${sheetId}/values/A1:ZZ1`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!headerRes.ok) {
      result.warning = `Could not read the response sheet (Google API ${headerRes.status}). Make sure the sheet is shared with your connected Google account.`;
      return result;
    }
    const headerRow = ((await headerRes.json()).values || [])[0] || [];
    if (!headerRow.length) {
      result.warning = 'The response sheet has no header row';
      return result;
    }

    const colIndex = mapColumns(headerRow);
    const row = new Array(headerRow.length).fill('');
    for (const [field, value] of Object.entries(values)) {
      if (colIndex[field] !== undefined) row[colIndex[field]] = value;
    }
    // Google-collected email column, when present, gets the same email.
    if (colIndex.collectedEmail !== undefined && colIndex.collectedEmail !== colIndex.email) {
      row[colIndex.collectedEmail] = values.email;
    }

    const appendRes = await fetch(`${SHEETS_API}/${sheetId}/values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    });
    if (!appendRes.ok) {
      const errText = await appendRes.text().catch(() => '');
      result.warning = `Could not write to the response sheet (Google API ${appendRes.status}): ${errText.slice(0, 200)}`;
      return result;
    }

    // Record the exact sheet row (submissionId + hash of what the sheet now
    // returns) so the sync import treats this row as already imported.
    const updatedRange = (((await appendRes.json()).updates || {}).updatedRange) || '';
    const rangeMatch = updatedRange.match(/!([A-Z]+)(\d+)/);
    if (rangeMatch) {
      const rowNum = Number(rangeMatch[2]);
      const readRes = await fetch(`${SHEETS_API}/${sheetId}/values/${encodeURIComponent(updatedRange)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (readRes.ok) {
        const rowValues = ((await readRes.json()).values || [])[0] || [];
        result.syncHash = rowHash(rowValues);
      }
      result.submissionId = `${sheetId}#r${rowNum}`;
    }
    result.saved = true;
    return result;
  } catch (e) {
    result.warning = e.message || 'Google Sheets error';
    return result;
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const data = {
      fullName: clean(body.fullName),
      username: clean(body.username),
      email: clean(body.email).toLowerCase(),
      phone: clean(body.phone),
      accountType: clean(body.accountType),
      category: clean(body.category),
      serviceTitle: clean(body.serviceTitle),
      description: clean(body.description),
      price: parseFloat(String(body.price || '').replace(/[^0-9.]/g, '')),
      currency: clean(body.currency) || 'NGN',
      deliveryTime: clean(body.deliveryTime),
      portfolioUrl: clean(body.portfolioUrl),
      sellerTerms: clean(body.sellerTerms),
      verificationInfo: clean(body.verificationInfo)
    };

    if (!data.fullName) return Response.json({ error: 'Enter your full name' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return Response.json({ error: 'Enter a valid email address' }, { status: 400 });
    if (!ACCOUNT_TYPES.includes(data.accountType)) return Response.json({ error: 'Select an account type' }, { status: 400 });
    if (!data.category) return Response.json({ error: 'Enter your service category' }, { status: 400 });
    if (!data.serviceTitle) return Response.json({ error: 'Enter your service title' }, { status: 400 });
    if (data.description.length < 20) return Response.json({ error: 'Describe your service in at least 20 characters' }, { status: 400 });
    if (!isFinite(data.price) || data.price <= 0) return Response.json({ error: 'Enter a valid price' }, { status: 400 });
    if (!data.deliveryTime) return Response.json({ error: 'Enter a delivery time' }, { status: 400 });
    if (data.portfolioUrl && !/^https?:\/\//i.test(data.portfolioUrl)) {
      return Response.json({ error: 'Portfolio link must start with http:// or https://' }, { status: 400 });
    }

    const submittedAt = new Date().toISOString();

    // Save to the owner's Google Sheet first, so the app records can reference
    // the exact sheet row and the sync import will not duplicate it.
    const sheet = await appendToSheet(service, {
      timestamp: submittedAt,
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      phone: data.phone,
      accountType: data.accountType,
      category: data.category,
      serviceTitle: data.serviceTitle,
      description: data.description,
      price: String(data.price),
      currency: data.currency,
      deliveryTime: data.deliveryTime,
      portfolioUrl: data.portfolioUrl,
      sellerTerms: data.sellerTerms,
      verificationInfo: data.verificationInfo
    });

    const listingId = generateListingId();
    const sellerRecord = await service.entities.MarketplaceSeller.create({
      userId: user.id,
      fullName: data.fullName, username: data.username, email: data.email, phone: data.phone,
      accountType: data.accountType, category: data.category, serviceTitle: data.serviceTitle,
      description: data.description, price: data.price, currency: data.currency,
      deliveryTime: data.deliveryTime, portfolioUrl: data.portfolioUrl,
      sellerTerms: data.sellerTerms, verificationInfo: data.verificationInfo,
      status: 'pending', source: 'in_app', submissionId: sheet.submissionId, submittedAt, listingId
    });
    await service.entities.MarketplaceListing.create({
      listingId, sellerId: sellerRecord.id, sellerUserId: user.id,
      title: data.serviceTitle, description: data.description, category: data.category,
      price: data.price, currency: data.currency, deliveryTime: data.deliveryTime, portfolioUrl: data.portfolioUrl,
      status: 'pending', isActive: true, source: 'in_app',
      submissionId: sheet.submissionId, submittedAt, syncHash: sheet.syncHash
    });

    await notifyAdmins(service, {
      type: 'marketplace',
      title: 'New marketplace seller submission received.',
      message: `${data.fullName || data.email} submitted "${data.serviceTitle}" (${listingId}) on ${new Date(submittedAt).toDateString()}.`,
      actionUrl: '/admin/marketplace'
    });

    return Response.json({ ok: true, listingId, sheetSaved: sheet.saved, warning: sheet.warning || undefined });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}