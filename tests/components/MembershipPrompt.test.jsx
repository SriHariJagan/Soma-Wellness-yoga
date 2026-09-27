import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

import MembershipPrompt from '../../src/components/soma/MembershipPrompt.jsx';

function renderPopup(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="*" element={<MembershipPrompt />} /></Routes>
    </MemoryRouter>
  );
}

describe('MembershipPrompt visibility (debug)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/wellness-circle')) {
        return Promise.resolve({ ok: true, json: async () => ({ price: 36500 }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens for a logged-out visitor after delay', async () => {
    renderPopup('/');
    await act(async () => { await Promise.resolve(); });
    // advance past the 9s initial delay (async so timers + promises flush)
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).not.toBeNull();
  });

  it('stays hidden for active members', async () => {    localStorage.setItem('token', 'fake');
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/membership/circle')) {
        return Promise.resolve({ ok: true, json: async () => ({ active: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ price: 36500 }) });
    });
    renderPopup('/');
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(30000); });
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('forcePopup=1 bypasses the once-per-day cap', async () => {
    localStorage.setItem('soma-popup-last-shown', new Date().toISOString().slice(0, 10));
    renderPopup('/?forcePopup=1');
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).not.toBeNull();
  });
});
