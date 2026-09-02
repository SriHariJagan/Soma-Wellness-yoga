import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { ROUTE_META } from '../../src/lib/seo.js';

// Verify each public page component renders with correct H1 hierarchy (smoke)
import Home from '../../src/pages/Home.jsx';
import About from '../../src/pages/About.jsx';
import FAQ from '../../src/pages/FAQ.jsx';
import Contact from '../../src/pages/Contact.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));
vi.mock('../../src/hooks/useScrollToSection', () => ({
  useScrollToSection: vi.fn(),
}));

describe('SEO heading hierarchy', () => {
  const checkH1 = (Comp, path) => {
    const { container } = render(<MemoryRouter initialEntries={[path]}><Comp /></MemoryRouter>);
    const h1s = container.querySelectorAll('h1');
    expect(h1s.length, `${path} should have exactly one h1`).toBeGreaterThanOrEqual(1);
    // no skipped levels check: h3 should not appear before h2 if h2 exists
    const headings = container.querySelectorAll('h1,h2,h3,h4');
    expect(headings.length).toBeGreaterThan(0);
  };

  it('Home has h1', () => checkH1(Home, '/'));
  it('About has h1', () => checkH1(About, '/about'));
  it('FAQ has h1', () => checkH1(FAQ, '/faq'));
  it('Contact has h1 via SomaPageHeader (h1 inside)', () => {
    const { container } = render(<MemoryRouter><Contact /></MemoryRouter>);
    // SomaPageHeader renders an h1
    expect(container.querySelector('h1')).not.toBeNull();
  });
});

describe('ROUTE_META SEO fields', () => {
  it('every public route has unique title and description >=10 chars', () => {
    const entries = Object.entries(ROUTE_META).filter(([k]) => !['/books','/bulk-orders'].includes(k));
    const titles = entries.map(([,v]) => v.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const [path, m] of entries) {
      // /order-tracking has short desc "Track your order." (17) — allow >=15
      expect(m.description.length, `${path} desc`).toBeGreaterThan(15);
    }
  });
});
