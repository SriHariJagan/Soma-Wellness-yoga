import Notification from '../../models/Notification.js';
import NotificationLog from '../../models/NotificationLog.js';
import { getChannel } from '../registry.js';
import { withTimeout } from '../../utils/timeout.js';
import logger from '../logger.js';
import { enqueueDLQ } from './dlq.js';
import { validateChannelResult } from '../channelInterface.js';

const MODULE = 'QueueHandler';

function classifyError(err) {
  const code = err.code || '';

  if (code === 'INVALID_RECIPIENT' || code === 'MISSING_FROM') return { retryable: false, reason: 'configuration_error' };
  if (code === 'EAUTH') return { retryable: false, reason: 'authentication_failure' };
  if (code === 'INVALID_CHANNEL_RESULT') return { retryable: false, reason: 'channel_contract_violation' };
  if (code === 'CHANNEL_NOT_FOUND') return { retryable: false, reason: 'channel_not_registered' };
  if (code === 'NOTIFICATION_NOT_FOUND') return { retryable: false, reason: 'notification_deleted' };
  if (code === 'REJECTED') return { retryable: false, reason: 'provider_rejected' };
  if (code === 'SMTP_VALIDATION_FAILED') return { retryable: false, reason: 'smtp_response_invalid' };
  if (code === 'TIMEOUT') return { retryable: true, reason: 'delivery_timed_out' };
  if (code === 'ERATE') return { retryable: true, reason: 'rate_limited' };
  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ECOMPARE') return { retryable: true, reason: 'network_error' };

  return { retryable: true, reason: 'unknown_error' };
}

async function _markLogFailed(logId, err, options = {}) {
  const classification = classifyError(err);
  const update = {
    status: 'failed',
    lastError: err.message || 'Unknown error',
    failedAt: new Date(),
    error: {
      code: err.code || 'DELIVERY_ERROR',
      message: err.message || 'Unknown error',
      retryable: options.retryable !== undefined ? options.retryable : classification.retryable,
    },
  };

  await NotificationLog.findByIdAndUpdate(logId, { $set: update });
}

async function _updateLogAndNotification(logId, notificationId, result, resolvedEmail) {
  await NotificationLog.findByIdAndUpdate(logId, {
    $set: {
      status: 'sent',
      providerMessageId: result.providerMessageId || '',
      providerResponse: result.providerResponse || null,
      sentAt: new Date(),
    },
  });

  const notifUpdate = { status: 'sent' };
  if (resolvedEmail) {
    notifUpdate.email = resolvedEmail;
  }
  await Notification.findByIdAndUpdate(notificationId, { $set: notifUpdate }).catch(
    (e) => logger.error(MODULE, 'Failed to update notification status', {
      notificationId,
      error: e.message,
    }),
  );
}

export async function processDelivery(jobData) {
  const { logId, notificationId, channel: channelName } = jobData;

  const claimed = await NotificationLog.findOneAndUpdate(
    { _id: logId, status: 'queued' },
    { $set: { status: 'sending' } },
    { returnDocument: 'after' },
  );

  if (!claimed) {
    logger.warn(MODULE, 'Delivery skipped — log already claimed', { logId, notificationId });
    return { skipped: true, reason: 'Already claimed' };
  }

  const channel = getChannel(channelName);
  if (!channel) {
    await _markLogFailed(logId, new Error(`Channel "${channelName}" not registered`), { retryable: false });
    logger.error(MODULE, 'Delivery failed — channel not registered', { logId, notificationId, channel: channelName });
    return { failed: true, reason: 'Channel not registered' };
  }

  const notification = await Notification.findById(notificationId)
    .populate('user', 'name email phone city');

  if (!notification) {
    await _markLogFailed(logId, new Error(`Notification ${notificationId} not found`), { retryable: false });
    logger.error(MODULE, 'Delivery failed — notification not found', { logId, notificationId });
    return { failed: true, reason: 'Notification not found' };
  }

  const resolvedEmail = notification.email || notification.user?.email || '';

  let result;
  try {
    result = await withTimeout(channel.send(notification), 120000, `channel:${channelName}`);
  } catch (err) {
    // If the error is TIMEOUT and the channel.send() may have actually
    // completed after the race, the orphaned promise handler in
    // timeout.js will log it. We still mark this attempt as failed
    // because we cannot confirm delivery.
    await _markLogFailed(logId, err);
    throw err;
  }

  try {
    validateChannelResult(result);
  } catch (validationError) {
    await _markLogFailed(logId, validationError, { retryable: false });
    logger.error(MODULE, 'Channel contract validation failed', {
      logId, notificationId, channel: channelName,
      error: validationError.message,
    });
    throw validationError;
  }

  await _updateLogAndNotification(logId, notificationId, result, resolvedEmail);

  logger.info(MODULE, 'Delivery completed', {
    logId,
    notificationId,
    channel: channelName,
    messageId: result.providerMessageId,
  });

  return { success: true, providerMessageId: result.providerMessageId };
}

