// ============================================================
// routes/chatbot.js — mounted at /api/chatbot
// Public: POST /enquiries, GET /config
// Admin:  GET /enquiries, PATCH /enquiries/:id/status
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as ctrl from '../controllers/chatbotController.js';

const router = express.Router();

// ── Public ───────────────────────────────────────────────────
router.get('/config', ctrl.getChatbotConfig);

// Stricter rate limit for enquiries: 10 per 15 min per IP (spam protection)
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many enquiries, please slow down.',
});
router.post('/enquiries', enquiryLimiter, ctrl.createChatbotEnquiry);

// ── Admin ────────────────────────────────────────────────────
router.get('/enquiries', requireAuth, requireAdmin, ctrl.listChatbotEnquiries);
router.patch('/enquiries/:id/status', requireAuth, requireAdmin, ctrl.updateChatbotEnquiryStatus);

export default router;
