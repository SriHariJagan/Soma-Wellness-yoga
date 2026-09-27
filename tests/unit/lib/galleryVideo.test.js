import { describe, it, expect } from 'vitest';
import { GALLERY_CATEGORIES } from '../../../src/config/galleryCategories.js';
import { REGISTRATION_VIDEO, resolveRegistrationVideo } from '../../../src/config/registrationVideo.js';

describe('gallery categories (centralized)', () => {
  it('has the required studio categories', () => {
    for (const c of ['Studio', 'Yoga Classes', 'Workshops', 'Events', 'Retreats', 'Community', 'Trainers', 'Other']) {
      expect(GALLERY_CATEGORIES).toContain(c);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(GALLERY_CATEGORIES).size).toBe(GALLERY_CATEGORIES.length);
  });
});

describe('registration video config (single source of truth)', () => {
  it('is enabled with a replaceable dummy url', () => {
    expect(REGISTRATION_VIDEO.enabled).toBe(true);
    expect(REGISTRATION_VIDEO.url).toMatch(/^https?:\/\//);
    expect(REGISTRATION_VIDEO.poster).toBeTruthy();
  });

  it('backend override wins when provided', () => {
    const merged = resolveRegistrationVideo({ url: 'https://example.com/real.mp4' });
    expect(merged.url).toBe('https://example.com/real.mp4');
    expect(resolveRegistrationVideo(null).url).toBe(REGISTRATION_VIDEO.url);
  });

  it('never requires sound autoplay', () => {
    expect(REGISTRATION_VIDEO.autoplayMuted === true || !REGISTRATION_VIDEO.url).toBe(false);
  });
});
