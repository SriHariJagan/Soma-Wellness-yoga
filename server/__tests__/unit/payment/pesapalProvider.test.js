import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PesapalProvider } from '../../../payment/gateways/pesapal/PesapalProvider.js';

function mockClient() {
  return {
    baseUrl: 'https://cybqa.pesapal.com/pesapalv3',
    isConfigured: true,
    submitOrder: jest.fn(async (order) => ({
      orderTrackingId: 'track-123',
      merchantReference: order.id,
      redirectUrl: 'https://cybqa.pesapal.com/iframe?OrderTrackingId=track-123',
      raw: { status: '200' },
    })),
    getTransactionStatus: jest.fn(async () => ({
      status: 'completed',
      statusDescription: 'Completed',
      amount: 1500,
      amountMinor: 150000,
      currency: 'KES',
      merchantReference: 'PAY-20260101-ABCDEF12',
      confirmationCode: 'CONF123',
      paymentMethod: 'M-PESA',
      raw: {},
    })),
  };
}

describe('PesapalProvider', () => {
  let provider;
  let client;
  beforeEach(() => {
    client = mockClient();
    provider = new PesapalProvider(client);
    process.env.PESAPAL_IPN_ID = '00000000-0000-0000-0000-000000000000';
    process.env.PESAPAL_CALLBACK_URL = 'https://example.com/payment/return';
  });

  it('maps provider statuses to canonical states', () => {
    expect(provider.mapStatus('COMPLETED')).toBe('captured');
    expect(provider.mapStatus('1')).toBe('captured');
    expect(provider.mapStatus('FAILED')).toBe('failed');
    expect(provider.mapStatus('2')).toBe('failed');
    expect(provider.mapStatus('REVERSED')).toBe('failed');
    expect(provider.mapStatus('INVALID')).toBe('failed');
    expect(provider.mapStatus('PENDING')).toBe('pending');
    expect(provider.mapStatus('unknown-thing')).toBe('pending');
  });

  it('creates an order with server-side amount and merchant reference', async () => {
    const payment = { merchant_reference: 'PAY-20260101-ABCDEF12', amount: 150000, currency: 'KES', label: 'Test item' };
    const res = await provider.createOrder({
      payment,
      customer: { email: 'a@b.co', phone: '254700000000' },
    });
    expect(res.checkoutId).toBe('track-123');
    expect(res.redirectUrl).toContain('cybqa.pesapal.com');
    const submitted = client.submitOrder.mock.calls[0][0];
    expect(submitted.id).toBe('PAY-20260101-ABCDEF12');
    expect(submitted.amount).toBe(1500);
    expect(submitted.currency).toBe('KES');
    expect(submitted.notification_id).toBeTruthy();
  });

  it('rejects order creation without customer contact', async () => {
    const payment = { merchant_reference: 'PAY-X', amount: 100, currency: 'KES', label: 'x' };
    await expect(provider.createOrder({ payment, customer: {} })).rejects.toThrow(/email or phone/);
  });

  it('rejects order creation without merchant reference', async () => {
    await expect(
      provider.createOrder({ payment: { amount: 100 }, customer: { email: 'a@b.co' } }),
    ).rejects.toThrow(/merchant_reference/);
  });

  it('parses callback/IPN from query and body', () => {
    const fromQuery = provider.parseCallback({
      query: { OrderTrackingId: 't1', OrderMerchantReference: 'm1', OrderNotificationType: 'IPNCHANGE' },
      body: {},
    });
    expect(fromQuery).toEqual({ trackingId: 't1', merchantReference: 'm1', notificationType: 'IPNCHANGE' });

    const fromBody = provider.parseCallback({
      query: {},
      body: { OrderTrackingId: 't2', OrderMerchantReference: 'm2', OrderNotificationType: 'CALLBACKURL' },
    });
    expect(fromBody.trackingId).toBe('t2');
    expect(fromBody.notificationType).toBe('CALLBACKURL');
  });

  it('normalizes transaction status with minor amounts', async () => {
    const s = await provider.getTransactionStatus('track-123');
    expect(s.amountMinor).toBe(150000);
    expect(s.currency).toBe('KES');
    expect(s.confirmationCode).toBe('CONF123');
  });
});
