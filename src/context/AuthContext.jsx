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

  // Merge partial user fields (e.g. refreshed permissions) into context + storage.
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(partial || {}) };
      try {
        localStorage.setItem(STORAGE_USER, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Re-fetch the authoritative profile from the server so admin permission
  // changes become visible without forcing a logout/login.
  const refreshProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem(STORAGE_TOKEN);
      if (!token) return null;
      const API_URL = import.meta.env.VITE_API_URL || '';
      // Reception staff profile carries role + permissions; generic profile
      // works for every role (students get their dashboard object).
      const tryUrls = [
        `${API_URL}/api/reception/profile`,
        `${API_URL}/api/auth/profile`,
      ];
      for (const url of tryUrls) {
        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) continue;
          const data = await res.json();
          // /api/auth/profile for students returns a dashboard object —
          // only accept payloads that look like a user record.
          const candidate = data?.user || data;
          if (candidate && candidate.role) {
            updateUser({
              ...candidate,
              id: candidate.id || candidate._id || '',
            });
            return candidate;
          }
        } catch {
          /* try next URL */
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [updateUser]);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_TOKEN);
    // best-effort server logout to clear refresh cookie
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch {}
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    clearPendingIntent();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user && !!localStorage.getItem(STORAGE_TOKEN),
    isAdmin: user?.role === 'admin' || user?.role === 'manager',
    isManager: user?.role === 'manager',
    isReception: user?.role === 'reception',
    isStudent: user?.role === 'student',
    hasPermission: (perm) => {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'manager') return true;
      return (user.permissions || []).includes(perm);
    },
    hasAnyPermission: (...perms) => {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'manager') return true;
      return perms.some((p) => (user.permissions || []).includes(p));
    },
    hasAllPermissions: (...perms) => {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'manager') return true;
      return perms.every((p) => (user.permissions || []).includes(p));
    },
    login,
    logout,
    updateUser,
    refreshProfile,
    savePendingIntent,
    getPendingIntent,
    clearPendingIntent,
  }), [user, loading, login, logout, updateUser, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
