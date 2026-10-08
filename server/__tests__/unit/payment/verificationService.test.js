import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { VerificationService } from '../../../payment/services/VerificationService.js';

describe('VerificationService (provider-neutral)', () => {
  let svc;
  beforeEach(() => {
    svc = new VerificationService();
  });

  it('enforces pending-only capture', () => {
    expect(() => svc.verifyPaymentStatus({ paymentStatus: 'pending' })).not.toThrow();
    expect(() => svc.verifyPaymentStatus({ paymentStatus: 'captured' })).toThrow(/cannot be verified/);
    expect(() => svc.verifyPaymentStatus({ paymentStatus: 'failed' })).toThrow(/cannot be verified/);
  });

  it('enforces exact amount equality (no tolerance)', () => {
    expect(() => svc.verifyAmount(150000, 150000)).not.toThrow();
    expect(() => svc.verifyAmount(150001, 150000)).toThrow(/Amount mismatch/);
    expect(() => svc.verifyAmount(null, 150000)).toThrow(/did not return an amount/);
  });

  it('enforces currency equality', () => {
    expect(() => svc.verifyCurrency('KES', 'KES')).not.toThrow();
    expect(() => svc.verifyCurrency('kes', 'KES')).not.toThrow();
    expect(() => svc.verifyCurrency('USD', 'KES')).toThrow(/Currency mismatch/);
  });

  it('enforces merchant reference equality', () => {
    expect(() => svc.verifyMerchantReference('PAY-1', 'PAY-1')).not.toThrow();
    expect(() => svc.verifyMerchantReference('PAY-1', 'PAY-2')).toThrow(/mismatch/);
    expect(() => svc.verifyMerchantReference(null, 'PAY-2')).toThrow(/missing/);
  });

  it('rejects duplicate provider transactions on other payments', async () => {
    const repo = {
      findByProviderTransactionId: jest.fn(async () => ({ _id: 'other-id' })),
    };
    await expect(
      svc.checkTransactionIdNotDuplicate('CONF1', repo, 'my-id'),
    ).rejects.toThrow(/already been processed/);
  });

  it('allows same-payment transaction id (idempotent retry)', async () => {
    const repo = {
      findByProviderTransactionId: jest.fn(async () => ({ _id: 'my-id' })),
    };
    await expect(
      svc.checkTransactionIdNotDuplicate('CONF1', repo, 'my-id'),
    ).resolves.toBe(true);
  });

  it('verifyWithProvider captures only on COMPLETED with matching fields', async () => {
    const payment = { _id: 'p1', paymentStatus: 'pending', amount: 150000, currency: 'KES', merchant_reference: 'PAY-1' };
    const provider = {
      getTransactionStatus: jest.fn(async () => ({
        status: 'completed',
        statusDescription: 'Completed',
        amountMinor: 150000,
        currency: 'KES',
        merchantReference: 'PAY-1',
        confirmationCode: 'C1',
      })),
      mapStatus: (s) => (s === 'Completed' ? 'captured' : 'pending'),
    };
    const status = await svc.verifyWithProvider({ payment, provider, checkoutId: 't1', repository: null });
    expect(status.confirmationCode).toBe('C1');
  });

  it('verifyWithProvider throws PROVIDER_NOT_COMPLETED when not completed', async () => {
    const payment = { _id: 'p1', paymentStatus: 'pending', amount: 100, currency: 'KES' };
    const provider = {
      getTransactionStatus: jest.fn(async () => ({ status: 'pending', statusDescription: 'Pending' })),
      mapStatus: () => 'pending',
    };
    await expect(
      svc.verifyWithProvider({ payment, provider, checkoutId: 't1', repository: null }),
    ).rejects.toMatchObject({ code: 'PROVIDER_NOT_COMPLETED' });
  });

  it('verifyWithProvider rejects amount mismatch', async () => {
    const payment = { _id: 'p1', paymentStatus: 'pending', amount: 150000, currency: 'KES', merchant_reference: 'PAY-1' };
    const provider = {
      getTransactionStatus: jest.fn(async () => ({
        status: 'completed',
        statusDescription: 'Completed',
        amountMinor: 99999,
        currency: 'KES',
        merchantReference: 'PAY-1',
      })),
      mapStatus: () => 'captured',
    };
    await expect(
      svc.verifyWithProvider({ payment, provider, checkoutId: 't1', repository: null }),
    ).rejects.toThrow(/Amount mismatch/);
  });
});
