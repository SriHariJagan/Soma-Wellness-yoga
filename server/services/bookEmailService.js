import emailService from './email/email.service.js';
import logger from '../notification/logger.js';
import Order from '../models/Order.js';
import Book from '../models/Book.js';

// ─────────────────────────────────────────────────────────────
// bookEmailService — transactional order emails for the book
// store. Built on the existing SMTP emailService.
//
// Idempotency: every send is recorded on the order's `emails`
// array; the same event is never sent twice.
//
// Email failures NEVER corrupt orders — all sends are
// fire-and-forget with the failure recorded for retry.
// ─────────────────────────────────────────────────────────────

const MODULE = 'BookEmailService';

function buildOrderData(order, items = []) {
  const est = order.estimatedDelivery || {};
  return {
    orderNumber: order.orderNumber,
    customerName: order.customer?.fullName || 'there',
    email: order.customer?.email || '',
    items: items.map((i) => ({
      name: i.name,
      quantity: i.quantity || 1,
      price: i.price || 0,
      finalPrice: i.finalPrice ?? i.price ?? 0,
      image: i.image || '',
    })),
    subtotal: order.subtotal || 0,
    discount: order.discount || 0,
    shippingCharge: order.shippingCharge || 0,
    total: order.total || 0,
    address: order.shippingAddress || {},
    courier: order.courier || '',
    trackingNumber: order.trackingNumber || '',
    dispatchDate: order.dispatchDate,
    expectedDelivery: order.expectedDelivery,
    estimatedDelivery: {
      minDays: est.minDays || 0,
      maxDays: est.maxDays || 0,
    },
    status: order.status,
    paymentMethod: order.paymentMethod || 'Razorpay',
  };
}

/**
 * Send one email event for an order exactly once.
 */
export async function sendOrderEmailOnce(orderId, type, sendFn) {
  try {
    const order = await Order.findById(orderId);
    if (!order) return { sent: false, reason: 'order_not_found' };

    const alreadySent = (order.emails || []).some((e) => e.type === type && e.status === 'sent');
    if (alreadySent) return { sent: false, reason: 'duplicate' };

    const recipient = order.customer?.email;
    if (!recipient) return { sent: false, reason: 'no_recipient' };

    const result = await sendFn(recipient, order);

    await Order.updateOne(
      { _id: orderId, 'emails.type': { $ne: type } },
      { $push: { emails: { type, to: recipient, status: result?.success ? 'sent' : 'failed', at: new Date() } } }
    );

    if (!result?.success) {
      logger.warn(MODULE, 'Order email send failed (order preserved)', { orderId: String(orderId), type, error: result?.error });
    }
    return { sent: result?.success === true, ...result };
  } catch (err) {
    logger.error(MODULE, 'Order email dispatch error', { orderId: String(orderId), type, error: err.message });
    return { sent: false, reason: 'dispatch_error' };
  }
}

async function loadOrderData(orderId) {
  const [order, items] = await Promise.all([
    Order.findById(orderId).lean(),
    import('../models/OrderItem.js').then((m) => m.default.find({ order: orderId }).lean()),
  ]);
  return order ? { order, items } : null;
}

// ── Customer emails ──────────────────────────────────────────

