// ─────────────────────────────────────────────────────────
// registrationVideo.js — single source of truth for the
// registration-experience video. Swap the DUMMY url/poster
// with the real Soma Wellness video later — no component
// changes required (all players read this config).
// Backend override (optional): Settings.soma.registrationVideo
// ─────────────────────────────────────────────────────────
export const REGISTRATION_VIDEO = {
  enabled: true,
  // DUMMY placeholder — replace with the real Soma video URL.
  url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  poster: '/images/headers/classes-memberships.webp',
  title: 'Welcome to Soma Wellness',
  caption: 'Watch a 60-second introduction before you create your account.',
  autoplayMuted: false,
  skippable: true,
  // Placement flags consumed by AuthCard + checkout preview.
  showInRegister: true,
  showInCheckoutPreview: true,
};

export function resolveRegistrationVideo(settingsVideo) {
  if (settingsVideo && typeof settingsVideo === 'object' && settingsVideo.url) {
    return { ...REGISTRATION_VIDEO, ...settingsVideo };
  }
  return REGISTRATION_VIDEO;
}
