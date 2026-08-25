import Notification from '../../models/Notification.js';
import NotificationLog from '../../models/NotificationLog.js';
import NotificationPreference from '../../models/NotificationPreference.js';
import NotificationRecipient from '../../models/NotificationRecipient.js';
import NotificationTemplate from '../../models/NotificationTemplate.js';
import NotificationSchedule from '../../models/NotificationSchedule.js';
import User from '../../models/User.js';
import { PRIORITY_LEVELS, NOTIFICATION_TYPES, NOTIFICATION_STATUSES, NOTIFICATION_CHANNELS } from '../../shared/constants/index.js';
import RetryStrategy from './RetryStrategy.js';
import logger from '../logger.js';
import { enqueueDelivery } from '../queue/notificationQueue.js';

const MODULE = 'NotificationService';
const ALWAYS_ALLOWED = new Set(['inApp']);

export class NotificationService {
  constructor() {
    this.retryStrategy = new RetryStrategy();
  }

  async send(userId, options = {}) {
    const {
      template: templateKey,
      channels: requestedChannels = ['inApp'],
      data = {},
      priority = 'normal',
      scheduledAt,
      correlationId,
      subject: overrideSubject,
      title: overrideTitle,
      message: overrideMessage,
      email: recipientEmail,
      type: overrideType,
      link: overrideLink,
      _existingNotificationId,
    } = options;

    if (!requestedChannels.length) return null;

    let templateDoc = null;
    if (templateKey) {
      templateDoc = await NotificationTemplate.findOne({ key: templateKey, active: true }).lean();
    }

    let prefs = null;
    let resolvedEmail = recipientEmail || '';
    if (userId) {
      prefs = await NotificationPreference.findOne({ user: userId }).lean();
      if (!resolvedEmail) {
        const user = await User.findById(userId).select('email').lean();
        resolvedEmail = user?.email || '';
      }
    }

    const allowedChannels = this._filterChannels(requestedChannels, prefs);
    if (allowedChannels.length === 0) return null;

    const primaryChannel = allowedChannels[0];
    const content = this._resolveContent(templateDoc, primaryChannel, data, {
      subject: overrideSubject,
      title: overrideTitle,
      message: overrideMessage,
    });

    // ── Use existing notification (for broadcast channel dispatch) or create new one ──
    let notification;
    if (_existingNotificationId) {
      notification = await Notification.findById(_existingNotificationId);
      if (!notification) throw new Error(`Existing notification not found: ${_existingNotificationId}`);
    } else {
      notification = await Notification.create({
        email: resolvedEmail || 'system',
        user: userId,
        type: overrideType || templateKey || 'general',
        priority,
        channels: allowedChannels,
        template: templateKey,
        templateData: data,
        subject: content.subject || '',
        title: content.title || '',
        message: content.message || 'Notification',
        richMessage: content.richMessage || '',
        correlationId: correlationId || '',
        recipientEmail: recipientEmail || '',
        link: overrideLink || '',
        status: scheduledAt && scheduledAt > new Date() ? 'scheduled' : 'pending',
        scheduledAt: scheduledAt || null,
      });

      if (userId) {
        User.findByIdAndUpdate(userId, { $inc: { unreadNotifications: 1 } }).catch(
          (err) => logger.error(MODULE, 'Failed to increment unread', { userId: String(userId), error: err.message }),
        );
        NotificationRecipient.create({
          notification: notification._id,
          student: userId,
          deliveredAt: new Date(),
        }).catch(
          (err) => logger.error(MODULE, 'Failed to create NotificationRecipient', { userId: String(userId), notificationId: String(notification._id), error: err.message }),
        );
      }
    }

    const now = new Date();
    const delay = scheduledAt && scheduledAt > now ? scheduledAt.getTime() - now.getTime() : 0;

    const enqueueResults = [];

    for (const channel of allowedChannels) {
      const isImmediate = !scheduledAt || scheduledAt <= now;
      const log = await NotificationLog.create({
        notification: notification._id,
        user: userId,
        channel,
        status: isImmediate ? 'queued' : 'scheduled',
        attempt: 0,
        maxAttempts: this.retryStrategy.maxAttempts(channel),
        queuedAt: isImmediate ? now : null,
      });

      logger.debug(MODULE, 'NotificationLog created', {
        logId: String(log._id),
        notificationId: String(notification._id),
        channel,
        status: log.status,
        correlationId: correlationId || undefined,
      });

      if (isImmediate || delay > 0) {
        try {
          await enqueueDelivery(log, {
            priority,
            delay,
            attempts: this.retryStrategy.maxAttempts(channel),
          });
          enqueueResults.push({ channel, success: true, logId: String(log._id) });
          logger.info(MODULE, 'Enqueued delivery', { logId: String(log._id), channel });
        } catch (err) {
          enqueueResults.push({ channel, success: false, logId: String(log._id), error: err.message });
          await NotificationLog.findByIdAndUpdate(log._id, {
            $set: {
              status: 'failed',
              lastError: `Enqueue failed: ${err.message}`,
              error: {
                code: 'ENQUEUE_FAILED',
                message: err.message,
                retryable: true,
              },
              failedAt: new Date(),
            },
          }).catch(() => {});
        }
      }
    }

    const allFailed = enqueueResults.length > 0 && enqueueResults.every((r) => !r.success);
    if (allFailed) {
      await Notification.findByIdAndUpdate(notification._id, { status: 'failed' }).catch(() => {});
    }

    logger.info(MODULE, 'Notification processed', {
      notificationId: String(notification._id),
      userId: userId ? String(userId) : '(anonymous)',
      template: templateKey || 'system',
      channels: allowedChannels,
      priority,
      correlationId: correlationId || undefined,
      enqueueResults,
    });

    return notification;
  }

