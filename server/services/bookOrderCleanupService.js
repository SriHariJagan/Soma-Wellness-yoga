import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import Payment from '../payment/models/Payment.js';
import inventoryService from './inventoryService.js';
import { sendPaymentCancelled, sendOrderDeletionNotice } from './bookEmailService.js';
import logger from '../notification/logger.js';

const MODULE = 'BookOrderCleanup';

// Reservation is held for 30 minutes. After that the order is considered
// cancelled: inventory is released and the customer gets a "payment
// cancelled — retry" email.
const CANCELLED_AFTER_MS = 30 * 60 * 1000;

// If payment was never completed, the order is deleted 1 hour after it was
// placed. A professional "payment incomplete — order deleted" email goes out
// BEFORE the deletion so the customer is never left wondering.
const DELETE_AFTER_MS = 60 * 60 * 1000;

async function findPaymentStatus(order) {
  if (!order.payment) return null;
  const payment = await Payment.findById(order.payment).select('paymentStatus').lean();
  return payment?.paymentStatus || null;
}

/**
 * Release reservations for abandoned book orders (30+ minutes, never paid)
 * and notify the customer that their payment was cancelled and they can retry.
 * Orders whose payment already failed at the gateway are skipped here — the
 * webhook already released inventory and emailed them.
 */
export async function cancelAbandonedBookOrders() {
  const cutoff = new Date(Date.now() - CANCELLED_AFTER_MS);
  const candidates = await Order.find({
    kind: 'book',
    status: 'payment_pending',
    inventoryReleasedAt: null,
    createdAt: { $lt: cutoff },
  }).lean();

  const results = [];
  for (const order of candidates) {
    const paymentStatus = await findPaymentStatus(order);
    if (paymentStatus === 'captured') continue; // paid but webhook pending — never touch

    const result = await inventoryService.releaseOrderReservations(order._id, {
      by: 'system',
      note: 'Payment cancelled — reservation released after 30 minutes',
    });

    if (result.released && (!paymentStatus || paymentStatus === 'pending')) {
      await sendPaymentCancelled(order._id).catch(() => {});
    }
    results.push({ orderId: String(order._id), ...result });
  }
  return results;
}

/**
 * Delete book orders that were never paid within 1 hour. Sequence per order:
 *   1. release any leftover reservation (idempotent)
 *   2. send the customer a professional "payment incomplete" email
 *   3. soft-delete the payment, remove order items + coupon usage, delete order
 */
export async function deleteExpiredUnpaidBookOrders() {
  const cutoff = new Date(Date.now() - DELETE_AFTER_MS);
  const candidates = await Order.find({
    kind: 'book',
    status: 'payment_pending',
    createdAt: { $lt: cutoff },
  }).lean();

  const results = [];
  for (const order of candidates) {
    const paymentStatus = await findPaymentStatus(order);
    if (paymentStatus === 'captured') continue; // paid but webhook pending — never delete

    await inventoryService.releaseOrderReservations(order._id, {
      by: 'system',
      note: 'Payment not completed within 1 hour — order deleted',
    });

    await sendOrderDeletionNotice(order._id).catch(() => {});

    // Atomic claim: only delete if the order is still unpaid. A payment
    // verified mid-sweep flips the status and keeps the order alive.
    const deleted = await Order.deleteOne({ _id: order._id, status: 'payment_pending' });
    if (deleted.deletedCount === 0) {
      results.push({ orderId: String(order._id), orderNumber: order.orderNumber, deleted: false, reason: 'status_changed' });
      continue;
    }

    await OrderItem.deleteMany({ order: order._id });

    if (order.coupon) {
      await Coupon.updateOne({ _id: order.coupon }, { $inc: { usageCount: -1 } });
      await CouponUsage.deleteMany({ order: order._id });
    }

    if (order.payment) {
      await Payment.updateOne(
        { _id: order.payment, paymentStatus: { $ne: 'captured' } },
        { $set: { isDeleted: true, paymentStatus: 'failed', failedAt: new Date() } }
      );
    }

    logger.info(MODULE, 'Unpaid book order deleted after 1 hour', {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
    });
    results.push({ orderId: String(order._id), orderNumber: order.orderNumber, deleted: true });
  }
  return results;
}

/**
 * Full sweep — runs on the book-store timer. Handles the 30-minute
 * cancellation (reservation release + retry email) and the 1-hour deletion
 * (notice email + delete).
 */
export async function sweepExpiredBookOrders() {
  const [cancelled, deleted] = await Promise.all([
    cancelAbandonedBookOrders(),
    deleteExpiredUnpaidBookOrders(),
  ]);
  return { cancelled, deleted };
}

export default { cancelAbandonedBookOrders, deleteExpiredUnpaidBookOrders, sweepExpiredBookOrders };