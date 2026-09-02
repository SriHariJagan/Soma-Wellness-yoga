import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLocalizedMeta, ROUTE_META, applyMeta, SITE, PATH_TO_SEO_KEY } from '../../../src/lib/seo.js';

// jsdom provides document; ensure clean head for each test
function resetHead() {
  document.head.innerHTML = `
    <title>initial</title>
    <meta name="description" content="initial desc" />
    <link rel="canonical" href="https://example.com/" />
    <meta property="og:title" content="initial" />
    <meta property="og:description" content="initial" />
    <meta property="og:url" content="https://example.com/" />
    <meta property="og:locale" content="en_KE" />
    <meta name="twitter:title" content="initial" />
    <meta name="twitter:description" content="initial" />
  `;
  document.documentElement.lang = 'en';
  // mock location
  delete window.location;
  window.location = new URL('https://somawellness.co.ke/about');
  // ensure pathname is /about by default
}

describe('ROUTE_META', () => {
  it('has required routes with title+description', () => {
    const required = ['/', '/about', '/classes', '/private', '/life-stages', '/restore', '/yttc', '/faq', '/contact'];
    for (const p of required) {
      expect(ROUTE_META[p]).toBeDefined();
      expect(ROUTE_META[p].title).toBeTruthy();
      expect(ROUTE_META[p].description).toBeTruthy();
    }
  });

  it('titles are unique per public page', () => {
    const titles = Object.entries(ROUTE_META).filter(([k]) => !['/books','/bulk-orders'].includes(k)).map(([,v]) => v.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('descriptions are not empty and not too short', () => {
    for (const [, meta] of Object.entries(ROUTE_META)) {
      expect(meta.description.length).toBeGreaterThan(10);
    }
  });
});

describe('getLocalizedMeta', () => {
  it('returns localized when t provides key', () => {
    const t = (key, opts) => key === 'seo.aboutTitle' ? 'About Localized' : key === 'seo.aboutDesc' ? 'About Desc L' : opts.defaultValue;
    const m = getLocalizedMeta('/about', t);
    expect(m.title).toBe('About Localized');
  });

  it('falls back to ROUTE_META when t returns key itself (missing)', () => {
    const t = (key, opts) => opts.defaultValue; // i18n returns defaultValue when missing, but getLocalizedMeta checks title !== key
    // Simulate t returning fallback default
    const t2 = (key, opts) => key; // returns key literal, triggers fallback path
    const m = getLocalizedMeta('/about', t2);
    expect(m.title).toBe(ROUTE_META['/about'].title);
  });

  it('falls back to / for unknown path', () => {
    const t = vi.fn((k, o) => o.defaultValue);
    expect(getLocalizedMeta('/unknown-xyz', t).title).toBe(ROUTE_META['/'].title);
  });

  it('returns ROUTE_META when t is falsy', () => {
    expect(getLocalizedMeta('/contact', null).title).toBe(ROUTE_META['/contact'].title);
  });

  it('PATH_TO_SEO_KEY mapping complete for core pages', () => {
    expect(PATH_TO_SEO_KEY['/']).toBe('home');
    expect(PATH_TO_SEO_KEY['/classes']).toBe('join');
  });
});

describe('applyMeta', () => {
  beforeEach(() => resetHead());

  it('sets document.title', () => {
    applyMeta({ title: 'New Title — Test', description: 'New desc for SEO' });
    expect(document.title).toBe('New Title — Test');
  });

  it('updates meta description', () => {
    applyMeta({ title: 'T', description: 'My description' });
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe('My description');
  });

  it('updates OG/Twitter tags', () => {
    applyMeta({ title: 'T2', description: 'D2' });
    expect(document.querySelector('meta[property="og:title"]').getAttribute('content')).toBe('T2');
    expect(document.querySelector('meta[property="og:description"]').getAttribute('content')).toBe('D2');
    expect(document.querySelector('meta[property="twitter:title"]').getAttribute('content')).toBe('T2');
  });

  it('creates canonical and hreflang links if missing', () => {
    document.head.innerHTML = ''; // clean
    document.documentElement.lang = 'en';
    window.location = new URL('https://somawellness.co.ke/classes');
    applyMeta({ title: 'X', description: 'Y' });
    const can = document.querySelector('link[rel="canonical"]');
    expect(can).not.toBeNull();
    expect(can.getAttribute('href')).toContain('/classes');
    expect(document.querySelector('link[hreflang="en"]')).not.toBeNull();
    expect(document.querySelector('link[hreflang="sw"]')).not.toBeNull();
    expect(document.querySelector('link[hreflang="x-default"]')).not.toBeNull();
  });

  it('sets og:locale based on html lang', () => {
    document.documentElement.lang = 'sw';
    applyMeta({ title: 'T', description: 'D' });
    expect(document.querySelector('meta[property="og:locale"]').getAttribute('content')).toBe('sw_KE');
    document.documentElement.lang = 'en';
    applyMeta({ title: 'T', description: 'D' });
    expect(document.querySelector('meta[property="og:locale"]').getAttribute('content')).toBe('en_KE');
  });

  it('is idempotent: calling twice does not duplicate tags', () => {
    applyMeta({ title: 'A', description: 'B' });
    applyMeta({ title: 'A', description: 'B' });
    expect(document.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });

  it('SITE has url and image', () => {
    expect(SITE.url).toMatch(/^https:\/\//);
    expect(SITE.image).toMatch(/^https:\/\//);
  });
});
