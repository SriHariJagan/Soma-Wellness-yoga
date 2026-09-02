// SOMA API helpers (fetch wrappers without axios assumption)
const BASE = '/api/soma';
const PUB = '/api/public';

async function jget(url) {
  const headers = {};
  const raw = localStorage.getItem('token');
  if (raw) headers['Authorization'] = `Bearer ${raw}`;
  const r = await fetch(url, { headers });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.msg || j?.message || j?.error || `GET ${url} failed: ${r.status}`);
  }
  return r.json();
}
async function jpost(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const raw = localStorage.getItem('token');
  if (raw) headers['Authorization'] = `Bearer ${raw}`;
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.msg || j?.message || j?.error || `POST ${url} failed: ${r.status}`);
  return j;
}

export const fetchCatalog = () => jget(`${BASE}/catalog`);
export const fetchFoundingStatus = () => jget(`${BASE}/founding/status`);
export const fetchSomaDashboard = () => jget(`${BASE}/me/dashboard`);
export const createAppointment = (body) => jpost(`${BASE}/appointments`, body);
export const createQuoteRequest = (body) => jpost(`${BASE}/quote`, body);
export const createCorporateLead = (body) => jpost(`${BASE}/corporate-lead`, body);
export const createGiftVoucher = (body) => jpost(`${BASE}/gift-vouchers`, body);
export const subscribeDaily = (plan) => jpost(`${BASE}/daily/subscribe`, { plan });
export const purchasePass = (type) => jpost(`${BASE}/passes/purchase`, { type });
