import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PesapalClient } from '../../../payment/gateways/pesapal/PesapalClient.js';

const realFetch = global.fetch;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: async () => JSON.stringify(body),
  };
}

describe('PesapalClient', () => {
  let client;
  beforeEach(() => {
    client = new PesapalClient();
    client._clearToken();
    process.env.PESAPAL_CONSUMER_KEY = 'key';
    process.env.PESAPAL_CONSUMER_SECRET = 'secret';
    process.env.PESAPAL_API_URL = 'https://cybqa.pesapal.com/pesapalv3';
    global.fetch = jest.fn();
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('fetches and caches the access token', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      token: 'tok-1',
      expiryDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      status: '200',
    }));
    const t1 = await client.getAccessToken();
    const t2 = await client.getAccessToken();
    expect(t1).toBe('tok-1');
    expect(t2).toBe('tok-1');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.consumer_key).toBe('key');
    // Secret must be in the body (per API) — ensure no logging of it happens here
    expect(body.consumer_secret).toBe('secret');
  });

  it('throws a clear error when credentials are missing', async () => {
    delete process.env.PESAPAL_CONSUMER_KEY;
    await expect(client.getAccessToken()).rejects.toThrow(/not configured/);
  });

  it('submits orders and validates the response', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ token: 't', expiryDate: new Date(Date.now() + 300000).toISOString(), status: '200' }))
      .mockResolvedValueOnce(jsonResponse({
        order_tracking_id: 'track-1',
        merchant_reference: 'PAY-1',
        redirect_url: 'https://cybqa.pesapal.com/iframe?x=1',
        status: '200',
      }));
    const res = await client.submitOrder({
      id: 'PAY-1',
      currency: 'KES',
      amount: 100,
      description: 'Test',
      callback_url: 'https://example.com/payment/return',
      notification_id: '00000000-0000-0000-0000-000000000000',
      billing_address: { email_address: 'a@b.co' },
    });
    expect(res.orderTrackingId).toBe('track-1');
    expect(res.redirectUrl).toContain('cybqa.pesapal.com');
  });

  it('rejects submitOrder without required fields (no network call)', async () => {
    await expect(client.submitOrder({})).rejects.toThrow(/requires/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('normalizes GetTransactionStatus COMPLETED', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ token: 't', expiryDate: new Date(Date.now() + 300000).toISOString(), status: '200' }))
      .mockResolvedValueOnce(jsonResponse({
        payment_method: 'M-PESA',
        amount: 100,
        currency: 'KES',
        confirmation_code: 'C1',
        payment_status_description: 'Completed',
        status_code: 1,
        merchant_reference: 'PAY-1',
        status: '200',
      }));
    const s = await client.getTransactionStatus('track-1');
    expect(s.status).toBe('completed');
    expect(s.confirmationCode).toBe('C1');
    const url = global.fetch.mock.calls[1][0];
    expect(url).toContain('orderTrackingId=track-1');
  });

  it('normalizes FAILED and REVERSED', async () => {
    const run = async (desc, code, want) => {
      client._clearToken();
      global.fetch.mockReset();
      global.fetch
        .mockResolvedValueOnce(jsonResponse({ token: 't', expiryDate: new Date(Date.now() + 300000).toISOString(), status: '200' }))
        .mockResolvedValueOnce(jsonResponse({
          payment_status_description: desc, status_code: code, amount: 1, currency: 'KES', status: '200',
        }));
      const s = await client.getTransactionStatus('t');
      expect(s.status).toBe(want);
    };
    await run('Failed', 2, 'failed');
    await run('Reversed', 3, 'reversed');
    await run('Invalid', 0, 'invalid');
  });

  it('validates refund input before calling the API', async () => {
    await expect(client.refundRequest({})).rejects.toThrow(/requires/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces provider HTTP errors clearly', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ token: 't', expiryDate: new Date(Date.now() + 300000).toISOString(), status: '200' }))
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'Bad order' } }, 400));
    await expect(
      client.submitOrder({
        id: 'PAY-1', currency: 'KES', amount: 1, description: 'x',
        callback_url: 'https://e.com/r', notification_id: 'n',
        billing_address: { email_address: 'a@b.co' },
      }),
    ).rejects.toThrow(/Pesapal API error \(400\)/);
  });
});
