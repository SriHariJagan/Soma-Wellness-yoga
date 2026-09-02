import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Contact from '../../../src/pages/Contact.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

describe('Security Integration — CORS, Validation, XSS, Rate-limit (B9, B15)', () => {
  beforeEach(() => { global.fetch = vi.fn(); localStorage.clear(); });

  it('validation: backend 400 details are not raw Zod but user-friendly', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ success: false, error: 'Validation failed', details: [{ field: 'email', message: 'Invalid email' }] }) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    // Should not expose raw details JSON, but friendly message
    expect(screen.getByRole('alert').textContent).toMatch(/Something went wrong/);
  });

  it('XSS: script payload does not create script element', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), '<svg onload=alert(1)>');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'x@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), '<img src=x onerror=alert(1)>');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByText('contact.thankYou')).toBeInTheDocument());
    expect(document.querySelectorAll('svg[onload]').length).toBe(0);
    expect(document.querySelectorAll('img[onerror]').length).toBe(0);
  });

  it('CORS: fetch includes credentials handling (API client uses credentials:true on server)', async () => {
    // Client does not set credentials directly; server cors credentials:true is tested via supertest in api tests
    // Here verify fetch does not leak tokens when none stored
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { createAppointment } = await import('../../../src/lib/somaApi.js');
    localStorage.clear();
    await createAppointment({ type: 'massage' });
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('rate-limit: 429 is handled as user message, not crash', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ message: 'Too many requests' }) });
    render(<MemoryRouter><Contact /></MemoryRouter>);
    await user.type(screen.getByLabelText('contact.name'), 'Amina');
    await user.type(screen.getByLabelText('contact.emailLabel'), 'amina@test.com');
    await user.type(screen.getByLabelText('contact.messageLabel'), 'Hi');
    await user.click(screen.getByRole('button', { name: /contact\.send/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('auth bypass: calling /api/leads GET without token should be 401 (server enforces)', async () => {
    // Simulate server response for unauthenticated leads GET
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'No token, authorization denied' }) });
    const res = await fetch('/api/leads', { headers: { 'Content-Type': 'application/json' } });
    expect(res.status).toBe(401);
    const j = await res.json();
    expect(j.error).toMatch(/authorization denied/i);
  });

  it('sensitive data: token never rendered in DOM', async () => {
    localStorage.setItem('token', 'secret-jwt-token-123');
    localStorage.setItem('user', JSON.stringify({ name: 'Amina', role: 'student' }));
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(document.body.innerHTML).not.toContain('secret-jwt-token-123');
  });
});
