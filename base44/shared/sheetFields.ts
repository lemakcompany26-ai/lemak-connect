// Shared mapping between Google Form response-sheet columns and Lemak Connect
// seller-submission fields. Used by syncMarketplaceSubmissions (sheet → app)
// and submitSellerApplication (app → sheet) so both agree on the layout.
//
// Candidates are matched as substrings of the normalized header, so numbered
// question headers like "16.Full Name" or "3.Wattsapp/phone number" still map.
export const FIELD_KEYS = {
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

export function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map a header row (array of header strings) to { field: columnIndex }.
export function mapColumns(headerRow) {
  const header = (headerRow || []).map(normalizeHeader);
  const colIndex = {};
  for (const [field, candidates] of Object.entries(FIELD_KEYS)) {
    for (const c of candidates) {
      const idx = header.findIndex(h => h === c || h.includes(c));
      if (idx !== -1) { colIndex[field] = idx; break; }
    }
  }
  return colIndex;
}

// Hash of a sheet row, used to detect updated submissions.
export function rowHash(values) {
  const str = JSON.stringify(values);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return String(hash);
}

export function parsePrice(raw) {
  const n = parseFloat(String(raw || '').replace(/[^0-9.]/g, ''));
  return isFinite(n) ? n : 0;
}