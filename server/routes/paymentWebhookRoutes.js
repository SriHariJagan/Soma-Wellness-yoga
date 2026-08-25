import express from 'express';
import { WebhookService } from '../payment/services/WebhookService.js';
import { WebhookEventRepository } from '../payment/repository/WebhookEventRepository.js';
import { enqueueWebhookRetry } from '../payment/queue/WebhookQueue.js';
import logger from '../notification/logger.js';

const MODULE = 'WebhookRoutes';
const router = express.Router();

const webhookService = new WebhookService();
const webhookEventRepo = new WebhookEventRepository();

router.post('/', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  const signature = req.headers['x-razorpay-signature'];

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    logger.warn(MODULE, 'Invalid JSON in webhook body');
    return res.status(400).json({ status: 'error', message: 'Invalid JSON' });
  }

  if (!webhookService.verifySignature(rawBody, signature)) {
    logger.warn(MODULE, 'Webhook signature verification failed', {
      event: payload.event,
      eventId: payload.event_id,
    });
    return res.status(401).json({ status: 'error', message: 'Invalid signature' });
  }

  if (!webhookService.preventReplay(payload)) {
    return res.status(403).json({ status: 'error', message: 'Event too old – possible replay' });
  }

  const event = payload.event;
  const eventId = payload.event_id;

  if (!event || !eventId) {
    logger.warn(MODULE, 'Webhook missing event or event_id');
    return res.status(400).json({ status: 'error', message: 'Missing event or event_id' });
  }

  try {
    const existing = await webhookEventRepo.findByIdempotent(eventId);
    if (existing) {
      logger.info(MODULE, 'Idempotent webhook – already processed', { eventId, event });
      return res.json({ status: 'ok', idempotent: true });
    }

    const webhookEvent = await webhookEventRepo.create({
      eventId,
      event,
      payload,
      rawBody,
      signature,
      status: 'processing',
      attempts: 1,
    });

    try {
      const result = await webhookService.processEvent(event, payload, rawBody, signature);

      await webhookEventRepo.updateStatus(webhookEvent._id, 'processed', {
        processedAt: new Date(),
        paymentStatus: result.handled ? 'handled' : 'unhandled',
      });

      logger.info(MODULE, 'Webhook processed successfully', {
        eventId,
        event,
        action: result.action || 'stored',
        handled: result.handled,
      });

      return res.json({ status: 'ok' });
    } catch (processErr) {
      logger.error(MODULE, 'Webhook processing failed – enqueuing retry', {
        eventId,
        event,
        error: processErr.message,
      });

      await webhookEventRepo.markFailed(webhookEvent._id, processErr.message);

      if (webhookService.isRetryable(processErr)) {
        enqueueWebhookRetry(eventId, processErr.message)
          .catch((qErr) => logger.error(MODULE, 'Failed to enqueue webhook retry', {
            eventId,
            error: qErr.message,
          }));
      }

      // Return 500 so Razorpay retries — but skip if the event was already idempotent
      return res.status(500).json({ status: 'error', message: 'Processing failed, will retry' });
    }
  } catch (err) {
    logger.error(MODULE, 'Webhook handler error', {
      eventId,
      event,
      error: err.message,
    });
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
