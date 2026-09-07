import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import TestPaymentPanel from '../../src/components/Payment/TestPaymentPanel.jsx';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockFetch.mockReset();
});

const baseProps = { amount: 500, paymentId: 'pay_123', checkoutRequestId: 'TESTWS_ABC' };

describe('TestPaymentPanel (TEST MODE ONLY)', () => {
  it('displays a clear TEST MODE banner so it cannot be mistaken for real payment', () => {
    render(<TestPaymentPanel {...baseProps} />);
    expect(screen.getByTestId('test-payment-panel')).toBeInTheDocument();
    expect(screen.getByText('TEST MODE')).toBeInTheDocument();
    expect(screen.getByText(/no real m-pesa charge/i)).toBeInTheDocument();
  });

  it('shows the amount and all five simulation scenarios', () => {
    render(<TestPaymentPanel {...baseProps} />);
    expect(screen.getByText('KES 500')).toBeInTheDocument();
    for (const label of ['Simulate Success', 'Simulate Failure', 'Simulate Pending', 'Simulate Cancelled', 'Simulate Timeout']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('requires no phone number (unlike the live M-Pesa form)', () => {
    render(<TestPaymentPanel {...baseProps} />);
    expect(screen.queryByPlaceholderText(/712 345 678/i)).toBeNull();
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
  });

  it('success scenario POSTs status=success and calls onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, scenario: 'success', status: 'captured' }) });
    render(<TestPaymentPanel {...baseProps} onSuccess={onSuccess} />);
    await user.click(screen.getByRole('button', { name: 'Simulate Success' }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/mpesa/test'),
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ paymentId: 'pay_123', status: 'success' });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('failure scenario shows a message, stays retryable, and never calls onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: false, scenario: 'failure', status: 'failed', message: 'Test payment failed as simulated' }) });
    render(<TestPaymentPanel {...baseProps} onSuccess={onSuccess} onError={onError} />);
    await user.click(screen.getByRole('button', { name: 'Simulate Failure' }));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/test payment failed as simulated/i)).toBeInTheDocument();
    // Panel stays mounted so the tester can retry another scenario.
    expect(screen.getByRole('button', { name: 'Simulate Success' })).toBeInTheDocument();
  });

  it('surfaces backend errors (e.g. live-mode 403) as a message', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Test payment mode is disabled' }) });
    render(<TestPaymentPanel {...baseProps} />);
    await user.click(screen.getByRole('button', { name: 'Simulate Success' }));
    expect(await screen.findByText(/test payment mode is disabled/i)).toBeInTheDocument();
  });
});
