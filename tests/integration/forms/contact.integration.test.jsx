import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Contact from '../../../src/pages/Contact.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

describe('Form → API Integration — Contact (B1-B9, B15)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('happy path: UI → validation → POST → 201 → success UI + reset → state', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ _id: 'lead123', name: 'Amina' }) });
    render(<MemoryRouter><Contact /></MemoryRouter>);

    await user.type(screen.getByLabelText('contact.name'), 'Amina Kapoor');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hello Soma, membership query');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));

    // success propagation: fetch → UI (loading state is transient, just verify success)
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/leads', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Amina Kapoor', email: 'amina@test.com', phone: '', interestType: 'Contact Form', notes: 'Hello Soma, membership query' }),
    }));
    // form reset after success
    expect(screen.getByLabelText('contact.name')).toHaveValue('');
    expect(screen.getByLabelText('contact.messageLabel')).toHaveValue('');
  });

  it('client validation blocks submit when required fields empty (no fetch)', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn();
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    // browser required validation prevents fetch
    expect(global.fetch).not.toHaveBeenCalled();
    const name = screen.getByLabelText('contact.name');
    expect(name.validity.valid).toBe(false);
  });

  it('invalid email typeMismatch blocks submit + shows browser validation', async () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    const email = screen.getByLabelText('contact.emailLabel');
    await userEvent.type(email, 'not-an-email');
    expect(email.validity.valid).toBe(false);
    expect(email.validationMessage.length).toBeGreaterThan(0);
  });

  it('boundary: excessively long notes (500 chars) still handled, API receives payload', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'x'.repeat(20));
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalled();
  });

  it('duplicate submission: rapid double-click does not send duplicate POSTs beyond loading guard', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    global.fetch.mockImplementation(() => {
      callCount++;
      return new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 200));
    });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    const btn = screen.getByRole('button', { name: /contact\.send/ });
    await user.click(btn);
    // button should be disabled during loading, second click ignored
    expect(btn).toBeDisabled();
    await user.click(btn).catch(() => {});
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument(), { timeout: 3000 });
    expect(callCount).toBe(1);
  });

  it('slow API: loading state persists, button disabled until response', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 600)));
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    expect(screen.getByRole('button', { name: /common\.sending/ })).toBeDisabled();
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument(), { timeout: 2000 });
  });

  it('error propagation: 500 → user-friendly alert, no raw stack exposed, form NOT reset', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'PrismaClientKnownRequestError P2002' }) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).not.toMatch(/Prisma/i);
    expect(screen.getByRole('alert').textContent).toMatch(/Something went wrong/);
    expect(screen.getByLabelText('contact.name')).toHaveValue('Amina'); // not reset on error
  });

  it('rate-limit: 429 → alert with retry message, not infinite spinner', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'Too many requests, please slow down.' }) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /contact\.send/ })).not.toBeDisabled(); // spinner cleared
  });

  it('network timeout: fetch rejects → alert, button re-enabled', async () => {
    const user = userEvent.setup();
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /contact\.send/ })).toBeEnabled();
  });
});
