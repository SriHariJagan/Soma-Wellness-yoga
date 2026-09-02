import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Hero from '../../src/components/Hero/Hero.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

describe('Hero', () => {
  it('renders main heading and CTA linking to /classes', () => {
    render(<MemoryRouter><Hero /></MemoryRouter>);
    // heading is likely h1 with some translation key
    const heading = document.querySelector('h1');
    expect(heading).not.toBeNull();
    const cta = document.querySelector('a[href="/classes"]');
    expect(cta).not.toBeNull();
  });

  it('has accessible image alt or background', () => {
    render(<MemoryRouter><Hero /></MemoryRouter>);
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
      const alt = img.getAttribute('alt');
      // allow empty alt for decorative but require attribute present
      expect(img.hasAttribute('alt')).toBe(true);
    });
  });
});
