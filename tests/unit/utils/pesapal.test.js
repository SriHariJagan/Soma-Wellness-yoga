import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initiatePesapalPayment, continuePesapalPayment, getPesapalPaymentStatus, newIdempotencyKey } from '../../../src/components/api/PesapalServices.js';
import { formatKES, formatKESMinor } from '../../../src/utils/money.js';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('PesapalServices', () => {
  it('initiatePesapalPayment POSTs items (never a raw amount)', async () => {
    localStorage.setItem('token', 'tok');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, redirectUrl: 'https://pay/x', merchantReference: 'PAY-1' }) });
    const res = await initiatePesapalPayment({
      items: [{ itemType: 'service', itemId: 'abc', quantity: 1 }],
      label: 'Service',
      idempotencyKey: 'k1',
    });
    expect(res.redirectUrl).toContain('https://pay/x');
    const [, opts] = mockFetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.items).toHaveLength(1);
    expect(body).not.toHaveProperty('amount');
    expect(mockFetch.mock.calls[0][0]).toContain('/api/payments/initiate');
  });

  it('continuePesapalPayment sends paymentId only', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, redirectUrl: 'https://pay/y' }) });
    await continuePesapalPayment('pay_123');
    const [, opts] = mockFetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toMatchObject({ paymentId: 'pay_123' });
  });

  it('getPesapalPaymentStatus uses the canonical path for merchant references', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, paymentStatus: 'captured' }) });
    const res = await getPesapalPaymentStatus('PAY-20260101-ABCDEF12', null);
    expect(res.paymentStatus).toBe('captured');
    expect(mockFetch.mock.calls[0][0]).toContain('/api/payments/PAY-20260101-ABCDEF12/status');
  });

  it('throws clean errors on failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'Bad items' }) });
    await expect(initiatePesapalPayment({ items: [] })).rejects.toThrow('Bad items');
  });

  it('newIdempotencyKey generates unique keys', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
    expect(newIdempotencyKey('chk')).toMatch(/^chk_/);
  });
});

describe('money utils (frontend)', () => {
  it('formats KES major amounts', () => {
    expect(formatKES(1500)).toBe('KES 1,500');
    expect(formatKES(1500, { decimals: 2 })).toBe('KES 1,500.00');
  });
  it('formats minor units from the API', () => {
    expect(formatKESMinor(150050)).toBe('KES 1,500.50');
  });
});
