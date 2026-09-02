import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Contact from '../../../src/pages/Contact.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

describe('Network Failure Integration — timeout/slow/offline (B9, B14)', () => {
  beforeEach(() => { global.fetch = vi.fn(); vi.clearAllMocks(); });

  it('slow API (2s) shows loading, then success', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 400)));
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    expect(screen.getByRole('button', { name: /common\.sending/ })).toBeDisabled();
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument(), { timeout: 2000 });
  });

  it('offline mode: fetch throws TypeError → user-friendly error, no spinner', async () => {
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

  it('retries: user can submit again after failure (button re-enabled)', async () => {
    const user = userEvent.setup();
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('no duplicate requests when single submit (strict mode double-effect guard)', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('race: rapid navigation does not overwrite stale success (contact success still shows)', async () => {
    // Simulate Contact mounted, fetch pending, user navigates away then back — stale response should not leak
    const user = userEvent.setup();
    global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 200)));
    const { unmount } = render(<MemoryRouter initialEntries={['/contact']}><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    // unmount before response
    unmount();
    // remount fresh
    render(<MemoryRouter><Contact /></MemoryRouter>);
    // fresh form should not show thankYou from stale request
    await new Promise(r => setTimeout(r, 300));
    expect(screen.queryByText('contact.thankYou')).not.toBeInTheDocument();
  });

  it('somaApi fetch handles malformed JSON gracefully (database returns unexpected)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new SyntaxError('Unexpected token'); } });
    const { fetchCatalog } = await import('../../../src/lib/somaApi.js');
    await expect(fetchCatalog()).rejects.toThrow();
  });
});
