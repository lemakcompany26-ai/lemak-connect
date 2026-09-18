import { secrets } from 'base44:runtime';

// OTP service catalogue — everything a rented virtual number can receive
// OTPs for: email, SMS and all major social media platforms.
export const OTP_SERVICE_CATALOGUE = [
  {
    category: 'Email',
    services: ['Gmail', 'Outlook / Hotmail', 'Yahoo Mail', 'ProtonMail', 'Email verification (any provider)']
  },
  {
    category: 'SMS',
    services: ['SMS verification (any network)', 'Nigeria SMS OTP', 'UK SMS OTP', 'US SMS OTP']
  },
  {
    category: 'Social Media',
    services: ['WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Snapchat', 'YouTube', 'LinkedIn', 'Pinterest', 'Reddit', 'Discord', 'Twitch']
  },
  {
    category: 'Finance & Apps',
    services: ['Google', 'PayPal', 'Payoneer', 'Binance', 'Cash App', 'Wise', 'Revolut', 'Chipper Cash', 'Amazon', 'Apple ID', 'Microsoft', 'Netflix', 'Spotify', 'OpenAI / ChatGPT', 'Uber', 'Bolt', 'Tinder']
  },
  {
    category: 'Other',
    services: ['Other / custom']
  }
];

// Dual OTP server configuration. Server A is the primary provider
// (OTP_PROVIDER_API_URL / OTP_PROVIDER_API_KEY); Server B is an optional
// second provider (OTP_SERVER_B_URL / OTP_SERVER_B_KEY). Both speak the
// Fleexa-compatible developer API (https://fleexa.com.ng/developer):
//   GET  /sms4/apps                    — services with live stock
//   GET  /sms4/prices?serviceName=x   — exact NGN price for a service
//   POST /sms4/buy                     — buy a live number
//   GET  /sms4/check/:requestId        — poll for the OTP code
//   POST /sms4/cancel                  — cancel + provider-side refund
//   GET  /email/products               — temporary email domains with prices
//   POST /email/buy                    — buy an email OTP address
//   GET  /email/check/:emailId         — poll for the email OTP code
//   POST /email/cancel                 — cancel an email order
//   GET  /balance                      — provider wallet status
export function getOtpServers() {
  return [
    {
      id: 'a',
      label: 'Server A (primary)',
      provider: 'fleexa',
      url: secrets.get('OTP_PROVIDER_API_URL'),
      key: secrets.get('OTP_PROVIDER_API_KEY')
    },
    {
      id: 'b',
      label: 'Server B (SMSPool)',
      provider: 'smspool',
      url: secrets.get('OTP_SERVER_B_URL'),
      key: secrets.get('OTP_SERVER_B_KEY')
    }
  ];
}

export function getOtpServer(id) {
  const wanted = String(id || '').toLowerCase();
  return getOtpServers().find(s => s.id === wanted) || null;
}

function providerError(payload, status) {
  const message = (payload && payload.message) || `OTP provider error (HTTP ${status})`;
  const err = new Error(message);
  err.statusCode = status === 429 ? 429 : 502;
  err.providerError = true;
  return err;
}

