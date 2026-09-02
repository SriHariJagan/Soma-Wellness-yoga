import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth, savePendingIntent, getPendingIntent, clearPendingIntent } from '../../../src/context/AuthContext.jsx';

function Probe() {
  const { user, isAuthenticated, isAdmin, isStudent } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'no-user'}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="isAdmin">{String(isAdmin)}</span>
      <span data-testid="isStudent">{String(isStudent)}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with no user when storage empty', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('user').textContent).toBe('no-user');
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });

  it('loads user from localStorage if valid', async () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Amina', role: 'student' }));
    localStorage.setItem('token', 'tok');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Amina'));
    expect(screen.getByTestId('isStudent').textContent).toBe('true');
  });

  it('ignores invalid JSON and clears storage', async () => {
    localStorage.setItem('user', '{bad json');
    localStorage.setItem('token', 'tok');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
  });

  it('ignores user without role', async () => {
    localStorage.setItem('user', JSON.stringify({ name: 'NoRole' }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
  });

  it('throws when useAuth outside provider', () => {
    function Bad() { useAuth(); return null; }
    expect(() => render(<Bad />)).toThrow(/must be used within AuthProvider/);
  });
});

describe('pending intent helpers', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('save + get + clear roundtrip', () => {
    savePendingIntent({ type: 'book', id: '123' });
    const got = getPendingIntent();
    expect(got.type).toBe('book');
    clearPendingIntent();
    expect(getPendingIntent()).toBeNull();
  });

  it('returns null after TTL expiry (30min)', () => {
    const old = { type: 'x', _ts: Date.now() - 31*60*1000 };
    localStorage.setItem('soma_pending_checkout', JSON.stringify(old));
    expect(getPendingIntent()).toBeNull();
    // should have cleared
    expect(localStorage.getItem('soma_pending_checkout')).toBeNull();
  });

  it('handles missing storage gracefully', () => {
    expect(getPendingIntent()).toBeNull();
    clearPendingIntent(); // no throw
  });
});
