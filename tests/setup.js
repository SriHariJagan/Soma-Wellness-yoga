import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
// Mock window.matchMedia (used by motion/reveal)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
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

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn();
window.scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch if not present (jsdom has no fetch in older, but Node 20 does)
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Suppress console.error for act warnings in test output (optional, keep warnings visible for real errors)
// Keep original for debugging failing tests
const originalError = console.error;
console.error = (...args) => {
  const msg = String(args[0] || '');
  if (msg.includes('act(') || msg.includes('Not implemented: navigation')) return;
  originalError(...args);
};
}
if (typeof global !== 'undefined' && !global.fetch) {
  global.fetch = vi.fn();
}
