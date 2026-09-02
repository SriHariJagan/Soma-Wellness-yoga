// ============================================================
// chatbotConfig.js — central config for SOMA chatbot
// Falls back gracefully when env vars are not set.
// ============================================================

// VITE_WHATSAPP_NUMBER should be digits only, e.g. 254700000000 or 254712345678
// Accepts +254..., 254..., 0700..., will be normalised.
const ENV_WA = import.meta.env.VITE_WHATSAPP_NUMBER || '';
const ENV_DISPLAY = import.meta.env.VITE_WHATSAPP_DISPLAY_PHONE || '';

// Default from site content / footer — must stay in sync
export const FALLBACK_WA_NUMBER = '254700000000';
export const FALLBACK_WA_DISPLAY = '+254 700 000 000';

// Normalise any phone string to digits-only wa.me format
export function normalizeWaNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return FALLBACK_WA_NUMBER;
  // If Kenyan 07... (10 digits starting with 0) -> 254...
  if (digits.length === 10 && digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('7')) return `254${digits}`;
  return digits;
}

export const WHATSAPP_NUMBER = normalizeWaNumber(ENV_WA || ENV_DISPLAY || FALLBACK_WA_NUMBER);
export const WHATSAPP_DISPLAY = ENV_DISPLAY || FALLBACK_WA_DISPLAY;

// Welcome popup timing (ms) — randomised 5–8s per spec
export const WELCOME_DELAY_MIN = 5000;
export const WELCOME_DELAY_MAX = 8000;
export function randomWelcomeDelay() {
  return Math.floor(WELCOME_DELAY_MIN + Math.random() * (WELCOME_DELAY_MAX - WELCOME_DELAY_MIN));
}

// Session storage keys
export const SESSION_KEYS = {
  WELCOME_DISMISSED: 'soma_chatbot_welcome_dismissed',
  WELCOME_SHOWN: 'soma_chatbot_welcome_shown',
};

// Chatbot views — single source of truth for state machine
export const CHAT_VIEW = {
  WELCOME: 'WELCOME',
  MAIN_MENU: 'MAIN_MENU',
  COURSES: 'COURSES',
  COURSE_DETAILS: 'COURSE_DETAILS',
  PROGRAMS: 'PROGRAMS',
  PROGRAM_DETAILS: 'PROGRAM_DETAILS',
  PACKAGES: 'PACKAGES',
  PACKAGE_DETAILS: 'PACKAGE_DETAILS',
  ABOUT: 'ABOUT',
  ENQUIRY: 'ENQUIRY',
  SUCCESS: 'SUCCESS',
};

// Quick actions for main menu
export const QUICK_ACTIONS = [
  { id: 'courses', label: 'Explore Courses', icon: 'book', view: CHAT_VIEW.COURSES },
  { id: 'programs', label: 'Explore Programs', icon: 'sparkles', view: CHAT_VIEW.PROGRAMS },
  { id: 'packages', label: 'Packages & Pricing', icon: 'wallet', view: CHAT_VIEW.PACKAGES },
  { id: 'about', label: 'About Soma Wellness', icon: 'leaf', view: CHAT_VIEW.ABOUT },
  { id: 'enquiry', label: 'Make an Enquiry', icon: 'mail', view: CHAT_VIEW.ENQUIRY },
  { id: 'whatsapp', label: 'Chat on WhatsApp', icon: 'whatsapp', view: 'WHATSAPP' },
];

// About content — concise, mirrors site copy, not duplicative
export const ABOUT_COPY = {
  title: 'Soma Wellness Nairobi',
  intro:
    'Soma Wellness is an integrated wellness home in Spring Valley, Nairobi — bringing together yoga, yoga therapy, meditation, breathwork, massage and mindful living.',
  points: [
    'Rebalance · Renew · Restore · Reconnect — body, breath and mind as one.',
    'Group yoga, one-to-one therapy, prenatal & senior programmes, and signature rituals like Stillness & The Acacia.',
    'Calm, premium, unhurried — not a gym, not a spa, but a place to return to your centre.',
  ],
  ctas: [
    { label: 'Learn more', to: '/about' },
    { label: 'Explore programs', to: '/restore' },
    { label: 'Visit us — Spring Valley', to: '/contact' },
  ],
};

// WhatsApp message builders
export function buildGenericWaMessage() {
  return [
    'Hi Soma Wellness \u{1F44B}',
    '',
    "I visited your website and I'm interested in learning more about your wellness programs.",
    '',
    'Could you please share more details?',
  ].join('\n');
}

export function buildCourseWaMessage(courseName) {
  const name = courseName || 'your courses';
  return [
    'Hi Soma Wellness \u{1F44B}',
    '',
    `I visited your website and I'm interested in your ${name}.`,
    '',
    'Could you please share more details about this course?',
  ].join('\n');
}

export function buildProgramWaMessage(programName) {
  const name = programName || 'your programs';
  return [
    'Hi Soma Wellness \u{1F44B}',
    '',
    `I visited your website and I'm interested in your ${name}.`,
    '',
    'Could you please share more details?',
  ].join('\n');
}

export function buildPackageWaMessage(packageName) {
  const name = packageName || 'wellness packages';
  return [
    'Hi Soma Wellness \u{1F44B}',
    '',
    `I visited your website and I'm interested in the ${name} package.`,
    '',
    'Could you please share more details?',
  ].join('\n');
}

export function buildEnquiryWaMessage({ name, interestedItem, interestedType }) {
  const item = interestedItem ? ` about ${interestedItem}` : '';
  const type = interestedType && interestedType !== 'general' ? ` (${interestedType})` : '';
  return [
    `Hi Soma Wellness \u{1F44B} — this is ${name || 'a visitor'} from your website.`,
    '',
    `I submitted an enquiry${item}${type} and would love to continue on WhatsApp.`,
    '',
    'Could you please share next steps?',
  ].join('\n');
}

export function buildWaUrl(number, message) {
  const digits = normalizeWaNumber(number);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

// Analytics event names (wire to existing analytics if present)
export const ANALYTICS_EVENTS = {
  CHATBOT_OPEN: 'chatbot_open',
  CHATBOT_CLOSE: 'chatbot_close',
  CHATBOT_WELCOME_SHOWN: 'chatbot_welcome_shown',
  CHATBOT_WELCOME_DISMISSED: 'chatbot_welcome_dismissed',
  CHATBOT_WELCOME_CTA: 'chatbot_welcome_cta',
  CHATBOT_COURSE_VIEW: 'chatbot_course_view',
  CHATBOT_PROGRAM_VIEW: 'chatbot_program_view',
  CHATBOT_PACKAGE_VIEW: 'chatbot_package_view',
  CHATBOT_ENQUIRY_STARTED: 'chatbot_enquiry_started',
  CHATBOT_ENQUIRY_SUBMITTED: 'chatbot_enquiry_submitted',
  CHATBOT_WHATSAPP_CLICK: 'chatbot_whatsapp_click',
  CHATBOT_COURSE_WHATSAPP_CLICK: 'chatbot_course_whatsapp_click',
};
