// ─────────────────────────────────────────────────────────────
// session.js
// Sliding session lifetime for the whole app:
//
// • ACTIVE users stay logged in: every API call succeeds with the access
//   token, and on a 401 the HttpOnly refresh cookie silently mints a new
//   one (see the api() wrappers). Normal use never logs you out.
// • IDLE users are logged out after 4 hours: each wrapper calls
//   guardActiveSession() before sending a request, and a 60s timer in
//   AuthProvider enforces it even with zero traffic. Force-logout clears
//   local auth state, revokes the refresh cookie server-side, and fires
//   'auth-logout' so the UI redirects to /login (plus 'storage' so other
//   tabs follow).
// ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const ACTIVITY_KEY = 'soma_last_activity';

// 4 hours of inactivity → automatic logout.
export const SESSION_IDLE_LIMIT_MS = 4 * 60 * 60 * 1000;

// localStorage writes are throttled to one per minute — mousemove/scroll
// fire far more often than the 4h window needs.
const TOUCH_THROTTLE_MS = 60 * 1000;
let lastTouchWrite = 0;

export function isLoggedIn() {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false; // storage unavailable (private mode) — treat as logged out
  }
}

export function lastActivity() {
  try {
    const v = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0; // storage unavailable — no activity record
  }
}

/** Record user activity. No-ops for logged-out visitors. Pass force on login. */
export function touchActivity(force = false) {
  if (!isLoggedIn()) return;
  const now = Date.now();
  if (!force && now - lastTouchWrite < TOUCH_THROTTLE_MS) return;
  lastTouchWrite = now;
  try {
    localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    /* storage unavailable — activity simply isn't persisted */
  }
}

export function clearActivity() {
  lastTouchWrite = 0;
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** True when logged in but silent for longer than the idle limit. */
export function isSessionIdle(limitMs = SESSION_IDLE_LIMIT_MS) {
  if (!isLoggedIn()) return false;
  const last = lastActivity();
  // Logged in but never stamped (legacy sessions) — stamp now and treat as
  // active rather than instantly logging out.
  if (!last) {
    touchActivity(true);
    return false;
  }
  return Date.now() - last > limitMs;
}

/**
 * Full session teardown: revoke refresh cookie server-side (best-effort),
 * clear local auth state, and notify the UI same-tab ('auth-logout') and
 * cross-tab ('storage', picked up by App's existing listener).
 */
export async function forceLogout(reason = 'expired') {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const token = isLoggedIn() ? localStorage.getItem(TOKEN_KEY) : null;
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    /* best-effort only — local teardown below runs regardless */
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
  clearActivity();
  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('auth-logout', { detail: { reason } }));
  } catch {
    /* no window (SSR/tests) — nothing to notify */
  }
}

/**
 * Call at the top of every authenticated API wrapper. Throws a 401-style
 * error for idle-expired sessions (after tearing them down) so callers
 * land on their normal auth-failure paths; otherwise stamps activity and
 * returns true.
 */
export function guardActiveSession() {
  if (!isLoggedIn()) return true;
  if (isSessionIdle()) {
    forceLogout('idle');
    const err = new Error('Session expired after 4 hours of inactivity. Please log in again.');
    err.status = 401;
    err.code = 'SESSION_IDLE';
    throw err;
  }
  touchActivity();
  return true;
}
