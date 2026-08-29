import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, heading, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'Yoga Seeker');
  const dashboardUrl = data.dashboardUrl || 'https://somawellness.in/dashboard';

  const subject = `Welcome to ${STUDIO_NAME}, ${name}!`;

  const body = `
    ${heading(`Namaste, ${name}!`)}
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

  return { subject, text, html: layout({ body, previewText: `Welcome, ${name}!` }) };
}