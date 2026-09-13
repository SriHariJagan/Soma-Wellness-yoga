// ============================================================
// templates/engine/components.js
// SomaWellness Premium Glassy Email Components
// Reusable table-based HTML components for email clients.
// ============================================================
import { BRAND, DARK, FONT, RADIUS } from './tokens.js';

// ── Button ──────────────────────────────────────────────────

export function button({ label, url, align = 'center', fullWidth = false, variant = 'primary' }) {
  if (!label || !url) return '';

  const width = fullWidth ? '100%' : 'auto';
  const bg = variant === 'primary'
    ? `background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryHover} 100%);`
    : `background:transparent;border:1.5px solid ${BRAND.primary};`;
  const textColor = variant === 'primary' ? '#FFFFFF' : BRAND.primary;
  const shadow = variant === 'primary' ? `box-shadow:0 4px 16px rgba(200, 149, 108, 0.3);` : '';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 ${align ? '24px' : '16px'};">
  <tr>
    <td align="${align}">
      <table role="presentation" cellpadding="0" cellspacing="0" class="dm-btn-table" style="width:${width};">
        <tr>
          <td align="center" class="dm-btn" style="background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryHover} 100%);border-radius:${RADIUS.md};padding:14px 36px;white-space:nowrap;${shadow}">
            <a href="${escapeAttr(url)}" style="color:${textColor};font-family:${FONT.body};font-size:15px;font-weight:700;text-decoration:none;display:inline-block;letter-spacing:0.3px;">${escapeHtml(label)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ── Alert ───────────────────────────────────────────────────

export function alert({ message, type = 'info', title = '' }) {
  if (!message) return '';

  const palette = {
    info:    { bg: BRAND.infoLight, border: BRAND.info, text: '#2C5282', darkBg: DARK.infoBg, darkBorder: BRAND.info },
    success: { bg: BRAND.successLight, border: BRAND.success, text: '#276749', darkBg: DARK.successBg, darkBorder: BRAND.success },
    warning: { bg: BRAND.warningLight, border: BRAND.warning, text: '#92571A', darkBg: DARK.warningBg, darkBorder: BRAND.warning },
    error:   { bg: BRAND.dangerLight, border: BRAND.danger, text: '#9B2C2C', darkBg: DARK.dangerBg, darkBorder: BRAND.danger },
  };
  const p = palette[type] || palette.info;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
  <tr>
    <td class="dm-alert dm-alert-${type}" style="background:${p.bg};border-radius:${RADIUS.md};border-left:4px solid ${p.border};padding:16px 20px;font-family:${FONT.body};font-size:14px;line-height:1.7;color:${p.text};">
      ${title ? `<strong style="display:block;margin-bottom:6px;font-size:15px;">${escapeHtml(title)}</strong>` : ''}
      ${message}
    </td>
  </tr>
</table>`;
}

// ── Glassy Card ─────────────────────────────────────────────

export function card({ title, content, accent = false }) {
  if (!content) return '';

  const accentBorder = accent ? `border-top:3px solid ${BRAND.primary};` : '';
  const glassShadow = DARK ? DARK.shadow : BRAND.shadow;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="dm-card" style="width:100%;margin:0 0 20px;background:${BRAND.surface};border-radius:${RADIUS.lg};${accentBorder}border:1px solid ${BRAND.border};box-shadow:${glassShadow};overflow:hidden;">
  <tr>
    <td style="padding:20px 24px;font-family:${FONT.body};font-size:15px;line-height:1.7;color:${BRAND.textSecondary};">
      ${title ? `<h3 style="margin:0 0 12px;font-family:${FONT.heading};font-size:18px;font-weight:700;color:${BRAND.text};letter-spacing:-0.2px;">${escapeHtml(title)}</h3>` : ''}
      ${content}
    </td>
  </tr>
</table>`;
}

// ── Info Table (key-value rows) ─────────────────────────────

export function infoTable(rows) {
  if (!rows || rows.length === 0) return '';

  const trs = rows
    .filter((r) => r.label && r.value)
    .map(
      (r, i) => `
    <tr>
      <td style="padding:8px 14px;font-family:${FONT.body};font-size:13px;color:${BRAND.textMuted};width:110px;vertical-align:top;white-space:nowrap;border-bottom:1px solid ${BRAND.borderSubtle};${i === 0 ? 'border-top:1px solid ' + BRAND.borderSubtle : ''}">${escapeHtml(r.label)}</td>
      <td style="padding:8px 14px;font-family:${FONT.body};font-size:14px;color:${BRAND.textSecondary};font-weight:500;border-bottom:1px solid ${BRAND.borderSubtle};${i === 0 ? 'border-top:1px solid ' + BRAND.borderSubtle : ''}">${r.value}</td>
    </tr>`,
    )
    .join('');

  if (!trs) return '';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="dm-info-table" style="width:100%;margin:0 0 20px;border-collapse:collapse;background:${BRAND.surface};border-radius:${RADIUS.md};border:1px solid ${BRAND.border};overflow:hidden;">
  ${trs}
</table>`;
}

// ── Spacer ──────────────────────────────────────────────────

export function spacer(height = '16px') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="height:${height};font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
}

// ── Divider ─────────────────────────────────────────────────

export function divider() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;"><tr><td style="height:1px;background:linear-gradient(90deg, transparent 0%, ${BRAND.primary}40 50%, transparent 100%);font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
}

// ── Paragraph ───────────────────────────────────────────────

export function p(text, opts = {}) {
  const { muted = false, small = false } = opts;
  const color = muted ? BRAND.textMuted : BRAND.textSecondary;
  const size = small ? '13px' : '15px';

  return `<p style="margin:0 0 16px;font-family:${FONT.body};font-size:${size};line-height:1.75;color:${color};">${text}</p>`;
}

// ── Heading (within body) ───────────────────────────────────

export function heading(text, level = 2) {
  const size = level === 1 ? '26px' : level === 2 ? '22px' : '18px';
  return `<h${level} style="margin:0 0 14px;font-family:${FONT.heading};font-size:${size};font-weight:700;color:${BRAND.text};letter-spacing:-0.3px;line-height:1.3;">${escapeHtml(text)}</h${level}>`;
}

// ── Glassy Badge ────────────────────────────────────────────

export function badge({ label, color = BRAND.primary }) {
  if (!label) return '';
  return `<span style="display:inline-block;background:${color}18;color:${color};font-family:${FONT.body};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(label)}</span>`;
}

// ── Dark mode <style> block ─────────────────────────────────

export function darkModeStyles() {
  return `
  @media (prefers-color-scheme: dark) {
    .dm-bg    { background-color: ${DARK.bg} !important; background-image: ${DARK.bgGradient} !important; }
    .dm-surface { background-color: ${DARK.surface} !important; }
    .dm-text  { color: ${DARK.text} !important; }
    .dm-text-secondary { color: ${DARK.textSecondary} !important; }
    .dm-muted { color: ${DARK.textMuted} !important; }
    .dm-border { border-color: ${DARK.border} !important; }
    .dm-footer { background: ${DARK.footerBg} !important; }
    .dm-header { background: ${DARK.headerBg} !important; }
    .dm-btn   { background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryHover} 100%) !important; }
    .dm-btn a { color: #FFFFFF !important; }
    .dm-card  { background-color: ${DARK.surfaceElevated} !important; border-color: ${DARK.border} !important; box-shadow: ${DARK.shadow} !important; }
    .dm-info-table td { color: ${DARK.textSecondary} !important; border-color: ${DARK.border} !important; }
    .dm-alert-info    { background-color: ${DARK.infoBg} !important; }
    .dm-alert-success { background-color: ${DARK.successBg} !important; }
    .dm-alert-warning { background-color: ${DARK.warningBg} !important; }
    .dm-alert-error   { background-color: ${DARK.dangerBg} !important; }
    .dm-header-title  { color: ${BRAND.headerAccent} !important; }
  }

  [data-ogsc] .dm-bg    { background-color: ${DARK.bg} !important; }
  [data-ogsc] .dm-surface { background-color: ${DARK.surface} !important; }
  [data-ogsc] .dm-text  { color: ${DARK.text} !important; }
  [data-ogsc] .dm-footer { background: ${DARK.footerBg} !important; }
  [data-ogsc] .dm-btn   { background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryHover} 100%) !important; }
  [data-ogsc] .dm-card  { background-color: ${DARK.surfaceElevated} !important; }
  `;
}

// ── Helpers ─────────────────────────────────────────────────

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}
