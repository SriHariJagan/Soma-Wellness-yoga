// ============================================================
// routes/whatsappRoutes.js — WhatsApp messaging endpoints
// All routes require authentication
// ============================================================
import { Router } from 'express';
import {
  sendMessage,
  sendToUser,
  broadcast,
  getStatus,
  verify,
  webhook,
} from '../controllers/whatsappController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Webhook verification (unauthenticated — Meta calls this)
router.get('/webhook', webhook);
router.post('/webhook', webhook);

// Status check (authenticated)
router.get('/status', requireAuth, getStatus);

// Verify connection (admin only)
router.post('/verify', requireAuth, requireAdmin, verify);

// Send direct message (admin only)
router.post('/send', requireAuth, requireAdmin, sendMessage);

// Send to specific user (admin only)
router.post('/send-to-user', requireAuth, requireAdmin, sendToUser);

// Broadcast (admin only)
router.post('/broadcast', requireAuth, requireAdmin, broadcast);

export default router;