  async retry(logId) {
    if (!logId) throw new Error('logId is required');

    const log = await NotificationLog.findById(logId);
    if (!log) throw new Error('Notification log not found');

    if (log.attempt >= log.maxAttempts) {
      throw new Error('Max retry attempts already reached');
    }

    if (log.status !== 'failed') {
      throw new Error(`Log is in status "${log.status}", not "failed"`);
    }

    log.status = 'queued';
    log.attempt += 1;
    log.lastError = '';
    log.nextRetryAt = null;
    log.error = { code: '', message: '', retryable: true };
    await log.save();

    logger.info(MODULE, 'Manual retry enqueued', { logId: String(logId) });

    return log;
  }

  async schedule(config = {}) {
    const { name, template, channels = ['inApp'], audience, trigger, data = {} } = config;

    if (!name || !template || !audience || !trigger) {
      throw new Error('schedule requires name, template, audience, and trigger');
    }

    const doc = await NotificationSchedule.create({
      name,
      template,
      channels,
      audience,
      trigger,
      templateData: data,
      status: 'active',
      nextRunAt: this._computeNextRun(trigger),
    });

    return doc;
  }

  async cancel(scheduleId) {
    if (!scheduleId) return null;
    const doc = await NotificationSchedule.findByIdAndUpdate(
      scheduleId,
      { status: 'paused' },
      { returnDocument: 'after' },
    );
    return doc;
  }

  async log(query = {}, opts = {}) {
    const { limit = 100, sort = { createdAt: -1 }, populate = true } = opts;

    let q = NotificationLog.find(query).sort(sort).limit(limit);

    if (populate) {
      q = q
        .populate('user', 'name email')
        .populate('notification', 'title type status');
    }

    return q.lean();
  }

  _filterChannels(requested, prefs) {
    return requested.filter((ch) => {
      if (ALWAYS_ALLOWED.has(ch)) return true;
      if (!prefs || !prefs.channels || typeof prefs.channels !== 'object') return true;
      if (!(ch in prefs.channels)) return false;
      return prefs.channels[ch] !== false;
    });
  }

  _resolveContent(templateDoc, channel, data, overrides) {
    const result = {
      subject: overrides.subject || '',
      title: overrides.title || '',
      message: overrides.message || '',
      richMessage: '',
    };

    if (templateDoc && templateDoc.channels && templateDoc.channels[channel]) {
      const chContent = templateDoc.channels[channel];
      result.subject   = overrides.subject   ?? (this._interpolate(chContent.subject, data)   || '');
      result.title     = overrides.title     ?? (this._interpolate(chContent.title, data)     || '');
      result.message   = overrides.message   ?? (this._interpolate(chContent.message, data)   || '');
      result.richMessage = this._interpolate(chContent.bodyHtml || chContent.bodyText || '', data);
    }

    return result;
  }

  _interpolate(str, data) {
    if (!str) return '';
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      data[key] !== undefined && data[key] !== null ? String(data[key]) : `{{${key}}}`,
    );
  }

  _computeNextRun(trigger) {
    if (trigger.cron) {
      return new Date(Date.now() + 3600_000);
    }
    if (trigger.delayMs) {
      return new Date(Date.now() + trigger.delayMs);
    }
    return new Date();
  }
}

const notificationService = new NotificationService();
export default notificationService;
