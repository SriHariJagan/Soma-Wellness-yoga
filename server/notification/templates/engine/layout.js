// ============================================================
// templates/engine/layout.js
// SomaWellness Premium Glassy Email Layout
// Base email layout wrapping every template.
// ============================================================
import { BRAND, DARK, FONT, STUDIO_NAME, STUDIO_TAGLINE, RADIUS, SPACING } from './tokens.js';
import { darkModeStyles } from './components.js';

/**
 * Wrap body HTML in a full email layout.
 *
 * @param {Object}  opts
 * @param {string}  opts.body     - The inner content HTML (components composed together).
 * @param {string}  [opts.previewText] - Hidden preview snippet shown in inbox.
 * @param {boolean} [opts.darkMode=true]
 * @returns {string} Complete HTML document.
 */
export function layout(opts = {}) {
  const { body = '', previewText = '', darkMode = true } = opts;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${STUDIO_NAME}</title>
  <style type="text/css">
    /* Reset */
    body,table,td,p,a,li,blockquote { -webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
    table,td { mso-table-lspace:0pt;mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic;border:0; }
    #outlook a { padding:0; }
    /* Responsive */
    @media only screen and (max-width:620px) {
      .responsive { width:100% !important; max-width:100% !important; }
      .responsive-pad { padding-left:16px !important; padding-right:16px !important; }
      .responsive-stack { display:block !important; width:100% !important; }
      .responsive-center { text-align:center !important; }
      .responsive-hide { display:none !important; }
    }
    ${darkMode ? darkModeStyles() : ''}
  </style>
  ${previewText ? `<!--[if !mso]><!--><div style="display:none;font-size:1px;color:#${BRAND.bg.replace('#', '')};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeAttr(previewText)}</div><!--<![endif]-->` : ''}
</head>
<body class="dm-bg" style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${FONT.body};">
  <!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};"><tr><td align="center"><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};background-image:${BRAND.bgGradient};">
    <tr>
      <td align="center" style="padding:${SPACING.xl} ${SPACING.md};">${header()}</td>
    </tr>
    <tr>
      <td align="center" style="padding:0 ${SPACING.md} 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" class="responsive dm-surface" style="max-width:600px;width:100%;background:${BRAND.surface};border-radius:0 0 ${RADIUS.xl} ${RADIUS.xl};box-shadow:${BRAND.shadowLg};">
          <tr>
            <td class="responsive-pad" style="padding:${SPACING.xl} 28px;font-family:${FONT.body};color:${BRAND.textSecondary};">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 ${SPACING.md} ${SPACING.xl};">${footer()}</td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

// ── Header ──────────────────────────────────────────────────

function header() {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="responsive" style="max-width:600px;width:100%;">
  <tr>
    <td class="dm-header" align="center" style="background:linear-gradient(135deg, #1A0F0A 0%, #2D1B10 50%, #3D2518 100%);border-radius:${RADIUS.xl} ${RADIUS.xl} 0 0;padding:32px ${SPACING.md} 24px;">
      <h1 class="dm-header-title" style="margin:0;font-family:${FONT.heading};font-size:26px;font-weight:700;color:#C8956C;letter-spacing:0.5px;">${STUDIO_NAME}</h1>
      <div style="margin:8px auto 0;width:40px;height:2px;background:linear-gradient(90deg, transparent, #C8956C, transparent);"></div>
      <p style="margin:10px 0 0;font-family:${FONT.body};font-size:11px;color:#8C7B6B;letter-spacing:2px;text-transform:uppercase;">${STUDIO_TAGLINE}</p>
    </td>
  </tr>
</table>`;
}

// ── Footer ──────────────────────────────────────────────────

function footer() {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="responsive" style="max-width:600px;width:100%;">
  <tr>
    <td class="dm-footer" align="center" style="background:linear-gradient(180deg, #F5EDE4 0%, #EDE3D6 100%);border-radius:${RADIUS.xl};padding:24px 28px;font-size:12px;color:${BRAND.footerText};line-height:1.7;">
      <p style="margin:0 0 6px;font-weight:600;color:${BRAND.textSecondary};">${STUDIO_NAME}</p>
      <p style="margin:0 0 4px;">Spring Valley, Nairobi, Kenya</p>
      <p style="margin:0 0 8px;">hello@somawellness.co.ke &middot; +254 700 000 000</p>
      <div style="width:32px;height:1px;background:linear-gradient(90deg, transparent, ${BRAND.primary}, transparent);margin:10px auto;"></div>
      <p style="margin:0;font-size:11px;color:${BRAND.textMuted};">&copy; ${new Date().getFullYear()} ${STUDIO_NAME}. All rights reserved.</p>
    </td>
  </tr>
</table>`;
}

// ── Utility ─────────────────────────────────────────────────

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default layout;
