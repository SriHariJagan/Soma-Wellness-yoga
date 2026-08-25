import mongoose from 'mongoose';

const WEBHOOK_STATUSES = ['received', 'processing', 'processed', 'failed', 'dlq']  ;

const WebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  event: { type: String, required: true, index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null, index: true },
  paymentStatus: { type: String, default: '' },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  rawBody: { type: String, default: '' },
  signature: { type: String, default: '' },
  status: {
    type: String,
    enum: WEBHOOK_STATUSES,
    default: 'received',
    index: true,
  },
  processedAt: { type: Date },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  idempotent: { type: Boolean, default: false },
}, {
  timestamps: true,
});

WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

WebhookEventSchema.statics.findByIdempotent = function (eventId) {
  return this.findOne({ eventId, status: { $in: ['processing', 'processed'] } });
};

WebhookEventSchema.statics.countFailed = function () {
  return this.countDocuments({ status: { $in: ['failed', 'dlq'] } });
};

const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', WebhookEventSchema);
export default WebhookEvent;
