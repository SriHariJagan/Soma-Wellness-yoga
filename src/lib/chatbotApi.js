// ============================================================
// chatbotApi.js — data layer for chatbot
// Uses existing public APIs + dedicated chatbot enquiry endpoint
// ============================================================
import {
  WHATSAPP_NUMBER,
  normalizeWaNumber,
  buildWaUrl,
  buildGenericWaMessage,
  buildCourseWaMessage,
  buildProgramWaMessage,
  buildPackageWaMessage,
} from '../config/chatbotConfig.js';

// ── Low-level fetch helpers (mirror somaApi pattern) ─────────
async function jget(url) {
  const headers = {};
  const raw = localStorage.getItem('token');
  if (raw) headers['Authorization'] = `Bearer ${raw}`;
  const r = await fetch(url, { headers });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.msg || j?.message || j?.error || `GET ${url} failed: ${r.status}`);
  }
  return r.json();
}

async function jpost(url, body) {
  const headers = { 'Content-Type': 'application/json' };
  const raw = localStorage.getItem('token');
  if (raw) headers['Authorization'] = `Bearer ${raw}`;
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(j?.msg || j?.message || j?.error || `POST ${url} failed: ${r.status}`);
    err.details = j?.details;
    err.status = r.status;
    throw err;
  }
  return j;
}

// ── Catalogue fetches (reuse existing public APIs) ───────────
export const fetchChatbotCourses = () => jget('/api/public/courses');
export const fetchChatbotPlans = () => jget('/api/public/plans');
export const fetchChatbotServices = () => jget('/api/public/services');
export const fetchChatbotCatalog = () => jget('/api/soma/catalog');

// Chatbot-specific config (WhatsApp number from server if available)
let cachedWaNumber = null;
export async function fetchChatbotConfig() {
  // Skip network in test / SSR environments — use local fallback instantly
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test') {
      return { whatsappNumber: WHATSAPP_NUMBER, whatsappDisplay: WHATSAPP_NUMBER };
    }
  } catch {}
  try {
    const cfg = await jget('/api/chatbot/config');
    if (cfg?.whatsappNumber) {
      cachedWaNumber = normalizeWaNumber(cfg.whatsappNumber);
      return cfg;
    }
  } catch {
    // fall through to local fallback
  }
  return { whatsappNumber: WHATSAPP_NUMBER, whatsappDisplay: WHATSAPP_NUMBER };
}

export function getCachedWaNumber() {
  return cachedWaNumber || WHATSAPP_NUMBER;
}

// ── Enquiry submission ───────────────────────────────────────
export function submitChatbotEnquiry(payload) {
  // payload: { name, email, phone, interestedType, interestedItem, interestedItemId, message, currentPage, source }
  return jpost('/api/chatbot/enquiries', {
    source: 'chatbot',
    currentPage: window.location.pathname + window.location.search,
    ...payload,
  });
}

// ── WhatsApp URL builders (centralised, testable) ────────────
export function getGenericWaUrl() {
  return buildWaUrl(getCachedWaNumber(), buildGenericWaMessage());
}
export function getCourseWaUrl(courseName) {
  return buildWaUrl(getCachedWaNumber(), buildCourseWaMessage(courseName));
}
export function getProgramWaUrl(programName) {
  return buildWaUrl(getCachedWaNumber(), buildProgramWaMessage(programName));
}
export function getPackageWaUrl(packageName) {
  return buildWaUrl(getCachedWaNumber(), buildPackageWaMessage(packageName));
}

// ── Lightweight analytics helper ─────────────────────────────
export function trackChatbotEvent(eventName, data = {}) {
  try {
    // 1) CustomEvent for any in-app listeners
    window.dispatchEvent(new CustomEvent('soma:analytics', { detail: { event: eventName, ...data } }));
    // 2) gtag if present
    if (typeof window.gtag === 'function') window.gtag('event', eventName, data);
    // 3) dataLayer push
    if (window.dataLayer) window.dataLayer.push({ event: eventName, ...data });
    // 4) console for dev
    if (import.meta.env.DEV) console.debug(`[chatbot analytics] ${eventName}`, data);
  } catch {
    /* no-op */
  }
}

// ── Helpers to shape raw API data into chatbot-friendly cards ─
export function shapeCourseForChat(course) {
  return {
    id: course._id || course.id || course.slug || course.title,
    title: course.title,
    description: course.description || '',
    duration: course.duration || (course.hours ? `${course.hours} hours` : ''),
    hours: course.hours || null,
    mode: course.mode || 'In-person',
    price: course.price ?? null,
    earlyPrice: course.earlyPrice ?? null,
    category: course.category || 'academy',
    image: course.image || null,
    // routing: courses live under yttc/academy, but use /yttc as fallback
    href: '/yttc',
  };
}

export function shapePlanForChat(plan) {
  return {
    id: plan._id || plan.id || plan.name,
    name: plan.name,
    description: plan.description || '',
    price: plan.price ?? null,
    currency: plan.currency || 'KES',
    durationMonths: plan.durationMonths,
    tier: plan.tier || null,
    isSoma: !!plan.isSoma,
    somaCategory: plan.somaCategory || 'membership',
    benefits: plan.benefits || plan.features || [],
    badge: plan.badge || (plan.isPopular ? 'Most Popular' : plan.isRecommended ? 'Recommended' : ''),
    termPricing: plan.termPricing || null,
    href: '/classes',
  };
}

export function shapeServiceForChat(svc) {
  return {
    id: svc._id || svc.id || svc.slug || svc.name,
    name: svc.name,
    slug: svc.slug || '',
    description: svc.description || '',
    category: svc.category || 'General',
    type: svc.type || '',
    mode: svc.mode || 'center',
    price: svc.price ?? null,
    pricingModel: svc.pricingModel || 'flat',
    sessionDuration: svc.sessionDuration || 60,
    image: svc.image || null,
    href: svc.slug ? `/restore` : '/private',
    // heuristic routing
    route:
      svc.category === 'Specialty' && /MAMA|YOUNG|AGE WELL/i.test(svc.name)
        ? '/life-stages'
        : /massage|meditation|signature|stillness|acacia/i.test(svc.name)
          ? '/restore'
          : '/private',
  };
}