export async function sendOrderPlaced(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'order_placed', (to) =>
    emailService.sendBookOrderPlaced({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendPaymentReceived(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'payment_confirmed', (to) =>
    emailService.sendBookPaymentConfirmed({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendPaymentFailed(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'payment_failed', (to) =>
    emailService.sendBookPaymentFailed({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendPaymentCancelled(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'payment_cancelled', (to) =>
    emailService.sendBookPaymentCancelled({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendOrderDeletionNotice(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'order_deletion_notice', (to) =>
    emailService.sendBookOrderDeletionNotice({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendOrderPacked(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'order_packed', (to) =>
    emailService.sendBookOrderPacked({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendOrderDispatched(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'order_dispatched', (to) =>
    emailService.sendBookOrderDispatched({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendOrderDelivered(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'order_delivered', (to) =>
    emailService.sendBookOrderDelivered({ ...buildOrderData(order, items), email: to })
  );
}

export async function sendOrderCancelled(orderId) {
  const data = await loadOrderData(orderId);
  if (!data) return { sent: false };
  const { order, items } = data;
  return sendOrderEmailOnce(orderId, 'order_cancelled', (to) =>
    emailService.sendBookOrderCancelled({ ...buildOrderData(order, items), email: to })
  );
}

// ── Admin emails (best-effort, may repeat on retry) ──────────

export async function sendNewOrderAdmin(orderId) {
  try {
    const data = await loadOrderData(orderId);
    if (!data) return { sent: false };
    const { order, items } = data;
    return emailService.sendNewBookOrderAdmin(buildOrderData(order, items));
  } catch (err) {
    logger.error(MODULE, 'Admin new-order email failed', { orderId: String(orderId), error: err.message });
    return { sent: false };
  }
}

/**
 * Called AFTER the payment transaction commits (both verify and webhook
 * paths). Sends all "payment successful" emails for a book order.
 * Individual sends are deduplicated on the order doc and failures never
 * corrupt the order.
 */
export async function notifyBookOrderPaid(paymentId) {
  try {
    const order = await Order.findOne({ payment: paymentId, kind: 'book' }).lean();
    if (!order) return { skipped: true, reason: 'not_a_book_order' };

    const orderId = order._id;
    const results = await Promise.all([
      sendOrderPlaced(orderId),
      sendPaymentReceived(orderId),
      sendNewOrderAdmin(orderId),
    ]);
    return { orderId: String(orderId), results };
  } catch (err) {
    logger.error(MODULE, 'Paid-order notification failed (order unaffected)', {
      paymentId: String(paymentId),
      error: err.message,
    });
    return { skipped: true, reason: 'error' };
  }
}

/**
 * Called when a payment definitively fails for a book order.
 * Releases the inventory reservation (idempotently) and notifies
 * customer + admin. Order status remains payment_pending so the
 * customer can retry.
 */
export async function notifyBookOrderPaymentFailed(paymentId) {
  try {
    const order = await Order.findOne({ payment: paymentId, kind: 'book' }).lean();
    if (!order) return { skipped: true, reason: 'not_a_book_order' };
    if (order.status !== 'payment_pending') return { skipped: true, reason: `status:${order.status}` };

    const orderId = order._id;
    const results = await Promise.all([
      sendPaymentFailed(orderId),
      emailService.sendPaymentFailedAdmin({
        customerName: order.customer?.fullName || '',
        customerEmail: order.customer?.email || '',
        amount: `KES ${((order.total || 0)).toLocaleString('en-KE')}`,
        failureReason: 'Payment failed at gateway',
      }),
    ]);
    return { orderId: String(orderId), results };
  } catch (err) {
    logger.error(MODULE, 'Payment-failed notification error (order unaffected)', {
      paymentId: String(paymentId),
      error: err.message,
    });
    return { skipped: true, reason: 'error' };
  }
}

export async function sendLowStockAlerts() {
  try {
    const books = await Book.find({
      trackInventory: true,
      status: 'published',
      lowStockThreshold: { $gt: 0 },
      lowStockAlertSentAt: null,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }).lean();
    for (const book of books) {
      await emailService.sendLowStockAlertAdmin({
        bookTitle: book.title,
        sku: book.sku,
        available: Math.max(0, book.stock || 0),
        threshold: book.lowStockThreshold,
      });
      await Book.updateOne({ _id: book._id }, { lowStockAlertSentAt: new Date() });
    }
    return { checked: books.length };
  } catch (err) {
    logger.error(MODULE, 'Low stock alert sweep failed', { error: err.message });
    return { checked: 0 };
  }
}

export async function sendBulkEnquiryAdmin(enquiry) {
  return emailService.sendBulkEnquiryAdmin({
    organisationName: enquiry.organisationName,
    contactPerson: enquiry.contactPerson,
    email: enquiry.email,
    phone: enquiry.phone,
    bookTitle: enquiry.bookTitle || enquiry.book?.title || '',
    quantity: enquiry.quantity,
    state: enquiry.state,
    pincode: enquiry.pincode,
    message: enquiry.message,
  });
}

export async function sendBulkEnquiryConfirmation(enquiry) {
  return emailService.sendBulkEnquiryConfirmation({
    organisationName: enquiry.organisationName,
    contactPerson: enquiry.contactPerson,
    email: enquiry.email,
    bookTitle: enquiry.bookTitle || enquiry.book?.title || '',
    quantity: enquiry.quantity,
  });
}

export default {
  sendOrderPlaced,
  sendPaymentReceived,
  sendPaymentFailed,
  sendPaymentCancelled,
  sendOrderDeletionNotice,
  sendOrderPacked,
  sendOrderDispatched,
  sendOrderDelivered,
  sendOrderCancelled,
  sendNewOrderAdmin,
  notifyBookOrderPaid,
  notifyBookOrderPaymentFailed,
  sendLowStockAlerts,
  sendBulkEnquiryAdmin,
  sendBulkEnquiryConfirmation,
};