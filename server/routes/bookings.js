// ============================================================
// routes/bookings.js  —  mounted at /api/bookings
// Public create (from the payment page); admin manage.
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Booking from '../models/Booking.js';
import { BOOKING_STATUSES } from '../shared/constants/index.js';
import notificationService from '../notification/core/NotificationService.js';
import logger from '../notification/logger.js';

const MODULE = 'Booking';

const router = express.Router();

const bookingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many booking attempts, please slow down.' });

router.post('/', bookingLimiter, validate(schemas.booking), asyncHandler(async (req, res) => {
  const { name, email, phone, city, courseName, coursePrice, courseTime, paymentMethod, transactionId, message } = req.body;
  const booking = await Booking.create({
    name, email, phone, city,
    courseName, coursePrice, courseTime,
    paymentMethod, transactionId, message,
    status: 'Pending',
  });

  // Admin in-app notification.
  notificationService.send(null, {
    channels: ['inApp'],
    data: { name, email, courseName, coursePrice },
    subject: 'New booking received',
    message: `<strong>${name}</strong> booked <strong>${courseName}</strong> (₹${coursePrice}).`,
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Admin notification failed', { error: err.message }));

  // Customer confirmation email.
  notificationService.send(null, {
    template: 'booking-confirmation',
    channels: ['email'],
    email: email,
    data: { name, email, courseName, coursePrice },
    subject: `Booking Confirmed: ${courseName}`,
    title: 'Booking Confirmed!',
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Confirmation email failed', { error: err.message, email }));

  res.status(201).json({ success: true, message: 'Booking confirmed!', booking });
}));

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await Booking.find().sort({ createdAt: -1 }));
}));

router.patch('/:id/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!BOOKING_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
  const updated = await Booking.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!updated) throw ApiError.notFound('Booking not found');
  res.json(updated);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await Booking.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Booking not found');
  res.json({ success: true, msg: 'Booking deleted' });
}));

export default router;
