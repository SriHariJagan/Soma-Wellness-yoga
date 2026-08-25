import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import notificationService from '../notification/core/NotificationService.js';
import notificationScheduler from '../notification/scheduler.js';
import Notification from '../models/Notification.js';
import NotificationLog from '../models/NotificationLog.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.post('/send-welcome', asyncHandler(async (req, res) => {
  const { userId, data } = req.body;
  if (!userId) return res.status(400).json({ success: false, msg: 'userId is required' });

  const result = await notificationService.send(userId, {
    template: 'welcome',
    channels: ['inApp', 'email'],
    data: {
      name: data?.name || 'Test User',
      email: data?.email || '',
      loginLink: data?.loginLink || 'http://localhost:5173/login',
      ...(data || {}),
    },
  });

  res.json({ success: true, notification: result });
}));

router.post('/send-class-reminder', asyncHandler(async (req, res) => {
  const { userId, data } = req.body;
  if (!userId) return res.status(400).json({ success: false, msg: 'userId is required' });

  const result = await notificationService.send(userId, {
    template: 'class-reminder',
    channels: ['inApp', 'email'],
    data: {
      className: data?.className || 'Test Yoga Class',
      classDate: data?.classDate || new Date().toLocaleDateString('en-IN'),
      classTime: data?.classTime || '7:00 AM',
      instructor: data?.instructor || 'Test Instructor',
      meetLink: data?.meetLink || 'https://zoom.us/test',
      name: data?.name || 'Test Student',
    },
  });

  res.json({ success: true, notification: result });
}));

router.post('/send-event-reminder', asyncHandler(async (req, res) => {
  const { userId, data } = req.body;
  if (!userId) return res.status(400).json({ success: false, msg: 'userId is required' });

  const result = await notificationService.send(userId, {
    template: 'event-reminder',
    channels: ['inApp', 'email'],
    data: {
      eventName: data?.eventName || 'Test Yoga Event',
      eventDate: data?.eventDate || new Date().toLocaleDateString('en-IN'),
      eventTime: data?.eventTime || '10:00 AM',
      location: data?.location || 'Test Studio',
      meetLink: data?.meetLink || 'https://zoom.us/test',
      name: data?.name || 'Test Student',
    },
  });

  res.json({ success: true, notification: result });
}));

router.post('/tick-scheduler', asyncHandler(async (req, res) => {
  await notificationScheduler._tick();
  res.json({ success: true, msg: 'Scheduler tick completed' });
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email')
    .lean();
  res.json({ success: true, count: notifications.length, notifications });
}));

router.get('/notification-logs', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const logs = await NotificationLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email')
    .populate('notification', 'title type status')
    .lean();
  res.json({ success: true, count: logs.length, logs });
}));

export default router;
