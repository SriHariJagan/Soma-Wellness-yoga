// ============================================================
// templates/engine/tokens.js
// SomaWellness Premium Glassy Design Tokens
// Single source of truth for brand colours, fonts, and spacing.
// ============================================================

export const STUDIO_NAME = 'SomaWellness';
export const STUDIO_TAGLINE = 'Premium International Wellness';

export const BRAND = {
  primary:         '#C8956C',
  primaryHover:    '#B8854F',
  primaryLight:    '#F5EDE4',
  primaryGlow:     'rgba(200, 149, 108, 0.15)',
  bg:              '#FAF7F2',
  bgGradient:      'linear-gradient(165deg, #FAF7F2 0%, #F0EBE3 50%, #E8E0D4 100%)',
  surface:         '#FFFFFF',
  surfaceGlass:    'rgba(255, 255, 255, 0.85)',
  surfaceElevated: '#FFFFFF',
  text:            '#1A0F0A',
  textSecondary:   '#3D2E24',
  textMuted:       '#8C7B6B',
  border:          'rgba(200, 149, 108, 0.18)',
  borderSubtle:    'rgba(200, 149, 108, 0.08)',
  divider:         'linear-gradient(90deg, transparent 0%, rgba(200, 149, 108, 0.3) 50%, transparent 100%)',
  footerBg:        'linear-gradient(180deg, #F5EDE4 0%, #EDE3D6 100%)',
  footerText:      '#6B5A4E',
  headerBg:        'linear-gradient(135deg, #1A0F0A 0%, #2D1B10 50%, #3D2518 100%)',
  headerText:      '#FFFFFF',
  headerAccent:    '#C8956C',
  danger:          '#C44536',
  dangerLight:     '#F8E8E6',
  success:         '#3D8B5E',
  successLight:    '#E8F5ED',
  warning:         '#C4873B',
  warningLight:    '#FDF3E6',
  info:            '#4A7FB5',
  infoLight:       '#E8F0F8',
  shadow:          '0 2px 16px rgba(26, 15, 10, 0.06)',
  shadowLg:        '0 8px 32px rgba(26, 15, 10, 0.08)',
  shadowGlow:      '0 0 24px rgba(200, 149, 108, 0.12)',
};

export const DARK = {
  bg:              '#121010',
  bgGradient:      'linear-gradient(165deg, #121010 0%, #1A1614 50%, #201C18 100%)',
  surface:         'rgba(45, 35, 28, 0.85)',
  surfaceElevated: '#2D231C',
  text:            '#F0E8E0',
  textSecondary:   '#C8B8A8',
  textMuted:       '#8C7B6B',
  border:          'rgba(200, 149, 108, 0.15)',
  borderSubtle:    'rgba(200, 149, 108, 0.08)',
  footerBg:        'linear-gradient(180deg, #1A1614 0%, #121010 100%)',
  headerBg:        'linear-gradient(135deg, #0A0806 0%, #1A1210 100%)',
  dangerBg:        'rgba(196, 69, 54, 0.15)',
  successBg:       'rgba(61, 139, 94, 0.15)',
  warningBg:       'rgba(196, 135, 59, 0.15)',
  infoBg:          'rgba(74, 127, 181, 0.15)',
  shadow:          '0 2px 16px rgba(0, 0, 0, 0.2)',
  shadowGlow:      '0 0 24px rgba(200, 149, 108, 0.08)',
};

export const FONT = {
  body:    "'Manrope','Segoe UI','Helvetica Neue',Arial,sans-serif",
  heading: "'Playfair Display','Georgia','Times New Roman',serif",
  mono:    "'JetBrains Mono','Fira Code',monospace",
};

export const SPACING = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' };

export const RADIUS = { sm: '8px', md: '12px', lg: '16px', xl: '20px' };

// Glassy overlay gradient for cards
export const GLASS_GRADIENT = 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 100%)';
