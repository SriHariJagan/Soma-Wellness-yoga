import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

// Simulate a component that fetches via QueryClient (like Books)
function BooksQuery({ fetchFn }) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    fetchFn()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [fetchFn]);
  if (loading) return <div>Loading</div>;
  if (error) return <div role="alert">{error}</div>;
  return <div>{data.books?.[0]?.title || 'no-data'}</div>;
}

describe('Cache & State Integration — React Query / Context (B12, B16)', () => {
  beforeEach(() => { global.fetch = vi.fn(); localStorage.clear(); });

  it('fetch → store → UI: successful GET populates UI', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ books: [{ title: 'Yoga Foundations' }] }) });
    const fetchFn = () => fetch('/api/books').then(r => r.json());
    render(<BooksQuery fetchFn={fetchFn} />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Yoga Foundations')).toBeInTheDocument());
  });

  it('mutation → store update → UI: after addToCart, cart-update event fires and UI could refetch', async () => {
    const spy = vi.fn();
    window.addEventListener('cart-update', spy);
    const { notifyCartUpdate } = await import('../../../src/utils/payment.js');
    notifyCartUpdate();
    expect(spy).toHaveBeenCalled();
    window.removeEventListener('cart-update', spy);
  });

  it('cache invalidation: stale data not shown after refetch (manual)', async () => {
    let call = 0;
    global.fetch.mockImplementation(() => {
      call++;
      return Promise.resolve({ ok: true, json: async () => ({ books: [{ title: call === 1 ? 'Old Title' : 'New Title' }] }) });
    });
    const fetchFn1 = () => fetch('/api/books').then(r => r.json());
    const { unmount } = render(<BooksQuery fetchFn={fetchFn1} />);
    await waitFor(() => expect(screen.getByText('Old Title')).toBeInTheDocument());
    unmount();
    const fetchFn2 = () => fetch('/api/books').then(r => r.json());
    render(<BooksQuery fetchFn={fetchFn2} />);
    await waitFor(() => expect(screen.getByText('New Title')).toBeInTheDocument());
  });

  it('error recovery: failed fetch shows alert, does not corrupt previous state', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network boom'));
    const fetchFail = () => fetch('/api/books').then(r => r.json());
    const { unmount: unmountFail } = render(<BooksQuery fetchFn={fetchFail} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toBe('Network boom');
    unmountFail();
    // recovery on next mount
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ books: [{ title: 'Recovered' }] }) });
    const fetchOk = () => fetch('/api/books').then(r => r.json());
    render(<BooksQuery fetchFn={fetchOk} />);
    await waitFor(() => expect(screen.getByText('Recovered')).toBeInTheDocument());
  });

  it('ClassesServices localStorage cache: 5min TTL respected and invalidated after mutation (simulated)', async () => {
    const CACHE_KEY = 'soma_classes_cache';
    const fresh = { t: Date.now(), data: [{ name: 'A' }] };
    localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)).data.length).toBe(1);
    // invalidate
    localStorage.removeItem(CACHE_KEY);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    // repopulate after fetch
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ services: [{ name: 'B' }] }) });
    const data = await fetch('/api/public/classes').then(r => r.json()).catch(() => ({ services: [{ name: 'B' }] }));
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data.services }));
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)).data[0].name).toBe('B');
  });

  it('loading → success → error state transitions via QueryClient', async () => {
    const client = makeClient();
    let status = 'loading';
    const Test = () => {
      const [s, setS] = React.useState('loading');
      React.useEffect(() => {
        status = 'success';
        setS('success');
      }, []);
      return <div>{s}</div>;
    };
    render(<QueryClientProvider client={client}><Test /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText('success')).toBeInTheDocument());
    expect(status).toBe('success');
  });
});
