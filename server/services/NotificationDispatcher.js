import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import NotificationRecipient from '../models/NotificationRecipient.js';
import User from '../models/User.js';
import notificationService from '../notification/core/NotificationService.js';
import logger from '../notification/logger.js';

const MODULE = 'NotificationDispatcher';

/**
 * Centralized Notification Dispatcher
 *
 * SINGLE entry point for ALL notification creation across the system.
 *
 * Guarantees:
 *  - Every Notification ALWAYS has at least one NotificationRecipient
 *  - unreadNotifications is always incremented per recipient
 *  - Channel dispatch (email, etc.) is handled consistently
 *  - No Notification can exist without a corresponding recipient record
 *
 * Usage:
 *   import dispatcher from './services/NotificationDispatcher.js';
 *
 *   // Single recipient
 *   await dispatcher.dispatch({ recipients: userId, title, message, type: 'info' });
 *
 *   // Broadcast
 *   await dispatcher.dispatch({ recipients: [id1, id2, id3], title, message });
 *
 *   // With channels (email + in-app)
 *   await dispatcher.dispatch({ recipients: userId, channels: ['inApp', 'email'], template: 'welcome' });
 */
class NotificationDispatcher {
  /**
   * Core dispatch method.
   *
   * @param {Object} options
   * @param {ObjectId|string|ObjectId[]|string[]} options.recipients - Single or multiple user IDs
   * @param {string}  [options.title='']       - Notification title (in-app heading)
   * @param {string}  [options.message='']     - Notification body
   * @param {string}  [options.type='general'] - Notification type enum value
   * @param {string}  [options.priority='normal']
   * @param {string[]}[options.channels]       - Delivery channels (default: ['inApp'] for single, none for broadcast)
   * @param {string}  [options.template]       - Template key for content resolution
   * @param {Object}  [options.data={}]        - Template interpolation data
   * @param {string}  [options.link='']        - Deep-link URL
   * @param {string}  [options.email]          - Override recipient email
   * @param {string}  [options.subject]        - Email subject override
   * @param {ObjectId}[options.sender]         - Admin sender ID (for broadcasts)
   * @param {Date}    [options.scheduledAt]    - Future delivery timestamp
   * @param {string}  [options.correlationId]  - Deduplication / tracking ID
   * @param {Object}  [options.metadata={}]    - Extra metadata stored on the notification
   * @param {Object}  [options.workshop]       - Workshop ObjectId reference
   * @param {Object}  [options.asset]          - Asset ObjectId reference
   * @param {string}  [options.assetName]      - Asset display name
   * @param {string}  [options.category]       - Notification category
   * @param {Object}  [options.courseId]       - Course ObjectId reference
   * @param {Object}  [options.serviceId]      - Service ObjectId reference
   * @param {Object}  [options.planId]         - Plan ObjectId reference
   * @param {Object}  [options.workshopId]     - Workshop ObjectId reference
   * @param {string}  [options.url]            - URL for broadcast notification
   * @param {string}  [options.route]          - Route for broadcast notification
   * @param {mongoose.ClientSession} [options.session] - MongoDB session (transactions)
   * @returns {Promise<Object|null>} The created Notification document (or null if no recipients)
   */
  async dispatch(options = {}) {
    const {
      recipients,
      title = '',
      message = '',
      type = 'general',
      priority = 'normal',
      channels: rawChannels,
      template,
      data = {},
      link = '',
      email: recipientEmail,
      subject,
      sender,
      scheduledAt,
      correlationId,
      metadata,
      workshop,
      asset,
      assetName,
      category,
      courseId,
      serviceId,
      planId,
      workshopId,
      url,
      route,
      session,
    } = options;

    // ── Normalize recipients ──
    const recipientIds = this._toArray(recipients).filter(Boolean);
    if (recipientIds.length === 0 && !recipientEmail) {
      logger.warn(MODULE, 'dispatch called without any recipients', { title });
      return null;
    }

    // ── For a single user, delegate to notificationService.send() ──
    // This keeps the existing channel-dispatch pipeline (NotificationLog + BullMQ)
    // and prevents code duplication.
    if (recipientIds.length === 1) {
      return this._dispatchSingle(recipientIds[0], {
        title,
        message,
        type,
        priority,
        channels: rawChannels,
        template,
        data,
        link,
        email: recipientEmail,
        subject,
        sender,
        scheduledAt,
        correlationId,
        workshop,
        asset,
        assetName,
        category,
        courseId,
        serviceId,
        planId,
        workshopId,
        url,
        route,
      });
    }

    // ── Broadcast / multi-recipient ──
    // Create one Notification + N NotificationRecipients, then dispatch channels
    // for each recipient without creating duplicate Notification documents.
    return this._dispatchBroadcast(recipientIds, {
      title,
      message,
      type,
      priority,
      channels: rawChannels || ['inApp'],
      template,
      data,
      link,
      email: recipientEmail,
      subject,
      sender,
      scheduledAt,
      correlationId,
      workshop,
      asset,
      assetName,
      category,
      courseId,
      serviceId,
      planId,
      workshopId,
      url,
      route,
      session,
    });
  }

