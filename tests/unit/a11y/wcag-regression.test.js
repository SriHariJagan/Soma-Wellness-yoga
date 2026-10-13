import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

/**
 * Regression tests for two WCAG defects found during the full-application E2E
 * run (2026-10-11):
 *
 *  1. aria-allowed-attr (critical) — the testimonial carousel dots used
 *     aria-selected on a plain <button>, which is only valid for roles such as
 *     tab/option/row. Corrected to aria-current.
 *  2. color-contrast (serious) — .finePrint on /memberships used
 *     --soma-warm-gray (#6B7D74) at 11px, ~4.09:1 on the ivory surface, below
 *     the WCAG AA 4.5:1 threshold for small text.
 */
describe('WCAG regression — aria-allowed-attr (testimonial dots)', () => {
  const raw = read('src/components/soma/SomaTestimonials.jsx');
  // Strip block and line comments so explanatory prose about aria-selected
  // cannot be mistaken for an actual attribute in the markup.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('does not put aria-selected on the plain carousel dot buttons', () => {
    expect(raw).toMatch(/aria-selected/); // rationale is documented
    expect(src).not.toMatch(/aria-selected/);
  });

  it('exposes the active dot with aria-current instead', () => {
    expect(src).toMatch(/aria-current=\{idx === i\}/);
  });

  it('keeps an accessible name on each dot', () => {
    expect(src).toMatch(/aria-label=\{t\("home\.testimonials\.testimonialLabel"/);
  });
});

describe('WCAG regression — color-contrast (/memberships fine print)', () => {
  const css = read('src/pages/Memberships.module.css');

  const relLuminance = (hex) => {
    const c = hex.replace('#', '');
    const ch = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const contrast = (a, b) => {
    const [l1, l2] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  const tokens = read('src/styles/design-tokens.css');
  const tokenValue = (name) => {
    const m = tokens.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
    return m ? m[1] : null;
  };

  it('.finePrint no longer uses the failing --soma-warm-gray', () => {
    const block = css.match(/\.finePrint\s*\{([^}]*)\}/);
    expect(block).toBeTruthy();
    expect(block[1]).not.toMatch(/var\(--soma-warm-gray\)/);
  });

  it('the replacement colour meets WCAG AA (4.5:1) for 11px text on ivory', () => {
    const block = css.match(/\.finePrint\s*\{([^}]*)\}/)[1];
    const m = block.match(/color:\s*var\((--[\w-]+)\)/);
    expect(m).toBeTruthy();
    const fg = tokenValue(m[1].replace('--', ''));
    const bg = tokenValue('soma-ivory');
    expect(fg).toBeTruthy();
    expect(bg).toBeTruthy();
    const ratio = contrast(fg, bg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('documents the measured contrast regression', () => {
    expect(css).toMatch(/WCAG AA/);
  });
});