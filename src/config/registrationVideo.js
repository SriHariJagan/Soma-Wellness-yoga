// ─────────────────────────────────────────────────────────
// registrationVideo.js — single source of truth for the
// registration-experience video. Swap the DUMMY url/poster
// with the real Soma Wellness video later — no component
// changes required (all players read this config).
// Backend override (optional): Settings.soma.registrationVideo
// ─────────────────────────────────────────────────────────
export const REGISTRATION_VIDEO = {
  enabled: true,
  // Real Soma intro (optimized H.264, see src/config/introVideo.js).
  url: '/videos/soma-intro-1080p.mp4',
  poster: '/images/headers/classes-memberships.webp',
  title: 'Welcome to Soma Wellness',
  caption: 'Watch a 60-second introduction before you create your account.',
  autoplayMuted: false,
  skippable: true,
  // Placement flags consumed by AuthCard + checkout preview.
  // NOTE: removed from signup — inline video broke the premium
  // fit-to-viewport register layout. Keep checkout preview only.
  showInRegister: false,
  showInCheckoutPreview: true,
};

export function resolveRegistrationVideo(settingsVideo) {
  if (settingsVideo && typeof settingsVideo === 'object' && settingsVideo.url) {
    return { ...REGISTRATION_VIDEO, ...settingsVideo };
  }
  return REGISTRATION_VIDEO;
}
