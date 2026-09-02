import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import Footer from '../../src/components/Footer/Footer.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (k === 'footer.copyright' ? `© ${opts?.year}` : k), i18n: { language: 'en' } }),
}));

describe('Footer', () => {
  it('renders logo with alt', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByAltText('Soma Wellness')).toBeInTheDocument();
  });

  it('renders explore links to all main pages', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    for (const href of ['/classes','/private','/life-stages','/restore','/yttc','/faq','/contact']) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it('social links have aria-label and target blank', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    for (const label of ['Facebook','Instagram','YouTube','Twitter/X']) {
      const el = screen.getByLabelText(label);
      expect(el).toHaveAttribute('target','_blank');
      expect(el).toHaveAttribute('rel','noreferrer');
    }
  });

  it('contact info present (address/email/phone)', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByText('hello@somawellness.co.ke')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+254 700 000 000' })).toHaveAttribute('href','tel:+254700000000');
  });

  it('newsletter form validates email required and shows Joined feedback', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Footer /></MemoryRouter>);
    const input = screen.getByPlaceholderText('footer.yourEmail');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('type','email');
    // empty submit should be blocked by required (no Joined)
    const form = input.closest('form');
    const btn = screen.getByRole('button', { name: /footer\.join|footer\.joined/i });
    expect(btn.textContent).toMatch(/footer\.join/);
    await user.type(input, 'qa@test.com');
    await user.click(btn);
    expect(screen.getByRole('button', { name: /footer\.joined/i })).toBeInTheDocument();
  });

  it('footer bottom has privacy/terms links and watermark hidden', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByText('footer.privacy')).toBeInTheDocument();
    expect(screen.getByText('footer.terms')).toBeInTheDocument();
    expect(document.querySelector('.footer-watermark')).toHaveAttribute('aria-hidden','true');
  });

  it('has landmark footer role', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(document.querySelector('footer.footer')).not.toBeNull();
  });
});