  /**
   * Convenience: single recipient with default channels=['inApp'].
   */
  async notify(userId, options = {}) {
    return this.dispatch({ ...options, recipients: userId });
  }

  /**
   * Convenience: broadcast to many recipients.
   */
  async broadcast(recipientIds, options = {}) {
    return this.dispatch({ ...options, recipients: recipientIds });
  }

  // ── Private ──────────────────────────────────────────────────

  async _dispatchSingle(userId, opts) {
    const { email, ...rest } = opts;
    return notificationService.send(userId, {
      ...rest,
      email: email || undefined,
      // inApp is always the default channel so NotificationRecipient is created
      channels: rest.channels && rest.channels.length > 0 ? rest.channels : ['inApp'],
    });
  }

  async _dispatchBroadcast(recipientIds, opts) {
    const {
      title,
      message,
      type,
      priority,
      channels,
      template,
      data,
      link,
      email: recipientEmail,
      subject,
      sender,
      scheduledAt,
      correlationId,
      workshop,
      asset,
      assetName,
      category,
      courseId,
      serviceId,
      planId,
      workshopId,
      url,
      route,
    } = opts;

    // Use a MongoDB transaction so that Notification, NotificationRecipient,
    // and User.unreadNotifications are created atomically.
    const mongooseSession = await mongoose.startSession();

    try {
      let notification;

      await mongooseSession.withTransaction(async () => {
        // Resolve an email for the notification record (use first recipient's email)
        let resolvedEmail = recipientEmail || '';
        if (!resolvedEmail) {
          const user = await User.findById(recipientIds[0]).select('email').lean().session(mongooseSession);
          resolvedEmail = user?.email || 'system';
        }

        // 1. Create the single Notification document
        [notification] = await Notification.create([{
          email: resolvedEmail,
          user: recipientIds[0],
          type,
          priority,
          channels,
          template: template || '',
          templateData: data,
          subject: subject || '',
          title,
          message,
          link,
          sender: sender || undefined,
          correlationId: correlationId || '',
          recipientEmail: recipientEmail || '',
          status: scheduledAt && scheduledAt > new Date() ? 'scheduled' : 'pending',
          scheduledAt: scheduledAt || null,
          recipientCount: recipientIds.length,
          readCount: 0,
          ...(workshop !== undefined ? { workshop } : {}),
          ...(asset !== undefined ? { asset } : {}),
          ...(assetName !== undefined ? { assetName } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(courseId !== undefined ? { courseId } : {}),
          ...(serviceId !== undefined ? { serviceId } : {}),
          ...(planId !== undefined ? { planId } : {}),
          ...(workshopId !== undefined ? { workshopId } : {}),
          ...(url !== undefined ? { url } : {}),
          ...(route !== undefined ? { route } : {}),
        }], { session: mongooseSession });

        // 2. Create NotificationRecipient for every recipient (bulk)
        const now = new Date();
        const recipientDocs = recipientIds.map((studentId) => ({
          notification: notification._id,
          student: studentId,
          deliveredAt: now,
        }));
        await NotificationRecipient.insertMany(recipientDocs, { session: mongooseSession });

        // 3. Increment unread counts in bulk
        await User.updateMany(
          { _id: { $in: recipientIds } },
          { $inc: { unreadNotifications: 1 } },
          { session: mongooseSession },
        );
      });

      // 4. Dispatch channels for each recipient (async, non-blocking)
      // NOTE: Channel dispatch happens OUTSIDE the transaction since it
      // involves external services (email, push) that cannot be rolled back.
      if (channels && channels.length > 0) {
        this._dispatchChannelsForBroadcast(notification, recipientIds, channels, {
          template, data, subject, title, message, email: recipientEmail,
          type, link, priority, scheduledAt, correlationId,
        }).catch((err) => {
          logger.error(MODULE, 'Broadcast channel dispatch failed', {
            notificationId: String(notification._id),
            error: err.message,
          });
        });
      }

      return notification;
    } finally {
      mongooseSession.endSession();
    }
  }

  async _dispatchChannelsForBroadcast(notification, recipientIds, channels, opts) {
    // For broadcast, we call send() for each recipient but pass _existingNotificationId
    // so send() skips Notification.create and reuses the existing notification.
    const promises = recipientIds.map((userId) =>
      notificationService.send(userId, {
        ...opts,
        channels,
        _existingNotificationId: notification._id,
      }).catch((err) => {
        logger.error(MODULE, 'Broadcast channel dispatch per-user failed', {
          userId: String(userId),
          notificationId: String(notification._id),
          error: err.message,
        });
      }),
    );
    await Promise.allSettled(promises);
  }

  _toArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }
}

const dispatcher = new NotificationDispatcher();
export default dispatcher;
