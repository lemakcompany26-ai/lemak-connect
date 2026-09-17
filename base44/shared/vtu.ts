import { secrets } from 'base44:runtime';

// VTU provider client (Bigisubs). All provider calls happen server-side only.
// API key and URL are stored in Base44 secrets and never sent to the frontend.

export function getVtuConfig() {
  const apiKey = secrets.get('BIGISUBS_API_KEY');
  const apiUrl = secrets.get('BIGISUBS_API_URL');
  return { apiKey, apiUrl, configured: Boolean(apiKey && apiUrl) };
}

async function vtuRequest(config, path, opts) {
  const method = (opts && opts.method) || 'GET';
  const body = opts && opts.body;
  const url = `${String(config.apiUrl).replace(/\/+$/, '')}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'api-key': String(config.apiKey),
      'x-api-key': String(config.apiKey)
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
  if (typeof d.status === 'boolean') return d.status === true;
  if (typeof d.status === 'string') {
    const s = d.status.toLowerCase();
    return ['success', 'successful', 'completed', 'complete', 'approved', 'delivered', 'true', '1'].includes(s);
  }
  return false;
}

export function extractProviderReference(d) {
  if (!d) return null;
  return d.reference || d.transaction_id || d.transactionId || d.order_id || d.orderId || d.trans_id || d.id || null;
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
  const attempts = [
    `/api/data/plans?network=${encodeURIComponent(network)}`,
    `/data/plans?network=${encodeURIComponent(network)}`,
    `/api/plans?network=${encodeURIComponent(network)}`
  ];
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
  const payload = { network, phone: phoneNumber, amount, reference };
  const attempts = ['/api/airtime/topup', '/airtime/topup', '/api/airtime', '/airtime'];
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
  const payload = { network, phone: phoneNumber, plan_id: planId, planId, reference };
  const attempts = ['/api/data/purchase', '/data/purchase', '/api/data/order', '/data/order'];
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