import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_USER = 'user';
const STORAGE_TOKEN = 'token';
const STORAGE_PENDING = 'soma_pending_checkout';

export function savePendingIntent(intent) {
  try {
    sessionStorage.setItem(STORAGE_PENDING, JSON.stringify({ ...intent, _ts: Date.now() }));
    localStorage.setItem(STORAGE_PENDING, JSON.stringify({ ...intent, _ts: Date.now() }));
  } catch {}
}

export function getPendingIntent() {
  try {
    const raw = sessionStorage.getItem(STORAGE_PENDING) || localStorage.getItem(STORAGE_PENDING);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // TTL 30 min
    if (parsed._ts && Date.now() - parsed._ts > 30 * 60 * 1000) {
      clearPendingIntent();
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function clearPendingIntent() {
  try {
    sessionStorage.removeItem(STORAGE_PENDING);
    localStorage.removeItem(STORAGE_PENDING);
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_USER);
    if (savedUser && savedUser !== 'undefined') {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.role) setUser(parsed);
      } catch {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_TOKEN);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, userPayload) => {
    if (token) localStorage.setItem(STORAGE_TOKEN, token);
    if (userPayload) localStorage.setItem(STORAGE_USER, JSON.stringify(userPayload));
    setUser(userPayload || null);
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_TOKEN);
    // best-effort server logout to clear refresh cookie
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({}),
      });
    } catch {}
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem('refreshToken');
    clearPendingIntent();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user && !!localStorage.getItem(STORAGE_TOKEN),
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    login,
    logout,
    savePendingIntent,
    getPendingIntent,
    clearPendingIntent,
  }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
