import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SESSION_IDLE_LIMIT_MS,
  touchActivity,
  clearActivity,
  isSessionIdle,
  guardActiveSession,
  forceLogout,
} from '../../../src/lib/session.js';

const FOUR_H = 4 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  clearActivity();
  vi.unstubAllGlobals();
});

describe('session inactivity rules', () => {
  it('uses a 4h idle limit', () => {
    expect(SESSION_IDLE_LIMIT_MS).toBe(FOUR_H);
  });

  it('logged-out visitors are never idle and guards pass through', () => {
    expect(isSessionIdle()).toBe(false);
    expect(guardActiveSession()).toBe(true);
  });

  it('fresh activity counts as active', () => {
    localStorage.setItem('token', 't');
    touchActivity(true);
    expect(isSessionIdle()).toBe(false);
    expect(guardActiveSession()).toBe(true);
  });

  it('stale activity counts as idle', () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('soma_last_activity', String(Date.now() - FOUR_H - 1000));
    expect(isSessionIdle()).toBe(true);
  });

  it('guard tears down idle sessions and throws a 401', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ role: 'student' }));
    localStorage.setItem('soma_last_activity', String(Date.now() - FOUR_H - 1000));
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    let err = null;
    try {
      guardActiveSession();
    } catch (e) {
      err = e;
    }
    expect(err?.status).toBe(401);
    expect(err?.code).toBe('SESSION_IDLE');
    // teardown runs async — allow it to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('forceLogout clears auth state', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ role: 'student' }));
    localStorage.setItem('soma_last_activity', String(Date.now()));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    await forceLogout('expired');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('soma_last_activity')).toBeNull();
  });
});
