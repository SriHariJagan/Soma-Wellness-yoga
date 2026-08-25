import Book from '../models/Book.js';
import { ApiError } from '../utils/ApiError.js';

// ─────────────────────────────────────────────────────────────
// inventoryService — atomic stock operations.
//
// Stock lifecycle:
//   Available (stock) ──reserve──▶ Reserved (reservedStock)
//   Reserved ──finalize (paid)──▶ Sold (soldCount)
//   Reserved ──release (fail/expire)──▶ Available (stock)
//
// Every mutation is a single atomic findOneAndUpdate guarded by
// conditions, so concurrent checkouts cannot oversell.
// ─────────────────────────────────────────────────────────────

/**
 * Reserve inventory for a book. Atomic — returns false when the
 * book is out of stock so callers can fail gracefully.
 */
export async function reserveStock({ bookId, quantity }) {
  if (!quantity || quantity < 1) {
    throw ApiError.badRequest('Quantity must be at least 1');
  }

  const book = await Book.findById(bookId).lean();
  if (!book) throw ApiError.notFound('Book not found');
  if (book.status !== 'published') {
    throw ApiError.badRequest(`${book.title} is not available`);
  }
  if (!book.trackInventory) return { book, reserved: true, tracked: false };

  if (book.allowBackorder) {
    // Backorders are allowed — reserve without a stock guard.
    await Book.updateOne({ _id: bookId }, { $inc: { reservedStock: quantity } });
    return { book, reserved: true, tracked: true, backorder: true };
  }

  const updated = await Book.findOneAndUpdate(
    { _id: bookId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity, reservedStock: quantity } },
    { new: true, lean: true }
  );

  if (!updated) {
    const current = await Book.findById(bookId).select('title stock trackInventory allowBackorder').lean();
    const available = current && current.trackInventory ? Math.max(0, current.stock || 0) : Infinity;
    throw ApiError.badRequest(
      current && available > 0
        ? `Only ${available} copy${available === 1 ? '' : 's'} of "${current.title}" left in stock`
        : `"${current ? current.title : 'This book'}" is currently out of stock`
    );
  }

  return { book: updated, reserved: true, tracked: true };
}

/**
 * Finalize a reservation after verified payment: reserved → sold.
 */
export async function finalizeStock({ bookId, quantity }) {
  if (!bookId || !quantity) return null;
  return Book.updateOne(
    { _id: bookId },
    { $inc: { reservedStock: -quantity, soldCount: quantity } }
  );
}

/**
 * Release a reservation (payment failed/expired/cancelled): reserved → available.
 * Idempotent from the caller's perspective — the order-level guard
 * (inventoryReleasedAt) ensures this runs exactly once per order.
 */
export async function releaseStock({ bookId, quantity }) {
  if (!bookId || !quantity) return null;
  return Book.updateOne(
    { _id: bookId },
    { $inc: { stock: quantity, reservedStock: -quantity } }
  );
}

/**
 * Restore sold stock when an order is cancelled after fulfilment.
 * Only used for explicit admin-initiated cancellations.
 */
export async function restoreStock({ bookId, quantity }) {
  if (!bookId || !quantity) return null;
  return Book.updateOne(
    { _id: bookId },
    { $inc: { stock: quantity, soldCount: -quantity } }
  );
}

/**
 * Release every reservation held by an order, exactly once.
 * The claim is atomic on `inventoryReleasedAt`, so concurrent
 * release attempts (webhook + cleanup job) cannot double-restore.
 */
export async function releaseOrderReservations(orderId, { by = 'system', note = '' } = {}) {
  const Order = (await import('../models/Order.js')).default;
  const OrderItem = (await import('../models/OrderItem.js')).default;

  const claimed = await Order.updateOne(
    { _id: orderId, inventoryReleasedAt: null },
    { $set: { inventoryReleasedAt: new Date() } }
  );
  if (claimed.modifiedCount === 0) {
    return { released: false, reason: 'already_released' };
  }

  const items = await OrderItem.find({ order: orderId, itemType: 'book' }).lean();
  for (const oi of items) {
    await Book.updateOne(
      { _id: oi.itemId },
      { $inc: { stock: oi.quantity || 1, reservedStock: -(oi.quantity || 1) } }
    );
  }

  await Order.updateOne(
    { _id: orderId },
    {
      $push: {
        timeline: {
          status: 'payment_pending',
          note: note || 'Inventory reservation released',
          by,
          at: new Date(),
        },
      },
    }
  );

  return { released: true, lines: items.length };
}

/**
 * Sweep stale inventory reservations: book orders stuck in
 * payment_pending whose payment never succeeded (failed, expired,
 * or abandoned for longer than `staleAfterMs`). Each order's
 * reservation is released exactly once (idempotent claim).
 */
export async function releaseStaleReservations({ staleAfterMs = 30 * 60 * 1000 } = {}) {
  const Order = (await import('../models/Order.js')).default;
  const Payment = (await import('../payment/models/Payment.js')).default;

  const cutoff = new Date(Date.now() - staleAfterMs);
  const staleOrders = await Order.find({
    kind: 'book',
    status: 'payment_pending',
    inventoryReleasedAt: null,
    createdAt: { $lt: cutoff },
  }).lean();

  const results = [];
  for (const order of staleOrders) {
    const payment = order.payment ? await Payment.findById(order.payment).select('paymentStatus').lean() : null;
    if (payment && payment.paymentStatus === 'captured') continue; // paid but webhook pending — never release

    const result = await releaseOrderReservations(order._id, {
      by: 'system',
      note: 'Payment not completed within the reservation window — reservation released',
    });
    results.push({ orderId: String(order._id), ...result });
  }
  return results;
}

export default { reserveStock, finalizeStock, releaseStock, restoreStock, releaseOrderReservations, releaseStaleReservations };