// Request ONE specific OTP server (Fleexa-compatible API, Bearer auth).
async function serverFetch(server, path, options) {
  if (!server || !server.url || !server.key) {
    const err = new Error('This OTP server is not configured.');
    err.statusCode = 503;
    throw err;
  }
  const res = await fetch(server.url.replace(/\/+$/, '') + path, {
    ...(options || {}),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${server.key}`,
      ...((options && options.headers) || {})
    }
  });
  let payload = null;
  try { payload = await res.json(); } catch (e) { payload = null; }
  if (!res.ok || (payload && payload.success === false)) {
    throw providerError(payload, res.status);
  }
  return payload && payload.data !== undefined ? payload.data : payload;
}

// Try each configured OTP server in order (A first, then B) and return the
// first successful response.
export async function otpServerRequest(path, options) {
  const servers = getOtpServers().filter(s => s.url && s.key);
  if (!servers.length) {
    const err = new Error('No OTP server is configured yet.');
    err.statusCode = 503;
    throw err;
  }
  let lastError = null;
  for (const server of servers) {
    try {
      return await serverFetch(server, path, options);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('All OTP servers are unreachable.');
}

// ---------- SMSPool adapter (Server B) ----------
// Server B speaks the SMSPool API (https://api.smspool.net): form-encoded
// POSTs with the key in the body. Prices are USD and are converted to NGN
// at a conservative fixed rate. SMSPool has no email OTP product.
const SMSPOOL_COUNTRY = 'US';
const SMSPOOL_USD_NGN = 1600;
let smspoolServicesCache = null;

// SMSPool serves most ISO country short codes; these are the most requested.
// Fleexa exposes its own live country list via /sms4/countries.
const SMSPOOL_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'TR', name: 'Turkey' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }
];

// Countries a provider serves, as { code, name } pairs.
export async function listSmsCountries(server) {
  if (isSmspool(server)) return SMSPOOL_COUNTRIES;
  const data = await serverFetch(server, '/sms4/countries');
  return (Array.isArray(data) ? data : [])
    .map(c => ({
      code: String((c && (c.id || c.code)) || '').toUpperCase(),
      name: (c && c.name) || String((c && (c.id || c.code)) || '')
    }))
    .filter(c => c.code);
}

function isSmspool(server) {
  return String((server && server.id) || '').toLowerCase() === 'b';
}

async function smspoolPost(server, path, fields) {
  if (!server || !server.url || !server.key) {
    const err = new Error('This OTP server is not configured.');
    err.statusCode = 503;
    throw err;
  }
  const res = await fetch(server.url.replace(/\/+$/, '') + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${server.key}` // without this header the API 404s
    },
    body: new URLSearchParams({ key: server.key, ...(fields || {}) }).toString()
  });
  let payload = null;
  try { payload = await res.json(); } catch (e) { payload = null; }
  if (!res.ok || (payload && payload.success === 0)) {
    const msg = (payload && payload.errors && payload.errors[0] && payload.errors[0].message) ||
      (payload && payload.message) || `OTP provider error (HTTP ${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status === 429 ? 429 : 502;
    err.providerError = true;
    throw err;
  }
  return payload;
}

// Resolve a lowercase service id (whatsapp, google…) to SMSPool's exact
// service name via the public service list (cached per invocation).
async function smspoolExactName(server, wanted) {
  if (!smspoolServicesCache) {
    const data = await smspoolPost(server, '/request/services');
    smspoolServicesCache = Array.isArray(data) ? data : [];
  }
  const target = String(wanted || '').toLowerCase();
  return smspoolServicesCache.find(s => String(s.name).toLowerCase() === target) ||
    smspoolServicesCache.find(s => String(s.name).toLowerCase().startsWith(target)) ||
    smspoolServicesCache.find(s => String(s.name).toLowerCase().includes(target)) || null;
}

function smspoolUnavailable(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

// ---------- Fleexa-compatible helpers (per server) ----------

export async function otpServerStatus(server) {
  if (isSmspool(server)) {
    const data = await smspoolPost(server, '/request/balance');
    return { balance: data && data.balance };
  }
  return await serverFetch(server, '/balance');
}

export async function listSmsServices(server) {
  if (isSmspool(server)) {
    if (!smspoolServicesCache) {
      const data = await smspoolPost(server, '/request/services');
      smspoolServicesCache = Array.isArray(data) ? data : [];
    }
    // SMSPool does not expose per-service stock; quantity null means
    // "available on demand" — the purchase itself fails gracefully if empty.
    return smspoolServicesCache.map(s => ({ id: String(s.name).toLowerCase(), quantity: null }));
  }
  const data = await serverFetch(server, '/sms4/apps');
  return Array.isArray(data) ? data : [];
}

export async function getSmsPrice(server, serviceName, country) {
  if (isSmspool(server)) {
    const exactName = await smspoolExactName(server, serviceName);
    if (!exactName) throw smspoolUnavailable('That service is not available on this server.');
    const data = await smspoolPost(server, '/request/price', {
      service: exactName.name, country: (country || SMSPOOL_COUNTRY).toUpperCase()
    });
    const usd = Number(data.price) || 0;
    if (!usd) throw smspoolUnavailable('No price available for this service right now.');
    return { price_ngn: usd * SMSPOOL_USD_NGN, success_rate: data.success_rate || null };
  }
  return await serverFetch(server, '/sms4/prices?serviceName=' + encodeURIComponent(serviceName));
}

export async function buySmsNumber(server, serviceName, country) {
  if (isSmspool(server)) {
    const exactName = await smspoolExactName(server, serviceName);
    if (!exactName) throw smspoolUnavailable('That service is not available on this server.');
    const data = await smspoolPost(server, '/purchase/sms', {
      service: exactName.name, country: (country || SMSPOOL_COUNTRY).toUpperCase()
    });
    return {
      number: data.number, phone: data.number,
      id: data.order_id, requestId: data.order_id,
      expires_in: Number(data.expires_in) || 0,
      amount_paid: 0
    };
  }
  return await serverFetch(server, '/sms4/buy', {
    method: 'POST',
    body: JSON.stringify({ serviceName })
  });
}

export async function checkSmsRequest(server, requestId) {
  if (isSmspool(server)) {
    const data = await smspoolPost(server, '/sms/check', { orderid: String(requestId) });
    // SMSPool statuses: 1 pending, 2 receiving, 3/4 SMS received, 5/6/7 cancelled or timed out
    const n = Number(data.status) || 0;
    const received = n === 3 || n === 4;
    const code = data.sms && String(data.sms) !== '0' && String(data.sms).toLowerCase() !== 'null'
      ? String(data.sms) : null;
    return {
      status: received ? 'received' : (n >= 5 ? 'cancelled' : 'pending'),
      sms_code: received ? code : null,
      full_sms: received ? (data.full_sms || null) : null
    };
  }
  return await serverFetch(server, '/sms4/check/' + encodeURIComponent(String(requestId)));
}

export async function cancelSmsRequest(server, requestId) {
  if (isSmspool(server)) {
    await smspoolPost(server, '/sms/cancel', { orderid: String(requestId) });
    return { ok: true };
  }
  return await serverFetch(server, '/sms4/cancel', {
    method: 'POST',
    body: JSON.stringify({ requestId })
  });
}

export async function listEmailProducts(server) {
  if (isSmspool(server)) return []; // SMSPool has no email OTP product
  const data = await serverFetch(server, '/email/products');
  return Array.isArray(data) ? data : [];
}

export async function buyEmailOtp(server, productId) {
  if (isSmspool(server)) throw smspoolUnavailable('Email OTP is not available on this server.');
  // The provider expects the product id (from /email/products) as the site;
  // anything else is rejected with a server error.
  return await serverFetch(server, '/email/buy', {
    method: 'POST',
    body: JSON.stringify({ domain: productId, site: productId })
  });
}

export async function checkEmailOtp(server, emailId) {
  if (isSmspool(server)) throw smspoolUnavailable('Email OTP is not available on this server.');
  return await serverFetch(server, '/email/check/' + encodeURIComponent(String(emailId)));
}

export async function cancelEmailOtp(server, emailId) {
  if (isSmspool(server)) throw smspoolUnavailable('Email OTP is not available on this server.');
  return await serverFetch(server, '/email/cancel', {
    method: 'POST',
    body: JSON.stringify({ requestId: emailId })
  });
}

// ---------- Long-term number rentals (Rent Number service) ----------
// Only the Fleexa-compatible server offers long-term rentals; the secondary
// server does not, so all rent requests there fail with a customer-safe
// message. Endpoints (monthly numbers, 1-12 months):
//   GET  /rent/sms4/apps               — rentable services
//   GET  /rent/sms4/areas              — rentable areas with monthly unit pricing
//   POST /rent/sms4/buy                — rent a number (appName + time in months)
//   GET  /rent/sms4/sms?rentalId=...   — messages received on a rented number
// Rentals cannot be cancelled once purchased.

function rentUnavailable() {
  const err = new Error('Long-term rentals are not available on this server.');
  err.statusCode = 400;
  return err;
}

export function supportsRentals(server) {
  return !isSmspool(server);
}

export async function listRentServices(server) {
  if (!supportsRentals(server)) throw rentUnavailable();
  const data = await serverFetch(server, '/rent/sms4/apps');
  return Array.isArray(data) ? data : [];
}

export async function listRentAreas(server) {
  if (!supportsRentals(server)) throw rentUnavailable();
  const data = await serverFetch(server, '/rent/sms4/areas');
  return Array.isArray(data) ? data : [];
}

// The rent-buy response carries the charged cost at the top level (outside
// `data`), so this uses a full-payload fetch instead of the trimmed helper.
export async function buyRentNumber(server, appName, months) {
  if (!supportsRentals(server)) throw rentUnavailable();
  if (!server || !server.url || !server.key) {
    const err = new Error('This OTP server is not configured.');
    err.statusCode = 503;
    throw err;
  }
  const res = await fetch(server.url.replace(/\/+$/, '') + '/rent/sms4/buy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${server.key}`
    },
    body: JSON.stringify({ appName, time: String(months) })
  });
  let payload = null;
  try { payload = await res.json(); } catch (e) { payload = null; }
  if (!res.ok || (payload && payload.success === false)) throw providerError(payload, res.status);
  const data = (payload && payload.data !== undefined) ? payload.data : payload;
  return {
    number: String((data && (data.number || data.phone)) || ''),
    expire_at: String((data && data.expire_at) || ''),
    order_id: String((data && (data.rental_id || data.order_id || data.id)) || ''),
    cost_ngn: Number((payload && payload.cost_ngn) || (data && (data.cost_ngn || data.amount_paid))) || 0
  };
}

export async function listRentSms(server, rentalId) {
  if (!supportsRentals(server)) throw rentUnavailable();
  const data = await serverFetch(server, '/rent/sms4/sms?rentalId=' + encodeURIComponent(String(rentalId)));
  return Array.isArray(data) ? data : ((data && (data.messages || data.sms)) || []);
}