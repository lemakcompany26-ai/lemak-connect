import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole, getMarketplaceSettings } from '../../shared/lemak.ts';

// Secure server-side sync of marketplace orders into the owner's Google
// Sheets records. Staff-only; Google credentials stay on the backend.
// Orders are written to the "Orders" tab of the configured records sheet
// (google_orders_sheet_url), falling back to the seller-form response
// spreadsheet so it works out of the box.

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TAB = 'Orders';
const HEADER = [
  'Transaction ID', 'Date', 'Listing', 'Buyer', 'Seller',
  'Escrow (NGN)', 'Listing Price (NGN)', 'Buyer Fee (NGN)', 'Commission (NGN)', 'Seller Payout (NGN)',
  'Payout Status', 'Order Status', 'Account URL', 'Delivered At', 'Confirmed At'
];

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
    const urlMatch = String(settings.google_orders_sheet_url || settings.google_form_response_sheet_url || '')
      .match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!urlMatch) return Response.json({ ok: false, error: 'No records sheet URL is configured' }, { status: 400 });
    const sheetId = urlMatch[1];

    let accessToken;
    try {
      const connection = await service.connectors.getConnection('googlesheets');
      accessToken = connection.accessToken;
    } catch (e) {
      return Response.json({
        ok: false, requiresGoogleIntegration: true,
        message: 'GOOGLE INTEGRATION REQUIRED — connect the Google Sheets integration so Lemak Connect can write your marketplace orders.'
      });
    }

    // Ensure the Orders tab exists.
    const metaRes = await fetch(`${SHEETS_API}/${sheetId}?fields=sheets(properties(title))`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!metaRes.ok) {
      return Response.json({
        ok: false,
        error: `Could not open the records sheet (Google API ${metaRes.status}). Make sure it is shared with your connected Google account.`
      }, { status: 502 });
    }
    const tabs = ((await metaRes.json()).sheets || []).map(s => (s.properties || {}).title);
    if (!tabs.includes(TAB)) {
      const addRes = await fetch(`${SHEETS_API}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB } } }] })
      });
      if (!addRes.ok) {
        return Response.json({ ok: false, error: `Could not create the Orders tab (Google API ${addRes.status}).` }, { status: 502 });
      }
    }

    // One bounded pass over orders; a single profile lookup for names.
    const orders = await service.entities.MarketplaceOrder.list('-created_date', 500);
    const profileRows = await service.entities.UserProfile.list('-created_date', 500);
    const nameById = {};
    for (const p of profileRows || []) {
      nameById[p.userId] = [p.fullName, p.email].filter(Boolean).join(' ');
    }
    const who = id => nameById[id] || (id ? `User ${id}` : '—');

    const rows = (orders || []).map(o => [
      o.transactionId || o.id,
      o.created_date || '',
      o.listingTitle || '',
      who(o.buyerUserId),
      who(o.sellerUserId),
      Number(o.amount) || 0,
      Number(o.listingPrice) || 0,
      Number(o.buyerFee) || 0,
      Number(o.commission) || 0,
      Number(o.sellerPayout) || 0,
      o.payoutStatus || '',
      o.status || '',
      o.accountUrl || '',
      o.deliveredAt || '',
      o.confirmedAt || ''
    ]);

    // Idempotent snapshot: clear previous data rows, then rewrite header + data.
    const clearRes = await fetch(`${SHEETS_API}/${sheetId}/values/${encodeURIComponent(TAB + '!A2:Z10000')}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!clearRes.ok) {
      return Response.json({ ok: false, error: `Could not clear the Orders tab (Google API ${clearRes.status}).` }, { status: 502 });
    }
    const batchRes = await fetch(`${SHEETS_API}/${sheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [
          { range: `${TAB}!A1`, values: [HEADER] },
          ...(rows.length ? [{ range: `${TAB}!A2`, values: rows }] : [])
        ]
      })
    });
    if (!batchRes.ok) {
      const errText = await batchRes.text().catch(() => '');
      return Response.json({
        ok: false,
        error: `Could not write orders (Google API ${batchRes.status}): ${errText.slice(0, 200)}`
      }, { status: 502 });
    }

    await service.entities.MarketplaceSyncLog.create({
      ranAt: new Date().toISOString(), trigger: 'manual', status: 'success',
      importedCount: 0, updatedCount: rows.length, skippedCount: 0,
      details: { kind: 'orders', written: rows.length, sheetId }
    }).catch(() => null);

    return Response.json({ ok: true, written: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}