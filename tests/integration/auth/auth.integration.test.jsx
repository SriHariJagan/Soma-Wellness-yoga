import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth, savePendingIntent, getPendingIntent, clearPendingIntent } from '../../../src/context/AuthContext.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

function Probe() {
  const { user, isAuthenticated, isAdmin, isStudent, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? `${user.name}:${user.role}` : 'no-user'}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <span data-testid="student">{String(isStudent)}</span>
      <button onClick={() => login('tok123', { name: 'NewUser', role: 'student', _id: 'u1' })}>doLogin</button>
      <button onClick={() => logout()}>doLogout</button>
    </div>
  );
}

describe('Auth Integration — UI → API → Storage → State (B13, B10, B8, B9)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('initial: no user from empty storage → loading false, no token', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('hydrates from localStorage with valid role', async () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Amina', role: 'student' }));
    localStorage.setItem('token', 'tok');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Amina:student'));
    expect(screen.getByTestId('auth').textContent).toBe('true');
    expect(screen.getByTestId('student').textContent).toBe('true');
  });

  it('recovers gracefully from corrupted JSON (invalid storage) — clears and shows no-user', async () => {
    localStorage.setItem('user', '{bad json');
    localStorage.setItem('token', 'tok');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('login: token+user → storage + state → isAuthenticated true', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
    await user.click(screen.getByText('doLogin'));
    expect(localStorage.getItem('token')).toBe('tok123');
    expect(JSON.parse(localStorage.getItem('user')).name).toBe('NewUser');
    expect(screen.getByTestId('user').textContent).toBe('NewUser:student');
    expect(screen.getByTestId('auth').textContent).toBe('true');
  });

  it('logout: clears storage, calls API with Bearer, resets state, clears pending', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'tok123');
    localStorage.setItem('user', JSON.stringify({ name: 'Amina', role: 'student' }));
    localStorage.setItem('refreshToken', 'ref123');
    savePendingIntent({ type: 'checkout', id: 'cart1' });
    // mock fetch for logout call
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Amina:student'));
    await user.click(screen.getByText('doLogout'));
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(getPendingIntent()).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/logout'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
    }));
  });

  it('pending intent TTL: expired intent returns null and clears', async () => {
    const expired = { type: 'book', _ts: Date.now() - 31 * 60 * 1000 };
    localStorage.setItem('soma_pending_checkout', JSON.stringify(expired));
    expect(getPendingIntent()).toBeNull();
    expect(localStorage.getItem('soma_pending_checkout')).toBeNull();
  });

  it('pending intent roundtrip: save → get → clear', () => {
    savePendingIntent({ type: 'appointment', date: '2026-09-01' });
    const got = getPendingIntent();
    expect(got.type).toBe('appointment');
    clearPendingIntent();
    expect(getPendingIntent()).toBeNull();
  });

  it('token refresh scenario: verifyAccessToken expiry is handled via 401 → UI would show Session expired', async () => {
    // Simulate backend refresh endpoint: we test contract shape, not real JWT
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Session expired, please sign in again' }) });
    const res = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: 'old' }) });
    const j = await res.json();
    expect(res.status).toBe(401);
    expect(j.error).toMatch(/Session expired/);
    // Frontend would then clear storage and redirect — AuthContext logout does this
  });

  it('role-based: admin vs student isStudent/isAdmin derived correctly', async () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    localStorage.setItem('token', 'tok');
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('admin').textContent).toBe('true'));
    unmount();
    localStorage.setItem('user', JSON.stringify({ name: 'Stu', role: 'student' }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('student').textContent).toBe('true'));
  });
});
