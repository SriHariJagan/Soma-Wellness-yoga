import mongoose from 'mongoose';
import transporter from '../mailer.js';
import Notification from '../models/Notification.js';
import { getNotificationQueue } from '../notification/queue/notificationQueue.js';
import logger from '../notification/logger.js';

const MODULE = 'SystemHealthCtrl';

function getSmtpNote(status) {
  if (!status.configured) return 'SMTP not configured — emails are logged, not sent';
  if (!status.verified) return 'SMTP configured but last verification failed — check credentials';
  return 'SMTP is operational';
}

export async function getEmailHealth(req, res) {
  const mongoState = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const database = stateMap[mongoState] || 'unknown';

  let smtpStatus = { configured: false, verified: false };
  try {
    smtpStatus = transporter.getStatus();
  } catch { }

  let queueData = { waiting: 0, active: 0, completed: 0, failed: 0 };
  let queueAvailable = false;
  try {
    const queue = getNotificationQueue();
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    queueData = { waiting, active, completed, failed };
    queueAvailable = true;
  } catch (err) {
    logger.warn(MODULE, 'BullMQ queue not available', { error: err.message });
  }

  let notifStats = { successCount: 0, failedCount: 0, pendingCount: 0 };
  try {
    const [successCount, failedCount, pendingCount] = await Promise.all([
      Notification.countDocuments({ status: { $in: ['sent', 'delivered'] } }),
      Notification.countDocuments({ status: 'failed' }),
      Notification.countDocuments({ status: 'pending' }),
    ]);
    notifStats = { successCount, failedCount, pendingCount };
  } catch (err) {
    logger.error(MODULE, 'Failed to fetch notification stats', { error: err.message });
  }

  let recent = [];
  try {
    recent = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('email type status createdAt title')
      .lean();
    recent = recent.map((n) => ({
      id: n._id,
      email: n.email || 'system',
      type: n.type || 'general',
      status: n.status || 'pending',
      createdAt: n.createdAt,
    }));
  } catch (err) {
    logger.error(MODULE, 'Failed to fetch recent notifications', { error: err.message });
  }

  const smtpNote = getSmtpNote(smtpStatus);

  res.json({
    database,
    smtp: { status: smtpStatus.verified ? 'verified' : smtpStatus.configured ? 'unverified' : 'unconfigured', note: smtpNote },
    notifications: { ...notifStats, recent },
    queue: queueAvailable ? queueData : { waiting: 0, active: 0, completed: 0, failed: 0, unavailable: true },
    timestamp: new Date().toISOString(),
  });
}

export async function testSmtp(req, res) {
  const adminEmail = req.user?.email;
  if (!adminEmail) {
    return res.status(400).json({ success: false, error: 'Admin user has no email on record' });
  }

  try {
    const info = await transporter.sendMail({
      to: adminEmail,
      subject: 'Pragya Yoga — SMTP Health Check',
      text: `This is a test email from Pragya Yoga's admin system.\n\nIf you received this, your SMTP configuration is working correctly.\n\nTimestamp: ${new Date().toISOString()}\n`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
          <h2 style="color:#FA8112;">Pragya Yoga — SMTP Health Check</h2>
          <p>This is a test email from your admin system.</p>
          <p style="padding:12px;background:#f5f5f5;border-radius:8px;">
            ✅ SMTP configuration is working correctly.
          </p>
          <p style="font-size:12px;color:#888;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    logger.info(MODULE, 'SMTP test email sent', { to: adminEmail, messageId: info.messageId });

    res.json({ success: true, message: `Test email sent to ${adminEmail}`, messageId: info.messageId });
  } catch (err) {
    logger.error(MODULE, 'SMTP test email failed', { to: adminEmail, error: err.message });
    res.status(500).json({ success: false, error: `Failed to send test email: ${err.message}` });
  }
}
