import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  global.fetch = vi.fn();
});

describe('somaApi helpers', () => {
  it('jget throws on non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const { fetchCatalog } = await import('../../../src/lib/somaApi.js');
    await expect(fetchCatalog()).rejects.toThrow(/failed: 404/);
  });

  it('jpost includes Bearer from localStorage token', async () => {
    localStorage.setItem('token', 'abc');
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: 1 }) });
    const { createGiftVoucher } = await import('../../../src/lib/somaApi.js');
    await createGiftVoucher({ amount: 1000 });
    expect(global.fetch).toHaveBeenCalledWith('/api/soma/gift-vouchers', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer abc' }),
    }));
  });

  it('jpost throws with backend message on error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'Invalid amount' }) });
    const { subscribeDaily } = await import('../../../src/lib/somaApi.js');
    await expect(subscribeDaily('monthly')).rejects.toThrow('Invalid amount');
  });

  it('jpost handles empty json gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('bad json'); } });
    const { purchasePass } = await import('../../../src/lib/somaApi.js');
    await expect(purchasePass('5-class')).rejects.toThrow(/failed: 500/);
  });

  it('fetchFoundingStatus calls correct path', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ open: true }) });
    const { fetchFoundingStatus } = await import('../../../src/lib/somaApi.js');
    const r = await fetchFoundingStatus();
    expect(r.open).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/soma/founding/status');
  });
});
