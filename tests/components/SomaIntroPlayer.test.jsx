import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, fallback) => (fallback !== undefined ? fallback : k), i18n: { language: 'en' } }),
}));

import SomaIntroPlayer from '../../src/components/soma/SomaIntroPlayer.jsx';

function stubMedia({ playImpl } = {}) {
  window.HTMLMediaElement.prototype.play =
    playImpl || vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
}

describe('SomaIntroPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    // Re-install matchMedia (other suites' restoreAllMocks can wipe the
    // shared setup mock; keep this file self-sufficient).
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    stubMedia();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  async function openFullscreen() {
    render(<SomaIntroPlayer autoOpen />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('renders nothing until the page is interactive (lazy, non-blocking)', async () => {
    render(<SomaIntroPlayer autoOpen />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('video')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.queryByRole('dialog')).not.toBeNull();
  });

  it('assigns the video source lazily only when opening', async () => {
    render(<SomaIntroPlayer autoOpen />);
    expect(document.querySelector('video source')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    const src = document.querySelector('video source');
    expect(src).not.toBeNull();
    expect(src.getAttribute('src')).toBe('/videos/soma-intro-1080p.mp4');
  });

  it('never auto-opens when autoOpen is false (non-home routes)', async () => {
    render(<SomaIntroPlayer autoOpen={false} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows once per session: seen intro never reappears', async () => {
    sessionStorage.setItem('soma_intro_seen_v1', '1');
    render(<SomaIntroPlayer autoOpen />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('skip closes the player and marks the session seen', async () => {
    await openFullscreen();
    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionStorage.getItem('soma_intro_seen_v1')).toBe('1');
  });

  it('minimize keeps the SAME video element + timestamp, restore returns to dialog', async () => {
    await openFullscreen();
    const v1 = document.querySelector('video');
    expect(v1).not.toBeNull();
    v1.currentTime = 5.25;

    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const region = screen.getByRole('region');
    expect(region).not.toBeNull();
    const v2 = document.querySelector('video');
    expect(v2).toBe(v1);
    expect(v2.currentTime).toBe(5.25);

    fireEvent.click(screen.getByRole('button', { name: 'Back to full screen' }));
    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(document.querySelector('video')).toBe(v1);
  });

  it('Escape minimizes from fullscreen and closes from the floating player', async () => {
    await openFullscreen();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region')).toBeNull();
    expect(sessionStorage.getItem('soma_intro_seen_v1')).toBe('1');
  });

  it('mute toggle flips state with accessible labels', async () => {
    await openFullscreen();
    const unmute = screen.getByRole('button', { name: 'Unmute' });
    fireEvent.click(unmute);
    expect(screen.getByRole('button', { name: 'Mute' })).not.toBeNull();
  });

  it('shows a Play fallback when autoplay is blocked', async () => {
    stubMedia({ playImpl: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });
    render(<SomaIntroPlayer autoOpen />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Play' })).not.toBeNull();
  });

  it('shows an error card with retry/close when the video fails', async () => {
    await openFullscreen();
    const video = document.querySelector('video');
    await act(async () => {
      fireEvent.error(video);
    });
    expect(screen.getByRole('alert')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('completion marks the session seen and offers replay', async () => {
    await openFullscreen();
    const video = document.querySelector('video');
    await act(async () => {
      fireEvent.ended(video);
    });
    expect(sessionStorage.getItem('soma_intro_seen_v1')).toBe('1');
    expect(screen.getByRole('button', { name: 'Replay' })).not.toBeNull();
  });

  it('reduced motion renders an opt-in pill instead of auto-opening', async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    try {
      render(<SomaIntroPlayer autoOpen />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      const pill = screen.getByRole('button', { name: /Watch intro/ });
      expect(pill).not.toBeNull();
      fireEvent.click(pill);
      expect(screen.queryByRole('dialog')).not.toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it('seek bar scrubs the same video element', async () => {
    await openFullscreen();
    const video = document.querySelector('video');
    Object.defineProperty(video, 'duration', { value: 18, configurable: true });
    const seek = screen.getByRole('slider', { name: 'Seek' });
    fireEvent.change(seek, { target: { value: '500' } });
    expect(video.currentTime).toBeCloseTo(9, 1);
  });
});
