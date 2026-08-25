// ============================================================
// templates/engine/layout.js
// Base email layout wrapping every template.
//
// Composes header + body + footer into a table-based,
// responsive, dark-mode-compatible HTML email.
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
    /* Outlook spacing fix */
    #outlook a { padding:0; }
    /* Responsive */
    @media only screen and (max-width:620px) {
      .responsive { width:100% !important; max-width:100% !important; }
      .responsive-pad { padding-left:12px !important; padding-right:12px !important; }
      .responsive-stack { display:block !important; width:100% !important; }
      .responsive-center { text-align:center !important; }
      .responsive-hide { display:none !important; }
    }
    ${darkMode ? darkModeStyles() : ''}
  </style>
  ${previewText ? `<!--[if !mso]><!--><div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeAttr(previewText)}</div><!--<![endif]-->` : ''}
</head>
<body class="dm-bg" style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${FONT.body};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:${SPACING.xl} ${SPACING.md};">${header()}</td>
    </tr>
    <tr>
      <td align="center" style="padding:0 ${SPACING.md} 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" class="responsive" style="max-width:600px;width:100%;background:${BRAND.surface};border-radius:0 0 ${RADIUS.lg} ${RADIUS.lg};">
          <tr>
            <td class="dm-surface responsive-pad" style="padding:${SPACING.xl} 24px;background:${BRAND.surface};border-radius:0 0 ${RADIUS.lg} ${RADIUS.lg};font-family:${FONT.body};color:${BRAND.textSecondary};">
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
</body>
</html>`;
}

// ── Header ──────────────────────────────────────────────────

function header() {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="responsive" style="max-width:600px;width:100%;">
  <tr>
    <td class="dm-header" align="center" style="background:${BRAND.headerBg};border-radius:${RADIUS.lg} ${RADIUS.lg} 0 0;padding:${SPACING.xl} ${SPACING.md} ${SPACING.md};">
      <h1 class="dm-header-title" style="margin:0;font-family:${FONT.heading};font-size:22px;font-weight:700;color:${BRAND.primary};">${STUDIO_NAME}</h1>
      <p style="margin:${SPACING.xs} 0 0;font-size:12px;color:#9C8B78;">${STUDIO_TAGLINE}</p>
    </td>
  </tr>
</table>`;
}

// ── Footer ──────────────────────────────────────────────────

function footer() {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="responsive" style="max-width:600px;width:100%;">
  <tr>
    <td class="dm-footer" align="center" style="background:${BRAND.footerBg};border-radius:${RADIUS.lg};padding:${SPACING.md} 24px;font-size:12px;color:${BRAND.textMuted};line-height:1.6;">
      <p style="margin:0 0 4px;">${STUDIO_NAME} &mdash; Jaipur, India</p>
      <p style="margin:0;">&copy; ${new Date().getFullYear()} Pragya Yoga. All rights reserved.</p>
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
