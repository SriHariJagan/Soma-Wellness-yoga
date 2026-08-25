# Soma Wellness — Image Sources & Licenses

All external imagery sourced via Unsplash (Unsplash License — free to use for commercial purposes, no attribution required but credited where possible). Images are served via Unsplash CDN with optimization parameters (`q=80&w=...&auto=format&fit=crop`) and local WebP fallbacks where appropriate.

## Hero — Cinematic
- **File / Usage**: `soma-hero-yoga.webp` — Homepage hero, immersive section
- **Source**: https://images.unsplash.com/photo-1544367567-0f2fcb009e0b
- **Creator**: Unknown (Unsplash)
- **License**: Unsplash License
- **Local filename (CDN)**: served via CDN as `photo-1544367567-0f2fcb009e0b`
- **Dimensions**: 1920w hero, 1200w fallback
- **Optimization**: Compressed via Unsplash CDN, `loading="eager"` for LCP hero, `fetchpriority="high"`, explicit width/height, `decoding="async"`

## Intro / Philosophy
- **File**: `soma-intro-calm.webp` — Studio detail / soft light
- **Source**: https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7
- **License**: Unsplash License
- **Dimensions**: 900w
- **Optimization**: lazy, async decode

## Experiences Grid
- **01 Yoga**: https://images.unsplash.com/photo-1506126613408-eca07ce68773 (yoga silhouette, premium retreat)
- **02 Meditation**: https://images.unsplash.com/photo-1506905925346-21bda4d32df4 (stillness, mountain calm)
- **03 Breathwork**: https://images.unsplash.com/photo-1545389336-cf090694435e (breath / mindful movement)
- **04 Wellness**: https://images.unsplash.com/photo-1544367567-0f2fcb009e0b (restorative)
- **License**: Unsplash License each
- **Optimization**: lazy load, object-fit cover, transition scale on hover

## Journal
- **Practice**: https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7
- **Breath**: https://images.unsplash.com/photo-1528715471578-2e5b6c0bb37a
- **Ritual**: https://images.unsplash.com/photo-1518611012118-696072aa579a
- **License**: Unsplash License
- **Dimensions**: 800w cards

## About Page
- **About header**: https://images.unsplash.com/photo-1528715471578-2e5b6c0bb37a
- **Studio**: https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7
- **License**: Unsplash License

## Local / Existing Images Retained
- `public/images/soma/og-image.webp` — derived from `Home_about.webp` (copy, will be replaced with premium Soma OG)
- `public/images/soma/logo.webp` — placeholder (vector logo used via SomaLogo.jsx is canonical)
- All original `public/images/services/*` retained for backward compat but not used in primary Soma journey; should be phased out in favor of Soma-curated library.

## Optimization Notes
- Hero images preloaded only where LCP-critical; all others `loading="lazy"` + `decoding="async"` + explicit width/height to prevent CLS.
- CDN delivers WebP/AVIF automatically via `auto=format`.
- Target sizes: hero < 500KB, content 120-300KB, thumbnails < 120KB (via `w` param).
- Responsive variants via `w` param (800, 1200, 1920) — `srcset` can be added per image for finer control.
- Alt text provided for all meaningful images; decorative images use `alt=""`.

## To Replace Before Production
- Commission a Soma-specific photoshoot (natural light, linen, wood, stone, water, authentic practice) to replace Unsplash placeholders with brand-owned imagery.
- Generate local AVIF/WebP variants via `sharp` for self-hosting (currently CDN-hosted for rapid iteration).
- Create `soma-hero-yoga-480/768/1024/1440/1920.webp` local variants + `<picture>` with srcset.
