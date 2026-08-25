// ============================================================
// templates/engine/components.js
// Reusable email HTML components. Every function returns a
// string of table-based HTML suitable for email clients.
//
// No component duplicates HTML — each is defined once and
// composed into templates via layout().
// ============================================================
import { BRAND, DARK, FONT, RADIUS } from './tokens.js';

// ── Button ──────────────────────────────────────────────────

export function button({ label, url, align = 'center', fullWidth = false }) {
  if (!label || !url) return '';

  const width = fullWidth ? '100%' : 'auto';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 ${align ? '24px' : '16px'};">
  <tr>
    <td align="${align}">
      <table role="presentation" cellpadding="0" cellspacing="0" class="dm-btn-table" style="width:${width};">
        <tr>
          <td align="center" class="dm-btn" style="background:${BRAND.primary};border-radius:${RADIUS.md};padding:12px 32px;white-space:nowrap;">
            <a href="${escapeAttr(url)}" style="color:#FFFFFF;font-family:${FONT.body};font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">${escapeHtml(label)}</a>
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
    info:    { bg: BRAND.infoBg, border: BRAND.info, text: '#1E40AF', darkBg: DARK.infoBg, darkBorder: BRAND.info },
    success: { bg: BRAND.successBg, border: BRAND.success, text: '#166534', darkBg: DARK.successBg, darkBorder: BRAND.success },
    warning: { bg: BRAND.warningBg, border: BRAND.warning, text: '#92400E', darkBg: DARK.warningBg, darkBorder: BRAND.warning },
    error:   { bg: BRAND.dangerBg, border: BRAND.danger, text: '#991B1B', darkBg: DARK.dangerBg, darkBorder: BRAND.danger },
  };
  const p = palette[type] || palette.info;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;">
  <tr>
    <td class="dm-alert dm-alert-${type}" style="background:${p.bg};border-radius:${RADIUS.sm};border-left:4px solid ${p.border};padding:12px 16px;font-family:${FONT.body};font-size:14px;line-height:1.6;color:${p.text};">
      ${title ? `<strong style="display:block;margin-bottom:4px;">${escapeHtml(title)}</strong>` : ''}
      ${message}
    </td>
  </tr>
</table>`;
}

// ── Info Card ───────────────────────────────────────────────

export function card({ title, content, accent = false }) {
  if (!content) return '';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="dm-card" style="width:100%;margin:0 0 16px;background:${BRAND.surface};border-radius:${RADIUS.md};${accent ? `border-top:3px solid ${BRAND.primary};` : `border:1px solid ${BRAND.border};`}">
  <tr>
    <td style="padding:16px;font-family:${FONT.body};font-size:15px;line-height:1.7;color:${BRAND.textSecondary};">
      ${title ? `<h3 style="margin:0 0 8px;font-family:${FONT.heading};font-size:16px;font-weight:600;color:${BRAND.text};">${escapeHtml(title)}</h3>` : ''}
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
      (r) => `
    <tr>
      <td style="padding:6px 12px;font-family:${FONT.body};font-size:13px;color:${BRAND.textMuted};width:100px;vertical-align:top;white-space:nowrap;">${escapeHtml(r.label)}</td>
      <td style="padding:6px 12px;font-family:${FONT.body};font-size:14px;color:${BRAND.textSecondary};">${r.value}</td>
    </tr>`,
    )
    .join('');

  if (!trs) return '';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" class="dm-info-table" style="width:100%;margin:0 0 16px;border-collapse:collapse;">
  ${trs}
</table>`;
}

// ── Spacer ──────────────────────────────────────────────────

export function spacer(height = '16px') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="height:${height};font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
}

// ── Divider ─────────────────────────────────────────────────

export function divider() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;"><tr><td style="height:1px;background:${BRAND.border};font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
}

// ── Paragraph ───────────────────────────────────────────────

export function p(text, opts = {}) {
  const { muted = false, small = false } = opts;
  const color = muted ? BRAND.textMuted : BRAND.textSecondary;
  const size = small ? '14px' : '15px';

  return `<p style="margin:0 0 16px;font-family:${FONT.body};font-size:${size};line-height:1.7;color:${color};">${text}</p>`;
}

// ── Heading (within body) ───────────────────────────────────

export function heading(text, level = 2) {
  const size = level === 1 ? '24px' : '20px';
  return `<h${level} style="margin:0 0 12px;font-family:${FONT.heading};font-size:${size};font-weight:700;color:${BRAND.text};">${escapeHtml(text)}</h${level}>`;
}

// ── Dark mode <style> block ─────────────────────────────────

export function darkModeStyles() {
  return `
  @media (prefers-color-scheme: dark) {
    .dm-bg    { background-color: ${DARK.bg} !important; }
    .dm-surface { background-color: ${DARK.surface} !important; }
    .dm-text  { color: ${DARK.text} !important; }
    .dm-text-secondary { color: ${DARK.textSecondary} !important; }
    .dm-muted { color: ${DARK.textMuted} !important; }
    .dm-border { border-color: ${DARK.border} !important; }
    .dm-footer { background-color: ${DARK.footerBg} !important; }
    .dm-header { background: ${DARK.headerBg} !important; background-image: none !important; }
    .dm-btn   { background-color: ${DARK.primary} !important; }
    .dm-btn a { color: #FFFFFF !important; }
    .dm-card  { background-color: ${DARK.surface} !important; border-color: ${DARK.border} !important; }
    .dm-info-table td { color: ${DARK.textSecondary} !important; }
    .dm-alert-info    { background-color: ${DARK.infoBg} !important; }
    .dm-alert-success { background-color: ${DARK.successBg} !important; }
    .dm-alert-warning { background-color: ${DARK.warningBg} !important; }
    .dm-alert-error   { background-color: ${DARK.dangerBg} !important; }
    .dm-header-title  { color: ${BRAND.primary} !important; }
  }

  [data-ogsc] .dm-bg    { background-color: ${DARK.bg} !important; }
  [data-ogsc] .dm-surface { background-color: ${DARK.surface} !important; }
  [data-ogsc] .dm-text  { color: ${DARK.text} !important; }
  [data-ogsc] .dm-footer { background-color: ${DARK.footerBg} !important; }
  [data-ogsc] .dm-btn   { background-color: ${DARK.primary} !important; }
  [data-ogsc] .dm-card  { background-color: ${DARK.surface} !important; }
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
