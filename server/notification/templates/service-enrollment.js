import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function serviceEnrollment(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};
  const name = data.name || user.name || 'there';
  const serviceName = data.serviceName || 'a new service';
  const dashboardUrl = data.dashboardUrl || 'https://somawellness.in/dashboard';

  const subject = notification.subject || `Enrolled in ${escapeHtml(serviceName)}`;

  const body = `
    ${heading('Enrollment Confirmed')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`You have been enrolled in <strong>${escapeHtml(serviceName)}</strong>. We are excited to have you on this journey!`)}
    ${card({ title: 'What\'s Next?', content: `<p style="margin:0;font-size:14px;line-height:1.6;color:#3B1D0D;">Visit your dashboard to view your schedule, track sessions, and access class resources. If this is a personalized service, your instructor will reach out to coordinate the schedule.</p>` })}
    ${button({ label: 'Go to Dashboard', url: dashboardUrl })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Enrolled in ${serviceName}`,
    '',
    `Hi ${name},`,
    `You have been enrolled in ${serviceName}. We are excited to have you on this journey!`,
    '',
    'Visit your dashboard to view your schedule, track sessions, and access class resources.',
    'If this is a personalized service, your instructor will reach out to coordinate the schedule.',
    '',
    `Dashboard: ${dashboardUrl}`,
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Enrolled in ${escapeHtml(serviceName)}` }) };
}
