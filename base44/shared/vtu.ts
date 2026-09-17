import { secrets } from 'base44:runtime';

// VTU provider client (Bigisubs). All provider calls happen server-side only.
// API key and URL are stored in Base44 secrets and never sent to the frontend.

// Provider: Bigisub. API base is https://api.bigisub.ng with
// "Authorization: Token <key>" auth. The BIGISUBS_API_URL secret is an
// optional override (any /api or /api/v2 suffix is stripped so paths are
// never doubled). Purchases require BIGISUB_PIN — the 4-digit Bigisub
// transaction PIN — stored in Base44 secrets and never sent to the frontend.
export function getVtuConfig() {
  const apiKey = secrets.get('BIGISUBS_API_KEY');
  const apiUrl = secrets.get('BIGISUBS_API_URL') || 'https://api.bigisub.ng';
  const pin = secrets.get('BIGISUB_PIN');
  return { apiKey, apiUrl, pin, configured: Boolean(apiKey) };
}

function providerBase(apiUrl) {
  return String(apiUrl || 'https://api.bigisub.ng')
    .replace(/\/+$/, '')
    .replace(/\/api\/v2$/, '')
    .replace(/\/api$/, '');
}

// Bigisub identifies networks by numeric ID: 1=MTN, 2=GLO, 3=AIRTEL, 4=9MOBILE.
function networkId(network) {
  const map = { MTN: 1, GLO: 2, AIRTEL: 3, '9MOBILE': 4, ETISALAT: 4 };
  return map[String(network || '').trim().toUpperCase()] || null;
}

async function vtuRequest(config, path, opts) {
  const method = (opts && opts.method) || 'GET';
  const body = opts && opts.body;
  const url = `${providerBase(config.apiUrl)}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${config.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = null; }
  }
  return { status: res.status, ok: res.ok, data, error: null };
}

// Normalize common provider success indicators.
export function isProviderSuccess(response) {
  const d = response && response.data;
  if (!d) return false;
  if (d.success === true) return true;
  if (typeof d.status === 'boolean') return d.status === true;
  if (typeof d.status === 'string') {
    const s = d.status.toLowerCase();
    return ['success', 'successful', 'completed', 'complete', 'approved', 'delivered', 'true', '1'].includes(s);
  }
  return false;
}

export function extractProviderReference(d) {
  if (!d) return null;
  return d.reference || d.transaction_id || d.transactionId || d.order_id || d.orderId || d.trans_id
    || (d.data && (d.data.reference || d.data.transaction_id || d.data.id)) || d.id || null;
}

function extractErrorMessage(d, fallback) {
  if (!d) return fallback;
  return d.message || d.error_message || d.error || (d.error && d.error.message) || fallback;
}

function extractPlansArray(d) {
  if (!d) return null;
  const candidates = [d.data, d.plans, d.result, d.products, d.response, Array.isArray(d) ? d : null];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (c && Array.isArray(c.plans)) return c.plans;
    if (c && Array.isArray(c.data)) return c.data;
  }
  return null;
}

// Fetch data plans for a network from the provider.
export async function fetchDataPlans(network) {
  const config = getVtuConfig();
  if (!config.configured) {
    const err = new Error('Data service is temporarily unavailable. Please try again later.');
    err.statusCode = 503;
    throw err;
  }
  const id = networkId(network);
  const attempts = id
    ? [`/api/v2/vtu/data/plans/?network=${id}`]
    : ['/api/v2/vtu/data/plans/'];
  let lastResponse = null;
  for (const path of attempts) {
    try {
      const response = await vtuRequest(config, path, { method: 'GET' });
      lastResponse = response;
      const arr = extractPlansArray(response.data);
      if (arr && arr.length > 0) return arr;
    } catch (e) { lastResponse = { ok: false, data: null, error: e.message }; }
  }
  if (isProviderSuccess(lastResponse)) return [];
  const err = new Error('Could not load data plans right now. Please try again shortly.');
  err.statusCode = 502;
  throw err;
}

// Purchase airtime through the provider.
export async function purchaseAirtimeViaProvider(opts) {
  const { network, phoneNumber, amount, reference } = opts;
  const config = getVtuConfig();
  const id = networkId(network);
  if (!id) {
    const err = new Error('Unsupported network. Please try again.');
    err.statusCode = 400;
    throw err;
  }
  const payload = { network: id, phone_number: phoneNumber, amount, pin: config.pin };
  const attempts = ['/api/v2/vtu/airtime/purchase/'];
  let lastResponse = null;
  for (const path of attempts) {
    try {
      const response = await vtuRequest(config, path, { method: 'POST', body: payload });
      lastResponse = response;
      if (response.ok || isProviderSuccess(response)) return response;
    } catch (e) { lastResponse = { ok: false, data: null, error: e.message }; }
  }
  return lastResponse;
}

// Purchase a data plan through the provider.
export async function purchaseDataViaProvider(opts) {
  const { network, phoneNumber, planId, reference } = opts;
  const config = getVtuConfig();
  const payload = { plan: planId, phone_number: phoneNumber, pin: config.pin };
  const attempts = ['/api/v2/vtu/data/purchase/'];
  let lastResponse = null;
  for (const path of attempts) {
    try {
      const response = await vtuRequest(config, path, { method: 'POST', body: payload });
      lastResponse = response;
      if (response.ok || isProviderSuccess(response)) return response;
    } catch (e) { lastResponse = { ok: false, data: null, error: e.message }; }
  }
  return lastResponse;
}