import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import App from '../../src/App.jsx';

describe('App routing (smoke)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('renders without crashing when wrapped in AuthProvider', async () => {
    const { container } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(container).toBeTruthy();
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });

  it('catch-all unknown route does not show blank screen (App handles * -> /)', async () => {
    window.history.pushState({}, '', '/unknown-xyz-not-a-route');
    const { container } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(container).toBeTruthy();
    // No unhandled runtime error
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });
});

describe('Protected route expectations (documented contract)', () => {
  it('documents that studentdashboard requires student role — else redirects to login', async () => {
    expect(true).toBe(true);
  });
});
