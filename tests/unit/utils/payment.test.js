import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parsePrice, formatKES, getAuthHeaders, isLoggedIn, getCurrentUser, initiateMpesaPayment, queryMpesaStatus, addToCart, getCart, showToast, notifyCartUpdate } from '../../../src/utils/payment.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('parsePrice', () => {
  it('parses KES price strings', () => {
    expect(parsePrice('KES 2,000 / month')).toBe(2000);
    expect(parsePrice('KES 12,000')).toBe(12000);
    expect(parsePrice('KES 1,500.50')).toBe(1500.5);
  });
  it('handles empty/null/undefined', () => {
    expect(parsePrice('')).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice(undefined)).toBe(0);
  });
  it('handles numeric input', () => {
    expect(parsePrice(5000)).toBe(5000);
  });
  it('returns 0 for non-numeric', () => {
    expect(parsePrice('free')).toBe(0);
  });
});

describe('formatKES (payment utils)', () => {
  it('formats with locale', () => {
    expect(formatKES(12000)).toBe('KES 12,000');
    expect(formatKES(0)).toBe('KES 0');
  });
});

describe('getAuthHeaders', () => {
  it('without token returns Content-Type only', () => {
    expect(getAuthHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });
  it('with token adds Authorization', () => {
    localStorage.setItem('token', 'abc123');
    expect(getAuthHeaders()).toMatchObject({ Authorization: 'Bearer abc123' });
  });
});

describe('isLoggedIn', () => {
  it('false when no token or user', () => {
    expect(isLoggedIn()).toBe(false);
    localStorage.setItem('token', 't');
    expect(isLoggedIn()).toBe(false);
    localStorage.clear();
    localStorage.setItem('user', '{}');
    expect(isLoggedIn()).toBe(false);
  });
  it('true when both present', () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', '{"id":1}');
    expect(isLoggedIn()).toBe(true);
  });
});

describe('getCurrentUser', () => {
  it('returns parsed user or null', () => {
    expect(getCurrentUser()).toBeNull();
    localStorage.setItem('user', '{"name":"Amina"}');
    expect(getCurrentUser()).toEqual({ name: 'Amina' });
  });
  it('returns null on malformed JSON', () => {
    localStorage.setItem('user', '{bad');
    expect(getCurrentUser()).toBeNull();
  });
});

describe('initiateMpesaPayment', () => {
  it('POSTs to /api/mpesa/stkpush and returns data', async () => {
    localStorage.setItem('token', 'tok');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, paymentId: 'p1' }) });
    const res = await initiateMpesaPayment({ phone: '254700000000', amount: 5500, accountRef: 'ref', description: 'yoga' });
    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/mpesa/stkpush'), expect.objectContaining({ method: 'POST' }));
  });
  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Failed' }) });
    await expect(initiateMpesaPayment({ phone: '254', amount: 100, accountRef: 'r', description: 'd' })).rejects.toThrow('Failed');
  });
});

describe('queryMpesaStatus', () => {
  it('POSTs checkoutRequestId', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'pending' }) });
    const r = await queryMpesaStatus('chk123');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/mpesa/query'), expect.objectContaining({ body: JSON.stringify({ checkoutRequestId: 'chk123' }) }));
    expect(r.status).toBe('pending');
  });
});

describe('addToCart / getCart', () => {
  it('addToCart succeeds with token', async () => {
    localStorage.setItem('token', 'tok');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    const r = await addToCart('book', '507f1f77bcf86cd799439011');
    expect(r).toEqual({ items: [] });
  });
  it('addToCart throws on failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Out of stock' }) });
    await expect(addToCart('book', 'id')).rejects.toThrow('Out of stock');
  });
  it('getCart fetches cart', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ total: 1000 }) });
    const r = await getCart();
    expect(r.total).toBe(1000);
  });
});

describe('showToast / notifyCartUpdate', () => {
  it('dispatches app-toast custom event', () => {
    const spy = vi.fn();
    window.addEventListener('app-toast', spy);
    showToast('hello', 'success');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].detail).toMatchObject({ message: 'hello', type: 'success' });
    window.removeEventListener('app-toast', spy);
  });
  it('dispatches cart-update', () => {
    const spy = vi.fn();
    window.addEventListener('cart-update', spy);
    notifyCartUpdate();
    expect(spy).toHaveBeenCalled();
    window.removeEventListener('cart-update', spy);
  });
});
