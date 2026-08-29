import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function welcome(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};
  const name = data.name || user.name || 'Yoga Seeker';
  const dashboardUrl = data.dashboardUrl || 'https://somawellness.in/dashboard';

  const subject = notification.subject || `Welcome to ${STUDIO_NAME}, ${escapeHtml(name)}!`;

  const body = `
    ${heading(`Namaste, ${escapeHtml(name)}!`)}
    ${p(`Welcome to <strong>${STUDIO_NAME}</strong> — your journey toward authentic Indian yoga and holistic wellness begins today.`)}
    ${p("We're thrilled to have you as part of our community. Explore our classes, workshops, and resources designed to nurture your body, mind, and spirit.")}
    ${button({ label: 'Get Started', url: dashboardUrl })}
    ${p('If you have any questions, simply reply to this email. We\'re here to help.', { muted: true, small: true })}
  `;

  const text = [
    `Namaste ${name},`,
    '',
    `Welcome to ${STUDIO_NAME} — your journey toward authentic Indian yoga and holistic wellness begins today.`,
    "We're thrilled to have you as part of our community. Explore our classes, workshops, and resources designed to nurture your body, mind, and spirit.",
    '',
    `Get started here: ${dashboardUrl}`,
    '',
    'If you have any questions, simply reply to this email. We\'re here to help.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Welcome, ${escapeHtml(name)}!` }) };
}
