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
      url: secrets.get('OTP_PROVIDER_API_URL'),
      key: secrets.get('OTP_PROVIDER_API_KEY')
    },
    {
      id: 'b',
      label: 'Server B (fallback)',
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

// ---------- Fleexa-compatible helpers (per server) ----------

export async function otpServerStatus(server) {
  return await serverFetch(server, '/balance');
}

export async function listSmsServices(server) {
  const data = await serverFetch(server, '/sms4/apps');
  return Array.isArray(data) ? data : [];
}

export async function getSmsPrice(server, serviceName) {
  return await serverFetch(server, '/sms4/prices?serviceName=' + encodeURIComponent(serviceName));
}

export async function buySmsNumber(server, serviceName) {
  return await serverFetch(server, '/sms4/buy', {
    method: 'POST',
    body: JSON.stringify({ serviceName })
  });
}

export async function checkSmsRequest(server, requestId) {
  return await serverFetch(server, '/sms4/check/' + encodeURIComponent(String(requestId)));
}

export async function cancelSmsRequest(server, requestId) {
  return await serverFetch(server, '/sms4/cancel', {
    method: 'POST',
    body: JSON.stringify({ requestId })
  });
}

export async function listEmailProducts(server) {
  const data = await serverFetch(server, '/email/products');
  return Array.isArray(data) ? data : [];
}

export async function buyEmailOtp(server, domain, site) {
  return await serverFetch(server, '/email/buy', {
    method: 'POST',
    body: JSON.stringify({ domain, site })
  });
}

export async function checkEmailOtp(server, emailId) {
  return await serverFetch(server, '/email/check/' + encodeURIComponent(String(emailId)));
}

export async function cancelEmailOtp(server, emailId) {
  return await serverFetch(server, '/email/cancel', {
    method: 'POST',
    body: JSON.stringify({ requestId: emailId })
  });
}