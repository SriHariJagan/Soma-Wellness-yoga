import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const initiatePesapalPayment = vi.fn();
const continuePesapalPayment = vi.fn();

vi.mock('../../src/components/api/PesapalServices', () => ({
  initiatePesapalPayment: (...a) => initiatePesapalPayment(...a),
  continuePesapalPayment: (...a) => continuePesapalPayment(...a),
  newIdempotencyKey: () => 'per_click_key_should_not_be_used',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

import PesapalCheckout from '../../src/components/Payment/PesapalCheckout.jsx';
import { INTENT_KEY_STORAGE } from '../../src/lib/paymentIntentKey.js';

const PASS_ITEMS = [{ itemType: 'membership', itemId: 'plan-1', quantity: 1 }];
const CUSTOMER = { email: 'test@example.com' };

function okRedirect(overrides = {}) {
  return {
    success: true,
    paymentId: 'pay_doc_1',
    merchantReference: 'PAY-ABC123',
    orderTrackingId: 'track-abc',
    redirectUrl: 'https://cybqa.pesapal.com/iframe?OrderTrackingId=track-abc',
    ...overrides,
  };
}

function sentKey(callIndex = 0) {
  return initiatePesapalPayment.mock.calls[callIndex][0].idempotencyKey;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  // jsdom refuses real navigation; capture the assignment instead.
  delete window.location;
  window.location = { href: '' };
});

describe('PesapalCheckout — DEF-006 duplicate-intent guards', () => {
  it('sends ONE stable idempotency key for a rapid double-click', async () => {
    const user = userEvent.setup();
    let resolveIt;
    initiatePesapalPayment.mockImplementation(
      () => new Promise((res) => { resolveIt = res; }),
    );

    render(<PesapalCheckout amount={50000} items={PASS_ITEMS} label="Circle" customer={CUSTOMER} />);
    const button = screen.getByRole('button');

    await user.dblClick(button);
    await user.click(button); // extra rapid click while in flight

    expect(initiatePesapalPayment).toHaveBeenCalledTimes(1);
    expect(sentKey()).toMatch(/^pay_/);
    expect(sentKey()).not.toBe('per_click_key_should_not_be_used');

    resolveIt(okRedirect());
    await waitFor(() => expect(window.location.href).toContain('pesapal.com'));
  });

  it('reuses the SAME key when the shopper retries after a failure', async () => {
    const user = userEvent.setup();
    initiatePesapalPayment
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(okRedirect());

    render(<PesapalCheckout amount={50000} items={PASS_ITEMS} label="Circle" customer={CUSTOMER} />);
    const button = screen.getByRole('button');

    await user.click(button);
    await screen.findByText('Network down');
    const firstKey = sentKey(0);

    await user.click(button);
    await waitFor(() => expect(window.location.href).toContain('pesapal.com'));

    expect(initiatePesapalPayment).toHaveBeenCalledTimes(2);
    expect(sentKey(1)).toBe(firstKey); // retry reuses the key
  });

  it('reuses the SAME key after a browser refresh (component remount)', async () => {
    const user = userEvent.setup();
    initiatePesapalPayment.mockRejectedValue(new Error('Network down'));

    const first = render(<PesapalCheckout amount={50000} items={PASS_ITEMS} label="Circle" customer={CUSTOMER} />);
    await user.click(screen.getByRole('button'));
    await screen.findByText('Network down');
    const keyBeforeRefresh = sentKey(0);

    first.unmount(); // simulate navigating away / refreshing

    render(<PesapalCheckout amount={50000} items={PASS_ITEMS} label="Circle" customer={CUSTOMER} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(initiatePesapalPayment).toHaveBeenCalledTimes(2));
    expect(sentKey(1)).toBe(keyBeforeRefresh);
  });

  it('clears the key once the attempt is handed to Pesapal', async () => {
    const user = userEvent.setup();
    initiatePesapalPayment.mockResolvedValue(okRedirect());

    render(<PesapalCheckout amount={50000} items={PASS_ITEMS} label="Circle" customer={CUSTOMER} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(window.location.href).toContain('pesapal.com'));

    expect(sessionStorage.getItem(INTENT_KEY_STORAGE)).toBeNull();
  });

  it('uses a different key for a different intended purchase', async () => {
    const user = userEvent.setup();
    initiatePesapalPayment.mockRejectedValue(new Error('Network down'));

    const { unmount } = render(<PesapalCheckout amount={50000} items={PASS_ITEMS} label="Circle" customer={CUSTOMER} />);
    await user.click(screen.getByRole('button'));
    await screen.findByText('Network down');
    const keyA = sentKey(0);
    unmount();

    render(<PesapalCheckout amount={90000} items={[{ itemType: 'membership', itemId: 'plan-2', quantity: 1 }]} label="Upgrade" customer={CUSTOMER} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(initiatePesapalPayment).toHaveBeenCalledTimes(2));
    expect(sentKey(1)).not.toBe(keyA);
  });

  it('continues an existing paymentId without minting a key', async () => {
    const user = userEvent.setup();
    continuePesapalPayment.mockResolvedValue(okRedirect());

    render(<PesapalCheckout amount={50000} paymentId="pay_doc_1" customer={CUSTOMER} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(window.location.href).toContain('pesapal.com'));

    expect(continuePesapalPayment).toHaveBeenCalledTimes(1);
    expect(initiatePesapalPayment).not.toHaveBeenCalled();
  });
});