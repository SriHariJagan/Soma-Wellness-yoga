import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPaymentMode, simulateTestPayment, provisionTestAccount, getTestIdentity } from '../../../src/components/api/MpesaServices.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('getPaymentMode (backend is source of truth)', () => {
  it('GETs /api/mpesa/mode without requiring auth', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, mode: 'test', testMode: true }) });
    const res = await getPaymentMode();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/mpesa/mode'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(res.testMode).toBe(true);
  });
});

describe('simulateTestPayment', () => {
  it('POSTs paymentId + status to /api/mpesa/test', async () => {
    localStorage.setItem('token', 'tok');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await simulateTestPayment({ paymentId: 'p1', status: 'success' });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ paymentId: 'p1', status: 'success' });
  });

  it('surfaces the backend 403 message in live mode', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Test payment mode is disabled' }) });
    await expect(simulateTestPayment({ paymentId: 'p1', status: 'success' }))
      .rejects.toThrow('Test payment mode is disabled');
  });
});

describe('provisionTestAccount (TEST MODE ONLY)', () => {
  it('POSTs name/email/phone to /api/mpesa/test/provision', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, token: 't', user: { id: 'u' }, isNew: true }) });
    const res = await provisionTestAccount({ name: 'Asha', email: 'asha@test.com', phone: '0712345678' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/mpesa/test/provision'),
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ name: 'Asha', email: 'asha@test.com', phone: '0712345678' });
    expect(res.token).toBe('t');
    expect(res.isNew).toBe(true);
  });

  it('surfaces the 409 already-exists message', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'An account with this email already exists' }) });
    await expect(provisionTestAccount({ name: 'Asha', email: 'asha@test.com', phone: '0712345678' }))
      .rejects.toThrow('already exists');
  });
});

describe('getTestIdentity (server truth, never throws)', () => {
  it('returns null when there is no token (guest)', async () => {
    await expect(getTestIdentity()).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns the server-reported email for a valid token', async () => {
    localStorage.setItem('token', 'tok');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ user: { email: 'real@example.com' } }) });
    await expect(getTestIdentity()).resolves.toEqual({ email: 'real@example.com' });
  });

  it('returns null when the token is not recognised (stale session)', async () => {
    localStorage.setItem('token', 'dead');
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Invalid token' }) });
    await expect(getTestIdentity()).resolves.toBeNull();
  });
});