export async function deliveryJobHandler(job) {
  const start = Date.now();
  const { logId, channel } = job.data;
  const attempt = job.attemptsMade + 1;

  logger.info(MODULE, 'Processing job', {
    jobId: job.id,
    logId,
    channel,
    attempt,
    remainingAttempts: job.opts.attempts - attempt,
  });

  try {
    const result = await processDelivery(job.data);
    const duration = Date.now() - start;
    logger.info(MODULE, 'Job completed', {
      jobId: job.id,
      logId,
      channel,
      attempt,
      duration,
      result: result?.success ? 'sent' : result?.skipped ? 'skipped' : 'failed',
      messageId: result?.providerMessageId,
    });
    return result;
  } catch (err) {
    const duration = Date.now() - start;

    if (attempt >= job.opts.attempts) {
      logger.error(MODULE, 'All retries exhausted — moving to DLQ', {
        jobId: job.id,
        logId,
        channel,
        attempt,
        duration,
        error: err.message,
        errorCode: err.code,
      });

      try {
        await enqueueDLQ({
          originalJobId: job.id,
          logId,
          notificationId: job.data.notificationId,
          channel,
          error: { code: err.code, message: err.message },
          failedAt: new Date(),
          attempts: attempt,
        });
      } catch (dlqErr) {
        logger.error(MODULE, 'Failed to enqueue DLQ — Redis may be unavailable', {
          jobId: job.id,
          logId,
          channel,
          dlqError: dlqErr.message,
        });
      }

      await _markLogFailed(logId, err);

      await Notification.findByIdAndUpdate(job.data.notificationId, { $set: { status: 'failed', email: resolvedEmail } }).catch(
        (e) => logger.error(MODULE, 'Failed to mark notification failed', {
          notificationId: job.data.notificationId,
          error: e.message,
        }),
      );
    } else {
      const classification = classifyError(err);
      if (!classification.retryable) {
        logger.error(MODULE, 'Non-retryable error — exhausting retries immediately', {
          jobId: job.id,
          logId,
          channel,
          attempt,
          error: err.message,
          errorCode: err.code,
          reason: classification.reason,
        });

        await NotificationLog.findByIdAndUpdate(logId, {
          $set: {
            status: 'failed',
            lastError: `[Non-retryable] ${err.message}`,
            failedAt: new Date(),
            error: {
              code: err.code || 'DELIVERY_ERROR',
              message: err.message || 'Unknown error',
              retryable: false,
            },
          },
        });

        await Notification.findByIdAndUpdate(job.data.notificationId, { status: 'failed' }).catch(() => {});

        try {
          await enqueueDLQ({
            originalJobId: job.id,
            logId,
            notificationId: job.data.notificationId,
            channel,
            error: { code: err.code, message: err.message },
            failedAt: new Date(),
            attempts: attempt,
          });
        } catch { }

        return { failed: true, reason: 'Non-retryable error — exhausted' };
      }

      logger.warn(MODULE, 'Delivery failed — will retry', {
        jobId: job.id,
        logId,
        channel,
        attempt,
        duration,
        error: err.message,
        errorCode: err.code,
        remainingAttempts: job.opts.attempts - attempt,
      });

      await _markLogFailed(logId, err);
    }

    throw err;
  }
}

export default { processDelivery, deliveryJobHandler };
