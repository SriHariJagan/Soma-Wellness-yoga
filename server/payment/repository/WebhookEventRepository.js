import WebhookEvent from '../models/WebhookEvent.js';
import logger from '../../notification/logger.js';

const MODULE = 'WebhookEventRepository';

export class WebhookEventRepository {
  async create(data) {
    const doc = await WebhookEvent.create(data);
    logger.info(MODULE, 'Webhook event stored', {
      eventId: doc.eventId,
      event: doc.event,
      status: doc.status,
    });
    return doc;
  }

  async findByEventId(eventId) {
    return WebhookEvent.findOne({ eventId });
  }

  async findByIdempotent(eventId) {
    return WebhookEvent.findByIdempotent(eventId);
  }

  async updateStatus(id, status, extra = {}) {
    const update = { $set: { status, ...extra } };
    if (status === 'processed') update.$set.processedAt = new Date();
    return WebhookEvent.findByIdAndUpdate(id, update, { new: true });
  }

  async markFailed(id, error) {
    return WebhookEvent.findByIdAndUpdate(id, {
      $set: { status: 'failed', lastError: error, processedAt: new Date() },
      $inc: { attempts: 1 },
    }, { new: true });
  }

  async markDlq(id, error) {
    return WebhookEvent.findByIdAndUpdate(id, {
      $set: { status: 'dlq', lastError: error, processedAt: new Date() },
      $inc: { attempts: 1 },
    }, { new: true });
  }

  async countFailed() {
    return WebhookEvent.countFailed();
  }
}

export default WebhookEventRepository;
