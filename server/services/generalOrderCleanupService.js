// ============================================================
// generalOrderCleanupService.js — auto-delete abandoned general orders.
// Student order-history was filling with stale `pending` checkouts
// (one per retry). Rule: general Order older than 15 min with no
// captured payment is deleted with its items. Captured payments are
// NEVER deleted — their order is healed to `completed` instead.
// ============================================================
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import CouponUsage from '../models/CouponUsage.js';
import Payment from '../payment/models/Payment.js';
import logger from '../notification/logger.js';

const MODULE = 'GeneralOrderCleanup';

// Pending general checkout lives for 15 minutes. After that the student
// either paid (order is completed by fulfillment) or abandoned it.
export const DELETE_AFTER_MS = 15 * 60 * 1000;

async function findPaymentStatus(paymentId) {
  if (!paymentId) return null;
  const payment = await Payment.findById(paymentId).select('paymentStatus').lean();
  return payment?.paymentStatus || null;
}

/**
 * Delete unpaid general orders older than 15 min.
 * Safe: skips + heals orders whose payment is already captured.
 */
export async function deleteExpiredUnpaidGeneralOrders() {
  const cutoff = new Date(Date.now() - DELETE_AFTER_MS);
  const candidates = await Order.find({
    kind: 'general',
    status: 'pending',
    createdAt: { $lt: cutoff },
  })
    .select('_id orderNumber payment coupon student createdAt')
    .lean();

  const results = [];
  for (const order of candidates) {
    const paymentStatus = await findPaymentStatus(order.payment);

    // Paid but order still pending (crash between Order.create and
    // fulfillment, or items missing the order link) — heal, never delete.
    if (paymentStatus === 'captured') {
      const healed = await Order.updateOne(
        { _id: order._id, status: 'pending' },
        { $set: { status: 'completed' } },
      );
      if (healed.modifiedCount > 0) {
        logger.info(MODULE, 'Healed paid general order to completed', {
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        });
      }
      results.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        deleted: false,
        reason: 'paid_healed',
      });
      continue;
    }

    // Atomic claim: only delete if still pending (a verify racing the
    // sweeper flips status to completed and keeps the order alive).
    const claimed = await Order.deleteOne({ _id: order._id, status: 'pending' });
    if (claimed.deletedCount === 0) {
      results.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        deleted: false,
        reason: 'status_changed',
      });
      continue;
    }

    await OrderItem.deleteMany({ order: order._id });

    // Coupon usage is only consumed at capture (see finalizePurchase),
    // so abandoned checkouts never burned a use — but clear any stray
    // usage doc tied to this order idempotently.
    await CouponUsage.deleteMany({ order: order._id });

    if (order.payment) {
      await Payment.updateOne(
        { _id: order.payment, paymentStatus: { $ne: 'captured' } },
        { $set: { isDeleted: true, paymentStatus: 'failed', failedAt: new Date() } },
      );
    }

    logger.info(MODULE, 'Unpaid general order deleted after 15 min', {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
    });
    results.push({ orderId: String(order._id), orderNumber: order.orderNumber, deleted: true });
  }
  return results;
}

export async function sweepExpiredGeneralOrders() {
  return deleteExpiredUnpaidGeneralOrders();
}

export default { DELETE_AFTER_MS, deleteExpiredUnpaidGeneralOrders, sweepExpiredGeneralOrders };
