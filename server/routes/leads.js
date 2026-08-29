// ============================================================
// routes/leads.js  —  mounted at /api/leads
// Public create (contact / enquiry forms); admin manage pipeline.
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Lead from '../models/lead.js';
import User from '../models/User.js';
import { LEAD_STAGES } from '../shared/constants/index.js';
import notificationService from '../notification/core/NotificationService.js';
import emailService from '../services/email/email.service.js';
import logger from '../notification/logger.js';

const MODULE = 'Lead';

const router = express.Router();

router.post('/', validate(schemas.lead), asyncHandler(async (req, res) => {
  const { name, phone, email, interestType, notes } = req.body;
  const lead = await Lead.create({ name, phone, email, interestType, notes, stage: 'New' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

  // In-app notification to all admins (existing behaviour)
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  for (const admin of admins) {
    notificationService.send(admin._id, {
      channels: ['inApp'],
      data: { name, phone, email, interestType },
      subject: 'New lead received',
      message: `<strong>${name}</strong> ${email ? `(${email})` : ''} is interested in ${interestType || 'yoga'}.`,
      priority: 'low',
    }).catch((err) => logger.error(MODULE, 'Admin notification failed', { error: err.message }));
  }

  // Email 1: Admin notification via new email service
  if (email) {
    emailService.sendEnquiryAdmin({
      name,
      email,
      phone,
      subject: interestType || 'Website Enquiry',
      message: notes || '',
      submissionDate: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
      ip,
    }).catch((err) => logger.error(MODULE, 'Admin email failed', { error: err.message }));
  }

  // Email 2: Auto-reply to visitor via new email service
  if (email) {
    emailService.sendEnquiry({
      name: name || 'there',
      email,
    }).catch((err) => logger.error(MODULE, 'Auto-reply failed', { error: err.message, email }));
  }

  res.status(201).json(lead);
}));

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await Lead.find().sort({ createdAt: -1 }));
}));

router.patch('/:id/stage', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (!LEAD_STAGES.includes(stage)) throw ApiError.badRequest('Invalid stage');
  const updated = await Lead.findByIdAndUpdate(req.params.id, { stage }, { returnDocument: 'after' });
  if (!updated) throw ApiError.notFound('Lead not found');
  res.json(updated);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await Lead.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Lead not found');
  res.json({ success: true, msg: 'Lead deleted' });
}));

export default router;
