// ============================================================
// controllers/whatsappController.js — WhatsApp message endpoints
// Allows sending WhatsApp messages directly or via the
// notification system
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import WhatsAppProvider from '../notification/providers/WhatsAppProvider.js';
import { getChannel } from '../notification/registry.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import logger from '../notification/logger.js';

const MODULE = 'WhatsAppCtrl';
let provider = null;

function getProvider() {
  if (!provider) provider = new WhatsAppProvider();
  return provider;
}

// ── POST /api/whatsapp/send ───────────────────────────────────
/** Send a direct WhatsApp message (admin only) */
export const sendMessage = asyncHandler(async (req, res) => {
  const { phone, message, templateName, templateLanguage, templateComponents } = req.body;

  if (!phone) throw ApiError.badRequest('phone is required');

  if (!message && !templateName) {
    throw ApiError.badRequest('message or templateName is required');
  }

  const p = getProvider();
  if (!p.isConfigured) {
    throw ApiError.serviceUnavailable('WhatsApp is not configured');
  }

  let result;
  if (templateName) {
    result = await p.sendTemplate({
      to: phone,
      templateName,
      language: templateLanguage || 'en',
      components: templateComponents || [],
    });
  } else {
    result = await p.send({ to: phone, message });
  }

  logger.info(MODULE, 'Direct WhatsApp message sent', {
    by: req.user._id,
    to: phone,
    messageId: result.providerMessageId,
  });

  res.json({
    success: true,
    messageId: result.providerMessageId,
  });
});

// ── POST /api/whatsapp/send-to-user ───────────────────────────
/** Send a WhatsApp message to a specific user by userId */
export const sendToUser = asyncHandler(async (req, res) => {
  const { userId, message, templateName, templateLanguage } = req.body;

  if (!userId || !message) {
    throw ApiError.badRequest('userId and message are required');
  }

  const user = await User.findById(userId).select('name phone email');
  if (!user) throw ApiError.notFound('User not found');

  if (!user.phone) {
    throw ApiError.badRequest('User has no phone number');
  }

  const p = getProvider();
  if (!p.isConfigured) {
    throw ApiError.serviceUnavailable('WhatsApp is not configured');
  }

  let result;
  if (templateName) {
    result = await p.sendTemplate({
      to: user.phone,
      templateName,
      language: templateLanguage || 'en',
    });
  } else {
    result = await p.send({ to: user.phone, message });
  }

  logger.info(MODULE, 'WhatsApp message sent to user', {
    by: req.user._id,
    userId,
    userPhone: user.phone,
    messageId: result.providerMessageId,
  });

  res.json({
    success: true,
    messageId: result.providerMessageId,
    user: { name: user.name, phone: user.phone },
  });
});

// ── POST /api/whatsapp/broadcast ───────────────────────────────
/** Broadcast a WhatsApp message to multiple users */
export const broadcast = asyncHandler(async (req, res) => {
  const { userIds, message, templateName, templateLanguage } = req.body;

  if (!userIds?.length || !message) {
    throw ApiError.badRequest('userIds array and message are required');
  }

  const p = getProvider();
  if (!p.isConfigured) {
    throw ApiError.serviceUnavailable('WhatsApp is not configured');
  }

  const users = await User.find({
    _id: { $in: userIds },
    phone: { $exists: true, $ne: '' },
  }).select('name phone');

  if (!users.length) {
    throw ApiError.badRequest('No users with phone numbers found');
  }

  const results = [];
  const errors = [];

  for (const user of users) {
    try {
      let result;
      if (templateName) {
        result = await p.sendTemplate({
          to: user.phone,
          templateName,
          language: templateLanguage || 'en',
        });
      } else {
        result = await p.send({ to: user.phone, message });
      }
      results.push({ userId: user._id, messageId: result.providerMessageId });
    } catch (err) {
      errors.push({ userId: user._id, phone: user.phone, error: err.message });
      logger.warn(MODULE, 'Broadcast send failed', {
        userId: user._id, error: err.message,
      });
    }
  }

  logger.info(MODULE, 'Broadcast completed', {
    by: req.user._id,
    total: users.length,
    sent: results.length,
    failed: errors.length,
  });

  res.json({
    success: true,
    sent: results.length,
    failed: errors.length,
    results,
    errors,
  });
});

// ── GET /api/whatsapp/status ───────────────────────────────────
/** Check WhatsApp provider status */
export const getStatus = asyncHandler(async (req, res) => {
  const p = getProvider();
  const status = p.getStatus();
  res.json(status);
});

// ── POST /api/whatsapp/verify ──────────────────────────────────
/** Verify WhatsApp connection */
export const verify = asyncHandler(async (req, res) => {
  const p = getProvider();
  const ok = await p.verify();
  res.json({ verified: ok });
});

// ── POST /api/whatsapp/webhook ─────────────────────────────────
/** Handle incoming WhatsApp messages and status updates */
export const webhook = asyncHandler(async (req, res) => {
  // Verify the webhook (Meta sends a verification challenge)
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info(MODULE, 'Webhook verified');
    res.status(200).send(challenge);
    return;
  }

  // Process incoming messages and status updates
  const body = req.body;
  if (body.entry) {
    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'messages') {
          const value = change.value;
          // Handle status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              logger.info(MODULE, 'Message status update', {
                messageId: status.id,
                status: status.status,
                timestamp: status.timestamp,
              });
            }
          }
          // Handle incoming messages
          if (value.messages) {
            for (const msg of value.messages) {
              logger.info(MODULE, 'Incoming message', {
                from: msg.from,
                type: msg.type,
                messageId: msg.id,
              });
            }
          }
        }
      }
    }
  }

  res.json({ status: 'ok' });
});
