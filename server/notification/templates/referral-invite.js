import { STUDIO_NAME, STUDIO_TAGLINE } from './engine/tokens.js';
import { button, p, heading, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function referralInvite(notification) {
  const data = notification.templateData || {};

  const inviteeName = escapeHtml(data.inviteeName || 'there');
  const senderName = escapeHtml(data.senderName || 'A friend');
  const referralLink = data.referralLink || 'https://pragyayoga.com';
  const subject = `You're invited to ${STUDIO_NAME}!`;

  const body = `
    ${heading(`${senderName} invites you to ${STUDIO_NAME}`, 1)}
    ${p(`Hi ${inviteeName},`)}
    ${p(`<strong>${senderName}</strong> has invited you to join <strong>${STUDIO_NAME}</strong> — ${STUDIO_TAGLINE}.`)}
    ${p('Use the link below to sign up and start your practice:')}
    ${button({ label: 'Join Now', url: referralLink })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `${senderName} invites you to ${STUDIO_NAME}!`,
    '',
    `Hi ${inviteeName},`,
    `${senderName} has invited you to join ${STUDIO_NAME} — ${STUDIO_TAGLINE}.`,
    'Use the link below to sign up and start your practice:',
    '',
    `Join Now: ${referralLink}`,
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `${senderName} invites you to ${STUDIO_NAME}!` }) };
}
