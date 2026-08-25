// ============================================================
// notification/templates/index.js
// Template registry. Each template is a function that receives
// a Notification document and returns { subject, text, html }.
//
// Register named templates here. The `render()` function
// resolves templates by matching on notification type, falling
// back to the default template when no specific match exists.
//
// To add a template for a new notification type:
//   1. Create server/notification/templates/<type>.js
//   2. Import and register it below
// ============================================================
import logger from '../logger.js';
import defaults from './defaults.js';

const MODULE = 'Templates';
import welcome from './welcome.js';
import passwordReset from './password-reset.js';
import classReminder from './class-reminder.js';
import workshopReminder from './workshop-reminder.js';
import eventReminder from './event-reminder.js';
import membershipReminder from './membership-reminder.js';
import invoice from './invoice.js';
import newsletter from './newsletter.js';
import birthday from './birthday.js';
import consultationConfirmation from './consultation-confirmation.js';
import serviceEnrollment from './service-enrollment.js';
import workshopConfirmation from './workshop-confirmation.js';
import bookingConfirmation from './booking-confirmation.js';
import referralInvite from './referral-invite.js';
import leadConfirmation from './lead-confirmation.js';
import refund from './refund.js';
import classEnrollment from './class-enrollment.js';

const templates = new Map();
const builtins = {
  'welcome':                  welcome,
  'password-reset':           passwordReset,
  'class-reminder':           classReminder,
  'class-enrollment':         classEnrollment,
  'workshop-reminder':        workshopReminder,
  'workshop-confirmation':    workshopConfirmation,
  'event-reminder':           eventReminder,
  'membership-reminder':      membershipReminder,
  'invoice':                  invoice,
  'newsletter':               newsletter,
  'birthday':                 birthday,
  'consultation-confirmation': consultationConfirmation,
  'service-enrollment':       serviceEnrollment,
  'booking-confirmation':     bookingConfirmation,
  'referral-invite':          referralInvite,
  'lead-confirmation':        leadConfirmation,
  'refund':                   refund,
};

for (const [key, fn] of Object.entries(builtins)) {
  templates.set(key, fn);
}

export function register(type, templateFn) {
  if (templates.has(type)) {
    logger.warn(MODULE, 'Template overwritten', { type });
  }
  templates.set(type, templateFn);
}

export function render(notification) {
  const key = notification.template || notification.type;
  const template = templates.get(key) || defaults;
  return template(notification);
}

export default { register, render };
