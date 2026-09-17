import { secrets } from 'base44:runtime';

// SMM panel client (social media growth services). Standard panel API:
// POST with form params key / action / ... — key and URL live in Base44
// secrets and never reach the frontend.

export function getSmmConfig() {
  const apiKey = secrets.get('SMM_API_KEY');
  const apiUrl = secrets.get('SMM_API_URL');
  return { apiKey, apiUrl, configured: Boolean(apiKey && apiUrl) };
}

async function smmRequest(config, params) {
  const body = new URLSearchParams({ key: config.apiKey, ...params });
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  return { status: res.status, ok: res.ok, data, raw: text };
}

function smmUnavailable() {
  const err = new Error('Social growth service is temporarily unavailable. Please try again later.');
  err.statusCode = 503;
  return err;
}

// Full services catalogue from the panel. Normalized for the frontend.
export async function fetchSmmServices() {
  const config = getSmmConfig();
  if (!config.configured) throw smmUnavailable();
  const response = await smmRequest(config, { action: 'services' });
  if (!Array.isArray(response.data)) {
    const err = new Error('Could not load social growth services right now. Please try again shortly.');
    err.statusCode = 502;
    throw err;
  }
  return response.data
    .filter(s => s && s.service && Number(s.rate) > 0)
    .map(s => ({
      id: String(s.service),
      name: String(s.name || 'Service'),
      category: String(s.category || 'Other'),
      rate: Number(s.rate),
      min: Number(s.min) || 1,
      max: Number(s.max) || 1000000,
      refill: Boolean(s.refill),
      description: String(s.description || '').slice(0, 200)
    }));
}

export async function findSmmService(serviceId) {
  const services = await fetchSmmServices();
  return services.find(s => s.id === String(serviceId)) || null;
}

// Place an order on the panel. Returns the panel order id.
export async function addSmmOrder(opts) {
  const { serviceId, link, quantity } = opts;
  const config = getSmmConfig();
  if (!config.configured) throw smmUnavailable();
  const response = await smmRequest(config, { action: 'add', service: String(serviceId), link, quantity: String(quantity) });
  const orderId = response.data && (response.data.order || response.data.order_id);
  if (!orderId) {
    const raw = String(response.raw || '').slice(0, 200);
    const err = new Error(raw || 'The panel could not accept this order.');
    err.statusCode = 502;
    throw err;
  }
  return String(orderId);
}

// Query a panel order's progress.
export async function getSmmOrderStatus(panelOrderId) {
  const config = getSmmConfig();
  if (!config.configured) throw smmUnavailable();
  const response = await smmRequest(config, { action: 'status', order: String(panelOrderId) });
  if (!response.data || typeof response.data !== 'object') {
    const err = new Error('Could not check this order right now.');
    err.statusCode = 502;
    throw err;
  }
  const d = response.data;
  return {
    status: String(d.status || 'pending'),
    charge: d.charge != null ? Number(d.charge) : null,
    startCount: d.start_count != null ? Number(d.start_count) : null,
    remains: d.remains != null ? Number(d.remains) : null
  };
}