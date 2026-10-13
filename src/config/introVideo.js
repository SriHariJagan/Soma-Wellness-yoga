// ─────────────────────────────────────────────────────────
// introVideo.js — single source of truth for the site intro video.
// All players read this config — swap sources/behaviour without
// touching components. The original upload is preserved untouched at
// media-original/Landing page video.mov (outside the web root so it
// is never deployed); the web-optimized H.264 +faststart derivative
// in /videos/ is referenced by URL string so it is NEVER bundled
// into the JS or preloaded up front.
// ─────────────────────────────────────────────────────────
export const INTRO_VIDEO = {
  enabled: true,
  // Optimized derivative (FFmpeg: libx264 CRF 20, preset slow,
  // yuv420p, AAC 128k, +faststart). Original .mov kept as-is.
  src: "/videos/soma-intro-1080p.mp4",
  poster: "/videos/soma-intro-poster.jpg",
  title: "Welcome to Soma Wellness",
  caption: "Movement · Restoration · Mindfulness — Spring Valley, Nairobi",
  // Repeat behaviour: "session" shows the intro at most once per tab
  // session; a seen/closed/completed intro never reappears on route
  // transitions. Set to "always" to show on every fresh home visit.
  repeat: "session",
  sessionKey: "soma_intro_seen_v1",
  // Full-screen intro opens on this route only (landing).
  homePath: "/",
  // Muted autoplay is the only universally allowed autoplay; the
  // player starts muted and offers one-tap unmute + a Play fallback
  // when autoplay is blocked.
  autoplayMuted: true,
};

export function hasSeenIntro(key = INTRO_VIDEO.sessionKey) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(key = INTRO_VIDEO.sessionKey) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* private mode — session-only memory still prevents re-showing */
  }
}
