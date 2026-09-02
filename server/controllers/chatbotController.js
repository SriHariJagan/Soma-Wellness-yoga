// ============================================================
// controllers/chatbotController.js — SOMA Wellness Chatbot
// Handles chatbot enquiries + public config (WhatsApp number)
// ============================================================
/* global process */
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ChatbotEnquiry from '../models/ChatbotEnquiry.js';
import Lead from '../models/lead.js';
import User from '../models/User.js';
import notificationService from '../notification/core/NotificationService.js';
import emailService from '../services/email/email.service.js';
import logger from '../notification/logger.js';

const MODULE = 'Chatbot';

// ── Validation helpers (mirrors frontend, but server is source of truth) ──
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-()]{6,19}$/;

function sanitizeStr(v, max = 2000) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).trim();
  return req.socket?.remoteAddress || req.ip || '';
}

// ── POST /api/chatbot/enquiries ────────────────────────────
export const createChatbotEnquiry = asyncHandler(async (req, res) => {
  const {
    name: rawName,
    email: rawEmail,
    phone: rawPhone,
    interestedType: rawType,
    interestedItem: rawItem,
    interestedItemId: rawItemId,
    message: rawMessage,
    currentPage: rawPage,
    source: rawSource,
  } = req.body;

  const name = sanitizeStr(rawName, 100);
  const email = sanitizeStr(rawEmail, 255).toLowerCase();
  const phone = sanitizeStr(rawPhone, 20);
  const interestedTypeRaw = sanitizeStr(rawType, 30).toLowerCase() || 'general';
  const interestedItem = sanitizeStr(rawItem, 200);
  const interestedItemId = sanitizeStr(rawItemId, 100);
  const message = sanitizeStr(rawMessage, 2000);
  const currentPage = sanitizeStr(rawPage, 500);
  const source = sanitizeStr(rawSource, 30) || 'chatbot';

  const allowedTypes = new Set(['course', 'program', 'package', 'membership', 'general']);
  const interestedType = allowedTypes.has(interestedTypeRaw) ? interestedTypeRaw : 'general';

  // ── Validation (server-side, do not trust client) ──
  const errors = [];
  if (!name || name.length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  if (name.length > 100) errors.push({ field: 'name', message: 'Name too long' });
  if (!email || !EMAIL_RE.test(email)) errors.push({ field: 'email', message: 'Valid email is required' });
  if (!phone || !PHONE_RE.test(phone)) errors.push({ field: 'phone', message: 'Valid phone number is required' });
  if (!message || message.length < 10) errors.push({ field: 'message', message: 'Message must be at least 10 characters' });
  if (message.length > 2000) errors.push({ field: 'message', message: 'Message too long (max 2000)' });
  if (interestedItem.length > 200) errors.push({ field: 'interestedItem', message: 'Interested item too long' });

  if (errors.length) {
    throw new ApiError(400, 'Validation failed', errors);
  }

  const ip = getClientIp(req);
  const userAgent = sanitizeStr(req.headers['user-agent'] || '', 500);

  // ── Spam guard: throttle same email to 5 enquiries per hour ──
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await ChatbotEnquiry.countDocuments({
    email,
    createdAt: { $gte: oneHourAgo },
  });
  if (recentCount >= 5) {
    throw new ApiError(429, 'Too many enquiries. Please try again later or contact us on WhatsApp.');
  }

  const enquiry = await ChatbotEnquiry.create({
    name,
    email,
    phone,
    interestedType,
    interestedItem,
    interestedItemId,
    message,
    source,
    currentPage,
    userAgent,
    ip,
    status: 'new',
  });

  // ── Mirror to Lead pipeline so admins see it in existing dashboard ──
  const interestTypeLabel =
    interestedType === 'general'
      ? 'Chatbot Enquiry'
      : `Chatbot: ${interestedType}${interestedItem ? ` — ${interestedItem}` : ''}`;

  // Fire-and-forget mirroring (do not block response on failure)
  Lead.create({
    name,
    phone,
    email,
    interestType: interestTypeLabel,
    notes: `Source: ${source} | Page: ${currentPage || 'unknown'} | Item: ${interestedItem || '—'} | Message: ${message}`,
    stage: 'New',
  }).catch((err) => logger.warn(MODULE, 'Lead mirror failed', { error: err.message }));

  // ── Admin notifications (in-app + email) — best-effort ──
  try {
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    for (const admin of admins) {
      notificationService
        .send(admin._id, {
          channels: ['inApp'],
          data: { name, phone, email, interestType: interestTypeLabel },
          subject: 'New chatbot enquiry',
          message: `<strong>${name}</strong> (${email}) enquired via chatbot about ${interestedItem || interestedType}.`,
          priority: 'low',
        })
        .catch((err) => logger.warn(MODULE, 'Admin in-app notify failed', { error: err.message }));
    }
  } catch (err) {
    logger.warn(MODULE, 'Admin lookup failed', { error: err.message });
  }

  // Admin email
  emailService
    .sendEnquiryAdmin({
      name,
      email,
      phone,
      subject: interestTypeLabel,
      message: `Chatbot enquiry\n\nInterested in: ${interestedType}${interestedItem ? ` — ${interestedItem}` : ''}\nPage: ${currentPage || '—'}\nSource: ${source}\n\nMessage:\n${message}`,
      submissionDate: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
      ip,
    })
    .catch((err) => logger.warn(MODULE, 'Admin email failed', { error: err.message }));

  // Visitor auto-reply
  emailService
    .sendEnquiry({ name: name || 'there', email })
    .catch((err) => logger.warn(MODULE, 'Auto-reply failed', { error: err.message, email }));

  res.status(201).json({
    success: true,
    message: 'Enquiry received',
    id: enquiry._id,
  });
});

// ── GET /api/chatbot/config (public) ───────────────────────
export const getChatbotConfig = asyncHandler(async (req, res) => {
  const rawDisplay = process.env.WHATSAPP_DISPLAY_PHONE || process.env.WHATSAPP_NUMBER || '';
  // Fallback to site phone if env not set
  const fallback = '+254700000000';
  const displayPhone = rawDisplay || fallback;
  // Normalise to digits for wa.me (strip + and spaces)
  const waNumber = displayPhone.replace(/[^0-9]/g, '') || '254700000000';

  res.json({
    whatsappNumber: waNumber,
    whatsappDisplay: displayPhone,
    // Expose only non-sensitive chatbot settings
    welcomeDelayMs: 6500,
    sessionKey: 'soma_chatbot_welcome_dismissed',
  });
});

// ── GET /api/chatbot/enquiries (admin only) ────────────────
export const listChatbotEnquiries = asyncHandler(async (req, res) => {
  const { status, limit = '50', page = '1' } = req.query;
  const q = {};
  if (status) q.status = status;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const [items, total] = await Promise.all([
    ChatbotEnquiry.find(q).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
    ChatbotEnquiry.countDocuments(q),
  ]);
  res.json({ items, total, page: pg, limit: lim, pages: Math.ceil(total / lim) });
});

// ── PATCH /api/chatbot/enquiries/:id/status (admin) ───────
export const updateChatbotEnquiryStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = new Set(['new', 'contacted', 'converted', 'closed']);
  if (!allowed.has(status)) throw ApiError.badRequest('Invalid status');
  const doc = await ChatbotEnquiry.findByIdAndUpdate(
    req.params.id,
    { status },
    { returnDocument: 'after' }
  );
  if (!doc) throw ApiError.notFound('Enquiry not found');
  res.json(doc);
});
