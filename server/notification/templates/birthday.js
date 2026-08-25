import { STUDIO_NAME } from './engine/tokens.js';
import { p, heading, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function birthday(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};
  const name = data.name || user.name || 'Yoga Seeker';

  const subject = notification.subject || `Happy Birthday, ${escapeHtml(name)}!`;

  const body = `
    ${heading(`Happy Birthday, ${escapeHtml(name)}!`)}
    ${p(`On this special day, the entire <strong>${STUDIO_NAME}</strong> community sends you warm wishes for peace, joy, and vibrant health.`)}
    ${p('May your year ahead be filled with light, growth, and beautiful moments on and off the mat.')}
    ${p('Thank you for being part of our yoga family.', { muted: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Happy Birthday, ${name}!`,
    '',
    `On this special day, the entire ${STUDIO_NAME} community sends you warm wishes for peace, joy, and vibrant health.`,
    'May your year ahead be filled with light, growth, and beautiful moments on and off the mat.',
    '',
    'Thank you for being part of our yoga family.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Happy Birthday, ${escapeHtml(name)}!` }) };
}
