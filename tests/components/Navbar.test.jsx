import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import Navbar from '../../src/components/Navbar/Navbar.jsx';

vi.mock('../../src/components/api/StudentServices', () => ({
  getMembershipStatus: vi.fn().mockResolvedValue({ planActive: true, isPaused: false }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

function renderNavbar({ user = null, path = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="*" element={<Navbar user={user} onLogout={vi.fn()} />} /></Routes>
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('renders logo with accessible name', () => {
    renderNavbar();
    expect(screen.getByLabelText(/SomaWellness — Home/i)).toBeInTheDocument();
  });

  it('renders nav links', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    for (const href of ['/classes', '/private', '/life-stages', '/restore', '/yttc', '/founding', '/contact']) {
      expect(hrefs).toContain(href);
    }
    // drawer holds the same sections
    await user.click(screen.getByLabelText('Toggle menu'));
    for (const href of ['/classes', '/private', '/life-stages', '/restore', '/yttc', '/founding', '/contact']) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it('shows Sign In when not authed', () => {
    renderNavbar({ user: null });
    expect(screen.getByRole('link', { name: /navigation\.signIn/i })).toBeInTheDocument();
  });

  it('shows user cluster with initials when authed', () => {
    renderNavbar({ user: { name: 'Amina Kapoor', role: 'student' } });
    // initials AK
    expect(screen.getByText('AK')).toBeInTheDocument();
    expect(screen.getByText('Amina Kapoor')).toBeInTheDocument();
  });

  it('hamburger toggles drawer and overlay', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const btn = screen.getByLabelText('Toggle menu');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    // drawer should appear with nav links
    expect(screen.getAllByText('navigation.join').length).toBeGreaterThan(0);
    // close via button
    await user.click(screen.getByLabelText('Close menu'));
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('user dropdown opens on avatar click and shows dashboard/profile', async () => {
    const user = userEvent.setup();
    renderNavbar({ user: { name: 'John Doe', role: 'student' } });
    const btns = screen.getAllByRole('button');
    const target = btns.find(b => b.textContent.includes('JD'));
    expect(target).toBeTruthy();
    await user.click(target);
    expect(screen.getByText('navigation.dashboard')).toBeInTheDocument();
    expect(screen.getByText('navigation.profile')).toBeInTheDocument();
  });

  it('applies active class on current route', () => {
    renderNavbar({ path: '/classes' });
    const activeLink = screen.getAllByRole('link').find(a => a.getAttribute('href') === '/classes');
    expect(activeLink.className).toMatch(/active/);
  });

  it('social links have aria-label and external attributes behavior via drawer', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByLabelText('Toggle menu'));
    const socialLabels = ['Facebook','Instagram','YouTube','Twitter/X'];
    for (const label of socialLabels) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
      expect(screen.getByLabelText(label).getAttribute('target')).toBe('_blank');
    }
  });
});
