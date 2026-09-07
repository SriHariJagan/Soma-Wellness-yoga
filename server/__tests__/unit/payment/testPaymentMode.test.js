// ============================================================
// testPaymentMode.test.js — TEST PAYMENT MODE (testing-code branch)
// Guards: backend env is the source of truth; test endpoints are
// unreachable in live mode; scenarios validate without touching
// production M-Pesa code. No DB required.
// ============================================================
import { jest, describe, test, expect, afterEach } from '@jest/globals';
import { getPaymentMode, isTestPaymentMode } from '../../../config/paymentMode.js';
import {
  TEST_SCENARIOS,
  normalizeScenario,
  buildTestStkIds,
  TestPaymentService,
} from '../../../payment/gateways/test/TestPaymentService.js';
import {
  getPaymentModeStatus,
  simulateTestPayment,
} from '../../../controllers/testPaymentController.js';

const OLD_PAYMENT_MODE = process.env.PAYMENT_MODE;

afterEach(() => {
  if (OLD_PAYMENT_MODE === undefined) delete process.env.PAYMENT_MODE;
  else process.env.PAYMENT_MODE = OLD_PAYMENT_MODE;
});

function mockRes() {
  const res = {};
  res.json = jest.fn((body) => body);
  res.status = jest.fn(() => res);
  return res;
}

describe('payment mode (backend source of truth)', () => {
  test('defaults to live when PAYMENT_MODE is unset', () => {
    delete process.env.PAYMENT_MODE;
    expect(getPaymentMode()).toBe('live');
    expect(isTestPaymentMode()).toBe(false);
  });

  test('test mode activates only on PAYMENT_MODE=test', () => {
    process.env.PAYMENT_MODE = 'test';
    expect(getPaymentMode()).toBe('test');
    expect(isTestPaymentMode()).toBe(true);
  });

  test('live mode stays live', () => {
    process.env.PAYMENT_MODE = 'live';
    expect(getPaymentMode()).toBe('live');
    expect(isTestPaymentMode()).toBe(false);
  });

  test('unknown values fall back to live (safe default)', () => {
    process.env.PAYMENT_MODE = 'demo';
    expect(getPaymentMode()).toBe('live');
    expect(isTestPaymentMode()).toBe(false);
  });
});

describe('test scenario validation', () => {
  test('supports exactly the five required scenarios', () => {
    expect([...TEST_SCENARIOS].sort()).toEqual(
      ['cancelled', 'failure', 'pending', 'success', 'timeout'].sort(),
    );
  });

  test.each(['success', 'failure', 'pending', 'cancelled', 'timeout'])(
    'accepts scenario "%s"',
    (s) => expect(normalizeScenario(s)).toBe(s),
  );

  test('normalises case and whitespace', () => {
    expect(normalizeScenario('SUCCESS')).toBe('success');
    expect(normalizeScenario(' Pending ')).toBe('pending');
  });

  test('rejects invalid scenarios with 400', () => {
    expect.assertions(2);
    try {
      normalizeScenario('bogus');
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.message).toMatch(/Invalid test scenario/);
    }
  });

  test('builds synthetic STK ids (never real Daraja ids)', () => {
    const ids = buildTestStkIds();
    expect(ids.checkoutRequestId).toMatch(/^TESTWS_/);
    expect(ids.merchantRequestId).toMatch(/^TESTM_/);
  });
});

describe('test payment endpoints', () => {
  test('GET mode reports backend mode without secrets', async () => {
    process.env.PAYMENT_MODE = 'live';
    const res = mockRes();
    await getPaymentModeStatus({}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'live', testMode: false }),
    );
    const body = res.json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toMatch(/SECRET|PASSKEY|TOKEN/i);
  });

  test('POST /api/mpesa/test is disabled in live mode (403)', async () => {
    process.env.PAYMENT_MODE = 'live';
    const next = jest.fn();
    await simulateTestPayment(
      { body: { status: 'success', paymentId: '507f1f77bcf86cd799439011' }, user: { _id: 'u1' } },
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/Test payment mode is disabled/);
  });

  test('POST /api/payment/test rejects invalid scenario with 400 in test mode', async () => {
    process.env.PAYMENT_MODE = 'test';
    const next = jest.fn();
    await simulateTestPayment(
      { body: { status: 'bogus', paymentId: '507f1f77bcf86cd799439011' }, user: { _id: 'u1' } },
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  test('POST test endpoint requires a payment identifier (400)', async () => {
    process.env.PAYMENT_MODE = 'test';
    const next = jest.fn();
    await simulateTestPayment(
      { body: { status: 'success' }, user: { _id: 'u1' } },
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  test('mode never comes from request params/body', async () => {
    process.env.PAYMENT_MODE = 'live';
    const next = jest.fn();
    await simulateTestPayment(
      // An attacker-style body trying to force test mode must NOT work.
      { body: { status: 'success', paymentId: 'x', mode: 'test', PAYMENT_MODE: 'test' }, user: { _id: 'u1' } },
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});

describe('test payment ownership (no DB required)', () => {
  const svc = new TestPaymentService();

  test('matching owner passes', () => {
    expect(() => svc._assertOwnership({ _id: 'p1', user: 'u1' }, 'u1')).not.toThrow();
  });

  test('guest payment (no owner) passes for any caller', () => {
    expect(() => svc._assertOwnership({ _id: 'p1', user: null }, 'u2')).not.toThrow();
  });

  test('mismatched owner is rejected with 403 + recovery hint', () => {
    expect.assertions(3);
    try {
      svc._assertOwnership({ _id: 'p1', user: 'user-A' }, 'user-B');
    } catch (err) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toMatch(/does not belong to this user/);
      expect(err.message).toMatch(/fresh test payment/);
    }
  });
});
