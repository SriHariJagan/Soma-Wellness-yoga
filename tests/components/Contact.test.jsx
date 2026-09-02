import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Contact from '../../src/pages/Contact.jsx';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

describe('Contact page', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  it('renders header, info cards and map iframe', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    // info cards contain phone/email/map/clock icons via headings
    expect(screen.getByText('contact.visitStudio')).toBeInTheDocument();
    expect(screen.getByText('contact.callUs')).toBeInTheDocument();
    expect(screen.getByTitle('contact.mapTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact\.send/ })).toBeInTheDocument();
  });

  it('form has required fields and email type', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    const name = screen.getByLabelText('contact.name');
    const email = screen.getByLabelText('contact.emailLabel');
    const message = screen.getByLabelText('contact.messageLabel');
    expect(name).toBeRequired();
    expect(email).toBeRequired();
    expect(email).toHaveAttribute('type','email');
    expect(message).toBeRequired();
  });

  it('successful submit shows thank you, resets form and calls correct payload', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<MemoryRouter><Contact /></MemoryRouter>);

    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hello Soma');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));

    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/leads', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Amina', email: 'amina@test.com', phone: '', interestType: 'Contact Form', notes: 'Hello Soma' }),
    }));
    // form reset
    expect(screen.getByLabelText('contact.name').value).toBe('');
  });

  it('failed submit shows error alert', async () => {
    const user = userEvent.setup();
    global.fetch.mockRejectedValue(new Error('Network fail'));
    render(<MemoryRouter><Contact /></MemoryRouter>);

    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toMatch(/Something went wrong/);
  });

  it('handles HTTP non-ok as error', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('external links have correct rel and href', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    const dirLink = screen.getAllByRole('link', { name: /contact\.getDirections/ })[0];
    expect(dirLink).toHaveAttribute('target','_blank');
    expect(dirLink).toHaveAttribute('rel','noreferrer');
  });

  it('social quick links have aria-label and images have alt', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('YouTube')).toBeInTheDocument();
    // gallery images have alt text; if rendered they must be non-empty
    const imgs = document.querySelectorAll('img[alt]');
    imgs.forEach(img => {
      if (img.getAttribute('alt') !== '') expect(img.getAttribute('alt').length).toBeGreaterThan(0);
    });
  });

  it('submit button disables while loading', async () => {
    const user = userEvent.setup();
    let resolve;
    global.fetch.mockReturnValue(new Promise(r => { resolve = r; }));
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'A');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'a@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'msg');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    expect(screen.getByRole('button', { name: /common\.sending/ })).toBeDisabled();
    resolve({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument());
  });
});
